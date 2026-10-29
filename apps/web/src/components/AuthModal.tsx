'use client';

import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, Building, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ApiClient } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (userData: any) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export function AuthModal({ isOpen, onSuccess, onClose, canClose = false }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await ApiClient.login(email.trim(), password);
        onSuccess(res);
      } else {
        if (!displayName.trim() || !organizationName.trim()) {
          throw new Error('Please fill in all registration fields');
        }
        const res = await ApiClient.register(
          email.trim(),
          password,
          displayName.trim(),
          organizationName.trim()
        );
        onSuccess(res);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0f172a] border border-slate-800 p-8 shadow-2xl space-y-6 text-left animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 items-center justify-center shadow-lg shadow-indigo-500/20 mb-1">
            <div className="w-full h-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white font-['Outfit'] tracking-tight">
            Reply<span className="text-emerald-400">Spark</span>
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'login'
              ? 'Sign in to access your organizations and reviews'
              : 'Create a new account and organization workspace'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organization Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Marketing Agency"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Register & Launch Workspace'}</span>
          </button>
        </form>

        {/* Quick Demo Accounts Helper */}
        {mode === 'login' && (
          <div className="pt-3 border-t border-slate-800 text-center space-y-2">
            <span className="text-[11px] text-slate-400 block">Quick testing accounts:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fillDemo('ashok@advaitlabs.com', 'password123')}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-indigo-300 transition cursor-pointer"
              >
                Owner: ashok@advaitlabs.com
              </button>
            </div>
          </div>
        )}

        {canClose && onClose && (
          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
