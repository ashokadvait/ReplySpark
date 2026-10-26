import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma, UserRole } from '@replyspark/db';

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = request.server.jwt.verify<{ userId: string }>(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'User not found or has no active organization' });
    }

    // Determine target organization from header 'x-organization-id', or default to first active membership
    const requestedOrgId = (request.headers['x-organization-id'] as string) || user.memberships[0].organizationId;
    const targetMembership = user.memberships.find(m => m.organizationId === requestedOrgId);

    if (!targetMembership) {
      return reply.code(403).send({ error: 'Forbidden', message: 'You do not have access to this organization' });
    }

    request.auth = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      organizationId: targetMembership.organizationId,
      role: targetMembership.role as UserRole
    };
  } catch (err: any) {
    return reply.code(401).send({ error: 'Unauthorized', message: err.message || 'Invalid token' });
  }
}
