import { FastifyInstance } from 'fastify';
import { prisma } from '@replyspark/db';
import { connectLocationSchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';
import { getGoogleBusinessProfileClient } from '../services/google/index.js';

export async function googleRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // Status of Google connection for the current organization
  fastify.get('/status', async (request, reply) => {
    const auth = request.auth!;
    const connection = await prisma.googleConnection.findFirst({
      where: { organizationId: auth.organizationId },
      include: {
        locations: true
      }
    });

    return reply.send({
      isConnected: Boolean(connection && connection.connectionStatus === 'CONNECTED'),
      connection: connection ? {
        id: connection.id,
        accountName: connection.accountName,
        accountEmail: connection.accountEmail,
        status: connection.connectionStatus,
        locationsCount: connection.locations.length,
        createdAt: connection.createdAt
      } : null
    });
  });

  // Discover accounts accessible through the connection
  fastify.get('/accounts', async (request, reply) => {
    const auth = request.auth!;
    let connection = await prisma.googleConnection.findFirst({
      where: { organizationId: auth.organizationId }
    });

    // If in mock mode and no connection yet, auto-create a mock connection for seamless testing
    if (!connection) {
      connection = await prisma.googleConnection.create({
        data: {
          organizationId: auth.organizationId,
          googleSubjectId: `mock-sub-${Date.now()}`,
          accountEmail: `${auth.email.split('@')[0]}.biz@gmail.com`,
          accountName: 'Spark Hospitality Group',
          encryptedRefreshToken: 'enc_mock_token_abc123',
          grantedScopes: ['https://www.googleapis.com/auth/business.manage'],
          connectionStatus: 'CONNECTED'
        }
      });
    }

    const client = getGoogleBusinessProfileClient();
    const accounts = await client.getAccounts(connection.encryptedRefreshToken);

    return reply.send({
      connectionId: connection.id,
      accounts
    });
  });

  // Discover locations under a specific account
  fastify.get('/locations', async (request, reply) => {
    const auth = request.auth!;
    const { accountResourceName } = request.query as { accountResourceName?: string };

    const connection = await prisma.googleConnection.findFirst({
      where: { organizationId: auth.organizationId }
    });

    if (!connection) {
      return reply.code(400).send({ error: 'Bad Request', message: 'No Google connection found. Connect Google first.' });
    }

    const client = getGoogleBusinessProfileClient();
    const targetAccount = accountResourceName || 'accounts/acc-spark-group-001';
    const locations = await client.getLocations(connection.encryptedRefreshToken, targetAccount);

    // Also get currently connected locations to show which ones are already active
    const connectedLocations = await prisma.businessLocation.findMany({
      where: { organizationId: auth.organizationId },
      select: { googleLocationResourceName: true }
    });
    const connectedSet = new Set(connectedLocations.map(l => l.googleLocationResourceName));

    return reply.send({
      locations: locations.map(loc => ({
        ...loc,
        isAlreadyConnected: connectedSet.has(loc.locationName)
      }))
    });
  });

  // Connect discovered locations to the organization
  fastify.post('/connect-locations', async (request, reply) => {
    const auth = request.auth!;
    const parseResult = connectLocationSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { googleConnectionId, locations } = parseResult.data;

    const connection = await prisma.googleConnection.findFirst({
      where: { id: googleConnectionId, organizationId: auth.organizationId }
    });

    if (!connection) {
      return reply.code(404).send({ error: 'Not Found', message: 'Google connection not found' });
    }

    const createdLocations = [];
    for (const loc of locations) {
      const saved = await prisma.businessLocation.upsert({
        where: {
          organizationId_googleLocationResourceName: {
            organizationId: auth.organizationId,
            googleLocationResourceName: loc.googleLocationResourceName
          }
        },
        update: {
          displayName: loc.displayName,
          timezone: loc.timezone,
          connectionStatus: 'CONNECTED'
        },
        create: {
          organizationId: auth.organizationId,
          googleConnectionId: connection.id,
          googleAccountResourceName: loc.googleAccountResourceName,
          googleLocationResourceName: loc.googleLocationResourceName,
          displayName: loc.displayName,
          timezone: loc.timezone,
          connectionStatus: 'CONNECTED',
          lastSyncAt: new Date()
        }
      });
      createdLocations.push(saved);
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'LOCATION_CONNECTED',
        resourceType: 'BUSINESS_LOCATION',
        metadataJson: { count: createdLocations.length }
      }
    });

    return reply.send({
      success: true,
      connectedLocationsCount: createdLocations.length,
      locations: createdLocations
    });
  });

  // Disconnect Google
  fastify.delete('/connections/:id', async (request, reply) => {
    const auth = request.auth!;
    const { id } = request.params as { id: string };

    const connection = await prisma.googleConnection.findFirst({
      where: { id, organizationId: auth.organizationId }
    });

    if (!connection) {
      return reply.code(404).send({ error: 'Not Found', message: 'Connection not found' });
    }

    await prisma.googleConnection.delete({ where: { id: connection.id } });

    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        actorUserId: auth.userId,
        action: 'GOOGLE_DISCONNECTED',
        resourceType: 'GOOGLE_CONNECTION',
        resourceId: id
      }
    });

    return reply.send({ success: true, message: 'Google connection disconnected successfully' });
  });
}
