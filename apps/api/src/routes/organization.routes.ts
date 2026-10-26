import { FastifyInstance } from 'fastify';
import { prisma } from '@replyspark/db';
import { authenticate } from '../middleware/auth.js';

export async function organizationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List user organizations
  fastify.get('/', async (request, reply) => {
    const auth = request.auth!;
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: auth.userId, status: 'ACTIVE' },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                locations: true,
                reviews: true
              }
            }
          }
        }
      }
    });

    return reply.send({
      organizations: memberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        locationsCount: m.organization._count.locations,
        reviewsCount: m.organization._count.reviews,
        isCurrent: m.organizationId === auth.organizationId
      }))
    });
  });

  // List locations for the current organization
  fastify.get('/locations', async (request, reply) => {
    const auth = request.auth!;
    const locations = await prisma.businessLocation.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: { displayName: 'asc' }
    });

    return reply.send({
      locations: locations.map(l => ({
        id: l.id,
        displayName: l.displayName,
        address: l.address,
        timezone: l.timezone,
        connectionStatus: l.connectionStatus,
        lastSyncAt: l.lastSyncAt,
        reviewsCount: l._count.reviews
      }))
    });
  });
}
