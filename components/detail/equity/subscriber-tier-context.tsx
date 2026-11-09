'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import type { SubscriberTier } from './SubscriberTierController';

const RANK: Record<SubscriberTier, number> = { explorer: 0, pro: 1, institutional: 2 };
const LABEL: Record<SubscriberTier, string> = { explorer: 'Explorer', pro: 'Pro Trader', institutional: 'Institutional Alpha' };
const STORAGE_KEY = 'pp_subscriber_tier';

const TierContext = createContext<{ tier: SubscriberTier; setTier: (t: SubscriberTier) => void }>({
  tier: 'explorer',
  setTier: () => {},
});

export function SubscriberTierProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierState] = useState<SubscriberTier>('explorer');
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'explorer' || saved === 'pro' || saved === 'institutional') setTierState(saved);
  }, []);
  const setTier = (t: SubscriberTier) => {
    setTierState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
  };
  return <TierContext.Provider value={{ tier, setTier }}>{children}</TierContext.Provider>;
}

export function useSubscriberTier() {
  return useContext(TierContext);
}

/** Renders children only when the selected tier is at or above `min`. */
export function TierGate({ min, feature, children }: { min: SubscriberTier; feature: string; children: React.ReactNode }) {
  const { tier, setTier } = useSubscriberTier();
  if (RANK[tier] >= RANK[min]) return <>{children}</>;
  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#090f1d]/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Lock className={`w-4 h-4 ${min === 'institutional' ? 'text-amber-400' : 'text-cyan-400'}`} />
        <div>
          <div className="text-sm font-bold text-white">{feature}</div>
          <div className="text-xs text-slate-400">Included with {LABEL[min]}{min === 'pro' ? ' and Institutional Alpha' : ''}.</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setTier(min)}
        className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded border ${min === 'institutional' ? 'border-amber-500/50 text-amber-300 bg-amber-500/10' : 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10'}`}
      >
        View as {LABEL[min]}
      </button>
    </div>
  );
}
