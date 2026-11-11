'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';
import { Play, ExternalLink, Film, TrendingUp, Award, BookOpen, Loader2, X } from 'lucide-react';
import { findComicBaseVideoForComic, type ComicBaseVideoRecord } from '@/lib/video/comicbase-archive';

interface VideoPanelProps {
  workName: string;
  publisher: string;
  variantId: string;
  issueNumber?: string | null;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

interface YTVideo {
  videoId: string;
  title: string;
  channel: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  youtubeUrl: string;
}

interface YTSearchResponse {
  success: boolean;
  source: 'youtube-api' | 'fallback';
  videos: YTVideo[];
  searchUrl: string;
}

function buildSearchQuery(workName: string, issueNumber?: string | null): string {
  const title = workName?.trim() || 'Comic';
  const issue = issueNumber?.trim();
  return issue ? `${title} #${issue} comic review CGC` : `${title} comic review collecting`;
}

function buildFallbackLinks(
  workName: string,
  issueNumber: string | null | undefined,
  publisher: string
) {
  const title = workName?.trim() || 'Comic';
  const issue = issueNumber?.trim() || '';
  const pub = publisher?.trim() || '';
  const titleWithIssue = issue ? `${title} #${issue}` : title;

  return [
    {
      label: `${titleWithIssue} — CGC Grading & Market Value`,
      query: `${titleWithIssue} CGC grading value`,
      icon: Award,
      description: 'Grading walkthroughs, census data & fair market value',
    },
    {
      label: `${titleWithIssue} — Key Issue Spotlight`,
      query: `${titleWithIssue} key issue comic review`,
      icon: Play,
      description: 'In-depth reviews, first appearances & significance',
    },
    {
      label: `${title} — Market Analysis & Investing`,
      query: `${title} comic investing market analysis`,
      icon: TrendingUp,
      description: 'Price trends, investment thesis & market outlook',
    },
    {
      label: `${title} — Collecting Guide`,
      query: issue
        ? `${title} comic collecting guide ${pub}`
        : `${title} comic collecting guide`,
      icon: BookOpen,
      description: `Collector tips, print runs & variant hunting${pub ? ` · ${pub}` : ''}`,
    },
  ];
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch { return ''; }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export default function VideoPanel({
  workName,
  publisher,
  variantId,
  issueNumber,
  eraColors,
}: VideoPanelProps) {
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUrl, setSearchUrl] = useState('');
  const [source, setSource] = useState<'youtube-api' | 'fallback'>('youtube-api');
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Check ComicBase archive video
  const cbVideo = findComicBaseVideoForComic(workName, issueNumber);
  const isSilverSurferBlack = /Silver Surfer.*Black/i.test(workName || '');
  const officialTrailer = isSilverSurferBlack
    ? {
        videoId: 'tsueFhZ5Qok',
        title: 'SILVER SURFER: BLACK Trailer | Marvel Comics',
        channel: 'Marvel Entertainment',
        description:
          'Official Marvel Comics promotional trailer for Silver Surfer: Black #1 by Donny Cates and Tradd Moore.',
        url: 'https://www.youtube.com/watch?v=tsueFhZ5Qok',
      }
    : null;

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const q = buildSearchQuery(workName, issueNumber);
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&maxResults=4`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: YTSearchResponse = await res.json();
      setVideos(data.videos || []);
      setSearchUrl(`/video-archive?q=${encodeURIComponent(workName + (issueNumber ? ' #' + issueNumber : ''))}`);
      setSource(data.source || 'youtube-api');
    } catch {
      setVideos([]);
      setSource('fallback');
      const q = buildSearchQuery(workName, issueNumber);
      setSearchUrl(`/video-archive?q=${encodeURIComponent(q)}`);
    } finally {
      setLoading(false);
    }
  }, [workName, issueNumber]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const fallbackLinks = buildFallbackLinks(workName, issueNumber, publisher);

  return (
    <Panel
      title="Video Intelligence & Archival Media"
      icon={<Film className="w-3.5 h-3.5" />}
      eraColors={eraColors as ReturnType<typeof getEraColors>}
    >
      <div className="space-y-3" data-variant-id={variantId}>
        {/* Official Publisher Promotional Trailer if available */}
        {officialTrailer && (
          <div
            className="rounded-lg p-3 border space-y-2"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.06)',
              borderColor: 'rgba(6, 182, 212, 0.35)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-mono tracking-widest text-cyan-400 font-semibold">
                Official Publisher Promotional Trailer
              </span>
              <a
                href={officialTrailer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-cyan-300 hover:text-cyan-200 underline font-mono"
              >
                {officialTrailer.channel} ↗
              </a>
            </div>
            <p className="text-xs font-semibold text-slate-100">{officialTrailer.title}</p>
            <p className="text-[11px] text-slate-300 font-light leading-relaxed">{officialTrailer.description}</p>
            <div className="rounded overflow-hidden bg-black aspect-video mt-2 border border-slate-800">
              <iframe
                src={`https://www.youtube.com/embed/${officialTrailer.videoId}`}
                title={officialTrailer.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Archival ComicBase Video feature if matched */}
        {cbVideo && (
          <div
            className="rounded-lg p-3 border space-y-2"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.05)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-mono tracking-widest text-amber-400 font-medium">
                Archival Creator Retrospective
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {Math.floor(cbVideo.duration / 60)}m {cbVideo.duration % 60}s
              </span>
            </div>
            <p className="text-xs font-medium text-slate-100">{cbVideo.title}</p>
            <p className="text-[11px] text-slate-300 font-light leading-relaxed">{cbVideo.description}</p>
            <div className="rounded overflow-hidden bg-black/60 aspect-video mt-2">
              <video
                src={cbVideo.videoUrl}
                controls
                className="w-full h-full object-cover"
                poster="/media/newsdesk-loop.mp4"
              />
            </div>
          </div>
        )}

        <div
          className="text-[9px] uppercase tracking-wider font-mono flex items-center justify-between"
          style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}
        >
          <span>Curated Market & Review Videos</span>
          <span className="text-[8px] text-cyan-400">
            {videos.length} Verified Clips
          </span>
        </div>

        {loading && (
          <div
            className="rounded-md p-6 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: eraColors.border }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Loading video intelligence…
            </span>
          </div>
        )}

        {/* Inline YouTube Player Modal/Container when a video is clicked */}
        {activePlayingId && (
          <div className="rounded-lg overflow-hidden border border-cyan-500/40 bg-black p-2 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-300">
                Active Video Player
              </span>
              <button
                onClick={() => setActivePlayingId(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                title="Close player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-video rounded overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${activePlayingId}?autoplay=1`}
                title="Comic Video Player"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {!loading && videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.videoId}
                className="group block rounded-md overflow-hidden transition-all duration-150 border bg-white/[0.02] hover:bg-white/[0.05]"
                style={{
                  borderColor: `${eraColors.border}25`,
                }}
              >
                <div className="flex items-start gap-3 p-2.5">
                  {/* Thumbnail with inline play trigger */}
                  <div
                    onClick={() => setActivePlayingId(video.videoId)}
                    className="relative w-28 shrink-0 aspect-video rounded overflow-hidden cursor-pointer group/thumb"
                  >
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/thumb:bg-black/50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                        <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4
                      onClick={() => setActivePlayingId(video.videoId)}
                      className="text-xs leading-snug line-clamp-2 font-medium text-slate-100 hover:text-cyan-300 cursor-pointer transition-colors"
                    >
                      {decodeHtmlEntities(video.title)}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {decodeHtmlEntities(video.channel)}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => setActivePlayingId(video.videoId)}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" /> Watch Inline
                      </button>
                      <Link
                        href={`/video-archive?v=${encodeURIComponent(video.videoId)}`}
                        className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        Archive Reel <Play className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {searchUrl && (
              <Link
                href={`/video-archive?q=${encodeURIComponent(workName + (issueNumber ? ' #' + issueNumber : ''))}`}
                className="block text-center rounded-md py-2 mt-2 transition-colors border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderColor: `${eraColors.border}20`,
                  textDecoration: 'none',
                }}
              >
                <span
                  className="text-[10px] font-mono flex items-center justify-center gap-1 text-slate-300 hover:text-white"
                >
                  Explore Sovereign Video Archive <Play className="w-3 h-3 text-cyan-400" />
                </span>
              </Link>
            )}
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="space-y-2">
            {fallbackLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={idx}
                  href={`/video-archive?q=${encodeURIComponent(link.query)}`}
                  className="group block rounded-md p-2.5 transition-all duration-150 border bg-white/[0.02] hover:bg-white/[0.05]"
                  style={{
                    borderColor: `${eraColors.border}20`,
                    borderLeft: `3px solid ${eraColors.border}`,
                    textDecoration: 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium text-slate-200 group-hover:text-white truncate"
                    >
                      {link.label}
                    </span>
                    <Play className="w-3 h-3 text-slate-500 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {link.description}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
