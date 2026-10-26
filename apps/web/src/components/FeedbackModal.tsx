'use client';

import React, { useState } from 'react';
import { X, Lightbulb, CheckCircle2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
  originalText: string;
  editedText?: string;
  onSubmit: (feedbackData: {
    category: string;
    feedbackText: string;
    teachAI: boolean;
  }) => void;
}

export function FeedbackModal({
  isOpen,
  onClose,
  draftId,
  originalText,
  editedText,
  onSubmit
}: FeedbackModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('WRONG_TONE');
  const [feedbackText, setFeedbackText] = useState('');
  const [teachAI, setTeachAI] = useState(true);

  if (!isOpen) return null;

  const categories = [
    { id: 'WRONG_TONE', label: 'Wrong tone' },
    { id: 'TOO_GENERIC', label: 'Too generic' },
    { id: 'TOO_LONG', label: 'Too long' },
    { id: 'TOO_SHORT', label: 'Too short' },
    { id: 'UNSUPPORTED_PROMISE', label: 'Unsupported promise' },
    { id: 'MISSES_COMPLAINT', label: 'Misses main complaint' },
    { id: 'INCORRECT_INFO', label: 'Incorrect info' },
    { id: 'OTHER', label: 'Other reason' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      category: selectedCategory,
      feedbackText,
      teachAI
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">What should the AI improve?</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Your feedback helps calibrate brand tone, safety policies, and conciseness for future review drafts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick category chips */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-2">Select Issue Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Text input */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Specific Instruction (Optional)
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., 'Avoid using the word valuable' or 'Always acknowledge food delays sincerely'"
              className="w-full h-20 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Teach AI toggle */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <input
              type="checkbox"
              id="teachAI"
              checked={teachAI}
              onChange={(e) => setTeachAI(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="teachAI" className="text-xs text-slate-200 cursor-pointer">
              <span className="font-medium text-white">Extract candidate rule</span> to calibrate future replies across this organization
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Skip
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20"
            >
              Save Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
