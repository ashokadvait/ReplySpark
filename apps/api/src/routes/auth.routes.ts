import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '@replyspark/db';
import { loginSchema, registerSchema } from '@replyspark/shared';
import { authenticate } from '../middleware/auth.js';
import { ENV } from '../config/env.js';

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

  // Generate Google OAuth URL for direct Login with Google / Gmail
  fastify.get('/google/url', async (request, reply) => {
    if (!ENV.GOOGLE_CLIENT_ID) {
      return reply.code(400).send({
        error: 'Misconfigured',
        message: 'GOOGLE_CLIENT_ID is not configured in .env. Please configure your Google Cloud OAuth Client ID.'
      });
    }

    const statePayload = {
      action: 'login',
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/business.manage'
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

  // Google OAuth Callback (exchanges code for refresh token, creates/logs in user, and connects Google Business Profile)
  fastify.get('/google/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${ENV.WEB_URL}?google_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${ENV.WEB_URL}?google_error=missing_code_or_state`);
    }

    let stateData: { action?: string; organizationId?: string; userId?: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      return reply.redirect(`${ENV.WEB_URL}?google_error=invalid_state`);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: ENV.GOOGLE_CLIENT_ID,
          client_secret: ENV.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: ENV.GOOGLE_REDIRECT_URI
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return reply.redirect(`${ENV.WEB_URL}?google_error=${encodeURIComponent('Token exchange failed: ' + errText)}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Fetch user profile info
      let profile: { sub?: string; email?: string; name?: string; picture?: string } = {};
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (profileRes.ok) {
          profile = await profileRes.json();
        }
      } catch (err) {
        // Fallback if userinfo fails
      }

      if (!profile.email) {
        return reply.redirect(`${ENV.WEB_URL}?google_error=${encodeURIComponent('Failed to retrieve email from Google profile')}`);
      }

      // Check if this is a Login flow (or no prior organizationId)
      if (stateData.action === 'login' || !stateData.organizationId) {
        let user = await prisma.user.findUnique({
          where: { email: profile.email },
          include: {
            memberships: {
              where: { status: 'ACTIVE' },
              include: { organization: true }
            }
          }
        });

        let userId: string;
        let orgId: string;

        if (!user) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(Math.random().toString(36), salt);
          const displayName = profile.name || profile.email.split('@')[0];
          const orgName = profile.name ? `${profile.name}'s Organization` : 'My Organization';

          const created = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                email: profile.email!,
                displayName,
                passwordHash
              }
            });

            const newOrg = await tx.organization.create({
              data: {
                name: orgName
              }
            });

            await tx.organizationMember.create({
              data: {
                organizationId: newOrg.id,
                userId: newUser.id,
                role: 'OWNER',
                status: 'ACTIVE'
              }
            });

            await tx.aiPreference.createMany({
              data: [
                {
                  organizationId: newOrg.id,
                  ruleText: 'Maintain a warm, genuine, and hospitality-first tone.',
                  ruleCategory: 'TONE_STYLE',
                  status: 'ACTIVE',
                  createdBy: newUser.id,
                  approvedBy: newUser.id
                },
                {
                  organizationId: newOrg.id,
                  ruleText: 'Never promise refunds or monetary compensation publicly.',
                  ruleCategory: 'POLICY_SAFETY',
                  status: 'ACTIVE',
                  createdBy: newUser.id,
                  approvedBy: newUser.id
                }
              ]
            });

            return { user: newUser, org: newOrg };
          });

          userId = created.user.id;
          orgId = created.org.id;
        } else {
          userId = user.id;
          if (user.memberships.length > 0) {
            orgId = user.memberships[0].organizationId;
          } else {
            const newOrg = await prisma.organization.create({
              data: {
                name: user.displayName ? `${user.displayName}'s Organization` : 'My Organization'
              }
            });
            await prisma.organizationMember.create({
              data: {
                organizationId: newOrg.id,
                userId: user.id,
                role: 'OWNER',
                status: 'ACTIVE'
              }
            });
            orgId = newOrg.id;
          }
        }

        // Upsert Google Connection for this organization
        if (orgId) {
          const existingConn = await prisma.googleConnection.findFirst({
            where: { organizationId: orgId }
          });

          if (existingConn) {
            await prisma.googleConnection.update({
              where: { id: existingConn.id },
              data: {
                googleSubjectId: profile.sub || existingConn.googleSubjectId || `google-sub-${Date.now()}`,
                accountEmail: profile.email,
                accountName: profile.name || profile.email,
                encryptedRefreshToken: refreshToken || existingConn.encryptedRefreshToken,
                grantedScopes: ['https://www.googleapis.com/auth/business.manage'],
                connectionStatus: 'CONNECTED',
                tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null
              }
            });
          } else {
            await prisma.googleConnection.create({
              data: {
                organizationId: orgId,
                googleSubjectId: profile.sub || `google-sub-${Date.now()}`,
                accountEmail: profile.email,
                accountName: profile.name || profile.email,
                encryptedRefreshToken: refreshToken || '',
                grantedScopes: ['https://www.googleapis.com/auth/business.manage'],
                connectionStatus: 'CONNECTED',
                tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null
              }
            });
          }

          await prisma.auditLog.create({
            data: {
              organizationId: orgId,
              actorUserId: userId,
              action: 'GOOGLE_CONNECTED',
              resourceType: 'GOOGLE_CONNECTION',
              metadataJson: { accountEmail: profile.email, loginFlow: true }
            }
          });
        }

        const token = fastify.jwt.sign({ userId }, { expiresIn: '7d' });
        return reply.redirect(`${ENV.WEB_URL}?token=${encodeURIComponent(token)}&connected=google`);
      }

      // Existing linking flow (when already logged in from within dashboard)
      const existing = await prisma.googleConnection.findFirst({
        where: { organizationId: stateData.organizationId }
      });

      if (existing) {
        await prisma.googleConnection.update({
          where: { id: existing.id },
          data: {
            googleSubjectId: profile.sub || existing.googleSubjectId || `google-sub-${Date.now()}`,
            accountEmail: profile.email || existing.accountEmail,
            accountName: profile.name || profile.email || existing.accountName,
            encryptedRefreshToken: refreshToken || existing.encryptedRefreshToken,
            grantedScopes: ['https://www.googleapis.com/auth/business.manage'],
            connectionStatus: 'CONNECTED',
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null
          }
        });
      } else {
        await prisma.googleConnection.create({
          data: {
            organizationId: stateData.organizationId!,
            googleSubjectId: profile.sub || `google-sub-${Date.now()}`,
            accountEmail: profile.email,
            accountName: profile.name || profile.email || 'Google Business Account',
            encryptedRefreshToken: refreshToken || '',
            grantedScopes: ['https://www.googleapis.com/auth/business.manage'],
            connectionStatus: 'CONNECTED',
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null
          }
        });
      }

      // Record audit log
      await prisma.auditLog.create({
        data: {
          organizationId: stateData.organizationId!,
          actorUserId: stateData.userId,
          action: 'GOOGLE_CONNECTED',
          resourceType: 'GOOGLE_CONNECTION',
          metadataJson: { accountEmail: profile.email }
        }
      });

      return reply.redirect(`${ENV.WEB_URL}?connected=google`);
    } catch (err: any) {
      return reply.redirect(`${ENV.WEB_URL}?google_error=${encodeURIComponent(err.message || 'connection_failed')}`);
    }
  });
}
