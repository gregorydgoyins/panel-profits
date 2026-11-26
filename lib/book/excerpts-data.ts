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

// Exactly 4 rotating Magazine-Textbook chapter sections:
// Appendix A, Chapter 5, Chapter 13, and Chapter 1 (The Room Test).
// Visitors may pick and read ONE of the 4 (3 actual typeset pages) free, then must purchase the book.
export const BOOK_EXCERPTS: BookExcerpt[] = [
  {
    id: "appendix-a-unflattening-cognitive-ma",
    volume: "APPENDIX A",
    chapter: "Appendix A",
    title: "Unflattening & The Cognitive 'Ma'",
    subtitle: "The Three Goyins Principles of Sequential Ontology & The Epistemology of Space",
    topic: "SEQUENTIAL SEMIOTICS & VISUAL PHILOSOPHY",
    summary:
      "A 3-page excerpt from Appendix A: Gregory D. Goyins's homage to Nick Sousanis's Unflattening, the Three Goyins Principles of Sequential Ontology, and Edwin Abbott's Flatland allegory.",
    quote:
      "The gutter is not merely a psychological transition; it is the sacred void of classical Japanese aesthetics ('Ma') where human consciousness acts as co-creator of reality.",
    wordCount: "3-Page Section",
    pagesInTextbook: "pp. 4–6",
    readTime: "6 min read",
    renderedPageImages: [
      {
        src: "/book-pages/appendix-a/page_04.jpg",
        pageNumber: 4,
        label: "Appendix A • Page 4 — The Three Goyins Principles of Sequential Ontology",
      },
      {
        src: "/book-pages/appendix-a/page_05.jpg",
        pageNumber: 5,
        label: "Appendix A • Page 5 — Part I: Nick Sousanis's 'Unflattening' & Escape from Lineland",
      },
      {
        src: "/book-pages/appendix-a/page_06.jpg",
        pageNumber: 6,
        label: "Appendix A • Page 6 — Multi-Dimensional Perceptual Faculties & Sequential Space",
      },
    ],
  },
  {
    id: "chapter-05-the-secular-temple",
    volume: "VOLUME II: THE MARKET",
    chapter: "Chapter 5",
    title: "The Secular Temple & The Organic Relic",
    subtitle: "Wood Pulp Chemistry, Acid Hydrolysis Kinetics & The Arrhenius Clock",
    topic: "MATERIALS SCIENCE & THERMODYNAMIC DECAY",
    summary:
      "A 3-page section from Chapter 5: why a vintage comic is a living, decaying organic matrix governed by the Arrhenius rate equation of cellulose acid hydrolysis—forging strictly non-linear natural survivorship.",
    quote:
      "Unlike gold bars, diamond wafers, or fiat treasury notes, a comic book is not an inorganic, chemically inert substance. It is a living, decaying organic matrix never engineered for longevity.",
    wordCount: "3-Page Section",
    pagesInTextbook: "pp. 5–7",
    readTime: "7 min read",
    renderedPageImages: [
      {
        src: "/book-pages/ch05/page_05.jpg",
        pageNumber: 5,
        label: "Chapter 5 • Page 5 — II. The Physical Substrate: Wood Pulp Chemistry & Acid Hydrolysis",
      },
      {
        src: "/book-pages/ch05/page_06.jpg",
        pageNumber: 6,
        label: "Chapter 5 • Page 6 — Encapsulation Mechanics & Conservation Thermodynamics",
      },
      {
        src: "/book-pages/ch05/page_07.jpg",
        pageNumber: 7,
        label: "Chapter 5 • Page 7 — Physical Survivorship Bounds & Condition Convexity",
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
      "A 3-page section from Chapter 13: how municipal censorship boards in Detroit, Los Angeles, and Binghamton mobilized 50,000-comic kerosene pyres—permanently crushing pre-Code populations.",
    quote:
      "The public pyres of 1948 were not spontaneous grass-roots outbursts; they were meticulously stage-managed civic rituals designed to exert social control through theatrical destruction.",
    wordCount: "3-Page Section",
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
  {
    id: "chapter-01-the-room-test",
    volume: "VOLUME I: THE ART",
    chapter: "Chapter 1",
    title: "The Room Test & The 20-Metric Standard",
    subtitle: "Three-Tier Score Discipline, Reportage vs. Commentary & The Price Firewall",
    topic: "VALUATION ARCHITECTURE & APPRAISAL SCIENCE",
    summary:
      "A 3-page section from Chapter 1: Gregory D. Goyins's comparative measurement apparatus—why no single cover or auction record can carry a book across twenty coequal metrics.",
    quote:
      "Every metric is worth exactly one-twentieth, five percent, of a perfect score, so no single virtue can carry a book; the most famous cover or the largest auction record can earn at most ten points and must still answer nineteen other questions.",
    wordCount: "3-Page Section",
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
];
