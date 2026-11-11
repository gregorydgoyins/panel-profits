'use client';
import React, { useState } from 'react';
import type { ProvenanceItem } from '@/lib/comics/detail-model';

/**
 * Where each figure on the page comes from: the source, the date it was captured, and how it was
 * derived. Entries are built from stored rows only. No confidence scores, no sync claims.
 */
export function ProvenanceLedger({ items, accentColor = '#3b82f6' }: { items: ProvenanceItem[]; accentColor?: string }) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '');
  if (!items || items.length === 0) return null;
  const active = items.find((i) => i.id === selectedId) ?? items[0];
  const day = (s: string | null) => (s ? s.slice(0, 10) : null);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#070c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
      <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: accentColor }}>
        Sources
      </div>
      <div className="grid gap-3 md:grid-cols-[260px_1fr] flex-1">
        <div className="flex flex-col gap-1.5">
          {items.map((it) => {
            const selected = it.id === active.id;
            return (
              <button
                key={it.id}
                onClick={() => setSelectedId(it.id)}
                className="text-left rounded px-2.5 py-2"
                style={{
                  border: selected ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: selected ? `${accentColor}18` : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-[11px]" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.75)' }}>{it.title}</span>
                  <span className="text-[11px] font-semibold" style={{ color: accentColor }}>{it.value}</span>
                </div>
                <div className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.38)' }}>{it.source}</div>
              </button>
            );
          })}
        </div>

        <div className="rounded p-3.5 space-y-3" style={{ backgroundColor: '#040812', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-start gap-3 pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: accentColor }}>{active.source}</div>
              <div className="text-base font-semibold text-white mt-0.5">
                {active.title} = <span style={{ color: accentColor }}>{active.value}</span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-right" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {active.asOf ? `As of ${day(active.asOf)}` : 'No capture date on file'}
            </div>
          </div>

          <p className="text-[12px] leading-snug m-0" style={{ color: 'rgba(255,255,255,0.8)' }}>{active.derivation}</p>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Stored rows</div>
            <div className="flex flex-col gap-1.5">
              {active.rows.map((r, idx) => (
                <div key={idx} className="flex justify-between items-center rounded px-2.5 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <span className="text-[11px] font-mono font-semibold text-white">{r.provider}</span>
                    <span className="text-[11px] ml-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.observation}</span>
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{day(r.date) ?? 'undated'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
