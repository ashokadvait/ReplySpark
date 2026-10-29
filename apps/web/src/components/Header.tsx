'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Plus,
  Check,
  X,
  LogOut
} from 'lucide-react';
import { ApiClient } from '../lib/api';

interface HeaderProps {
  locations: Array<{ id: string; displayName: string }>;
  selectedLocationId: string;
  onSelectLocation: (id: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  googleStatus: { isConnected: boolean; connection?: any } | null;
  userName: string;
  userEmail?: string;
  organizations?: Array<{ id: string; name: string; role: string; locationsCount?: number; reviewsCount?: number }>;
  currentOrganizationId?: string;
  onSelectOrganization?: (id: string) => void;
  onCreateOrganization?: (name: string) => Promise<void>;
  onSignOut?: () => void;
}

export function Header({
  locations,
  selectedLocationId,
  onSelectLocation,
  onSync,
  isSyncing,
  googleStatus,
  userName,
  userEmail = '',
  organizations = [],
  currentOrganizationId = '',
  onSelectOrganization,
  onCreateOrganization,
  onSignOut
}: HeaderProps) {
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentOrg = organizations.find((o) => o.id === currentOrganizationId) || organizations[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !onCreateOrganization) return;
    setIsCreatingOrg(true);
    try {
      await onCreateOrganization(newOrgName.trim());
      setNewOrgName('');
      setIsCreateModalOpen(false);
      setIsOrgDropdownOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create organization');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Brand & Org Switcher */}
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

            {/* Interactive Organization Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition cursor-pointer shadow-sm"
                title="Switch or create organization"
              >
                <Building className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="font-semibold text-white max-w-[140px] truncate">
                  {currentOrg ? currentOrg.name : 'Select Organization'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isOrgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl z-50 p-1.5 text-left animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                    Switch Organization
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                    {organizations.map((org) => {
                      const isSelected = org.id === (currentOrg?.id || currentOrganizationId);
                      return (
                        <button
                          key={org.id}
                          onClick={() => {
                            if (onSelectOrganization) onSelectOrganization(org.id);
                            setIsOrgDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="font-medium truncate">{org.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {org.role}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setIsOrgDropdownOpen(false);
                        setIsCreateModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Organization</span>
                    </button>
                  </div>
                </div>
              )}
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
                <button
                  onClick={async () => {
                    try {
                      const res = await ApiClient.getGoogleOAuthUrl();
                      if (res.url) window.location.href = res.url;
                    } catch (e: any) {
                      alert(e.message || 'Configure GOOGLE_CLIENT_ID in .env first');
                    }
                  }}
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                  title="Click to connect live Google Business account"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 underline underline-offset-2">Connect Google</span>
                </button>
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

            {/* User Avatar & Menu */}
            <div className="relative pl-2 border-l border-slate-800" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 hover:opacity-85 transition cursor-pointer text-left"
                title="Account options"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white shadow-sm flex-shrink-0">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-slate-200">{userName}</div>
                  <div className="text-[10px] text-slate-400">{currentOrg?.role || 'Owner'}</div>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl z-50 p-2 text-left animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Logged in as</span>
                    <span className="text-xs font-semibold text-white truncate block">{userEmail || userName}</span>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {currentOrg?.role || 'Owner'}
                    </span>
                  </div>

                  <div className="pt-1.5">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onSignOut) onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out / Switch User</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal: Create New Organization */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Create New Organization</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Organizations provide isolated multi-tenant workspaces with their own Google connections, business locations, review queues, and custom AI brand guidelines.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Hospitality LLC"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg || !newOrgName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingOrg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingOrg ? 'Creating...' : 'Create Organization'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
