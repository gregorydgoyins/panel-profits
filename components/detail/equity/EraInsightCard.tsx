'use client';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';
import { Clock, Lightbulb, TrendingUp } from 'lucide-react';

export interface EraInsightCardProps {
  era: string | null | undefined;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

const ERA_INSIGHTS: Record<
  string,
  { yearRange: string; description: string; investmentNotes: string; avgPremium: string; keyTrend: string }
> = {
  golden: {
    yearRange: '1938–1956',
    description:
      'The birth of superheroes. Superman, Batman, Captain America, and Wonder Woman debut. Comics became a mass medium.',
    investmentNotes:
      'Extreme scarcity drives value. Condition sensitivity is paramount — even low-grade copies of key issues command five figures.',
    avgPremium: '300-500%',
    keyTrend: 'Steady appreciation, recession-resistant',
  },
  silver: {
    yearRange: '1956–1970',
    description:
      'Marvel revolution. Stan Lee, Jack Kirby, and Steve Ditko create the modern superhero. Spider-Man, Fantastic Four, X-Men debut.',
    investmentNotes:
      'The sweet spot for collectors — significant enough to be culturally important, scarce enough to be valuable. 9.8 copies are extremely rare.',
    avgPremium: '200-400%',
    keyTrend: 'MCU adaptations driving sustained demand',
  },
  bronze: {
    yearRange: '1970–1984',
    description:
      'Comics grow darker and more socially aware. Wolverine, Punisher, Swamp Thing debut. Creator-driven storytelling emerges.',
    investmentNotes:
      'Newsstand variants carry meaningful scarcity premiums. First appearances from this era are blue-chip investments.',
    avgPremium: '100-250%',
    keyTrend: 'Newsstand premiums accelerating',
  },
  copper: {
    yearRange: '1984–1991',
    description:
      'The direct market matures. Dark Knight Returns, Watchmen redefine the medium. Speculator boom begins.',
    investmentNotes:
      'High print runs mean condition is the key differentiator. 9.8 census numbers matter more than total prints.',
    avgPremium: '50-150%',
    keyTrend: 'Key issues outperforming, bulk declining',
  },
  modern: {
    yearRange: '1992–Present',
    description:
      'Variant cover era. Trade paperback culture. Independent movement flourishes. Digital distribution begins.',
    investmentNotes:
      'Census-registered copies anchor pricing. First appearances of characters adapted to screen drive the market.',
    avgPremium: '20-80%',
    keyTrend: 'Screen adaptation speculation dominant',
  },
  postmodern: {
    yearRange: '2010–Present',
    description:
      'Deconstructionist storytelling. Trade-first publishing. Creator prestige over character IP.',
    investmentNotes:
      'Value driven by creator reputation and adaptation potential rather than print scarcity.',
    avgPremium: '10-40%',
    keyTrend: 'Creator-driven speculation',
  },
  independent: {
    yearRange: 'Various',
    description:
      'Outside the Marvel/DC duopoly. Often creator-owned with outsized cultural impact and far greater natural scarcity.',
    investmentNotes:
      'No returnable copies, no overprint buffer. True scarcity with potential for explosive growth on media adaptation news.',
    avgPremium: '50-300%',
    keyTrend: 'Adaptation lottery — high risk, high reward',
  },
};

const ERA_NAMES: Record<string, string> = {
  golden: 'Golden Age',
  silver: 'Silver Age',
  bronze: 'Bronze Age',
  copper: 'Copper Age',
  modern: 'Modern Age',
  postmodern: 'Postmodern Age',
  independent: 'Independent',
};

function normalizeEraKey(era: string): string {
  return era.toLowerCase().replace(/_/g, ' ').replace(/\s+age$/, '').trim();
}

export default function EraInsightCard({ era, eraColors }: EraInsightCardProps) {
  if (!era || typeof era !== 'string') {
    return null;
  }

  const key = normalizeEraKey(era);
  const insight = ERA_INSIGHTS[key] || ERA_INSIGHTS[era.toLowerCase().trim()];
  if (!insight) {
    return null;
  }

  const colors = eraColors ?? getEraColors(era);
  const displayName = ERA_NAMES[key] || (era.charAt(0).toUpperCase() + era.slice(1));

  return (
    <Panel
      title="Era Intelligence"
      icon={<Clock className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="space-y-3">
        {/* Era name + Year range */}
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="text-sm font-bold tracking-wide capitalize"
            style={{ color: colors.border, fontFamily: 'Hind, sans-serif' }}
          >
            {displayName}
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {insight.yearRange}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Hind, sans-serif' }}
        >
          {insight.description}
        </p>

        {/* Investment Notes */}
        <div
          className="p-3 rounded space-y-1.5"
          style={{
            backgroundColor: 'rgba(255,255,255,0.018)',
            border: `1px solid ${colors.border}20`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: colors.border }} />
            <span
              className="text-[9px] uppercase tracking-wider font-semibold"
              style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              INVESTMENT NOTES
            </span>
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Hind, sans-serif' }}
          >
            {insight.investmentNotes}
          </p>
        </div>

        {/* Two stat mini-blocks side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="p-2.5 rounded flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255,255,255,0.018)',
              border: `1px solid ${colors.border}20`,
            }}
          >
            <div
              className="text-[8px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              Avg Premium
            </div>
            <div
              className="text-sm font-semibold tracking-tight"
              style={{ color: colors.border, fontFamily: 'monospace' }}
            >
              {insight.avgPremium}
            </div>
          </div>

          <div
            className="p-2.5 rounded flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255,255,255,0.018)',
              border: `1px solid ${colors.border}20`,
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-2.5 h-2.5 shrink-0" style={{ color: `${colors.border}cc` }} />
              <span
                className="text-[8px] uppercase tracking-wider font-semibold"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
              >
                Key Trend
              </span>
            </div>
            <div
              className="text-xs leading-snug"
              style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}
            >
              {insight.keyTrend}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
