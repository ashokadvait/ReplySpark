'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, CheckCircle2, User, Clock } from 'lucide-react';
import { ApiClient } from '../lib/api';

export function AuditView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ApiClient.getAuditLogs()
      .then((data) => setLogs(data.logs || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="text-center py-12 text-xs text-slate-400">Loading audit trail...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-5xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" /> Security & Publishing Audit Trail
        </h2>
        <p className="text-xs text-slate-400">
          Immutable log of all human approvals, Google publications, and configuration changes.
        </p>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 font-semibold text-emerald-400">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {log.resourceType}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {log.actorUser?.displayName || 'System'}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                    {log.metadataJson ? JSON.stringify(log.metadataJson) : '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No audit records recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
