'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Check, Trash2, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { ApiClient } from '../lib/api';

export function PreferencesView() {
  const [preferences, setPreferences] = useState<{
    activeRules: any[];
    candidateRules: any[];
    disabledRules: any[];
  }>({
    activeRules: [],
    candidateRules: [],
    disabledRules: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('TONE_STYLE');
  const [isAdding, setIsAdding] = useState(false);

  const fetchPreferences = async () => {
    try {
      const data = await ApiClient.getPreferences();
      setPreferences(data);
    } catch (err) {
      console.error('Failed to load preferences', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleApproveCandidate = async (id: string) => {
    await ApiClient.approvePreference(id);
    await fetchPreferences();
  };

  const handleDisableRule = async (id: string) => {
    await ApiClient.disablePreference(id);
    await fetchPreferences();
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;
    await ApiClient.createPreference(newRuleText, newRuleCategory);
    setNewRuleText('');
    setIsAdding(false);
    await fetchPreferences();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'POLICY_SAFETY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Safety & Policy</span>;
      case 'CONCISENESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Conciseness</span>;
      case 'ESCALATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Escalation</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Tone & Style</span>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-xs text-slate-400">Loading AI preferences...</div>;
  }

  return (
    <div className="space-y-8 text-left max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" /> AI Learned Rules & Preferences
          </h2>
          <p className="text-xs text-slate-400">
            Rules calibrated through user edits, approvals, and explicit guidelines. Injected directly into generation context.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {/* Add New Rule Form */}
      {isAdding && (
        <form onSubmit={handleCreateRule} className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
          <h4 className="text-xs font-semibold text-slate-200">Create New Business Rule</h4>
          <textarea
            value={newRuleText}
            onChange={(e) => setNewRuleText(e.target.value)}
            placeholder="e.g. 'Never apologize for strict reservation cancellation policies' or 'Always invite guests to try our weekend brunch'"
            className="w-full h-16 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex items-center justify-between">
            <select
              value={newRuleCategory}
              onChange={(e) => setNewRuleCategory(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-700"
            >
              <option value="TONE_STYLE">Tone & Style</option>
              <option value="POLICY_SAFETY">Safety & Policy</option>
              <option value="CONCISENESS">Conciseness</option>
              <option value="ESCALATION">Escalation</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
              >
                Save Rule
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Candidate Rules Awaiting Confirmation */}
      {preferences.candidateRules.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4" /> Candidate Rules Awaiting Your Confirmation ({preferences.candidateRules.length})
          </div>
          <div className="space-y-2">
            {preferences.candidateRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(rule.ruleCategory)}
                    <span className="text-[10px] text-amber-400 font-medium">Extracted from user feedback</span>
                  </div>
                  <p className="text-xs text-slate-200">{rule.ruleText}</p>
                </div>
                <button
                  onClick={() => handleApproveCandidate(rule.id)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Activate Rule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Rules */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Active Learned Rules ({preferences.activeRules.length})
        </h3>
        <div className="space-y-2">
          {preferences.activeRules.map((rule) => (
            <div
              key={rule.id}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(rule.ruleCategory)}
                  {rule.businessLocation && (
                    <span className="text-[10px] text-slate-400">
                      Scoped to {rule.businessLocation.displayName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200">{rule.ruleText}</p>
              </div>
              <button
                onClick={() => handleDisableRule(rule.id)}
                className="text-xs text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="Disable Rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
