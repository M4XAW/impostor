"use client";

import Link from "next/link";
import { WarningDiamond } from "pixelarticons/react";
import { FinalSummary } from "@/components/final-summary";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { GameRulesDialog } from "@/components/game-rules-dialog";
import { LeaveRoomDialog } from "@/components/leave-room-dialog";
import { RoundGrid } from "@/components/round-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClueTurnPanel } from "@/features/game/components/clue-turn-panel";
import { GameSettings } from "@/features/game/components/game-settings";
import {
  LobbyPlayers,
  MAX_PLAYERS,
} from "@/features/game/components/lobby-players";
import { MatchResultPanel } from "@/features/game/components/match-result-panel";
import { VotingPanel } from "@/features/game/components/voting-panel";
import { useRoomGame } from "@/features/game/hooks/use-room-game";
import type { GameSnapshot } from "@/types/game";

interface RoomClientProps {
  code: string;
}

function getPhaseLabel(game: GameSnapshot) {
  if (game.phase === "LOBBY") return "Salon";
  if (game.phase === "DISCUSSION") return "Tour en cours";
  if (game.phase === "VOTING") return "Vote";
  if (game.result) {
    return `Résultats · manche ${game.result.matchNumber}/${game.settings.matchCount}`;
  }
  return "Résultats";
}

function getPageTitle(game: GameSnapshot) {
  if (game.phase === "LOBBY") return "En attente des joueurs";
  if (game.phase === "DISCUSSION") {
    return `Ton mot : ${game.currentPlayer.word ?? "?"}`;
  }
  if (game.phase === "VOTING") return "Qui est l’imposteur ?";
  if (game.seriesSummary || game.endReason === "NOT_ENOUGH_PLAYERS") {
    return "Partie terminée";
  }
  if (game.matchWinner === "CIVILIANS") return "Les civils gagnent la manche";
  return game.settings.impostorCount > 1
    ? "Les imposteurs gagnent la manche"
    : "L’imposteur gagne la manche";
}

export function RoomClient({ code }: RoomClientProps) {
  const {
    game,
    error,
    clue,
    setClue,
    clueError,
    activeTurnKey,
    copiedSlotIndex,
    connectedPlayerPublicIds,
    isLeaving,
    secondsLeft,
    play,
    copyInvite,
    leaveRoom,
  } = useRoomGame(code);

  if (error && !game) {
    return (
      <main className="grid flex-1 place-items-center">
        <div className="flex flex-col items-center">
          <WarningDiamond className="size-13 text-rose-300" />
          <h1 className="mb-2 text-2xl">Accès refusé</h1>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button asChild>
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!game) return <FullScreenLoader label="Chargement de la partie" />;

  const isHost = game.currentPlayer.isHost;
  const canBeginVote =
    game.phase === "DISCUSSION" && isHost && game.turn?.canStartVote === true;
  const hasNextMatch =
    game.phase === "RESULTS" &&
    game.result !== undefined &&
    game.result.matchNumber < game.settings.matchCount;
  const canStartNextMatch = hasNextMatch && isHost;
  const connectedPlayerCount = connectedPlayerPublicIds?.length ?? 0;
  const allPlayersReady =
    game.players.length >= 3 && game.players.every((player) => player.isReady);
  const allPlayersConnected =
    connectedPlayerPublicIds !== null &&
    connectedPlayerCount === game.players.length;
  const canLaunchGame = allPlayersReady && allPlayersConnected;
  const startRequirement =
    connectedPlayerPublicIds === null
      ? "Vérification des joueurs connectés…"
      : game.players.length < 3
        ? `Il manque ${3 - game.players.length} joueur${game.players.length === 2 ? "" : "s"} pour commencer`
        : !allPlayersConnected
          ? "Tous les joueurs du salon doivent être connectés"
          : !allPlayersReady
            ? "Tous les joueurs doivent être prêts"
            : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card className="flex-1">
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm uppercase tracking-widest text-orange-300">
                  {getPhaseLabel(game)}
                </p>
                <Badge variant="secondary">{game.code}</Badge>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <GameRulesDialog />
                <LeaveRoomDialog
                  isLeaving={isLeaving}
                  onConfirm={() => void leaveRoom()}
                />
              </div>
            </div>

            <h1 className="mt-2 text-3xl">{getPageTitle(game)}</h1>

            {game.phase === "LOBBY" && (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                {game.players.length} / {MAX_PLAYERS}
              </p>
            )}

            {game.phase === "RESULTS" && game.seriesSummary && (
              <FinalSummary
                summary={game.seriesSummary}
                isHost={isHost}
                onRematch={() => void play({ action: "rematch" })}
              />
            )}

            <MatchResultPanel game={game} isHost={isHost} />

            {game.endReason === "NOT_ENOUGH_PLAYERS" && (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                Il ne reste plus assez de joueurs pour continuer la partie.
              </p>
            )}

            <ClueTurnPanel
              game={game}
              secondsLeft={secondsLeft}
              clue={clue}
              clueError={clueError}
              activeTurnKey={activeTurnKey}
              onClueChange={setClue}
              onAction={play}
            />

            {game.phase === "LOBBY" && (
              <LobbyPlayers
                game={game}
                connectedPlayerPublicIds={connectedPlayerPublicIds}
                copiedSlotIndex={copiedSlotIndex}
                onAction={play}
                onCopyInvite={copyInvite}
              />
            )}

            {game.phase !== "LOBBY" && !game.seriesSummary && (
              <RoundGrid
                game={game}
                connectedPlayerPublicIds={connectedPlayerPublicIds}
              />
            )}

            <VotingPanel
              game={game}
              connectedPlayerPublicIds={connectedPlayerPublicIds}
              onAction={play}
            />

            {error && (
              <p className="mt-4 text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
          </CardContent>

          {(canBeginVote || canStartNextMatch) && (
            <CardFooter>
              {canBeginVote ? (
                <Button onClick={() => void play({ action: "beginVote" })}>
                  Passer au vote
                </Button>
              ) : (
                <Button onClick={() => void play({ action: "nextMatch" })}>
                  Lancer la manche suivante
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        {game.phase === "LOBBY" && (
          <Card>
            <CardContent>
              <GameSettings game={game} isHost={isHost} onSave={play} />
            </CardContent>
            {isHost && (
              <CardFooter>
                {canLaunchGame ? (
                  <Button
                    className="w-full"
                    onClick={() => void play({ action: "start" })}
                  >
                    Lancer la partie
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block w-full">
                        <Button disabled className="w-full">
                          Lancer la partie
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{startRequirement}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}
