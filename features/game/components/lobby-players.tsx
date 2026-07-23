"use client";

import { AvatarCircle, Plus } from "pixelarticons/react";
import { TransferHostContextMenu } from "@/components/transfer-host-context-menu";
import { Button } from "@/components/ui/button";
import type { PlayRoomAction } from "@/features/game/hooks/use-room-game";
import type { GameSnapshot } from "@/types/game";

export const MAX_PLAYERS = 6;

interface LobbyPlayersProps {
  game: GameSnapshot;
  connectedPlayerPublicIds: string[] | null;
  copiedSlotIndex: number | null;
  onAction: PlayRoomAction;
  onCopyInvite: (slotIndex: number) => Promise<void>;
}

export function LobbyPlayers({
  game,
  connectedPlayerPublicIds,
  copiedSlotIndex,
  onAction,
  onCopyInvite,
}: LobbyPlayersProps) {
  const isHost = game.currentPlayer.isHost;
  const selfPlayer = game.players.find((player) => player.isSelf);
  const isPlayerConnected = (publicId: string) =>
    connectedPlayerPublicIds?.includes(publicId) ?? true;

  return (
    <>
      <ul
        className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Joueurs du salon"
      >
        {game.players.map((player) => {
          const canTransferHost = isHost && !player.isSelf;
          const playerCard = (
            <li
              key={player.publicId}
              className={`grid aspect-square min-w-0 place-items-center border border-dotted p-3 ${player.isHost ? "border-white bg-white text-black" : ""} ${canTransferHost ? "cursor-context-menu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : ""} transition-opacity ${isPlayerConnected(player.publicId) ? "" : "opacity-40"}`}
              tabIndex={canTransferHost ? 0 : undefined}
              aria-label={
                canTransferHost
                  ? `${player.name}, menu de gestion du joueur`
                  : undefined
              }
            >
              <div className="flex flex-col items-center gap-2">
                <AvatarCircle />
                <div className="flex max-w-full flex-col items-center gap-1">
                  <span className="max-w-full wrap-anywhere text-center">
                    {player.name}
                  </span>
                  <span
                    className={`text-[0.65rem] uppercase tracking-wider ${player.isHost ? "text-black/60" : player.isReady ? "text-emerald-300" : "text-muted-foreground"}`}
                  >
                    {player.isReady ? "Prêt" : "Pas prêt"}
                  </span>
                  {!isPlayerConnected(player.publicId) && (
                    <span className="sr-only"> — hors ligne</span>
                  )}
                </div>
              </div>
            </li>
          );

          if (!canTransferHost) return playerCard;

          return (
            <TransferHostContextMenu
              key={player.publicId}
              playerName={player.name}
              disabled={!isPlayerConnected(player.publicId)}
              onConfirm={() =>
                void onAction({
                  action: "transferHost",
                  targetPlayerPublicId: player.publicId,
                })
              }
              onRemove={() =>
                void onAction({
                  action: "kick",
                  targetPlayerPublicId: player.publicId,
                })
              }
            >
              {playerCard}
            </TransferHostContextMenu>
          );
        })}
        {Array.from({
          length: Math.max(0, MAX_PLAYERS - game.players.length),
        }).map((_, index) => (
          <li
            key={`empty-player-slot-${index}`}
            className="aspect-square min-w-0 border border-dotted text-muted-foreground"
          >
            <button
              type="button"
              className="grid size-full cursor-pointer place-items-center p-3 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={
                copiedSlotIndex === index
                  ? "Lien d’invitation copié"
                  : "Copier le lien d’invitation"
              }
              onClick={() => void onCopyInvite(index)}
            >
              {copiedSlotIndex === index ? (
                <span className="text-xs">Copié</span>
              ) : (
                <Plus aria-hidden="true" />
              )}
            </button>
          </li>
        ))}
      </ul>
      {selfPlayer && (
        <Button
          type="button"
          className="mt-4"
          variant={selfPlayer.isReady ? "outline" : "default"}
          aria-pressed={selfPlayer.isReady}
          onClick={() =>
            void onAction({
              action: "ready",
              isReady: !selfPlayer.isReady,
            })
          }
        >
          {selfPlayer.isReady ? "Annuler mon statut prêt" : "Je suis prêt"}
        </Button>
      )}
    </>
  );
}
