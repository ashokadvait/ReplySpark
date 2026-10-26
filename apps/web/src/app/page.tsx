'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ReviewCard } from '@/components/ReviewCard';
import { FeedbackModal } from '@/components/FeedbackModal';
import { PreferencesView } from '@/components/PreferencesView';
import { LocationsView } from '@/components/LocationsView';
import { AuditView } from '@/components/AuditView';
import { ApiClient } from '@/lib/api';
import { Search, Filter, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState('inbox');
  const [reviews, setReviews] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [userName, setUserName] = useState('Ashok Advait');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    draftId: string;
    originalText: string;
    editedText?: string;
  }>({
    isOpen: false,
    draftId: '',
    originalText: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Ensure user is authenticated (auto-login demo user if no token)
  const initAuth = async () => {
    try {
      if (!localStorage.getItem('replyspark_token')) {
        await ApiClient.login('ashok@advaitlabs.com', 'password123');
      }
      const me = await ApiClient.getMe();
      if (me.user?.displayName) {
        setUserName(me.user.displayName);
      }
    } catch (e) {
      // Re-login on token expiration
      try {
        await ApiClient.login('ashok@advaitlabs.com', 'password123');
      } catch (err) {
        console.error('Auth initialization error', err);
      }
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [reviewRes, locRes, statusRes] = await Promise.all([
        ApiClient.getReviews({
          status: statusFilter,
          locationId: selectedLocationId,
          rating: ratingFilter,
          search: searchQuery
        }),
        ApiClient.getLocations(),
        ApiClient.getGoogleStatus()
      ]);

      setReviews(reviewRes.reviews || []);
      setMetrics(reviewRes.metrics || {});
      setLocations(locRes.locations || []);
      setGoogleStatus(statusRes);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedLocationId, ratingFilter, searchQuery]);

  useEffect(() => {
    initAuth().then(() => {
      loadData();
    });
  }, [loadData]);

  // Sync Google Reviews
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await ApiClient.syncReviews(selectedLocationId !== 'ALL' ? selectedLocationId : undefined);
      showToast(res.message || 'Synced reviews successfully!');
      await loadData();
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Approve Draft
  const handleApprove = async (draftId: string, replyText: string) => {
    try {
      const res = await ApiClient.approveDraft(draftId, replyText);
      showToast(res.message || 'Approved and published to Google!');
      await loadData();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    }
  };

  // Regenerate Draft
  const handleRegenerate = async (reviewId: string) => {
    try {
      await ApiClient.regenerateDraft(reviewId);
      showToast('Generated fresh reply proposal!');
      await loadData();
    } catch (err: any) {
      showToast(`Regeneration failed: ${err.message}`);
    }
  };

  // Reject Draft
  const handleReject = async (draftId: string) => {
    try {
      await ApiClient.rejectDraft(draftId);
      showToast('Draft rejected.');
      await loadData();
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`);
    }
  };

  // Generate Initial Draft
  const handleGenerateInitial = async (reviewId: string) => {
    try {
      await ApiClient.generateDraft(reviewId);
      showToast('AI reply draft generated!');
      await loadData();
    } catch (err: any) {
      showToast(`Draft generation failed: ${err.message}`);
    }
  };

  // Submit Feedback & Teach AI
  const handleSubmitFeedback = async (data: {
    category: string;
    feedbackText: string;
    teachAI: boolean;
  }) => {
    try {
      const res = await ApiClient.submitFeedback({
        draftId: feedbackModal.draftId,
        category: data.category,
        feedbackText: data.feedbackText,
        teachAI: data.teachAI
      });
      if (res.candidatePreference) {
        showToast('Feedback recorded & candidate rule proposed for your confirmation!');
      } else {
        showToast('Feedback saved successfully!');
      }
      await loadData();
    } catch (err: any) {
      showToast(`Failed to save feedback: ${err.message}`);
    }
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Reviews', count: metrics.ALL || 0 },
    { id: 'PENDING_APPROVAL', label: 'Awaiting Approval', count: metrics.PENDING_APPROVAL || 0, highlight: true },
    { id: 'DRAFT_PENDING', label: 'Draft Pending', count: metrics.DRAFT_PENDING || 0 },
    { id: 'PUBLISHED', label: 'Published', count: metrics.PUBLISHED || 0 },
    { id: 'REJECTED', label: 'Rejected', count: metrics.REJECTED || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white shadow-2xl animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        locations={locations}
        selectedLocationId={selectedLocationId}
        onSelectLocation={setSelectedLocationId}
        onSync={handleSync}
        isSyncing={isSyncing}
        googleStatus={googleStatus}
        userName={userName}
      />

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          pendingCount={metrics.PENDING_APPROVAL || 0}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'inbox' && (
            <div className="space-y-6 max-w-6xl text-left">
              {/* Inbox Controls Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Review Inbox
                  </h1>
                  <p className="text-xs text-slate-400">
                    Review proposed AI drafts, edit nuances, and publish authorized replies directly to Google Business Profile.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reviews or reviewer..."
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800/80">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        statusFilter === tab.id
                          ? 'bg-white/20 text-white'
                          : tab.highlight && tab.count > 0
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}

                {/* Star Rating Filter dropdown */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Rating:</span>
                  <select
                    value={ratingFilter ?? ''}
                    onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : undefined)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars only</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star (Complaints)</option>
                  </select>
                </div>
              </div>

              {/* Reviews List */}
              {isLoading ? (
                <div className="py-20 text-center text-xs text-slate-400">Loading inbox reviews...</div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <ReviewCard
                      key={rev.id}
                      review={rev}
                      onApprove={handleApprove}
                      onRegenerate={handleRegenerate}
                      onReject={handleReject}
                      onGenerateInitial={handleGenerateInitial}
                      onOpenFeedback={(draftId, currentText) =>
                        setFeedbackModal({
                          isOpen: true,
                          draftId,
                          originalText: currentText
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-8">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300 mb-1">No reviews found</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    No customer reviews match your active filter criteria.
                  </p>
                  <button
                    onClick={handleSync}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                  >
                    Sync Latest Reviews from Google
                  </button>
                </div>
              )}
            </div>
          )}

          {currentTab === 'preferences' && <PreferencesView />}
          {currentTab === 'locations' && <LocationsView />}
          {currentTab === 'audit' && <AuditView />}
        </main>
      </div>

      {/* Feedback & AI Learning Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        draftId={feedbackModal.draftId}
        originalText={feedbackModal.originalText}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  );
}
