"use client";

import { useEffect, useRef } from "react";
import { NumberField } from "@/components/number-field";
import {
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/number-field";
import { Field, FieldLabel } from "@/components/ui/field";
import type { PlayRoomAction } from "@/features/game/hooks/use-room-game";
import type { GameSnapshot } from "@/types/game";

type SettingName = keyof GameSnapshot["settings"];

const settingFields: Array<{
  name: SettingName;
  label: string;
  min: number;
  max: number;
}> = [
  { name: "matchCount", label: "Nombre de manches", min: 1, max: 20 },
  {
    name: "clueRoundCount",
    label: "Tours d’indices par manche",
    min: 1,
    max: 10,
  },
  { name: "turnSeconds", label: "Secondes par tour", min: 10, max: 120 },
  { name: "impostorCount", label: "Imposteurs", min: 1, max: 3 },
];

interface GameSettingsProps {
  game: GameSnapshot;
  isHost: boolean;
  onSave: PlayRoomAction;
}

export function GameSettings({ game, isHost, onSave }: GameSettingsProps) {
  const settingsKey = `${game.settings.matchCount}-${game.settings.clueRoundCount}-${game.settings.turnSeconds}-${game.settings.impostorCount}`;
  const latestSettings = useRef(game.settings);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (!isHost) latestSettings.current = game.settings;
  }, [game.settings, isHost]);

  function updateSetting(
    field: (typeof settingFields)[number],
    value: number | null,
  ) {
    if (
      value === null ||
      !Number.isInteger(value) ||
      value < field.min ||
      value > field.max ||
      latestSettings.current[field.name] === value
    ) {
      return;
    }

    const nextSettings = { ...latestSettings.current, [field.name]: value };
    latestSettings.current = nextSettings;
    saveQueue.current = saveQueue.current
      .then(async () => {
        await onSave({ action: "settings", ...nextSettings });
      })
      .catch(() => undefined);
  }

  const settingsContent = (
    <>
      <h2 className="text-lg">Paramètres de partie</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
        {settingFields.map((field) => (
          <Field key={field.name}>
            <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
            <NumberField
              name={field.name}
              defaultValue={game.settings[field.name]}
              min={field.min}
              max={field.max}
              disabled={!isHost}
              onValueChange={(value) => updateSetting(field, value)}
            >
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput id={field.name} />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
          </Field>
        ))}
      </div>
    </>
  );

  if (!isHost) {
    return (
      <div key={settingsKey} className="w-full lg:w-72 lg:shrink-0">
        {settingsContent}
      </div>
    );
  }

  return <div className="w-full lg:w-72 lg:shrink-0">{settingsContent}</div>;
}
