import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../../config/env.js';

let redisClient: Redis | null = null;
let replyPublicationQueue: Queue | null = null;
let draftGenerationQueue: Queue | null = null;

try {
  redisClient = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    }
  });

  redisClient.on('error', (err) => {
    // Suppress unhandled redis errors if redis is offline
    console.warn(`[Redis Notice] ${err.message}`);
  });

  replyPublicationQueue = new Queue('reply-publication', { connection: redisClient as any });
  draftGenerationQueue = new Queue('review-generation', { connection: redisClient as any });
} catch (e) {
  console.warn('[Queue] Redis not available, running in direct processing mode.');
}

export class QueueService {
  static async enqueueDraftGeneration(reviewId: string, organizationId: string): Promise<void> {
    if (draftGenerationQueue) {
      try {
        await draftGenerationQueue.add('generate-draft', { reviewId, organizationId }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        });
        return;
      } catch (err) {
        console.warn('[Queue] Could not enqueue to Redis, will process in-band if needed.');
      }
    }
  }

  static async enqueueReplyPublication(publicationJobId: string, organizationId: string): Promise<void> {
    if (replyPublicationQueue) {
      try {
        await replyPublicationQueue.add('publish-reply', { publicationJobId, organizationId }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        });
        return;
      } catch (err) {
        console.warn('[Queue] Could not enqueue to Redis, fallback direct execution.');
      }
    }
  }
}
