"use client";

import { WarningDiamond } from "pixelarticons/react";
import { TurnCountdown } from "@/components/turn-countdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  ClueError,
  PlayRoomAction,
} from "@/features/game/hooks/use-room-game";
import type { GameSnapshot } from "@/types/game";

interface ClueTurnPanelProps {
  game: GameSnapshot;
  secondsLeft: number;
  clue: string;
  clueError: ClueError | null;
  activeTurnKey: string | null;
  onClueChange: (clue: string) => void;
  onAction: PlayRoomAction;
}

export function ClueTurnPanel({
  game,
  secondsLeft,
  clue,
  clueError,
  activeTurnKey,
  onClueChange,
  onAction,
}: ClueTurnPanelProps) {
  if (game.phase !== "DISCUSSION" || !game.turn) return null;

  const selfPlayer = game.players.find((player) => player.isSelf);
  const currentTurnPlayer = game.players.find(
    (player) => player.publicId === game.turn?.currentPlayerPublicId,
  );
  const canSubmitClue = game.turn.currentPlayerPublicId === selfPlayer?.publicId;
  const isTurnEndingSoon = secondsLeft <= 10;

  return (
    <>
      <div
        className={`mt-5 flex items-center justify-between border p-4 ${
          isTurnEndingSoon
            ? "border-red-400/70 bg-red-500/15 text-red-200"
            : "border-orange-400/20 bg-orange-400/10"
        }`}
      >
        <div>
          <p>
            {currentTurnPlayer?.name}
            {canSubmitClue ? " — c’est toi" : ""}
          </p>
          <p
            className={`mt-1 text-sm ${isTurnEndingSoon ? "text-red-200/80" : "text-foreground"}`}
          >
            Manche {game.turn.matchNumber}/{game.settings.matchCount} · tour
            d’indices {game.turn.clueRoundNumber}/
            {game.settings.clueRoundCount}
          </p>
        </div>
        <TurnCountdown secondsLeft={secondsLeft} />
      </div>

      {canSubmitClue && (
        <form
          className="mt-6 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const content = clue.trim();
            if (!content) return;

            void onAction({ action: "clue", content }).then((succeeded) => {
              if (succeeded) onClueChange("");
            });
          }}
        >
          <Field>
            <ButtonGroup>
              <FieldLabel htmlFor="clue" className="sr-only">
                Ton indice
              </FieldLabel>
              <Input
                id="clue"
                value={clue}
                onChange={(event) => onClueChange(event.target.value)}
                maxLength={40}
                placeholder="Saisis un mot qui ressemble…"
                required
              />
              <Button size="lg">Valider</Button>
            </ButtonGroup>
          </Field>
        </form>
      )}

      {canSubmitClue && clueError?.turnKey === activeTurnKey && (
        <Alert variant="destructive" className="mt-3">
          <WarningDiamond aria-hidden="true" />
          <AlertTitle>Indice refusé</AlertTitle>
          <AlertDescription>{clueError.message}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
