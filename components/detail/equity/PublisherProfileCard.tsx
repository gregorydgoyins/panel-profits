'use client';
import React from 'react';
import { Building2, Calendar, Globe } from 'lucide-react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';

export interface PublisherProfileCardProps {
  publisher: string;
  era: string | null | undefined;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

const PUBLISHER_INFO: Record<string, { founded: number; hq: string; description: string; notableCharacters: string[] }> = {
  'Marvel': { founded: 1939, hq: 'New York, NY', description: 'Home of Spider-Man, X-Men, Avengers, and the Marvel Cinematic Universe.', notableCharacters: ['Spider-Man', 'X-Men', 'Avengers', 'Fantastic Four'] },
  'Timely': { founded: 1939, hq: 'New York, NY', description: 'Golden Age predecessor of Marvel Comics, pioneering Captain America, Sub-Mariner, and the Human Torch.', notableCharacters: ['Captain America', 'Human Torch', 'Sub-Mariner'] },
  'Atlas': { founded: 1951, hq: 'New York, NY', description: '1950s Atomic Age imprint of Martin Goodman bridging Timely Comics into the Silver Age Marvel Universe.', notableCharacters: ['Sub-Mariner', 'Captain America', 'Black Knight'] },
  'DC': { founded: 1934, hq: 'Burbank, CA', description: 'Home of Superman, Batman, Wonder Woman, and the Justice League.', notableCharacters: ['Superman', 'Batman', 'Wonder Woman', 'Flash'] },
  'National': { founded: 1934, hq: 'New York, NY', description: 'Golden & Silver Age corporate imprint of DC Comics publishing Action Comics, Detective Comics, and Superman.', notableCharacters: ['Superman', 'Batman', 'Wonder Woman', 'Green Lantern'] },
  'All-American': { founded: 1938, hq: 'New York, NY', description: 'Golden Age partner imprint to National/DC that introduced The Flash, Green Lantern, Wonder Woman, and the JSA.', notableCharacters: ['Flash', 'Green Lantern', 'Wonder Woman', 'Hawkman'] },
  'Dell': { founded: 1929, hq: 'New York, NY', description: 'Largest comic book publisher of the Golden & Atomic Ages, famed for Four Color, Carl Barks Disney ducks, Tarzan, and Looney Tunes.', notableCharacters: ['Donald Duck', 'Uncle Scrooge', 'Mickey Mouse', 'Tarzan'] },
  'Gold Key': { founded: 1962, hq: 'Poughkeepsie, NY', description: 'Western Publishing imprint succeeding Dell Comics with Magnus Robot Fighter, Solar, Turok, and licensed icons.', notableCharacters: ['Donald Duck', 'Turok', 'Doctor Solar', 'Magnus'] },
  'Western': { founded: 1907, hq: 'Racine, WI', description: 'Production and publishing powerhouse behind Dell Comics, Four Color, and Gold Key Comics.', notableCharacters: ['Donald Duck', 'Uncle Scrooge', 'Bugs Bunny', 'Tarzan'] },
  'Fawcett': { founded: 1919, hq: 'New York, NY', description: 'Golden Age powerhouse behind Captain Marvel (Shazam), the best-selling superhero franchise of the 1940s.', notableCharacters: ['Captain Marvel', 'Captain Marvel Jr.', 'Mary Marvel', 'Spy Smasher'] },
  'EC': { founded: 1944, hq: 'New York, NY', description: 'Entertaining Comics revolutionized the 1950s with Tales from the Crypt, Weird Science, Two-Fisted Tales, and MAD.', notableCharacters: ['Crypt-Keeper', 'Alfred E. Neuman', 'Vault-Keeper'] },
  'Lev Gleason': { founded: 1939, hq: 'New York, NY', description: 'Golden Age pioneer of Daredevil and Crime Does Not Pay, which invented the true-crime comic genre.', notableCharacters: ['Daredevil', 'Mr. Crime', 'Silver Streak', 'Crimebuster'] },
  'Quality': { founded: 1939, hq: 'Stamford, CT', description: 'Golden Age publisher celebrated for Will Eisner’s The Spirit, Plastic Man, Blackhawk, and Phantom Lady.', notableCharacters: ['Plastic Man', 'Blackhawk', 'The Spirit', 'Phantom Lady'] },
  'Archie': { founded: 1939, hq: 'Pelham, NY', description: 'Originally MLJ Magazines; home of Archie Andrews, Riverdale, Sabrina the Teenage Witch, and The Shield.', notableCharacters: ['Archie Andrews', 'Jughead', 'Betty & Veronica', 'Sabrina'] },
  'MLJ': { founded: 1939, hq: 'New York, NY', description: 'Golden Age predecessor of Archie Comics that debuted Pep Comics, The Shield, and Archie Andrews.', notableCharacters: ['Archie Andrews', 'The Shield', 'Black Hood'] },
  'Harvey': { founded: 1941, hq: 'New York, NY', description: 'Long-running publisher of Casper the Friendly Ghost, Richie Rich, Sad Sack, and Golden Age Black Cat.', notableCharacters: ['Casper', 'Richie Rich', 'Black Cat', 'Little Dot'] },
  'Charlton': { founded: 1945, hq: 'Derby, CT', description: 'Independent Silver & Bronze Age publisher whose Action Heroes (Blue Beetle, Question, Captain Atom) inspired Watchmen.', notableCharacters: ['Blue Beetle', 'The Question', 'Captain Atom', 'Peacemaker'] },
  'Fiction House': { founded: 1938, hq: 'New York, NY', description: 'Golden Age pulp-to-comics publisher famed for Planet Comics, Jungle Comics, and Sheena, Queen of the Jungle.', notableCharacters: ['Sheena', 'Mysta of the Moon', 'Camilla'] },
  'Fox Feature': { founded: 1939, hq: 'New York, NY', description: 'Golden Age syndicate led by Victor Fox, publisher of Blue Beetle, Wonderworld Comics, and Phantom Lady.', notableCharacters: ['Blue Beetle', 'Samson', 'Phantom Lady'] },
  'Image': { founded: 1992, hq: 'Portland, OR', description: 'Creator-owned publisher. Home of Spawn, The Walking Dead, and Invincible.', notableCharacters: ['Spawn', 'Invincible', 'Walking Dead', 'Savage Dragon'] },
  'Dark Horse': { founded: 1986, hq: 'Milwaukie, OR', description: 'Premier independent publisher known for Hellboy, Sin City, Umbrella Academy, and licensed franchises.', notableCharacters: ['Hellboy', 'Sin City', 'The Mask'] },
  'Valiant': { founded: 1989, hq: 'New York, NY', description: 'Tightly integrated superhero universe led by X-O Manowar, Harbinger, Shadowman, and Bloodshot.', notableCharacters: ['X-O Manowar', 'Harbinger', 'Bloodshot', 'Shadowman'] },
  'IDW': { founded: 1999, hq: 'San Diego, CA', description: 'Independent publisher of Teenage Mutant Ninja Turtles, Transformers, Sonic the Hedgehog, and Locke & Key.', notableCharacters: ['TMNT', 'Transformers', 'Locke & Key'] },
  'BOOM!': { founded: 2005, hq: 'Los Angeles, CA', description: 'Creator-owned and licensed hitmaker behind Something Is Killing the Children, Power Rangers, and BRZRKR.', notableCharacters: ['Erica Slaughter', 'Power Rangers', 'BRZRKR'] },
  'Mirage': { founded: 1983, hq: 'Northampton, MA', description: 'Independent studio founded by Kevin Eastman & Peter Laird that launched Teenage Mutant Ninja Turtles.', notableCharacters: ['Leonardo', 'Raphael', 'Donatello', 'Michelangelo'] },
  'Dynamite': { founded: 2004, hq: 'Mount Laurel, NJ', description: 'Publisher of The Boys, Vampirella, Red Sonja, and classic pulp adventure revivals.', notableCharacters: ['The Boys', 'Vampirella', 'Red Sonja'] },
  'Vertigo': { founded: 1993, hq: 'New York, NY', description: 'Mature-readers DC imprint behind Sandman, Preacher, Y: The Last Man, and Fables.', notableCharacters: ['Dream (Sandman)', 'John Constantine', 'Jesse Custer'] },
  'WildStorm': { founded: 1992, hq: 'La Jolla, CA', description: 'Studio founded by Jim Lee behind WildC.A.T.s, Gen13, The Authority, and Planetary.', notableCharacters: ['Grifter', 'Midnighter', 'Apollo', 'Fairchild'] },
  'Skybound': { founded: 2010, hq: 'Los Angeles, CA', description: 'Robert Kirkman’s Image imprint behind The Walking Dead, Invincible, and the Energon Universe.', notableCharacters: ['Invincible', 'Rick Grimes', 'Transformers'] },
};

function getPublisherInfo(publisher: string | null | undefined) {
  if (!publisher || typeof publisher !== 'string') return null;
  const trimmed = publisher.trim();
  if (PUBLISHER_INFO[trimmed]) {
    return PUBLISHER_INFO[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(PUBLISHER_INFO)) {
    const keyLower = key.toLowerCase();
    if (lower === keyLower || lower.startsWith(keyLower) || lower.includes(keyLower)) {
      return PUBLISHER_INFO[key];
    }
  }
  return null;
}

export default function PublisherProfileCard({
  publisher,
  era,
  eraColors,
}: PublisherProfileCardProps) {
  const colors = eraColors ?? getEraColors(era);
  const info = getPublisherInfo(publisher);
  const displayName = (publisher && publisher.trim()) || 'Unknown Publisher';

  return (
    <Panel
      title="Publisher"
      icon={<Building2 className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      {info ? (
        <div className="space-y-3">
          <div>
            <div
              className="text-sm font-bold tracking-wide"
              style={{ color: colors.border, fontFamily: 'Hind, sans-serif' }}
            >
              {displayName}
            </div>
            <div
              className="flex items-center gap-4 mt-1.5 text-xs"
              style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Hind, sans-serif' }}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: `${colors.border}cc` }} />
                <span style={{ fontFamily: 'monospace' }}>{info.founded}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: `${colors.border}cc` }} />
                <span>{info.hq}</span>
              </div>
            </div>
          </div>

          <p
            className="text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Hind, sans-serif' }}
          >
            {info.description}
          </p>

          {info.notableCharacters && info.notableCharacters.length > 0 && (
            <div
              className="space-y-1.5 pt-2"
              style={{ borderTop: `1px solid ${colors.border}15` }}
            >
              <div
                className="text-[9px] uppercase tracking-wider font-semibold"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
              >
                KEY CHARACTERS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {info.notableCharacters.map((character) => (
                  <span
                    key={character}
                    className="text-[10px] px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: `${colors.border}14`,
                      color: 'rgba(255,255,255,0.85)',
                      border: `1px solid ${colors.border}30`,
                      fontFamily: 'Hind, sans-serif',
                    }}
                  >
                    {character}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div
            className="text-sm font-bold tracking-wide"
            style={{ color: colors.border, fontFamily: 'Hind, sans-serif' }}
          >
            {displayName}
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Hind, sans-serif' }}
          >
            {displayName} is an indexed comic book publisher{era ? ` from the ${era.charAt(0).toUpperCase()}${era.slice(1)} Age` : ''} tracked across the Panel Profits Sovereign Registry and CGC Census ledger.
          </p>
        </div>
      )}
    </Panel>
  );
}
