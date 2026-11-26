import React from 'react';
import type { GradePrice, HistoryEntry } from './types';
import type { getEraColors } from '@/lib/design-system/colors';
import TradingChartPanel, { type ChartSale } from './TradingChartPanel';

export default function PriceChartPanel({
  history = [],
  eraColors,
  gradeLattice = [],
  sales = [],
  censusHistogram,
}: {
  history?: HistoryEntry[];
  eraColors?: ReturnType<typeof getEraColors>;
  gradeLattice?: GradePrice[];
  sales?: ChartSale[];
  censusHistogram?: Array<{ grade: string; count: number }>;
}) {
  if (!eraColors) return null;
  return <TradingChartPanel history={history} eraColors={eraColors} gradeLattice={gradeLattice} sales={sales} censusHistogram={censusHistogram} />;
}
