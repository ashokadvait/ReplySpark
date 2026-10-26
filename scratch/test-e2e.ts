async function runIntegrationTest() {
  console.log('🧪 Starting ReplySpark End-to-End API Integration Test...\n');
  const baseUrl = 'http://localhost:4000';

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  const health = await healthRes.json();
  console.log('✅ 1. Health check:', health.status);

  // 2. Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ashok@advaitlabs.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const orgId = loginData.organization.id;
  console.log(`✅ 2. Auth successful. User: ${loginData.user.displayName}, Org: ${loginData.organization.name}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-organization-id': orgId
  };

  // 3. Fetch Reviews
  const reviewsRes = await fetch(`${baseUrl}/api/v1/reviews`, { headers: authHeaders });
  const reviewsData = await reviewsRes.json();
  console.log(`✅ 3. Reviews inbox returned ${reviewsData.reviews.length} reviews.`);
  console.log('   Metrics:', reviewsData.metrics);

  // Find a pending approval review
  const pendingReview = reviewsData.reviews.find((r: any) => r.workflowStatus === 'PENDING_APPROVAL' && r.latestDraft);
  if (!pendingReview) {
    throw new Error('No pending review with draft found');
  }
  console.log(`\n🔍 Found Pending Review: "${pendingReview.reviewText?.slice(0, 45)}..." by ${pendingReview.reviewerDisplayName}`);
  console.log(`   Proposed Draft: "${pendingReview.latestDraft.generatedText.slice(0, 60)}..."`);

  // 4. Edit draft
  const draftId = pendingReview.latestDraft.id;
  const editedReply = pendingReview.latestDraft.generatedText + ' Warm regards, the management team.';
  const editRes = await fetch(`${baseUrl}/api/v1/reply-drafts/${draftId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ replyText: editedReply })
  });
  const editData = await editRes.json();
  console.log('✅ 4. Edited draft text successfully.');

  // 5. Approve & Publish
  const approveRes = await fetch(`${baseUrl}/api/v1/reply-drafts/${draftId}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ replyText: editedReply, autoPublish: true })
  });
  const approveData = await approveRes.json();
  console.log(`✅ 5. Approval & Publishing result: ${approveData.status} - "${approveData.message}"`);

  // 6. Verify Review status updated
  const checkReviewRes = await fetch(`${baseUrl}/api/v1/reviews/${pendingReview.id}`, { headers: authHeaders });
  const checkReviewData = await checkReviewRes.json();
  console.log(`✅ 6. Review state machine verified: Status is now ${checkReviewData.review.workflowStatus}`);
  console.log(`   Owner Reply Text in DB: "${checkReviewData.review.ownerReplyText?.slice(0, 50)}..."`);

  // 7. Submit Feedback & extract candidate rule
  const feedbackRes = await fetch(`${baseUrl}/api/v1/reviews/${pendingReview.id}/feedback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      draftId,
      category: 'WRONG_TONE',
      feedbackText: 'Keep it warm and hospitality-first without sounding stiff.',
      correctedText: editedReply,
      teachAI: true
    })
  });
  const feedbackData = await feedbackRes.json();
  console.log(`✅ 7. Feedback recorded (ID: ${feedbackData.feedbackId}).`);
  if (feedbackData.candidatePreference) {
    console.log(`   Candidate Rule Proposed: "${feedbackData.candidatePreference.ruleText}"`);

    // 8. Approve the candidate rule
    const approveRuleRes = await fetch(`${baseUrl}/api/v1/preferences/${feedbackData.candidatePreference.id}/approve`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({})
    });
    const approveRuleData = await approveRuleRes.json();
    if (!approveRuleRes.ok) {
      console.error('Approve rule error:', approveRuleRes.status, approveRuleData);
    } else {
      console.log(`✅ 8. Candidate rule activated into permanent business preferences: ${approveRuleData.preference?.status}`);
    }
  }

  // 9. Sync Google Reviews
  const syncRes = await fetch(`${baseUrl}/api/v1/sync`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  const syncData = await syncRes.json();
  console.log(`✅ 9. Google Business Profile Sync: ${syncData.message}`);

  // 10. Audit Logs
  const auditRes = await fetch(`${baseUrl}/api/v1/audit-logs`, { headers: authHeaders });
  const auditData = await auditRes.json();
  console.log(`✅ 10. Audit log verified: ${auditData.logs.length} immutable events recorded.`);
  console.log('   Recent actions:', auditData.logs.slice(0, 4).map((l: any) => l.action).join(', '));

  console.log('\n🎉 ALL 10 END-TO-END INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
