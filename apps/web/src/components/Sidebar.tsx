'use client';

import React from 'react';
import { Inbox, MapPin, Sliders, History, ShieldAlert, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingCount: number;
}

export function Sidebar({ currentTab, onTabChange, pendingCount }: SidebarProps) {
  const navItems = [
    {
      id: 'inbox',
      label: 'Review Inbox',
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    },
    {
      id: 'locations',
      label: 'Google & Locations',
      icon: MapPin
    },
    {
      id: 'preferences',
      label: 'AI Learned Rules',
      icon: Sliders
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0d1322] p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-500/10 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Core Principle Badge */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Core Principle</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          AI proposes. Humans decide. Google receives only explicitly approved replies.
        </p>
      </div>
    </aside>
  );
}
