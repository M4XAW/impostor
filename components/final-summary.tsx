import { Button } from "@/components/ui/button";
import type { SeriesSummary } from "@/types/game";

interface FinalSummaryProps {
  summary: SeriesSummary;
  isHost: boolean;
  onRematch: () => void;
}

function globalWinnerLabel(globalWinner: SeriesSummary["globalWinner"]) {
  if (globalWinner === "CIVILIANS") return "Victoire globale des civils";
  if (globalWinner === "IMPOSTORS") return "Victoire globale des imposteurs";
  return "Égalité parfaite";
}

function formatAverageVotes(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export function FinalSummary({ summary, isHost, onRematch }: FinalSummaryProps) {
  return (
    <section className="mt-6" aria-labelledby="final-summary-title">
      <div className="border border-orange-400/30 bg-orange-400/10 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-orange-300">Résultat final</p>
        <h2 id="final-summary-title" className="mt-2 text-2xl">
          {globalWinnerLabel(summary.globalWinner)}
        </h2>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="border bg-muted/30 p-4 text-center">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Civils</dt>
          <dd className="mt-1 text-3xl">{summary.civilianMatchWins}</dd>
          <dd className="text-xs text-muted-foreground">manches gagnées</dd>
        </div>
        <div className="border bg-muted/30 p-4 text-center">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Imposteurs</dt>
          <dd className="mt-1 text-3xl">{summary.impostorMatchWins}</dd>
          <dd className="text-xs text-muted-foreground">manches gagnées</dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="border p-4">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground">
            Meilleur détective
          </h3>
          <p className="mt-2 text-lg">
            {summary.bestDetective?.playerNames.join(", ") ?? "Aucun"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.bestDetective
              ? `${summary.bestDetective.value} votes corrects`
              : "Aucun vote civil correct"}
          </p>
        </article>
        <article className="border p-4">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground">
            Imposteur le plus discret
          </h3>
          <p className="mt-2 text-lg">
            {summary.stealthiestImpostor?.playerNames.join(", ") ?? "Aucun"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.stealthiestImpostor
              ? `${formatAverageVotes(summary.stealthiestImpostor.value)} voix reçues par manche jouée comme imposteur`
              : "Aucune manche jouée comme imposteur"}
          </p>
        </article>
      </div>

      <div className="mt-6 overflow-x-auto">
        <h3 className="mb-3 text-lg">Classement individuel</h3>
        <table className="w-full min-w-80 border-collapse text-left">
          <thead>
            <tr className="border bg-muted/30">
              <th className="px-3 py-2 font-medium">Joueur</th>
              <th className="px-3 py-2 text-right font-medium">Manches gagnées</th>
            </tr>
          </thead>
          <tbody>
            {summary.playerScores.map((playerScore, index) => (
              <tr key={playerScore.playerPublicId} className="border-x border-b">
                <td className="px-3 py-2">{index + 1}. {playerScore.playerName}</td>
                <td className="px-3 py-2 text-right">{playerScore.matchWins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-lg">Historique des manches</h3>
        <ol className="grid gap-2 sm:grid-cols-2">
          {summary.matches.map((match) => (
            <li key={match.matchNumber} className="border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <strong>Manche {match.matchNumber}</strong>
                <span className="text-xs text-orange-300">
                  {match.winner === "CIVILIANS" ? "Civils" : "Imposteurs"}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                {match.civilianWord} / {match.impostorWord}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {match.isVoteTie ? "Égalité au vote · " : ""}
                {match.impostorNames.join(", ")}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 border-t pt-5">
        {isHost ? (
          <Button onClick={onRematch}>Proposer une revanche</Button>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            En attente de l’hôte pour une éventuelle revanche.
          </p>
        )}
      </div>
    </section>
  );
}
