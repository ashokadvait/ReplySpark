import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import { ENV } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { organizationRoutes } from './routes/organization.routes.js';
import { googleRoutes } from './routes/google.routes.js';
import { reviewRoutes } from './routes/review.routes.js';
import { draftRoutes } from './routes/draft.routes.js';
import { preferenceRoutes } from './routes/preference.routes.js';
import { syncRoutes } from './routes/sync.routes.js';
import { auditRoutes } from './routes/audit.routes.js';

const fastify = Fastify({
  logger: {
    level: ENV.NODE_ENV === 'development' ? 'info' : 'warn'
  }
});

async function main() {
  // Plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  await fastify.register(jwt, {
    secret: ENV.JWT_SECRET
  });

  await fastify.register(sensible);

  // Allow empty JSON bodies on POST/PATCH
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const str = typeof body === 'string' ? body : (body ? body.toString('utf8') : '');
      const json = str.trim().length > 0 ? JSON.parse(str) : {};
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  // Health checks per Section 10 of PRD
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  fastify.get('/ready', async () => ({ status: 'ready', mode: ENV.GOOGLE_PROVIDER_MODE, aiProvider: ENV.AI_PROVIDER }));

  // API v1 Routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(organizationRoutes, { prefix: '/api/v1/organizations' });
  await fastify.register(googleRoutes, { prefix: '/api/v1/google' });
  await fastify.register(reviewRoutes, { prefix: '/api/v1/reviews' });
  await fastify.register(draftRoutes, { prefix: '/api/v1/reply-drafts' });
  await fastify.register(preferenceRoutes, { prefix: '/api/v1/preferences' });
  await fastify.register(syncRoutes, { prefix: '/api/v1/sync' });
  await fastify.register(auditRoutes, { prefix: '/api/v1/audit-logs' });

  // Error handler
  fastify.setErrorHandler((error: any, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
      statusCode
    });
  });

  try {
    await fastify.listen({ port: ENV.PORT, host: ENV.HOST });
    console.log(`🚀 ReplySpark Fastify REST API running on http://localhost:${ENV.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
