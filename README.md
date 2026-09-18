# Panel Profits — Comic Market Intelligence & Catalog

Production-grade comic book market intelligence platform and financial catalog.

## Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19 Server Components
- **Language**: TypeScript (Strict Mode enabled)
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Database**: Supabase PostgreSQL (`public.comics` containing 3,481,445 records)
- **Testing**: Vitest
- **Runtime**: Node.js 24 + npm
- **Deployment**: Vercel-ready

## Features

- **`/comics`**: High-performance keyset/cursor-paginated comic catalog surveillance with instant search by series/title, exact issue filtering, publisher, year, and variant categorization. Preserves search state in URL query parameters.
- **`/comics/[id]`**: Detailed comic dossier featuring primary cover resolution (with graceful in-migration states), identity metadata, 3-tier valuation summary (Panel Profits 9.8 price, ComicBase price, and Blended Baseline), and complete source provenance (Panel Profits, ComicBase, GCD).
- **Zero Schema Mutation**: Strict read-only integration against the authoritative `Panel Profits Clean` database.

## Environment Variables

Required environment variables for deployment and local execution:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vbcmjmakluyjnsmisoth.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run unit tests
npm test

# Run type check
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```
