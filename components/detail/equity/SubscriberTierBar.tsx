'use client';

import React from 'react';
import SubscriberTierController from './SubscriberTierController';
import { useSubscriberTier } from './subscriber-tier-context';

export default function SubscriberTierBar() {
  const { tier, setTier } = useSubscriberTier();

  return (
    <div className="w-full">
      <SubscriberTierController currentTier={tier} onTierChange={setTier} />
    </div>
  );
}
