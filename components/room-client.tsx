"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { RoundGrid } from "@/components/round-grid";
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

import { CornerUpRight, AvatarCircle, Copy, Loader } from 'pixelarticons/react'

interface RoomClientProps {
    code: string;
}

type SettingName = keyof GameSnapshot["settings"];

interface RoomPresence {
    connectedPlayerIds: string[];
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
        "connectedPlayerIds" in value &&
        Array.isArray(value.connectedPlayerIds) &&
        value.connectedPlayerIds.every((playerId) => typeof playerId === "string")
    );
}

export function RoomClient({ code }: RoomClientProps) {
    const [game, setGame] = useState<GameSnapshot | null>(null);
    const [error, setError] = useState("");
    const [clue, setClue] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [connectedPlayerIds, setConnectedPlayerIds] = useState<string[] | null>(null);
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
                setConnectedPlayerIds(presence.connectedPlayerIds);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [code, refresh]);

    useEffect(() => {
        if (!isCopied) return;

        const timeout = window.setTimeout(() => setIsCopied(false), 500);

        return () => window.clearTimeout(timeout);
    }, [isCopied]);

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

    async function copyInvite() {
        await navigator.clipboard.writeText(`${window.location.origin}/?join=${code}`);
        setIsCopied(true);
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
    const currentTurnPlayer = game.turn ? game.players.find((player) => player.id === game.turn?.currentPlayerId) : undefined;
    const secondsLeft = game.turn ? Math.max(0, Math.ceil((new Date(game.turn.endsAt).getTime() - now) / 1000)) : 0;
    const canSubmitClue = game.phase === "DISCUSSION" && game.turn?.currentPlayerId === game.currentPlayer.id;
    const canStartGame = game.phase === "LOBBY" && isHost;
    const canBeginVote = game.phase === "DISCUSSION" && isHost && game.turn?.canStartVote === true;
    const hasCurrentPlayerVoted = game.players.some(
        (player) => player.id === game.currentPlayer.id && player.hasVoted,
    );
    const isPlayerConnected = (playerId: string) => connectedPlayerIds?.includes(playerId) ?? true;

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
                                                ? "Les autres joueurs gagnent"
                                                : "L’imposteur gagne"
                                        : "Qui est l’imposteur ?"}
                        </h1>

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
                                <div className="mt-6 space-y-4">
                                    <div className="flex gap-2 p-4 border bg-muted">
                                        <code className="min-w-0 flex-1 truncate text-sm">
                                            <p className="text-sm text-muted-foreground">Lien d’invitation</p>
                                            {game.code}
                                        </code>
                                        <Button
                                            variant="secondary"
                                            disabled={isCopied}
                                            onClick={() => void copyInvite()}
                                        >
                                            {isCopied ? "Copié" : "Copier"}
                                            <Copy />
                                        </Button>
                                    </div>
                                </div>
                                <ul
                                    className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
                                    aria-label="Joueurs du salon"
                                >
                                    {game.players.map((player) => (
                                        <li
                                            key={player.id}
                                            className="grid aspect-square min-w-0 place-items-center border bg-muted p-3"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <AvatarCircle />
                                                <span
                                                    className={`max-w-full wrap-anywhere transition-opacity ${isPlayerConnected(player.id) ? "" : "opacity-40"}`}
                                                >
                                                    {player.name}
                                                    {!isPlayerConnected(player.id) && (
                                                        <span className="sr-only"> — hors ligne</span>
                                                    )}
                                                </span>
                                            </div>
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
                            <RoundGrid game={game} connectedPlayerIds={connectedPlayerIds} />
                        )}

                        {game.phase === "VOTING" && (
                            <ul className="mt-7 space-y-2">
                                {game.players.map((player) => (
                                    <li
                                        key={player.id}
                                        className={`flex items-center gap-3 border px-4 py-3 transition-opacity ${isPlayerConnected(player.id) ? "" : "opacity-40"}`}
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {player.name}
                                            {player.id === game.currentPlayer.id ? " (toi)" : ""}
                                        </span>
                                        {player.id !== game.currentPlayer.id && (
                                            <Button
                                                disabled={hasCurrentPlayerVoted}
                                                onClick={() =>
                                                    void play({
                                                        action: "vote",
                                                        targetId: player.id,
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
                                                key={`${vote.voterName}-${vote.targetName}`}
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
                                <Button
                                    onClick={() => void play({ action: "start" })}
                                    disabled={game.players.length < 3}
                                >
                                    Lancer la partie
                                    <CornerUpRight />
                                </Button>
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

    return (
        <form
            key={settingsKey}
            className="w-full lg:w-72 lg:shrink-0"
            onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);

                void onSave({
                    action: "settings",
                    wordCount: Number(data.get("wordCount")),
                    roundCount: Number(data.get("roundCount")),
                    turnSeconds: Number(data.get("turnSeconds")),
                    impostorCount: Number(data.get("impostorCount")),
                });
            }}
        >
            {settingsContent}
            <Button type="submit" className="mt-5 w-full" disabled={!isHost}>Enregistrer</Button>
        </form>
    );
}
