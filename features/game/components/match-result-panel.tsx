"use client";

import { VoteResults } from "@/components/vote-results";
import type { GameSnapshot } from "@/types/game";

interface MatchResultPanelProps {
  game: GameSnapshot;
  isHost: boolean;
}

export function MatchResultPanel({ game, isHost }: MatchResultPanelProps) {
  if (game.phase !== "RESULTS" || !game.result || game.seriesSummary) {
    return null;
  }

  const hasNextMatch = game.result.matchNumber < game.settings.matchCount;

  return (
    <>
      <dl className="mt-6 grid gap-3 border bg-muted/40 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {game.result.impostorNames.length > 1 ? "Imposteurs" : "Imposteur"}
          </dt>
          <dd className="mt-1">{game.result.impostorNames.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Mot des civils
          </dt>
          <dd className="mt-1">{game.result.civilianWord}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {game.result.impostorNames.length > 1
              ? "Mot des imposteurs"
              : "Mot de l’imposteur"}
          </dt>
          <dd className="mt-1">{game.result.impostorWord}</dd>
        </div>
      </dl>

      <VoteResults results={game.result.voteResults} />

      {game.result.isVoteTie && (
        <p className="mt-4 border border-orange-400/30 bg-orange-400/10 p-3 text-sm text-orange-200">
          Égalité : aucun imposteur n’a été formellement identifié.
        </p>
      )}

      {hasNextMatch && !isHost && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          En attente de l’hôte pour lancer la manche suivante.
        </p>
      )}
      {!hasNextMatch && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          Toutes les manches sont terminées.
        </p>
      )}
    </>
  );
}
