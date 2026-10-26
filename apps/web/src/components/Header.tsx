'use client';

import React from 'react';
import { Sparkles, RefreshCw, MapPin, Building, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  locations: Array<{ id: string; displayName: string }>;
  selectedLocationId: string;
  onSelectLocation: (id: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  googleStatus: { isConnected: boolean; connection?: any } | null;
  userName: string;
}

export function Header({
  locations,
  selectedLocationId,
  onSelectLocation,
  onSync,
  isSyncing,
  googleStatus,
  userName
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Org */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5 font-['Outfit']">
                Reply<span className="text-emerald-400">Spark</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Google Review AI Suite</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200">Spark Hospitality Group</span>
          </div>
        </div>

        {/* Center: Location Filter */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedLocationId}
              onChange={(e) => onSelectLocation(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-4"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-slate-200">
                  {loc.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Sync & Connection Status & User Profile */}
        <div className="flex items-center gap-3">
          {/* Connection status pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-900/60 border-slate-800">
            {googleStatus?.isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-400">Google Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">Google Disconnected</span>
              </>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            title="Fetch new reviews from Google Business Profile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-300' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Reviews'}</span>
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white shadow-sm">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-slate-200">{userName}</div>
              <div className="text-[10px] text-slate-400">Owner</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
