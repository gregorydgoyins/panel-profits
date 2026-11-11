import { BookOpen } from 'lucide-react';
import Panel from './Panel';
import { ERA_LABELS, fmtDate } from './shared';
import { getEraColors } from '@/lib/design-system/colors';
import type { DetailResponse } from './types';

interface SeriesInfoPanelProps {
  series: DetailResponse['series'];
  variant: Pick<DetailResponse['variant'], 'publisher' | 'era'>;
  eraColors: ReturnType<typeof getEraColors>;
}

export default function SeriesInfoPanel({ series, variant, eraColors }: SeriesInfoPanelProps) {
  const fields = [
    { label: 'Publisher', val: variant.publisher },
    { label: 'Category', val: series.category },
    { label: 'Total Issues (series)', val: series.totalIssues > 0 ? series.totalIssues.toLocaleString() : '—' },
    { label: 'Issues Priced', val: series.totalPriced > 0 ? series.totalPriced.toLocaleString() : '—' },
    { label: 'Era', val: ERA_LABELS[variant.era] || variant.era },
    { label: 'Last Crawled', val: fmtDate(series.lastCrawled) },
  ];

  return (
    <Panel title="Series" icon={<BookOpen className="w-3.5 h-3.5" />} eraColors={eraColors}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {fields.map(({ label, val }) => (
          <div key={label}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{val}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}15` }}>
        <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Data Source</div>
        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Panel Profits · WAV pricing · CGC census-derived scarcity</div>
      </div>
    </Panel>
  );
}
