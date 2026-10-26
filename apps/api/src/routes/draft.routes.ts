import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { prisma, WorkflowStatus, JobStatus } from '@replyspark/db';
import { approveDraftSchema, rejectDraftSchema, updateDraftSchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';
import { getGoogleBusinessProfileClient } from '../services/google/index.js';
import { QueueService } from '../services/queue/queue.service.js';

export async function draftRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // Edit draft text
  fastify.patch('/:id', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };
    const parseResult = updateDraftSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { replyText } = parseResult.data;

    const draft = await prisma.replyDraft.findFirst({
      where: { id, organizationId: auth.organizationId }
    });

    if (!draft) {
      return reply.code(404).send({ error: 'Not Found', message: 'Draft not found' });
    }

    // Revoke any prior approvals because the text has been modified
    await prisma.replyApproval.updateMany({
      where: { replyDraftId: draft.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    const updated = await prisma.replyDraft.update({
      where: { id: draft.id },
      data: {
        finalText: replyText
      }
    });

    return reply.send({ success: true, draft: updated });
  });

  // Approve draft and publish to Google
  fastify.post('/:id/approve', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };
    const parseResult = approveDraftSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { replyText, autoPublish } = parseResult.data;

    const draft = await prisma.replyDraft.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        review: {
          include: {
            businessLocation: {
              include: {
                googleConnection: true
              }
            }
          }
        }
      }
    });

    if (!draft) {
      return reply.code(404).send({ error: 'Not Found', message: 'Draft not found' });
    }

    // Cryptographic hash of exact approved text
    const approvedTextHash = crypto.createHash('sha256').update(replyText.trim()).digest('hex');

    // 1. Transactionally record approval and update review status
    const result = await prisma.$transaction(async (tx) => {
      // Invalidate old approvals
      await tx.replyApproval.updateMany({
        where: { replyDraftId: draft.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      const approval = await tx.replyApproval.create({
        data: {
          organizationId: auth.organizationId,
          replyDraftId: draft.id,
          approvedBy: auth.userId,
          approvedTextHash
        }
      });

      await tx.replyDraft.update({
        where: { id: draft.id },
        data: { finalText: replyText }
      });

      const updatedReview = await tx.review.update({
        where: { id: draft.review.id },
        data: {
          workflowStatus: WorkflowStatus.PUBLISH_QUEUED
        }
      });

      const idempotencyKey = `pub-${draft.id}-${approvedTextHash.slice(0, 16)}`;
      const pubJob = await tx.publicationJob.upsert({
        where: { idempotencyKey },
        update: { status: JobStatus.PENDING },
        create: {
          organizationId: auth.organizationId,
          replyDraftId: draft.id,
          idempotencyKey,
          status: JobStatus.PENDING
        }
      });

      return { approval, updatedReview, pubJob };
    });

    // 2. Perform or queue publication to Google
    if (autoPublish) {
      try {
        const client = getGoogleBusinessProfileClient();
        const refreshToken = draft.review.businessLocation.googleConnection?.encryptedRefreshToken || 'mock-token';

        const pubResult = await client.publishReply(
          refreshToken,
          draft.review.businessLocation.googleLocationResourceName,
          draft.review.googleReviewResourceName,
          replyText
        );

        if (pubResult.success) {
          await prisma.$transaction([
            prisma.publicationJob.update({
              where: { id: result.pubJob.id },
              data: {
                status: JobStatus.COMPLETED,
                publishedAt: pubResult.publishedAt
              }
            }),
            prisma.review.update({
              where: { id: draft.review.id },
              data: {
                workflowStatus: WorkflowStatus.PUBLISHED,
                ownerReplyText: replyText,
                ownerReplyCommittedAt: pubResult.publishedAt
              }
            }),
            prisma.auditLog.create({
              data: {
                organizationId: auth.organizationId,
                actorUserId: auth.userId,
                action: 'REPLY_PUBLISHED',
                resourceType: 'REVIEW',
                resourceId: draft.review.id,
                metadataJson: {
                  approvedBy: auth.email,
                  location: draft.review.businessLocation.displayName,
                  replySnippet: replyText.slice(0, 50)
                }
              }
            })
          ]);

          return reply.send({
            success: true,
            status: WorkflowStatus.PUBLISHED,
            publishedAt: pubResult.publishedAt,
            message: 'Reply approved and published to Google Business Profile successfully!'
          });
        }
      } catch (err: any) {
        console.error('Publication failed:', err);
        await prisma.$transaction([
          prisma.publicationJob.update({
            where: { id: result.pubJob.id },
            data: {
              status: JobStatus.FAILED,
              lastErrorMessage: err.message
            }
          }),
          prisma.review.update({
            where: { id: draft.review.id },
            data: { workflowStatus: WorkflowStatus.PUBLISH_FAILED }
          })
        ]);

        return reply.code(502).send({
          error: 'Publication Failed',
          message: err.message,
          status: WorkflowStatus.PUBLISH_FAILED
        });
      }
    } else {
      // Background worker dispatch
      await QueueService.enqueueReplyPublication(result.pubJob.id, auth.organizationId);
      return reply.send({
        success: true,
        status: WorkflowStatus.PUBLISH_QUEUED,
        message: 'Reply approved and queued for publication.'
      });
    }
  });

  // Reject draft
  fastify.post('/:id/reject', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };
    const parseResult = rejectDraftSchema.safeParse(request.body || {});

    const draft = await prisma.replyDraft.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: { review: true }
    });

    if (!draft) {
      return reply.code(404).send({ error: 'Not Found', message: 'Draft not found' });
    }

    await prisma.review.update({
      where: { id: draft.review.id },
      data: { workflowStatus: WorkflowStatus.REJECTED }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'DRAFT_REJECTED',
        resourceType: 'REPLY_DRAFT',
        resourceId: draft.id,
        metadataJson: parseResult.success ? parseResult.data : {}
      }
    });

    return reply.send({
      success: true,
      status: WorkflowStatus.REJECTED,
      message: 'Draft rejected.'
    });
  });
}
