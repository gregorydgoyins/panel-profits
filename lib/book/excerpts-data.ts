export interface RenderedTextbookPage {
  src: string;
  pageNumber: number;
  label: string;
}

export interface BookExcerpt {
  id: string;
  volume: string;
  chapter: string;
  title: string;
  subtitle: string;
  topic: string;
  summary: string;
  quote: string;
  wordCount: string;
  pagesInTextbook: string;
  readTime: string;
  renderedPageImages: RenderedTextbookPage[];
}

// Exactly 4 rotating Magazine-Textbook chapters (Prologue, Chapter 1, Chapter 2, Chapter 13).
// Visitors may pick and read ONE of the 4 (3 actual typeset pages) free, then must purchase the book.
export const BOOK_EXCERPTS: BookExcerpt[] = [
  {
    id: "prologue-valhalla-of-american-gods",
    volume: "VOLUME I: THE ART",
    chapter: "Prologue",
    title: "The Valhalla of American Gods",
    subtitle: "Fine Art Parity, Pop Appropriation & The $15 Million Action Comics #1",
    topic: "CIVILIZATIONAL MYTHOLOGY & MARKET EVIDENCE",
    summary:
      "How ten-cent newsstand pulp outpriced Andy Warhol, Roy Lichtenstein, and contemporary salon canvases—backed by Sidebar 0.1A's 2025–2026 auction ledger and the survival attrition math of Action Comics #1.",
    quote:
      "Every one of those artists made the same move: take an image printed by the million, meant to be used up and thrown away, and hang it on a wall where nobody can throw it away. The comic book had been living it since 1938.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 5–7",
    readTime: "7 min read",
    renderedPageImages: [
      {
        src: "/book-pages/prologue/page_05.jpg",
        pageNumber: 5,
        label: "Prologue • Page 5 — Pop Art, Street Art & The Comic Book Living It Since 1938",
      },
      {
        src: "/book-pages/prologue/page_06.jpg",
        pageNumber: 6,
        label: "Prologue • Page 6 — Sidebar 0.1A: Selected Art Sales for Price Context (Action Comics #1 — $15,000,000)",
      },
      {
        src: "/book-pages/prologue/page_07.jpg",
        pageNumber: 7,
        label: "Prologue • Page 7 — Sidebar 0.1: Economic Framework & Mechanical Reproduction",
      },
    ],
  },
  {
    id: "chapter-01-the-room-test",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 1",
    title: "The Room Test & The 20-Metric Standard",
    subtitle: "Three-Tier Score Discipline, Reportage vs. Commentary & The Price Firewall",
    topic: "VALUATION ARCHITECTURE & APPRAISAL SCIENCE",
    summary:
      "Gregory D. Goyins's comparative measurement apparatus: why no single cover or auction record can carry a book across twenty coequal metrics, and how museums finally opened their doors to sequential art.",
    quote:
      "Every metric is worth exactly one-twentieth, five percent, of a perfect score, so no single virtue can carry a book; the most famous cover or the largest auction record can earn at most ten points and must still answer nineteen other questions.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 4–6",
    readTime: "8 min read",
    renderedPageImages: [
      {
        src: "/book-pages/ch01/page_04.jpg",
        pageNumber: 4,
        label: "Chapter 1 • Page 4 — Architecture of The Room Test & Comparative Rubric",
      },
      {
        src: "/book-pages/ch01/page_05.jpg",
        pageNumber: 5,
        label: "Chapter 1 • Page 5 — Three-Tier Score Discipline & Reportage vs. Commentary",
      },
      {
        src: "/book-pages/ch01/page_06.jpg",
        pageNumber: 6,
        label: "Chapter 1 • Page 6 — From the Archive: When Museums Opened the Doors (1990 & 2006)",
      },
    ],
  },
  {
    id: "chapter-02-genesis-1935-1955",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 2",
    title: "Genesis: The Superhero as a Primary Issue",
    subtitle: "1938–1941 Sworn Print Runs, Siegel & Shuster, and Finger vs. Kane",
    topic: "GOLDEN AGE GENESIS & SWORN COURTROOM LEDGERS",
    summary:
      "Inside Act I, Movement Two: Jack Liebowitz's sworn 1939 courtroom circulation numbers for Action Comics #1, Captain America Comics #1 on the 1940 newsstand, and the Bill Finger / Bob Kane attribution dossier.",
    quote:
      "The finance word for the first sale of a new security is a primary issue: the moment a company sells shares to the public for the first time, before any of them have traded hands. Each of these comics was a primary issue in exactly that sense.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 12–14",
    readTime: "7 min read",
    renderedPageImages: [
      {
        src: "/book-pages/ch02/page_12.jpg",
        pageNumber: 12,
        label: "Chapter 2 • Page 12 — 1938–1941: The Superhero as a Primary Issue (Figure 2.4 & Sidenote 2.8)",
      },
      {
        src: "/book-pages/ch02/page_13.jpg",
        pageNumber: 13,
        label: "Chapter 2 • Page 13 — Callout Box 2.3 (The Only Sworn Numbers) & Maker Dossier: Bill Finger & Bob Kane",
      },
      {
        src: "/book-pages/ch02/page_14.jpg",
        pageNumber: 14,
        label: "Chapter 2 • Page 14 — Primary-Issue Circulation & Golden Age Genesis Ledger",
      },
    ],
  },
  {
    id: "chapter-13-censorship-bonfires-1954",
    volume: "VOLUME II: THE MARKET",
    chapter: "Chapter 13",
    title: "The Censorship Bonfires & The 1954 Crucible",
    subtitle: "The Spencer High Proclamation, Municipal Blacklists & Phantom Lady #17",
    topic: "SUPPLY DESTRUCTION & PRE-CODE ATTRITION",
    summary:
      "How municipal censorship boards in Detroit, Los Angeles, and Binghamton mobilized 50,000-comic kerosene pyres—permanently crushing pre-Code populations and forging six-figure Golden Age scarcity.",
    quote:
      "The public pyres of 1948 were not spontaneous grass-roots outbursts; they were meticulously stage-managed civic rituals designed to exert social control through theatrical destruction.",
    wordCount: "3 Complete Typeset Pages",
    pagesInTextbook: "pp. 2–4",
    readTime: "8 min read",
    renderedPageImages: [
      {
        src: "/book-pages/ch13/page_02.jpg",
        pageNumber: 2,
        label: "Chapter 13 • Page 2 — Primary Archive 13.1 (Spencer High Proclamation) & Municipal Newsstand Blacklists",
      },
      {
        src: "/book-pages/ch13/page_03.jpg",
        pageNumber: 3,
        label: "Chapter 13 • Page 3 — The 1948 Parish & Schoolyard Bonfires (Figure 13.1: Phantom Lady #17)",
      },
      {
        src: "/book-pages/ch13/page_04.jpg",
        pageNumber: 4,
        label: "Chapter 13 • Page 4 — Concept 13.2: The Sacrificial Pyre as Symbolic Expulsion",
      },
    ],
  },
];
