'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, CheckCircle2, Globe, Clock, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { ApiClient } from '../lib/api';

export function LocationsView() {
  const [locations, setLocations] = useState<any[]>([]);
  const [discoverable, setDiscoverable] = useState<any[]>([]);
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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
  }, []);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const data = await ApiClient.getDiscoverableLocations();
      setDiscoverable(data.locations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnectLocation = async (loc: any) => {
    if (!googleStatus?.connection?.id) return;
    setIsConnecting(true);
    try {
      await ApiClient.connectLocations(googleStatus.connection.id, [
        {
          googleAccountResourceName: 'accounts/acc-spark-group-001',
          googleLocationResourceName: loc.locationName,
          displayName: loc.title,
          timezone: 'America/Chicago'
        }
      ]);
      await loadData();
      await handleDiscover();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-xs text-slate-400">Loading locations...</div>;
  }

  return (
    <div className="space-y-8 text-left max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" /> Google Business Profile Locations
          </h2>
          <p className="text-xs text-slate-400">
            Manage authorized Google Business Profile locations and synchronization settings.
          </p>
        </div>

        <button
          onClick={handleDiscover}
          disabled={isDiscovering}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Discover Locations from Google</span>
        </button>
      </div>

      {/* Connected Locations Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Connected Locations ({locations.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="p-4 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-slate-700 transition shadow-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">{loc.displayName}</h4>
                  <p className="text-xs text-slate-400">{loc.address || 'Address registered on Google'}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Last synced: {loc.lastSyncAt ? new Date(loc.lastSyncAt).toLocaleTimeString() : 'Never'}
                </span>
                <span>{loc.reviewsCount} reviews</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered / Available to Connect */}
      {discoverable.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Available Locations on Google Account
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoverable.map((loc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{loc.title}</h4>
                  <p className="text-[11px] text-slate-400">{loc.address}</p>
                </div>
                {loc.isAlreadyConnected ? (
                  <span className="text-[11px] text-slate-500 font-medium">Connected</span>
                ) : (
                  <button
                    onClick={() => handleConnectLocation(loc)}
                    disabled={isConnecting}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                  >
                    + Connect
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
