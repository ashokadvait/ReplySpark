import { FastifyInstance } from 'fastify';
import { prisma, PreferenceStatus } from '@replyspark/db';
import { createPreferenceSchema, updatePreferenceSchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';

export async function preferenceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // List all preferences for the organization
  fastify.get('/', async (request, reply) => {
    const auth = request.auth!;

    const preferences = await prisma.aiPreference.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        businessLocation: {
          select: { id: true, displayName: true }
        },
        creator: {
          select: { id: true, displayName: true, email: true }
        }
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });

    const activeRules = preferences.filter(p => p.status === PreferenceStatus.ACTIVE);
    const candidateRules = preferences.filter(p => p.status === PreferenceStatus.AWAITING_CONFIRMATION);
    const disabledRules = preferences.filter(p => p.status === PreferenceStatus.DISABLED);

    return reply.send({
      all: preferences,
      activeRules,
      candidateRules,
      disabledRules
    });
  });

  // Manually add a preference rule
  fastify.post('/', async (request, reply) => {
    const auth = request.auth!;
    const parseResult = createPreferenceSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { ruleText, ruleCategory, businessLocationId } = parseResult.data;

    const preference = await prisma.aiPreference.create({
      data: {
        organizationId: auth.organizationId,
        businessLocationId,
        ruleText,
        ruleCategory,
        status: PreferenceStatus.ACTIVE,
        createdBy: auth.userId,
        approvedBy: auth.userId
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'AI_PREFERENCE_CREATED',
        resourceType: 'AI_PREFERENCE',
        resourceId: preference.id,
        metadataJson: { ruleText, ruleCategory }
      }
    });

    return reply.code(201).send({ success: true, preference });
  });

  // Approve / activate a candidate rule
  fastify.post('/:id/approve', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const preference = await prisma.aiPreference.findFirst({
      where: { id, organizationId: auth.organizationId }
    });

    if (!preference) {
      return reply.code(404).send({ error: 'Not Found', message: 'Preference not found' });
    }

    const updated = await prisma.aiPreference.update({
      where: { id: preference.id },
      data: {
        status: PreferenceStatus.ACTIVE,
        approvedBy: auth.userId,
        version: { increment: 1 }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'AI_PREFERENCE_ACTIVATED',
        resourceType: 'AI_PREFERENCE',
        resourceId: preference.id
      }
    });

    return reply.send({ success: true, preference: updated });
  });

  // Disable a preference rule
  fastify.post('/:id/disable', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const preference = await prisma.aiPreference.findFirst({
      where: { id, organizationId: auth.organizationId }
    });

    if (!preference) {
      return reply.code(404).send({ error: 'Not Found', message: 'Preference not found' });
    }

    const updated = await prisma.aiPreference.update({
      where: { id: preference.id },
      data: { status: PreferenceStatus.DISABLED }
    });

    return reply.send({ success: true, preference: updated });
  });

  // Delete a preference rule
  fastify.delete('/:id', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const preference = await prisma.aiPreference.findFirst({
      where: { id, organizationId: auth.organizationId }
    });

    if (!preference) {
      return reply.code(404).send({ error: 'Not Found', message: 'Preference not found' });
    }

    await prisma.aiPreference.delete({ where: { id: preference.id } });

    return reply.send({ success: true, message: 'Preference deleted' });
  });
}
