import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { prisma, JobStatus, WorkflowStatus } from '@replyspark/db';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('⚡ ReplySpark Background Worker starting...');

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Worker 1: Reply Publication
const publicationWorker = new Worker(
  'reply-publication',
  async (job: Job<{ publicationJobId: string; organizationId: string }>) => {
    console.log(`[Worker:Pub] Processing job ${job.id} for publicationJob ${job.data.publicationJobId}`);

    const pubJob = await prisma.publicationJob.findUnique({
      where: { id: job.data.publicationJobId },
      include: {
        replyDraft: {
          include: {
            review: {
              include: {
                businessLocation: {
                  include: { googleConnection: true }
                }
              }
            }
          }
        }
      }
    });

    if (!pubJob) {
      throw new Error(`Publication job ${job.data.publicationJobId} not found`);
    }

    if (pubJob.status === JobStatus.COMPLETED) {
      console.log(`[Worker:Pub] Job ${pubJob.id} already completed, skipping.`);
      return;
    }

    await prisma.publicationJob.update({
      where: { id: pubJob.id },
      data: {
        status: JobStatus.PROCESSING,
        attemptCount: { increment: 1 }
      }
    });

    const replyText = pubJob.replyDraft.finalText || pubJob.replyDraft.generatedText;

    // Simulate/Execute publishing
    await prisma.$transaction([
      prisma.publicationJob.update({
        where: { id: pubJob.id },
        data: {
          status: JobStatus.COMPLETED,
          publishedAt: new Date()
        }
      }),
      prisma.review.update({
        where: { id: pubJob.replyDraft.review.id },
        data: {
          workflowStatus: WorkflowStatus.PUBLISHED,
          ownerReplyText: replyText,
          ownerReplyCommittedAt: new Date()
        }
      })
    ]);

    console.log(`[Worker:Pub] Successfully processed publication job ${pubJob.id}`);
  },
  { connection: redisConnection as any, concurrency: 5 }
);

publicationWorker.on('completed', (job) => {
  console.log(`[Worker:Pub] Job ${job.id} completed!`);
});

publicationWorker.on('failed', (job, err) => {
  console.error(`[Worker:Pub] Job ${job?.id} failed with error: ${err.message}`);
});

console.log('🚀 Background workers listening for jobs.');

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await publicationWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
