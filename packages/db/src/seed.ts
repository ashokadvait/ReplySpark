import { prisma } from './index.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting ReplySpark database seeding...');

  // 1. Create or update Demo User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const user = await prisma.user.upsert({
    where: { email: 'ashok@advaitlabs.com' },
    update: {
      displayName: 'Ashok Advait',
      passwordHash
    },
    create: {
      email: 'ashok@advaitlabs.com',
      displayName: 'Ashok Advait',
      passwordHash
    }
  });

  console.log(`👤 User ready: ${user.email} (${user.id})`);

  // 2. Create Demo Organization
  let org = await prisma.organization.findFirst({
    where: { name: 'Spark Hospitality Group' }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Spark Hospitality Group'
      }
    });
  }

  // Ensure user is an OWNER member of org
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id
      }
    },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
      status: 'ACTIVE'
    }
  });

  console.log(`🏢 Organization ready: ${org.name} (${org.id})`);

  // 3. Create Mock Google Connection
  let googleConn = await prisma.googleConnection.findFirst({
    where: { organizationId: org.id }
  });

  if (!googleConn) {
    googleConn = await prisma.googleConnection.create({
      data: {
        organizationId: org.id,
        googleSubjectId: 'google-sub-mock-10928374',
        accountEmail: 'ashok.advait.biz@gmail.com',
        accountName: 'Spark Group Accounts',
        encryptedRefreshToken: 'enc_mock_refresh_token_xyz987',
        grantedScopes: [
          'https://www.googleapis.com/auth/business.manage'
        ],
        connectionStatus: 'CONNECTED'
      }
    });
  }

  console.log(`🔗 Google Connection ready: ${googleConn.accountName}`);

  // 4. Create Business Locations
  const loc1 = await prisma.businessLocation.upsert({
    where: {
      organizationId_googleLocationResourceName: {
        organizationId: org.id,
        googleLocationResourceName: 'locations/loc-downtown-bistro-01'
      }
    },
    update: {
      displayName: 'Spark Downtown Bistro',
      address: '400 Congress Ave, Austin, TX 78701',
      connectionStatus: 'CONNECTED'
    },
    create: {
      organizationId: org.id,
      googleConnectionId: googleConn.id,
      googleAccountResourceName: 'accounts/acc-spark-group-001',
      googleLocationResourceName: 'locations/loc-downtown-bistro-01',
      displayName: 'Spark Downtown Bistro',
      address: '400 Congress Ave, Austin, TX 78701',
      timezone: 'America/Chicago',
      connectionStatus: 'CONNECTED',
      lastSyncAt: new Date()
    }
  });

  const loc2 = await prisma.businessLocation.upsert({
    where: {
      organizationId_googleLocationResourceName: {
        organizationId: org.id,
        googleLocationResourceName: 'locations/loc-waterfront-grill-02'
      }
    },
    update: {
      displayName: 'Spark Waterfront Grill',
      address: '1000 Lady Bird Lake Way, Austin, TX 78704',
      connectionStatus: 'CONNECTED'
    },
    create: {
      organizationId: org.id,
      googleConnectionId: googleConn.id,
      googleAccountResourceName: 'accounts/acc-spark-group-001',
      googleLocationResourceName: 'locations/loc-waterfront-grill-02',
      displayName: 'Spark Waterfront Grill',
      address: '1000 Lady Bird Lake Way, Austin, TX 78704',
      timezone: 'America/Chicago',
      connectionStatus: 'CONNECTED',
      lastSyncAt: new Date()
    }
  });

  console.log(`📍 Locations ready: ${loc1.displayName}, ${loc2.displayName}`);

  // 5. Create AI Preferences (Active organization rules)
  await prisma.aiPreference.deleteMany({
    where: { organizationId: org.id }
  });

  await prisma.aiPreference.createMany({
    data: [
      {
        organizationId: org.id,
        ruleText: 'Maintain a warm, genuine, and hospitality-first tone without sounding robotic.',
        ruleCategory: 'TONE_STYLE',
        status: 'ACTIVE',
        createdBy: user.id,
        approvedBy: user.id
      },
      {
        organizationId: org.id,
        ruleText: 'Never promise monetary compensation, refunds, or free meals in public review replies.',
        ruleCategory: 'POLICY_SAFETY',
        status: 'ACTIVE',
        createdBy: user.id,
        approvedBy: user.id
      },
      {
        organizationId: org.id,
        ruleText: 'For complaints, acknowledge the customer’s frustration sincerely and invite them to email manager@sparkbistro.com.',
        ruleCategory: 'ESCALATION',
        status: 'ACTIVE',
        createdBy: user.id,
        approvedBy: user.id
      },
      {
        organizationId: org.id,
        ruleText: 'Keep standard replies between 2 to 3 concise, impactful sentences.',
        ruleCategory: 'CONCISENESS',
        status: 'ACTIVE',
        createdBy: user.id,
        approvedBy: user.id
      }
    ]
  });

  console.log(`⚙️ AI Preferences configured.`);

  // 6. Clean existing demo reviews for fresh state
  await prisma.review.deleteMany({
    where: { organizationId: org.id }
  });

  // Review 1: 5-Star Rave (Awaiting Approval)
  const rev1 = await prisma.review.create({
    data: {
      organizationId: org.id,
      businessLocationId: loc1.id,
      googleReviewResourceName: 'reviews/rev-mock-5star-001',
      rating: 5,
      reviewText: 'Celebrated our anniversary here last night. The truffle risotto and the signature cocktails were out of this world! Server Marcus took such great care of us. Will definitely be returning!',
      reviewerDisplayName: 'Sarah Jenkins',
      reviewerPhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop',
      reviewCreatedAt: new Date(Date.now() - 3600 * 1000 * 4), // 4 hours ago
      workflowStatus: 'PENDING_APPROVAL',
      replyDrafts: {
        create: {
          organizationId: org.id,
          generatedText: 'Happy anniversary, Sarah! We are thrilled to hear that you and your partner had such a memorable evening with us. We will make sure Marcus hears your kind words about the truffle risotto and cocktails. We look forward to welcoming you back for many more celebrations!',
          modelProvider: 'google-gemini',
          modelName: 'gemini-1.5-flash',
          promptVersion: 'v1.0',
          qualityStatus: 'PASSED',
          qualityNotes: 'Warm tone matches anniversary celebration context. High confidence.'
        }
      }
    }
  });

  // Review 2: 1-Star Complaint (Awaiting Approval, Flagged Context)
  const rev2 = await prisma.review.create({
    data: {
      organizationId: org.id,
      businessLocationId: loc1.id,
      googleReviewResourceName: 'reviews/rev-mock-1star-002',
      rating: 1,
      reviewText: 'Waited over 50 minutes for our main courses on a Wednesday evening. When the food finally arrived, the steak was lukewarm and the soup was completely cold. We spoke to the host but they seemed indifferent.',
      reviewerDisplayName: 'David Miller',
      reviewerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop',
      reviewCreatedAt: new Date(Date.now() - 3600 * 1000 * 18), // 18 hours ago
      workflowStatus: 'PENDING_APPROVAL',
      replyDrafts: {
        create: {
          organizationId: org.id,
          generatedText: 'Hello David, thank you for bringing this to our attention. A 50-minute wait and lukewarm food is certainly not the standard of service we strive for at Spark Downtown Bistro. Please reach out to our team at manager@sparkbistro.com so we can investigate what happened and make this right.',
          modelProvider: 'google-gemini',
          modelName: 'gemini-1.5-flash',
          promptVersion: 'v1.0',
          qualityStatus: 'FLAGGED_WARNING',
          qualityNotes: 'Complaint regarding food temperature and wait times. Complied with no-refund-promise rule.'
        }
      }
    }
  });

  // Review 3: 4-Star Constructive (Awaiting Approval)
  const rev3 = await prisma.review.create({
    data: {
      organizationId: org.id,
      businessLocationId: loc2.id,
      googleReviewResourceName: 'reviews/rev-mock-4star-003',
      rating: 4,
      reviewText: 'Spectacular sunset views over Lady Bird Lake! The appetizers were fresh and delicious. Only giving 4 stars because the live music was a bit too loud for conversation, but overall a great spot.',
      reviewerDisplayName: 'Elena Rostova',
      reviewerPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
      reviewCreatedAt: new Date(Date.now() - 3600 * 1000 * 30), // 30 hours ago
      workflowStatus: 'PENDING_APPROVAL',
      replyDrafts: {
        create: {
          organizationId: org.id,
          generatedText: 'Thank you for your review, Elena! We are delighted that you enjoyed the lakeside sunset and our fresh appetizers. We appreciate your helpful feedback regarding the volume of the live music and will adjust it so our guests can converse comfortably. See you again soon!',
          modelProvider: 'google-gemini',
          modelName: 'gemini-1.5-flash',
          promptVersion: 'v1.0',
          qualityStatus: 'PASSED'
        }
      }
    }
  });

  // Review 4: 5-Star Already Published
  const rev4 = await prisma.review.create({
    data: {
      organizationId: org.id,
      businessLocationId: loc2.id,
      googleReviewResourceName: 'reviews/rev-mock-5star-004',
      rating: 5,
      reviewText: 'Best brunch patio in Austin hands down. The eggs benedict and mimosas are unmatched!',
      reviewerDisplayName: 'Alex Wong',
      reviewerPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop',
      reviewCreatedAt: new Date(Date.now() - 3600 * 1000 * 72),
      workflowStatus: 'PUBLISHED',
      ownerReplyText: 'Thanks so much for the 5-star love, Alex! Our weekend brunch team works hard to make every plate shine. Looking forward to your next visit!',
      ownerReplyCommittedAt: new Date(Date.now() - 3600 * 1000 * 70)
    }
  });

  // Review 5: 3-Star Without Review Text (Draft Pending)
  const rev5 = await prisma.review.create({
    data: {
      organizationId: org.id,
      businessLocationId: loc1.id,
      googleReviewResourceName: 'reviews/rev-mock-3star-005',
      rating: 3,
      reviewText: null,
      reviewerDisplayName: 'Anonymous Diner',
      reviewCreatedAt: new Date(Date.now() - 3600 * 1000 * 2),
      workflowStatus: 'DRAFT_PENDING'
    }
  });

  console.log(`⭐ Seeded ${5} reviews across 2 locations.`);
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
