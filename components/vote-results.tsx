import { Badge } from "@/components/ui/badge";
import type { VoteResult } from "@/types/game";

interface VoteResultsProps {
  results: VoteResult[];
}

export function VoteResults({ results }: VoteResultsProps) {
  return (
    <section className="mt-6" aria-labelledby="vote-results-title">
      <h2 id="vote-results-title" className="text-lg">
        Résultats du vote
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {results.map((result) => (
          <li
            key={result.playerPublicId}
            className={`flex items-center justify-between gap-3 border px-4 py-3 ${
              result.isMostVoted ? "border-orange-400/40 bg-orange-400/10" : "bg-muted/20"
            }`}
          >
            <span className="min-w-0 truncate">{result.playerName}</span>
            <span className="flex shrink-0 items-center gap-2">
              {result.isMostVoted && <Badge variant="secondary">En tête</Badge>}
              <span className="tabular-nums text-muted-foreground">
                {result.voteCount} voix
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
