import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '@replyspark/db';
import { loginSchema, registerSchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { email, password, displayName, organizationName } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.code(409).send({ error: 'Conflict', message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and new organization in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName
        }
      });

      const org = await tx.organization.create({
        data: {
          name: organizationName
        }
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'OWNER',
          status: 'ACTIVE'
        }
      });

      // Seed standard initial preferences
      await tx.aiPreference.createMany({
        data: [
          {
            organizationId: org.id,
            ruleText: 'Maintain a warm, genuine, and hospitality-first tone.',
            ruleCategory: 'TONE_STYLE',
            status: 'ACTIVE',
            createdBy: user.id,
            approvedBy: user.id
          },
          {
            organizationId: org.id,
            ruleText: 'Never promise refunds or monetary compensation publicly.',
            ruleCategory: 'POLICY_SAFETY',
            status: 'ACTIVE',
            createdBy: user.id,
            approvedBy: user.id
          }
        ]
      });

      return { user, org };
    });

    const token = fastify.jwt.sign({ userId: result.user.id }, { expiresIn: '7d' });

    return reply.code(201).send({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        role: 'OWNER'
      }
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Validation Error', details: parseResult.error.flatten() });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true }
        }
      }
    });

    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const token = fastify.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    const primaryMembership = user.memberships[0];

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      organization: primaryMembership ? {
        id: primaryMembership.organization.id,
        name: primaryMembership.organization.name,
        role: primaryMembership.role
      } : null,
      memberships: user.memberships.map(m => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role
      }))
    });
  });

  // Me
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const auth = request.auth!;
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        memberships: {
          include: { organization: true }
        }
      }
    });

    if (!user) {
      return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
    }

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      currentOrganizationId: auth.organizationId,
      currentRole: auth.role,
      memberships: user.memberships.map(m => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role
      }))
    });
  });
}
