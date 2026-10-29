import { FastifyInstance } from 'fastify';
import { prisma } from '@replyspark/db';
import { connectLocationSchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';
import { getGoogleBusinessProfileClient } from '../services/google/index.js';
import { ENV } from '../config/env.js';

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
      providerMode: ENV.GOOGLE_PROVIDER_MODE,
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

  // Generate Google OAuth authorization URL for linking live business accounts
  fastify.get('/oauth/url', async (request, reply) => {
    const auth = request.auth!;
    if (!ENV.GOOGLE_CLIENT_ID) {
      return reply.code(400).send({
        error: 'Misconfigured',
        message: 'GOOGLE_CLIENT_ID is not configured in .env. Please configure your Google Cloud OAuth Client ID.'
      });
    }

    const statePayload = {
      organizationId: auth.organizationId,
      userId: auth.userId,
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const scopes = [
      'https://www.googleapis.com/auth/business.manage',
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const params = new URLSearchParams({
      client_id: ENV.GOOGLE_CLIENT_ID,
      redirect_uri: ENV.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    return reply.send({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
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
      if (ENV.GOOGLE_PROVIDER_MODE === 'mock') {
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
      } else {
        return reply.code(400).send({
          error: 'Not Connected',
          message: 'No Google connection found. Please connect your Google account via OAuth first.'
        });
      }
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
    let targetAccount = accountResourceName;
    if (!targetAccount) {
      if (ENV.GOOGLE_PROVIDER_MODE === 'live') {
        const accounts = await client.getAccounts(connection.encryptedRefreshToken);
        if (accounts.length > 0) {
          targetAccount = accounts[0].name;
        } else {
          return reply.send({
            accountResourceName: null,
            locations: [],
            message: 'No Google Business Profile accounts found under this connected Google user.'
          });
        }
      } else {
        try {
          const accounts = await client.getAccounts(connection.encryptedRefreshToken);
          if (accounts.length > 0) {
            targetAccount = accounts[0].name;
          }
        } catch (err) {
          // Fallback to default mock account if fetching fails in mock mode
        }
        targetAccount = targetAccount || 'accounts/acc-spark-group-001';
      }
    }

    const locations = await client.getLocations(connection.encryptedRefreshToken, targetAccount);

    // Also get currently connected locations to show which ones are already active
    const connectedLocations = await prisma.businessLocation.findMany({
      where: { organizationId: auth.organizationId },
      select: { googleLocationResourceName: true }
    });
    const connectedSet = new Set(connectedLocations.map(l => l.googleLocationResourceName));

    return reply.send({
      accountResourceName: targetAccount,
      locations: locations.map(loc => ({
        ...loc,
        accountResourceName: targetAccount,
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
