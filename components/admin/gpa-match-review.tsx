'use client';

import { useState, useTransition } from 'react';
import { GpaMatchViewItem, updateGpaMatchStatus } from '@/app/admin/gpa-matches/actions';
import { CheckCircle2, XCircle, Clock, ExternalLink, ShieldAlert } from 'lucide-react';

interface Props {
  initialMatches: GpaMatchViewItem[];
}

export function GpaMatchReviewManager({ initialMatches }: Props) {
  const [matches, setMatches] = useState<GpaMatchViewItem[]>(initialMatches);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'AUTO_MATCHED' | 'CONFIRMED' | 'REJECTED'>('PENDING_REVIEW');
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filteredMatches = matches.filter((m) => {
    if (filter === 'ALL') return true;
    return m.match_status === filter;
  });

  const handleStatusChange = (matchId: string, newStatus: 'CONFIRMED' | 'REJECTED') => {
    const notes = notesState[matchId] || '';
    startTransition(async () => {
      try {
        await updateGpaMatchStatus(matchId, newStatus, notes);
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, match_status: newStatus, reviewer_notes: notes } : m))
        );
      } catch (err: any) {
        alert(err.message || 'Error updating status');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Status:</span>
          {(['PENDING_REVIEW', 'AUTO_MATCHED', 'CONFIRMED', 'REJECTED', 'ALL'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                filter === status
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-slate-200 font-semibold">{filteredMatches.length}</span> matches
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <p className="text-sm text-slate-400">No match records found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* GPA Target */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-800">
                      GPA DISCOVERY
                    </span>
                    <a
                      href={m.gpa_issue?.gpa_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open GPA Page</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <h3 className="text-base font-medium text-slate-100">
                    {m.gpa_issue?.gpa_titles?.title_name || 'Unknown Title'} #{m.gpa_issue?.issue_number_raw}
                  </h3>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div>Publisher: {m.gpa_issue?.gpa_titles?.publisher || 'N/A'}</div>
                    <div>Year: {m.gpa_issue?.gpa_titles?.publication_year || 'N/A'}</div>
                    <div>GPA Title ID: {m.gpa_issue?.gpa_title_id} | Issue ID: {m.gpa_issue?.gpa_issue_id}</div>
                  </div>
                </div>

                {/* Proposed Match */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                      PUBLIC.COMICS MATCH
                    </span>
                    <span className="text-xs text-slate-400">
                      Confidence: <strong className="text-emerald-300">{(m.match_confidence * 100).toFixed(0)}%</strong> ({m.match_method})
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-slate-100">
                    {m.comic?.series || 'N/A'} #{m.comic?.issue_number || 'N/A'}
                  </h3>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div>Publisher: {m.comic?.publisher || 'N/A'}</div>
                    <div>Year: {m.comic?.publication_year || 'N/A'}</div>
                    <div>Comic ID: <code className="text-slate-300">{m.comic?.id}</code></div>
                  </div>
                </div>
              </div>

              {/* Status & Review Controls */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      m.match_status === 'CONFIRMED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : m.match_status === 'REJECTED'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : m.match_status === 'AUTO_MATCHED'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {m.match_status}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Reviewer notes..."
                    value={notesState[m.id] !== undefined ? notesState[m.id] : m.reviewer_notes || ''}
                    onChange={(e) => setNotesState({ ...notesState, [m.id]: e.target.value })}
                    className="rounded bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    disabled={isPending}
                    onClick={() => handleStatusChange(m.id, 'CONFIRMED')}
                    className="flex items-center space-x-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handleStatusChange(m.id, 'REJECTED')}
                    className="flex items-center space-x-1 rounded bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
