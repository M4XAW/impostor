"use client";

import { VoteConfirmationDialog } from "@/components/vote-confirmation-dialog";
import type { PlayRoomAction } from "@/features/game/hooks/use-room-game";
import type { GameSnapshot } from "@/types/game";

interface VotingPanelProps {
  game: GameSnapshot;
  connectedPlayerPublicIds: string[] | null;
  onAction: PlayRoomAction;
}

export function VotingPanel({
  game,
  connectedPlayerPublicIds,
  onAction,
}: VotingPanelProps) {
  if (game.phase !== "VOTING") return null;

  const hasCurrentPlayerVoted = game.players.some(
    (player) => player.isSelf && player.hasVoted,
  );
  const isPlayerConnected = (publicId: string) =>
    connectedPlayerPublicIds?.includes(publicId) ?? true;

  return (
    <>
      <ul className="mt-7 space-y-2">
        {game.players.map((player) => (
          <li
            key={player.publicId}
            className={`flex items-center gap-3 border px-4 py-3 transition-opacity ${isPlayerConnected(player.publicId) ? "" : "opacity-40"}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate">
                {player.name}
                {player.isSelf ? " (toi)" : ""}
              </p>
            </div>
            {!player.isSelf && (
              <VoteConfirmationDialog
                disabled={hasCurrentPlayerVoted}
                playerName={player.name}
                onConfirm={() =>
                  void onAction({
                    action: "vote",
                    targetPublicId: player.publicId,
                  })
                }
              />
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <h2>Votes anonymes</h2>
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {game.voteProgress.submittedCount} / {game.voteProgress.requiredCount}{" "}
          votes enregistrés
        </p>
      </div>
    </>
  );
}
