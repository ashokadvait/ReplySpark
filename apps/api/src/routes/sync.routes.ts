import { FastifyInstance } from 'fastify';
import { prisma, WorkflowStatus, QualityStatus } from '@replyspark/db';
import { authenticate } from '../middleware/auth.js';
import { getGoogleBusinessProfileClient } from '../services/google/index.js';
import { getAIProvider } from '../services/ai/index.js';

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/', async (request, reply) => {
    const auth = request.auth!;
    const { locationId } = (request.body as { locationId?: string }) || {};

    const locations = await prisma.businessLocation.findMany({
      where: {
        organizationId: auth.organizationId,
        ...(locationId ? { id: locationId } : {})
      },
      include: {
        googleConnection: true,
        organization: true
      }
    });

    if (locations.length === 0) {
      return reply.code(400).send({ error: 'Bad Request', message: 'No connected locations to sync' });
    }

    const client = getGoogleBusinessProfileClient();
    const aiProvider = getAIProvider();

    // Fetch active preferences
    const preferences = await prisma.aiPreference.findMany({
      where: { organizationId: auth.organizationId, status: 'ACTIVE' }
    });

    let totalSynced = 0;
    let newDraftsGenerated = 0;

    for (const loc of locations) {
      const refreshToken = loc.googleConnection?.encryptedRefreshToken || 'mock-token';
      const fetched = await client.fetchReviews(refreshToken, loc.googleLocationResourceName);

      for (const rev of fetched) {
        // Upsert review
        const existing = await prisma.review.findFirst({
          where: {
            businessLocationId: loc.id,
            googleReviewResourceName: rev.googleReviewResourceName
          }
        });

        if (!existing) {
          totalSynced++;
          const newReview = await prisma.review.create({
            data: {
              organizationId: auth.organizationId,
              businessLocationId: loc.id,
              googleReviewResourceName: rev.googleReviewResourceName,
              rating: rev.rating,
              reviewText: rev.reviewText,
              reviewerDisplayName: rev.reviewerDisplayName,
              reviewerPhotoUrl: rev.reviewerPhotoUrl,
              reviewCreatedAt: rev.reviewCreatedAt,
              workflowStatus: WorkflowStatus.PENDING_APPROVAL
            }
          });

          // Generate draft for the review
          const draftResult = await aiProvider.generateReply({
            rating: newReview.rating,
            reviewText: newReview.reviewText,
            reviewerDisplayName: newReview.reviewerDisplayName,
            businessName: loc.organization.name,
            locationName: loc.displayName,
            address: loc.address,
            activePreferences: preferences.map(p => ({
              ruleText: p.ruleText,
              ruleCategory: p.ruleCategory
            }))
          });

          await prisma.replyDraft.create({
            data: {
              organizationId: auth.organizationId,
              reviewId: newReview.id,
              generatedText: draftResult.replyText,
              qualityStatus: draftResult.qualityStatus as QualityStatus,
              qualityNotes: draftResult.qualityNotes?.join('; ') || draftResult.rationale,
              suggestedEscalation: draftResult.suggestedEscalation,
              modelProvider: draftResult.modelProvider,
              modelName: draftResult.modelName,
              promptVersion: draftResult.promptVersion
            }
          });

          newDraftsGenerated++;
        }
      }

      await prisma.businessLocation.update({
        where: { id: loc.id },
        data: { lastSyncAt: new Date() }
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'REVIEWS_SYNCED',
        resourceType: 'REVIEW',
        metadataJson: { totalSynced, newDraftsGenerated }
      }
    });

    return reply.send({
      success: true,
      totalSynced,
      newDraftsGenerated,
      message: `Successfully synchronized ${totalSynced} new reviews with AI draft proposals.`
    });
  });
}
