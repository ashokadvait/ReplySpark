import { FastifyInstance } from 'fastify';
import { prisma } from '@replyspark/db';
import { authenticate } from '../middleware/auth.js';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (request, reply) => {
    const auth = request.auth!;
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        actorUser: {
          select: { id: true, displayName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return reply.send({ logs });
  });
}
