'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { Creator } from './types';
import Panel from './Panel';
import { classifyNewsItem, scoreNewsItem, buildKeywords, getSourceColor, normalizeNewsRow, type RawNewsRow } from './newsUtils';

interface NewsItem { id: string; title: string; summary: string | null; url: string; source: string; publishedAt: string; aiScore: number | null; }

/**
 * Stories from the stored news feed that match this book's title, publisher or credited creators.
 * Stories that do not match are not shown, and with no match the panel does not render.
 */
export default function NewsPanel({ workName, publisher, assetId, eraColors }: {
  workName: string; publisher: string; assetId: string; eraColors: ReturnType<typeof getEraColors>;
}) {
  const { data: newsData } = useQuery<{ success: boolean; data: NewsItem[]; count: number }>({
    queryKey: ['news-latest'],
    queryFn: async () => {
      const res = await fetch('/api/feed/news');
      if (!res.ok) return { success: false, data: [], count: 0 };
      return res.json();
    },
    staleTime: 120000,
  });

  const { data: creatorData } = useQuery<{ data: Creator[] }>({
    queryKey: ['creators', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/creators/${assetId}`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    staleTime: 300000,
  });

  const items: NewsItem[] = ((newsData?.data || (newsData as any)?.stories || []) as RawNewsRow[]).map(normalizeNewsRow);
  const creatorNames = (creatorData?.data || []).map((c: Creator) => c.name).filter(Boolean);
  const keywords = buildKeywords(workName, publisher);

  const matched = items
    .map((item) => ({ item, score: scoreNewsItem(item, keywords, creatorNames) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (matched.length === 0) return null;

  const gridColsClass =
    matched.length === 1
      ? 'grid-cols-1'
      : matched.length === 2 || matched.length === 4
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <Panel title="News & Market Catalysts" icon={<Newspaper className="w-3.5 h-3.5" />} eraColors={eraColors}>
      <div className={`grid ${gridColsClass} gap-3`}>
        {matched.map(({ item }) => {
          const classification = classifyNewsItem(item.title, item.summary ?? '');
          const sc = getSourceColor(item.source || '', eraColors.border);
          return (
            <Link key={item.id} href={`/news/${encodeURIComponent(item.id)}`} className="block rounded p-2.5 transition-all pp-hover-bg-5"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${eraColors.border}25`, textDecoration: 'none' }}>
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                  style={{ backgroundColor: `${classification.color}18`, color: classification.color, border: `1px solid ${classification.color}30` }}>
                  {classification.type}
                </span>
                {item.source && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${sc}12`, color: sc, border: `1px solid ${sc}28` }}>
                    {item.source}
                  </span>
                )}
                {item.publishedAt && (
                  <span className="ml-auto text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.82)' }}>{item.title}</p>
              {item.summary && <p className="text-[9px] mt-1 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.summary}</p>}
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
