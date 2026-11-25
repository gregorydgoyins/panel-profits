export const CHARACTER_KEYWORDS: Record<string, string[]> = {
  'Captain America': ['Steve Rogers', 'Sam Wilson', 'Bucky', 'Winter Soldier', 'Nomad', 'HYDRA', 'Red Skull'],
  'Iron Man': ['Tony Stark', 'Pepper Potts', 'War Machine', 'Rhodey', 'Mandarin', 'Stark Industries', 'Armor Wars'],
  'Incredible Hulk': ['Bruce Banner', 'She-Hulk', 'gamma', 'Abomination', 'Betty Ross', 'Banner'],
  'Amazing Spider-Man': ['Peter Parker', 'Mary Jane', 'Gwen Stacy', 'Venom', 'Green Goblin', 'Mysterio', 'Symbiote'],
  'Spider-Man': ['Peter Parker', 'Miles Morales', 'Mary Jane', 'Venom', 'Green Goblin', 'Symbiote'],
  'Thor': ['Jane Foster', 'Loki', 'Asgard', 'Odin', 'Mjolnir', 'Hela', 'Asgardian'],
  'Wolverine': ['Logan', 'X-Men', 'mutant', 'adamantium', 'Weapon X', 'Jubilee', 'berserker', 'claws'],
  'X-Men': ['Xavier', 'mutant', 'Cyclops', 'Jean Grey', 'Storm', 'Magneto', 'Professor X'],
  'Avengers': ['Tony Stark', 'Steve Rogers', 'Black Widow', 'Hawkeye', 'Vision', 'Scarlet Witch'],
  'Fantastic Four': ['Reed Richards', 'Susan Storm', 'Johnny Storm', 'Ben Grimm', 'Doctor Doom', 'Thing'],
  'Daredevil': ['Matt Murdock', 'Kingpin', "Hell's Kitchen", 'Murdock', 'Elektra'],
  'Black Panther': ["T'Challa", 'Wakanda', 'Vibranium', 'Shuri', 'Killmonger'],
  'Star Wars': ['Luke Skywalker', 'Darth Vader', 'Han Solo', 'Leia', 'Jedi', 'Sith', 'Skywalker'],
  'Superman': ['Clark Kent', 'Lex Luthor', 'Kryptonite', 'Lois Lane', 'Metropolis', 'Kryptonian'],
  'Batman': ['Bruce Wayne', 'Gotham', 'Joker', 'Robin', 'Alfred', 'Wayne', 'Commissioner Gordon'],
};

const INTERVIEW_SIGNALS = ['interview', 'exclusive', 'talks about', 'speaks with', 'creator spotlight', 'behind the scenes', 'in conversation', 'creator talk', 'sits down'];
const PREVIEW_SIGNALS   = ['preview', 'first look', 'advance', 'solicitation', 'solicit'];
const REVIEW_SIGNALS    = ['review', 'reviewed', 'rating', 'verdict', 'breakdown'];
const EXCLUSIVE_SIGNALS = ['exclusive', 'breaking', 'announced', 'confirmed', 'revealed'];

export interface NewsClassification { type: string; color: string; }

export function classifyNewsItem(title: string, summary: string): NewsClassification {
  const text = (title + ' ' + summary).toLowerCase();
  if (INTERVIEW_SIGNALS.some(s => text.includes(s))) return { type: 'INTERVIEW', color: '#a78bfa' };
  if (PREVIEW_SIGNALS.some(s => text.includes(s)))   return { type: 'PREVIEW',   color: '#38bdf8' };
  if (REVIEW_SIGNALS.some(s => text.includes(s)))    return { type: 'REVIEW',    color: '#4ade80' };
  if (EXCLUSIVE_SIGNALS.some(s => text.includes(s))) return { type: 'EXCLUSIVE', color: '#fbbf24' };
  return { type: 'NEWS', color: 'rgba(255,255,255,0.4)' };
}

export interface ScoredNewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  publishedAt: string;
  aiScore: number | null;
}

export function scoreNewsItem(item: ScoredNewsItem, keywords: string[], creatorNames: string[]): number {
  const text = (item.title + ' ' + (item.summary ?? '')).toLowerCase();
  let score = 0;
  for (const kw of keywords) if (text.includes(kw.toLowerCase())) score += kw.length > 6 ? 3 : 2;
  for (const name of creatorNames) if (name.length > 3 && text.includes(name.toLowerCase())) score += 4;
  const cls = classifyNewsItem(item.title, item.summary ?? '');
  if (cls.type === 'INTERVIEW' && score > 0) score += 3;
  if (cls.type === 'EXCLUSIVE' && score > 0) score += 2;
  return score;
}

export function buildKeywords(workName: string, publisher: string): string[] {
  const charKeywords = CHARACTER_KEYWORDS[workName] || [];
  return [workName, ...workName.split(' ').filter(w => w.length > 3), ...charKeywords, publisher, 'comic', 'comics'];
}

export const SOURCE_COLORS: Record<string, string> = {
  'cbr': '#f59e0b', 'bleeding cool': '#ef4444', 'the beat': '#38bdf8',
  'aipt comics': '#4ade80', 'comicbook.com': '#60a5fa', 'comicbook': '#60a5fa',
};

export function getSourceColor(src: string, fallback: string): string {
  const k = src.toLowerCase();
  for (const [key, color] of Object.entries(SOURCE_COLORS)) if (k.includes(key)) return color;
  return fallback;
}

export interface RawNewsRow {
  id: string;
  title?: string;
  headline?: string;
  description?: string;
  summary?: string;
  url: string;
  source: string;
  publishedAt?: string;
  published_at?: string;
  score?: number;
  aiScore?: number | null;
}

function cleanNewsText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/<[^>]*$/g, ' ')
    .replace(/["']\s+(?:data-[a-z0-9-]+|srcset|sizes|src|loading|decoding|fetchpriority|width|height|class|alt)=[\s\S]*$/i, '')
    .replace(/\b(?:data-[a-z0-9-]+|srcset|sizes)=["'][^"']*["']?/gi, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNewsRow(r: RawNewsRow): ScoredNewsItem {
  const summary = cleanNewsText(r.description || r.summary || '');
  return {
    id: r.id,
    title: cleanNewsText(r.headline || r.title || ''),
    summary: summary || null,
    url: r.url,
    source: r.source,
    publishedAt: r.published_at || r.publishedAt || '',
    aiScore: typeof r.score === 'number' ? r.score : (r.aiScore ?? null),
  };
}

export function computeMediaVelocity(relevantItems: { score: number }[]): { label: string; color: string } {
  const totalScore = relevantItems.filter(s => s.score > 0).reduce((sum, s) => sum + s.score, 0);
  if (totalScore >= 20) return { label: 'ELEVATED', color: '#f87171' };
  if (totalScore >= 8)  return { label: 'ACTIVE',   color: '#fbbf24' };
  return { label: 'QUIET', color: 'rgba(255,255,255,0.3)' };
}
