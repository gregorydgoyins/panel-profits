import Link from "next/link";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function LinkedBriefing({
  text,
  terms,
  linkedSet,
}: {
  text: string;
  terms: string[];
  linkedSet?: Set<string>;
}) {
  const usableTerms = terms.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!usableTerms.length) return <>{text}</>;
  const pattern = new RegExp(`(${usableTerms.map(escapeRegExp).join("|")})`, "gi");
  const localSet = linkedSet || new Set<string>();
  return (
    <>
      {text.split(pattern).map((part, index) => {
        const term = usableTerms.find((candidate) => candidate.toLowerCase() === part.toLowerCase());
        const key = term?.toLowerCase();
        if (!term || (key && localSet.has(key))) return <span key={`${part}-${index}`}>{part}</span>;
        if (key) localSet.add(key);
        return (
          <Link
            prefetch
            href={`/wiki?q=${encodeURIComponent(term)}`}
            key={`${term}-${index}`}
            className="font-medium text-pink-200 underline decoration-pink-400/70 underline-offset-4 hover:text-pink-100"
          >
            {part}
          </Link>
        );
      })}
    </>
  );
}
