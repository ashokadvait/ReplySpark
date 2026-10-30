'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Plus,
  Radio
} from 'lucide-react';
import { ApiClient } from '../lib/api';

export function LocationsView() {
  const [locations, setLocations] = useState<any[]>([]);
  const [discoverable, setDiscoverable] = useState<any[]>([]);
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [locRes, statRes] = await Promise.all([
        ApiClient.getLocations(),
        ApiClient.getGoogleStatus()
      ]);
      setLocations(locRes.locations || []);
      setGoogleStatus(statRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check for query parameters from OAuth redirection
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('connected') === 'google') {
        setBannerNotice({
          type: 'success',
          message: 'Google Business Profile account connected successfully! You can now discover and sync your live locations.'
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('google_error')) {
        setBannerNotice({
          type: 'error',
          message: `Google authorization failed: ${decodeURIComponent(params.get('google_error') || '')}`
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnectGoogleOAuth = async () => {
    setIsConnectingOAuth(true);
    try {
      const res = await ApiClient.getGoogleOAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Failed to initiate Google OAuth. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured in .env'
      });
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const data = await ApiClient.getDiscoverableLocations();
      setDiscoverable(data.locations || []);
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Error discovering locations from Google. Verify your account connection.'
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnectLocation = async (loc: any) => {
    if (!googleStatus?.connection?.id) {
      setBannerNotice({
        type: 'error',
        message: 'No Google connection found. Please connect your Google account first.'
      });
      return;
    }
    setIsConnecting(true);
    try {
      await ApiClient.connectLocations(googleStatus.connection.id, [
        {
          googleAccountResourceName: loc.accountResourceName || 'accounts/acc-spark-group-001',
          googleLocationResourceName: loc.locationName,
          displayName: loc.title,
          timezone: 'UTC'
        }
      ]);
      await loadData();
      await handleDiscover();
      setBannerNotice({
        type: 'success',
        message: `Location "${loc.title}" connected successfully!`
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Failed to connect location'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Loading Google Business Profile settings...</span>
      </div>
    );
  }

  const isLive = googleStatus?.providerMode === 'live';

  return (
    <div className="space-y-8 text-left max-w-5xl">
      {/* Notifications */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-start justify-between gap-3 ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              {bannerNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              )}
              <span>{bannerNotice.message}</span>
            </div>

            {bannerNotice.message.includes('quota is 0') && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 space-y-2.5">
                <p className="font-semibold text-amber-300">
                  Google requires manual approval for Business Profile API quota:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://support.google.com/business/contact/api_default"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-sm"
                  >
                    <span>Submit Google API Access Request</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong>Instant local testing:</strong> Change <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">GOOGLE_PROVIDER_MODE=mock</code> in your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">.env</code> to test locations, real Gemini AI replies, and approval workflows right now without waiting for Google.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold self-start"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" /> Google Business Profile Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authorize Google Business Accounts, manage live storefronts, and synchronize customer reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {googleStatus?.isConnected && (
            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Discover Locations from Google</span>
            </button>
          )}

          <button
            onClick={handleConnectGoogleOAuth}
            disabled={isConnectingOAuth}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-300" />
            <span>
              {googleStatus?.isConnected
                ? 'Re-link Live Google Account'
                : 'Connect Live Google Account'}
            </span>
          </button>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-white border border-slate-700">
              G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {googleStatus?.connection?.accountName || 'Google Business Profile'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isLive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isLive ? 'Live Mode' : 'Sandbox / Mock Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {googleStatus?.connection?.accountEmail || 'No active account authorized'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Connection Status</span>
              <span
                className={`text-xs font-semibold flex items-center gap-1 justify-end ${
                  googleStatus?.isConnected ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    googleStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {googleStatus?.isConnected ? 'Authorized & Active' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Setup Hint if not in live mode */}
        {!isLive && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>
                Currently running in <strong>mock mode</strong>. Set <code>GOOGLE_PROVIDER_MODE=live</code> with your Google Cloud OAuth credentials in <code>.env</code> to connect real live business data.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Connected Locations Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Connected Locations ({locations.length})
          </h3>
        </div>

        {locations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0f172a] border border-slate-800 text-center space-y-3">
            <MapPin className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-medium text-slate-300">No Locations Connected Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click &quot;Discover Locations from Google&quot; above to inspect the locations associated with your authorized Google Business Profile.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{loc.displayName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{loc.address || 'Verified Google storefront'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Live
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Last synced: {loc.lastSyncAt ? new Date(loc.lastSyncAt).toLocaleTimeString() : 'Never'}
                  </span>
                  <span className="font-medium text-slate-300">{loc.reviewsCount || 0} reviews synced</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discovered / Available to Connect */}
      {discoverable.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Discovered Locations on Google Account
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select verified locations from your Google Business Profile to link into ReplySpark:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoverable.map((loc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{loc.title}</h4>
                  <p className="text-[11px] text-slate-400">{loc.address || 'Google Business Location'}</p>
                </div>
                {loc.isAlreadyConnected ? (
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-medium">
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnectLocation(loc)}
                    disabled={isConnecting}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
