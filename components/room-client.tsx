"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { RoundGrid } from "@/components/round-grid";
import { TransferHostContextMenu } from "@/components/transfer-host-context-menu";
import type { GameSnapshot } from "@/types/game";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    NumberField,
    NumberFieldDecrement,
    NumberFieldGroup,
    NumberFieldIncrement,
    NumberFieldInput,
} from "@/components/number-field"
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { AvatarCircle, Loader, Plus } from 'pixelarticons/react'

interface RoomClientProps {
    code: string;
}

type SettingName = keyof GameSnapshot["settings"];

interface RoomPresence {
    connectedPlayerPublicIds: string[];
}

const settingFields: Array<{
    name: SettingName;
    label: string;
    min: number;
    max: number;
}> = [
        { name: "wordCount", label: "Nombre de mots", min: 1, max: 20 },
        { name: "roundCount", label: "Tours par mot", min: 1, max: 10 },
        { name: "turnSeconds", label: "Secondes par tour", min: 10, max: 120 },
        { name: "impostorCount", label: "Imposteurs", min: 1, max: 3 },
    ];

function isGameSnapshot(value: unknown): value is GameSnapshot {
    return (
        typeof value === "object" &&
        value !== null &&
        "phase" in value &&
        "players" in value &&
        "settings" in value
    );
}

function isRoomPresence(value: unknown): value is RoomPresence {
    return (
        typeof value === "object" &&
        value !== null &&
        "connectedPlayerPublicIds" in value &&
        Array.isArray(value.connectedPlayerPublicIds) &&
        value.connectedPlayerPublicIds.every((publicId) => typeof publicId === "string")
    );
}

export function RoomClient({ code }: RoomClientProps) {
    const [game, setGame] = useState<GameSnapshot | null>(null);
    const [error, setError] = useState("");
    const [clue, setClue] = useState("");
    const [copiedSlotIndex, setCopiedSlotIndex] = useState<number | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [connectedPlayerPublicIds, setConnectedPlayerPublicIds] = useState<string[] | null>(null);
    const [now, setNow] = useState(0);

    const refresh = useCallback(async () => {
        const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok || !isGameSnapshot(payload)) {
            setError(
                typeof payload === "object" &&
                    payload !== null &&
                    "error" in payload &&
                    typeof payload.error === "string"
                    ? payload.error
                    : "Impossible de charger la partie.",
            );
            return;
        }

        setGame(payload);
        setError("");
    }, [code]);

    useEffect(() => {
        const initial = window.setTimeout(() => void refresh(), 0);
        const interval = window.setInterval(() => void refresh(), 2000);

        return () => {
            window.clearTimeout(initial);
            window.clearInterval(interval);
        };
    }, [refresh]);

    useEffect(() => {
        const initial = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);

        return () => {
            window.clearTimeout(initial);
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        const socket = io({ path: "/socket.io" });
        const watchRoom = () => socket.emit("room:watch", code);

        socket.on("connect", watchRoom);
        socket.on("room:changed", () => void refresh());
        socket.on("room:presence", (presence: unknown) => {
            if (isRoomPresence(presence)) {
                setConnectedPlayerPublicIds(presence.connectedPlayerPublicIds);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [code, refresh]);

    useEffect(() => {
        if (copiedSlotIndex === null) return;

        const timeout = window.setTimeout(() => setCopiedSlotIndex(null), 500);

        return () => window.clearTimeout(timeout);
    }, [copiedSlotIndex]);

    async function play(payload: Record<string, unknown>) {
        const response = await fetch(`/api/rooms/${code}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            setError(
                typeof result === "object" &&
                    result !== null &&
                    "error" in result &&
                    typeof result.error === "string"
                    ? result.error
                    : "Action impossible.",
            );
        }

        await refresh();
    }

    async function copyInvite(slotIndex: number) {
        await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
        setCopiedSlotIndex(slotIndex);
    }

    async function leaveRoom() {
        setIsLeaving(true);
        const response = await fetch(`/api/rooms/${code}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "leave" }),
        });
        const result: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            setError(
                typeof result === "object" &&
                    result !== null &&
                    "error" in result &&
                    typeof result.error === "string"
                    ? result.error
                    : "Impossible de quitter la partie.",
            );
            setIsLeaving(false);
            return;
        }

        window.location.assign("/");
    }

    if (error && !game) {
        return (
            <main className="grid place-items-center flex-1">
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl mb-2">Accès refusé</h1>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <Button asChild>
                        <Link href="/">Retour à l’accueil</Link>
                    </Button>
                </div>
            </main>
        );
    }

    if (!game) {
        return <FullScreenLoader label="Chargement de la partie" />;
    }

    const isHost = game.currentPlayer.isHost;
    const selfPlayer = game.players.find((player) => player.isSelf);
    const currentTurnPlayer = game.turn
        ? game.players.find((player) => player.publicId === game.turn?.currentPlayerPublicId)
        : undefined;
    const secondsLeft = game.turn ? Math.max(0, Math.ceil((new Date(game.turn.endsAt).getTime() - now) / 1000)) : 0;
    const canSubmitClue = game.phase === "DISCUSSION" && game.turn?.currentPlayerPublicId === selfPlayer?.publicId;
    const canStartGame = game.phase === "LOBBY" && isHost;
    const canBeginVote = game.phase === "DISCUSSION" && isHost && game.turn?.canStartVote === true;
    const hasCurrentPlayerVoted = game.players.some(
        (player) => player.isSelf && player.hasVoted,
    );
    const isPlayerConnected = (publicId: string) => connectedPlayerPublicIds?.includes(publicId) ?? true;

    return (
        <main className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <Card className="flex-1">
                    <CardContent>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <p className="text-sm uppercase tracking-widest text-orange-300">
                                    {game.phase === "LOBBY" ? "Salon" :
                                        game.phase === "DISCUSSION" ? "Tour en cours"
                                            : game.phase === "VOTING" ? "Vote" : "Résultats"}
                                </p>
                                <Badge variant="secondary">{game.code}</Badge>
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={isLeaving}
                                onClick={() => void leaveRoom()}
                            >
                                {isLeaving ? <Loader className="animate-spin" /> : "Quitter"}
                            </Button>
                        </div>

                        <h1 className="mt-2 text-3xl">
                            {game.phase === "LOBBY"
                                ? "En attente des joueurs"
                                : game.phase === "DISCUSSION"
                                    ? `Ton mot : ${game.currentPlayer.word ?? "?"}`
                                    : game.phase === "RESULTS"
                                        ? game.endReason === "NOT_ENOUGH_PLAYERS"
                                            ? "Partie terminée"
                                            : game.winner === "CIVILIANS"
                                                ? "Les civils gagnent"
                                                : "L’imposteur gagne"
                                        : "Qui est l’imposteur ?"}
                        </h1>

                        {game.phase === "RESULTS" && game.result && (
                            <dl className="mt-6 grid gap-3 border bg-muted/40 p-4 sm:grid-cols-3">
                                <div>
                                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {game.result.impostorNames.length > 1 ? "Imposteurs" : "Imposteur"}
                                    </dt>
                                    <dd className="mt-1 font-semibold">
                                        {game.result.impostorNames.join(", ")}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Mot des civils
                                    </dt>
                                    <dd className="mt-1 font-semibold">{game.result.civilianWord}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {game.result.impostorNames.length > 1
                                            ? "Mot des imposteurs"
                                            : "Mot de l’imposteur"}
                                    </dt>
                                    <dd className="mt-1 font-semibold">{game.result.impostorWord}</dd>
                                </div>
                            </dl>
                        )}

                        {game.endReason === "NOT_ENOUGH_PLAYERS" && (
                            <p className="mt-2 text-sm text-muted-foreground" role="status">
                                Il ne reste plus assez de joueurs pour continuer la partie.
                            </p>
                        )}

                        {game.phase === "DISCUSSION" && game.turn && (
                            <div className="mt-5 flex items-center justify-between border border-orange-400/20 bg-orange-400/10 p-4">
                                <div>
                                    <p className="text-sm text-orange-300">À jouer maintenant</p>
                                    <p>
                                        {currentTurnPlayer?.name}
                                        {canSubmitClue ? " — c’est toi" : ""}
                                    </p>
                                    <p className="mt-1 text-sm text-foreground">
                                        Mot {game.turn.wordNumber}/{game.settings.wordCount} · tour {game.turn.roundNumber}/{game.settings.roundCount}
                                    </p>
                                </div>
                                <strong className="text-3xl tabular-nums text-orange-300">
                                    {secondsLeft}s
                                </strong>
                            </div>
                        )}

                        {game.phase === "LOBBY" && (
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
                                                className={`grid aspect-square min-w-0 place-items-center border border-dotted ${player.isHost ? "border-white bg-white text-black" : ""} ${canTransferHost ? "cursor-context-menu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : ""}`}
                                                tabIndex={canTransferHost ? 0 : undefined}
                                                aria-label={canTransferHost ? `${player.name}, menu de gestion du joueur` : undefined}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <AvatarCircle />
                                                    <div
                                                        className={`flex max-w-full flex-col items-center gap-1 transition-opacity ${isPlayerConnected(player.publicId) ? "" : "opacity-40"}`}
                                                    >
                                                        <span className="max-w-full wrap-anywhere text-center">
                                                            {player.name}
                                                        </span>
                                                        {!isPlayerConnected(player.publicId) && (
                                                            <span className="sr-only"> — hors ligne</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );

                                        if (!canTransferHost) {
                                            return playerCard;
                                        }

                                        return (
                                            <TransferHostContextMenu
                                                key={player.publicId}
                                                playerName={player.name}
                                                disabled={!isPlayerConnected(player.publicId)}
                                                onConfirm={() => void play({
                                                    action: "transferHost",
                                                    targetPlayerPublicId: player.publicId,
                                                })}
                                                onRemove={() => void play({
                                                    action: "kick",
                                                    targetPlayerPublicId: player.publicId,
                                                })}
                                            >
                                                {playerCard}
                                            </TransferHostContextMenu>
                                        );
                                    })}
                                    {Array.from({ length: Math.max(0, 6 - game.players.length) }).map((_, index) => (
                                        <li
                                            key={`empty-player-slot-${index}`}
                                            className="aspect-square min-w-0 border border-dotted text-muted-foreground"
                                        >
                                            <button
                                                type="button"
                                                className="grid size-full cursor-pointer place-items-center p-3 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                aria-label={copiedSlotIndex === index ? "Lien d’invitation copié" : "Copier le lien d’invitation"}
                                                onClick={() => void copyInvite(index)}
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
                            </>
                        )}

                        {canSubmitClue && (
                            <form
                                className="mt-6 flex gap-2"
                                onSubmit={(event) => {
                                    event.preventDefault();

                                    if (clue.trim()) {
                                        void play({ action: "clue", content: clue.trim() });
                                        setClue("");
                                    }
                                }}
                            >
                                <Field>
                                    <ButtonGroup>
                                        <FieldLabel htmlFor="clue" className="sr-only">Ton indice</FieldLabel>
                                        <Input
                                            id="clue"
                                            value={clue}
                                            onChange={(event) => setClue(event.target.value)}
                                            maxLength={40}
                                            placeholder="Saisis un mot qui ressemble…"
                                            required
                                        />
                                        <Button size="lg">Valider</Button>
                                    </ButtonGroup>
                                </Field>
                            </form>
                        )}

                        {game.phase !== "LOBBY" && (
                            <RoundGrid game={game} connectedPlayerPublicIds={connectedPlayerPublicIds} />
                        )}

                        {game.phase === "VOTING" && (
                            <ul className="mt-7 space-y-2">
                                {game.players.map((player) => (
                                    <li
                                        key={player.publicId}
                                        className={`flex items-center gap-3 border px-4 py-3 transition-opacity ${isPlayerConnected(player.publicId) ? "" : "opacity-40"}`}
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {player.name}
                                            {player.isSelf ? " (toi)" : ""}
                                        </span>
                                        {!player.isSelf && (
                                            <Button
                                                disabled={hasCurrentPlayerVoted}
                                                onClick={() =>
                                                    void play({
                                                        action: "vote",
                                                        targetPublicId: player.publicId,
                                                    })
                                                }
                                            >
                                                Voter
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {game.phase === "VOTING" && (
                            <div className="mt-6">
                                <h2>Votes visibles</h2>
                                {game.votes.length === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Aucun vote pour le moment.
                                    </p>
                                ) : (
                                    <ul className="mt-2 space-y-2">
                                        {game.votes.map((vote) => (
                                            <li
                                                key={`${vote.voterPublicId}-${vote.targetPublicId}`}
                                                className="bg-muted px-4 py-2 text-sm"
                                            >
                                                <strong>{vote.voterName}</strong> a voté pour{" "}
                                                <strong>{vote.targetName}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p>
                        )}
                    </CardContent>
                    {(canStartGame || canBeginVote) && (
                        <CardFooter>
                            {canStartGame && (

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-block w-fit">
                                            <Button
                                                onClick={() => void play({ action: "start" })}
                                                disabled={game.players.length < 3}
                                            >
                                                Lancer la partie
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p>Il manque {3 - game.players.length} joueur{game.players.length === 2 ? "" : "s"} pour commencer</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}

                            {canBeginVote && (
                                <Button
                                    onClick={() => void play({ action: "beginVote" })}
                                >
                                    Passer au vote
                                </Button>
                            )}
                        </CardFooter>
                    )}
                </Card>
                {game.phase === "LOBBY" && (
                    <Card>
                        <CardContent>
                            <Settings game={game} isHost={isHost} onSave={play} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}

function Settings({ game, isHost, onSave }: { game: GameSnapshot; isHost: boolean; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
    const settingsKey = `${game.settings.wordCount}-${game.settings.roundCount}-${game.settings.turnSeconds}-${game.settings.impostorCount}`;
    const latestSettings = useRef(game.settings);
    const saveQueue = useRef(Promise.resolve());

    useEffect(() => {
        if (!isHost) {
            latestSettings.current = game.settings;
        }
    }, [game.settings, isHost]);

    function updateSetting(field: (typeof settingFields)[number], value: number | null) {
        if (
            value === null ||
            !Number.isInteger(value) ||
            value < field.min ||
            value > field.max ||
            latestSettings.current[field.name] === value
        ) {
            return;
        }

        const nextSettings = {
            ...latestSettings.current,
            [field.name]: value,
        };

        latestSettings.current = nextSettings;
        saveQueue.current = saveQueue.current
            .then(() => onSave({ action: "settings", ...nextSettings }))
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

    if (!isHost) return <div key={settingsKey} className="w-full lg:w-72 lg:shrink-0">{settingsContent}</div>

    return <div className="w-full lg:w-72 lg:shrink-0">{settingsContent}</div>;
}
