import { FastifyInstance } from 'fastify';
import { prisma, WorkflowStatus, QualityStatus } from '@replyspark/db';
import { feedbackSchema, reviewQuerySchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';
import { getAIProvider } from '../services/ai/index.js';

export async function reviewRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List reviews (Inbox) with filters, search, and pagination
  fastify.get('/', async (request, reply) => {
    const auth = request.auth!;
    const parseResult = reviewQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { locationId, status, rating, search, page, limit } = parseResult.data;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId: auth.organizationId
    };

    if (locationId) {
      whereClause.businessLocationId = locationId;
    }

    if (status) {
      whereClause.workflowStatus = status;
    }

    if (rating) {
      whereClause.rating = rating;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { reviewText: { contains: search.trim(), mode: 'insensitive' } },
        { reviewerDisplayName: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const [reviews, totalCount, statusCounts] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          businessLocation: {
            select: { id: true, displayName: true, address: true }
          },
          replyDrafts: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { reviewCreatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where: whereClause }),
      prisma.review.groupBy({
        by: ['workflowStatus'],
        where: { organizationId: auth.organizationId },
        _count: { id: true }
      })
    ]);

    // Format status metrics dictionary
    const metrics: Record<string, number> = {
      ALL: 0,
      PENDING_APPROVAL: 0,
      DRAFT_PENDING: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      PUBLISH_FAILED: 0
    };

    statusCounts.forEach((sc) => {
      metrics[sc.workflowStatus] = sc._count.id;
      metrics.ALL += sc._count.id;
    });

    return reply.send({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        reviewText: r.reviewText,
        reviewerDisplayName: r.reviewerDisplayName || 'Anonymous Diner',
        reviewerPhotoUrl: r.reviewerPhotoUrl,
        reviewCreatedAt: r.reviewCreatedAt,
        workflowStatus: r.workflowStatus,
        ownerReplyText: r.ownerReplyText,
        ownerReplyCommittedAt: r.ownerReplyCommittedAt,
        location: r.businessLocation,
        latestDraft: r.replyDrafts[0] ? {
          id: r.replyDrafts[0].id,
          generatedText: r.replyDrafts[0].generatedText,
          finalText: r.replyDrafts[0].finalText,
          qualityStatus: r.replyDrafts[0].qualityStatus,
          qualityNotes: r.replyDrafts[0].qualityNotes,
          suggestedEscalation: r.replyDrafts[0].suggestedEscalation,
          modelProvider: r.replyDrafts[0].modelProvider,
          modelName: r.replyDrafts[0].modelName,
          createdAt: r.replyDrafts[0].createdAt
        } : null
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      metrics
    });
  });

  // Get single review detail
  fastify.get('/:id', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const review = await prisma.review.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        businessLocation: true,
        replyDrafts: {
          orderBy: { createdAt: 'desc' },
          include: {
            approvals: true,
            feedbacks: true
          }
        }
      }
    });

    if (!review) {
      return reply.code(404).send({ error: 'Not Found', message: 'Review not found' });
    }

    return reply.send({ review });
  });

  // Generate an AI reply draft for a review
  fastify.post('/:id/generate', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const review = await prisma.review.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        businessLocation: true,
        organization: true
      }
    });

    if (!review) {
      return reply.code(404).send({ error: 'Not Found', message: 'Review not found' });
    }

    // Fetch active AI preferences for this organization and location
    const preferences = await prisma.aiPreference.findMany({
      where: {
        organizationId: auth.organizationId,
        status: 'ACTIVE',
        OR: [
          { businessLocationId: null },
          { businessLocationId: review.businessLocationId }
        ]
      }
    });

    const aiProvider = getAIProvider();
    const result = await aiProvider.generateReply({
      rating: review.rating,
      reviewText: review.reviewText,
      reviewerDisplayName: review.reviewerDisplayName,
      businessName: review.organization.name,
      locationName: review.businessLocation.displayName,
      address: review.businessLocation.address,
      activePreferences: preferences.map(p => ({
        ruleText: p.ruleText,
        ruleCategory: p.ruleCategory
      }))
    });

    // Save draft and transition review to PENDING_APPROVAL
    const [draft, updatedReview] = await prisma.$transaction([
      prisma.replyDraft.create({
        data: {
          organizationId: auth.organizationId,
          reviewId: review.id,
          generatedText: result.replyText,
          qualityStatus: result.qualityStatus as QualityStatus,
          qualityNotes: result.qualityNotes?.join('; ') || result.rationale,
          suggestedEscalation: result.suggestedEscalation,
          modelProvider: result.modelProvider,
          modelName: result.modelName,
          promptVersion: result.promptVersion,
          createdBy: auth.userId
        }
      }),
      prisma.review.update({
        where: { id: review.id },
        data: { workflowStatus: WorkflowStatus.PENDING_APPROVAL }
      })
    ]);

    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'AI_DRAFT_GENERATED',
        resourceType: 'REPLY_DRAFT',
        resourceId: draft.id,
        metadataJson: { reviewId: review.id, qualityStatus: draft.qualityStatus }
      }
    });

    return reply.send({
      success: true,
      draft,
      reviewStatus: updatedReview.workflowStatus
    });
  });

  // Regenerate draft
  fastify.post('/:id/regenerate', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const review = await prisma.review.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        businessLocation: true,
        organization: true
      }
    });

    if (!review) {
      return reply.code(404).send({ error: 'Not Found', message: 'Review not found' });
    }

    const preferences = await prisma.aiPreference.findMany({
      where: {
        organizationId: auth.organizationId,
        status: 'ACTIVE',
        OR: [
          { businessLocationId: null },
          { businessLocationId: review.businessLocationId }
        ]
      }
    });

    const aiProvider = getAIProvider();
    const result = await aiProvider.generateReply({
      rating: review.rating,
      reviewText: review.reviewText,
      reviewerDisplayName: review.reviewerDisplayName,
      businessName: review.organization.name,
      locationName: review.businessLocation.displayName,
      address: review.businessLocation.address,
      activePreferences: preferences.map(p => ({
        ruleText: p.ruleText,
        ruleCategory: p.ruleCategory
      }))
    });

    const draft = await prisma.replyDraft.create({
      data: {
        organizationId: auth.organizationId,
        reviewId: review.id,
        generatedText: result.replyText,
        qualityStatus: result.qualityStatus as QualityStatus,
        qualityNotes: result.qualityNotes?.join('; ') || result.rationale,
        suggestedEscalation: result.suggestedEscalation,
        modelProvider: result.modelProvider,
        modelName: result.modelName,
        promptVersion: result.promptVersion,
        createdBy: auth.userId
      }
    });

    await prisma.review.update({
      where: { id: review.id },
      data: { workflowStatus: WorkflowStatus.PENDING_APPROVAL }
    });

    return reply.send({ success: true, draft });
  });

  // Submit feedback on a draft & optionally extract candidate rule
  fastify.post('/:id/feedback', async (request, reply) => {
    const auth = request.auth!;
    const parseResult = feedbackSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { draftId, category, feedbackText, correctedText, scope, teachAI } = parseResult.data;

    const draft = await prisma.replyDraft.findFirst({
      where: { id: draftId, organizationId: auth.organizationId },
      include: {
        review: true,
        organization: true
      }
    });

    if (!draft) {
      return reply.code(404).send({ error: 'Not Found', message: 'Draft not found' });
    }

    // Save feedback record
    const feedback = await prisma.reviewFeedback.create({
      data: {
        organizationId: auth.organizationId,
        replyDraftId: draft.id,
        feedbackCategory: category,
        feedbackText,
        generatedTextSnapshot: draft.generatedText,
        correctedText,
        scope,
        createdBy: auth.userId
      }
    });

    let candidatePreference = null;

    // Continuous learning pipeline (Module E & Section 6 of PRD)
    if (teachAI) {
      const aiProvider = getAIProvider();
      const extracted = await aiProvider.extractCandidatePreference({
        feedbackCategory: category,
        feedbackText,
        originalGeneratedText: draft.generatedText,
        finalEditedText: correctedText || draft.finalText,
        rating: draft.review.rating,
        businessName: draft.organization.name
      });

      if (extracted) {
        // Create candidate preference for user confirmation
        candidatePreference = await prisma.aiPreference.create({
          data: {
            organizationId: auth.organizationId,
            businessLocationId: scope === 'LOCATION' ? draft.review.businessLocationId : null,
            ruleText: extracted.ruleText,
            ruleCategory: extracted.ruleCategory,
            sourceFeedbackId: feedback.id,
            status: 'AWAITING_CONFIRMATION',
            createdBy: auth.userId
          }
        });
      }
    }

    return reply.send({
      success: true,
      feedbackId: feedback.id,
      candidatePreference
    });
  });
}
