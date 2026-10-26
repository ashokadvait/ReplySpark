'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle,
  Sparkles,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    reviewText?: string | null;
    reviewerDisplayName: string;
    reviewerPhotoUrl?: string | null;
    reviewCreatedAt: string;
    workflowStatus: string;
    ownerReplyText?: string | null;
    ownerReplyCommittedAt?: string | null;
    location: {
      id: string;
      displayName: string;
    };
    latestDraft?: {
      id: string;
      generatedText: string;
      finalText?: string | null;
      qualityStatus: string;
      qualityNotes?: string | null;
      suggestedEscalation: boolean;
      modelProvider: string;
      modelName: string;
      createdAt: string;
    } | null;
  };
  onApprove: (draftId: string, replyText: string) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
  onReject: (draftId: string) => Promise<void>;
  onOpenFeedback: (draftId: string, currentText: string) => void;
  onGenerateInitial: (reviewId: string) => Promise<void>;
}

export function ReviewCard({
  review,
  onApprove,
  onRegenerate,
  onReject,
  onOpenFeedback,
  onGenerateInitial
}: ReviewCardProps) {
  const [editText, setEditText] = useState(
    review.latestDraft?.finalText || review.latestDraft?.generatedText || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setEditText(review.latestDraft?.finalText || review.latestDraft?.generatedText || '');
  }, [review.latestDraft]);

  const handleApprove = async () => {
    if (!review.latestDraft) return;
    setIsSubmitting(true);
    try {
      await onApprove(review.latestDraft.id, editText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(review.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReject = async () => {
    if (!review.latestDraft) return;
    setIsSubmitting(true);
    try {
      await onReject(review.latestDraft.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 ${
              s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Published to Google
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3 h-3" /> Awaiting Approval
          </span>
        );
      case 'DRAFT_PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Draft Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/30">
            Rejected
          </span>
        );
      case 'PUBLISH_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Publication Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getQualityBadge = (qualityStatus?: string) => {
    if (qualityStatus === 'PASSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" /> Policy Checked
        </span>
      );
    }
    if (qualityStatus === 'FLAGGED_WARNING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" /> Complaint Handling
        </span>
      );
    }
    if (qualityStatus === 'ESCALATED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" /> Escalation Recommended
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all shadow-lg text-left">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg">
            {review.location.displayName}
          </span>
          <span className="text-xs text-slate-500">
            {new Date(review.reviewCreatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        <div>{getStatusBadge(review.workflowStatus)}</div>
      </div>

      {/* 2-Column Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Customer Review */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 overflow-hidden">
                {review.reviewerPhotoUrl ? (
                  <img
                    src={review.reviewerPhotoUrl}
                    alt={review.reviewerDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  review.reviewerDisplayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {review.reviewerDisplayName}
                </div>
                {renderStars(review.rating)}
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/50">
              {review.reviewText ? (
                `"${review.reviewText}"`
              ) : (
                <span className="text-slate-500 italic">No text comment provided by reviewer (star rating only).</span>
              )}
            </div>
          </div>

          {/* Published owner reply display */}
          {review.ownerReplyText && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 mb-1">
                <span>Published Google Reply</span>
                {review.ownerReplyCommittedAt && (
                  <span className="text-slate-500 font-normal">
                    {new Date(review.ownerReplyCommittedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{review.ownerReplyText}</p>
            </div>
          )}
        </div>

        {/* Right Column: AI Proposed Reply & Actions */}
        <div className="space-y-3 flex flex-col justify-between">
          {review.latestDraft ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Draft Proposal
                    </span>
                    {getQualityBadge(review.latestDraft.qualityStatus)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {review.latestDraft.modelName}
                  </span>
                </div>

                {/* Quality Notes / Rationale banner */}
                {review.latestDraft.qualityNotes && (
                  <div className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                    <span className="truncate">{review.latestDraft.qualityNotes}</span>
                  </div>
                )}

                {/* Editable Reply Box */}
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  disabled={review.workflowStatus === 'PUBLISHED'}
                  rows={4}
                  className="w-full bg-[#0b0f19] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="Review proposed AI reply, refine if desired..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenFeedback(review.latestDraft!.id, editText)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Teach AI / Feedback
                </button>

                <div className="flex items-center gap-2">
                  {review.workflowStatus !== 'PUBLISHED' && (
                    <>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={isSubmitting}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition cursor-pointer"
                        title="Reject Draft"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={isRegenerating || isSubmitting}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                        title="Regenerate Draft"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-indigo-400' : ''}`} />
                        <span className="hidden sm:inline">Regenerate</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={isSubmitting || !editText.trim()}
                        className="px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Publishing...' : 'Approve & Publish'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[140px] rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-center">
              <Sparkles className="w-6 h-6 text-indigo-400 mb-2" />
              <p className="text-xs text-slate-400 mb-3">No reply draft created yet for this review.</p>
              <button
                onClick={() => onGenerateInitial(review.id)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate AI Draft
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
