"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { RoundGrid } from "@/components/round-grid";
import type { GameSnapshot } from "@/types/game";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { RiAddLine } from "@remixicon/react";
import {
    NumberField,
    NumberFieldDecrement,
    NumberFieldGroup,
    NumberFieldIncrement,
    NumberFieldInput,
} from "@/components/number-field"

interface RoomClientProps {
    code: string;
}

type SettingName = keyof GameSnapshot["settings"];

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

export function RoomClient({ code }: RoomClientProps) {
    const [game, setGame] = useState<GameSnapshot | null>(null);
    const [error, setError] = useState("");
    const [clue, setClue] = useState("");
    const [isCopied, setIsCopied] = useState(false);
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
        socket.emit("room:watch", code);
        socket.on("room:changed", () => void refresh());

        return () => {
            socket.disconnect();
        };
    }, [code, refresh]);

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

    if (error && !game) {
        return (
            <main className="grid min-h-screen place-items-center p-6 text-center text-white">
                <div>
                    <p>{error}</p>
                    <Link className="mt-4 inline-block text-orange-300 underline" href="/">
                        Retour à l’accueil
                    </Link>
                </div>
            </main>
        );
    }

    if (!game) {
        return (
            <main className="grid min-h-screen place-items-center text-slate-300">
                Chargement…
            </main>
        );
    }

    const isHost = game.currentPlayer.isHost;
    const currentTurnPlayer = game.turn ? game.players.find((player) => player.id === game.turn?.currentPlayerId) : undefined;
    const secondsLeft = game.turn ? Math.max(0, Math.ceil((new Date(game.turn.endsAt).getTime() - now) / 1000)) : 0;
    const canSubmitClue = game.phase === "DISCUSSION" && game.turn?.currentPlayerId === game.currentPlayer.id;

    return (
        <main className="px-5 pb-8 text-slate-100">
            <div className="mx-auto max-w-5xl">
                <section className="flex justify-space-between gap-6 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
                    <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
                                {game.phase === "LOBBY" ? "Salon" :
                                    game.phase === "DISCUSSION" ? "Tour en cours"
                                        : game.phase === "VOTING" ? "Vote" : "Résultats"}
                            </p>
                            <Badge variant="secondary">{game.code}</Badge>
                        </div>

                        <h1 className="mt-2 text-3xl font-black">
                            {game.phase === "LOBBY"
                                ? "En attente des joueurs"
                                : game.phase === "DISCUSSION"
                                    ? `Ton mot : ${game.currentPlayer.word ?? "?"}`
                                    : game.phase === "RESULTS"
                                        ? game.winner === "CIVILIANS"
                                            ? "Les autres joueurs gagnent"
                                            : "L’imposteur gagne" : "Qui est l’imposteur ?"}
                        </h1>

                        {game.phase === "DISCUSSION" && game.turn && (
                            <div className="mt-5 flex items-center justify-between rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4">
                                <div>
                                    <p className="text-sm text-orange-200">À jouer maintenant</p>
                                    <p className="font-bold">
                                        {currentTurnPlayer?.name}
                                        {canSubmitClue ? " — c’est toi" : ""}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-300">
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
                                    <div className="rounded-2xl bg-white/5 p-4">
                                        <p className="text-sm text-slate-400">Lien d’invitation</p>
                                        <div className="mt-2 flex gap-2">
                                            <code className="min-w-0 flex-1 truncate text-sm">
                                                ?join={game.code}
                                            </code>
                                            <Button
                                                onClick={() => void copyInvite()}
                                            >
                                                {isCopied ? "Copié" : "Copier"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6 sm:grid">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Copier le lien d'invitation"
                                        onClick={() => void copyInvite()}
                                    >
                                        <RiAddLine />
                                    </Button>
                                </div>
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
                                <label className="sr-only" htmlFor="clue">
                                    Votre mot
                                </label>
                                <input
                                    id="clue"
                                    value={clue}
                                    onChange={(event) => setClue(event.target.value)}
                                    maxLength={40}
                                    required
                                    className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-3 outline-none ring-orange-400 focus:ring-2"
                                    placeholder="Saisis un mot qui ressemble…"
                                />
                                <Button className="rounded-xl bg-orange-500 px-4 font-bold">
                                    Valider
                                </Button>
                            </form>
                        )}

                        {game.phase !== "LOBBY" && <RoundGrid game={game} />}

                        {game.phase === "VOTING" && (
                            <ul className="mt-7 space-y-2">
                                {game.players.map((player) => (
                                    <li
                                        key={player.id}
                                        className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {player.name}
                                            {player.id === game.currentPlayer.id ? " (toi)" : ""}
                                        </span>
                                        <span className="text-sm text-slate-400">
                                            {player.hasVoted ? "A voté" : ""}
                                        </span>
                                        {player.id !== game.currentPlayer.id && (
                                            <Button
                                                className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
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
                                <h2 className="font-bold">Votes visibles</h2>
                                {game.votes.length === 0 ? (
                                    <p className="mt-2 text-sm text-slate-400">
                                        Aucun vote pour le moment.
                                    </p>
                                ) : (
                                    <ul className="mt-2 space-y-2">
                                        {game.votes.map((vote) => (
                                            <li
                                                key={`${vote.voterName}-${vote.targetName}`}
                                                className="rounded-xl bg-white/5 px-4 py-2 text-sm"
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

                        <div className="mt-7">
                            {game.phase === "LOBBY" && isHost && (
                                <Button
                                    onClick={() => void play({ action: "start" })}
                                    disabled={game.players.length < 3}
                                >
                                    Lancer la partie
                                </Button>
                            )}

                            {game.phase === "DISCUSSION" &&
                                isHost &&
                                game.turn?.canStartVote && (
                                    <Button
                                        onClick={() => void play({ action: "beginVote" })}
                                    >
                                        Passer au vote
                                    </Button>
                                )}
                        </div>
                    </div>
                    <Settings game={game} isHost={isHost} onSave={play} />
                </section>
            </div>
        </main>
    );
}

function Settings({ game, isHost, onSave }: { game: GameSnapshot; isHost: boolean; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
    const settingsKey = `${game.settings.wordCount}-${game.settings.roundCount}-${game.settings.turnSeconds}-${game.settings.impostorCount}`;
    const settingsContent = (
        <>
            <h2 className="font-bold">Paramètres de partie</h2>

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

            <Button type={isHost ? "submit" : "button"} className="mt-5 w-full" disabled={!isHost}>
                Enregistrer
            </Button>
        </>
    );

    if (!isHost) {
        return (
            <div key={settingsKey} className="rounded-2xl border border-white/10 p-4">
                {settingsContent}
            </div>
        );
    }

    return (
        <form
            key={settingsKey}
            className="rounded-2xl border border-white/10 p-4"
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
        </form>
    );
}
