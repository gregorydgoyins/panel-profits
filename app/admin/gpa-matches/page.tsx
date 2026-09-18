import { getGpaMatches } from './actions';
import { GpaMatchReviewManager } from '@/components/admin/gpa-match-review';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'GPA Match Review | Panel Profits Admin',
  description: 'Review and confirm comic matches discovered by the GPA browser ingestion pipeline.',
};

export default async function GpaMatchesAdminPage() {
  const matches = await getGpaMatches('PENDING_REVIEW');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-light tracking-wide text-slate-100">
              GPA Catalog Discovery & Match Review
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Adjudicate and confirm issue linkages between GPA titles and canonical records in <code className="text-slate-300">public.comics</code>.
          </p>
        </div>
      </div>

      <GpaMatchReviewManager initialMatches={matches} />
    </div>
  );
}
