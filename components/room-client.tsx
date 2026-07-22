"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { GameRulesDialog } from "@/components/game-rules-dialog";
import { LeaveRoomDialog } from "@/components/leave-room-dialog";
import { RoundGrid } from "@/components/round-grid";
import { TransferHostContextMenu } from "@/components/transfer-host-context-menu";
import { VoteConfirmationDialog } from "@/components/vote-confirmation-dialog";
import { VoteResults } from "@/components/vote-results";
import {
    estimateServerClockOffsetMs,
    getCountdownSeconds,
    getNextCountdownUpdateDelay,
} from "@/lib/server-clock";
import { isPlayerActivityEvent } from "@/lib/player-activity";
import {
    createNotificationSound,
    disposeNotificationSound,
    playNotificationSound,
} from "@/lib/notification-sound";
import type { GameSnapshot } from "@/types/game";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { RiLoginBoxLine, RiLogoutBoxLine } from "@remixicon/react";

import { AvatarCircle, Plus, WarningDiamond } from 'pixelarticons/react'

interface RoomClientProps {
    code: string;
}

type SettingName = keyof GameSnapshot["settings"];

interface RoomPresence {
    connectedPlayerPublicIds: string[];
}

interface ClueError {
    turnKey: string;
    message: string;
}

const settingFields: Array<{
    name: SettingName;
    label: string;
    min: number;
    max: number;
}> = [
        { name: "wordCount", label: "Nombre de manches", min: 1, max: 20 },
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
        "settings" in value &&
        "serverTiming" in value &&
        typeof value.serverTiming === "object" &&
        value.serverTiming !== null &&
        "receivedAt" in value.serverTiming &&
        typeof value.serverTiming.receivedAt === "number" &&
        "sentAt" in value.serverTiming &&
        typeof value.serverTiming.sentAt === "number"
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
    const [clueError, setClueError] = useState<ClueError | null>(null);
    const [copiedSlotIndex, setCopiedSlotIndex] = useState<number | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [connectedPlayerPublicIds, setConnectedPlayerPublicIds] = useState<string[] | null>(null);
    const [now, setNow] = useState(0);
    const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
    const refreshVersion = useRef(0);
    const selfPlayerPublicId = useRef<string | undefined>(undefined);
    const observedTurn = useRef<{ roomCode: string; turnKey: string } | null>(null);
    const turnSound = useRef<HTMLAudioElement | null>(null);
    const turnEndsAt = game?.turn?.endsAt;
    const activeTurnKey = game?.turn
        ? `${game.turn.wordNumber}:${game.turn.roundNumber}:${game.turn.currentPlayerPublicId}`
        : null;

    useEffect(() => {
        const sound = createNotificationSound();
        turnSound.current = sound;

        return () => {
            turnSound.current = null;
            disposeNotificationSound(sound);
        };
    }, []);

    useEffect(() => {
        if (!activeTurnKey) return;

        if (!observedTurn.current || observedTurn.current.roomCode !== code) {
            observedTurn.current = { roomCode: code, turnKey: activeTurnKey };
            return;
        }

        if (observedTurn.current.turnKey === activeTurnKey) return;

        observedTurn.current = { roomCode: code, turnKey: activeTurnKey };
        if (turnSound.current) playNotificationSound(turnSound.current);
    }, [activeTurnKey, code]);

    const refresh = useCallback(async () => {
        const version = ++refreshVersion.current;
        const clientSentAt = Date.now();
        const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
        const clientReceivedAt = Date.now();
        const payload: unknown = await response.json().catch(() => null);

        if (version !== refreshVersion.current) return;

        if (!response.ok || !isGameSnapshot(payload)) {
            if (response.status === 403 || response.status === 404) {
                setGame(null);
            }
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

        setServerClockOffsetMs(estimateServerClockOffsetMs(
            clientSentAt,
            clientReceivedAt,
            payload.serverTiming,
        ));
        setNow(clientReceivedAt);
        setGame(payload);
        selfPlayerPublicId.current = payload.players.find((player) => player.isSelf)?.publicId;
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
        if (!turnEndsAt) return;

        const endsAt = Date.parse(turnEndsAt);
        if (!Number.isFinite(endsAt)) return;

        let timer: number | undefined;

        const updateCountdown = () => {
            const clientNow = Date.now();
            setNow(clientNow);

            const delay = getNextCountdownUpdateDelay(
                endsAt - (clientNow + serverClockOffsetMs),
            );
            if (delay !== null) {
                timer = window.setTimeout(updateCountdown, delay);
            }
        };
        const updateWhenVisible = () => {
            if (document.visibilityState !== "visible") return;
            if (timer !== undefined) window.clearTimeout(timer);
            updateCountdown();
        };

        updateCountdown();
        document.addEventListener("visibilitychange", updateWhenVisible);

        return () => {
            if (timer !== undefined) window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", updateWhenVisible);
        };
    }, [serverClockOffsetMs, turnEndsAt]);

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
        socket.on("room:player-activity", (activity: unknown) => {
            if (
                !isPlayerActivityEvent(activity) ||
                activity.playerPublicId === selfPlayerPublicId.current
            ) {
                return;
            }

            const hasJoined = activity.type === "joined";
            toast(`${activity.playerName} a ${hasJoined ? "rejoint" : "quitté"} la partie.`);
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
            const message = typeof result === "object" &&
                    result !== null &&
                    "error" in result &&
                    typeof result.error === "string"
                    ? result.error
                    : "Action impossible.";

            if (payload.action === "clue" && activeTurnKey) {
                setClueError({ turnKey: activeTurnKey, message });
            } else {
                setError(message);
            }

            return false;
        }

        if (payload.action === "clue") setClueError(null);
        await refresh();
        return true;
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
                    <WarningDiamond className="size-13 text-rose-300" />
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
    const secondsLeft = game.turn
        ? getCountdownSeconds(Date.parse(game.turn.endsAt), now + serverClockOffsetMs)
        : 0;
    const canSubmitClue = game.phase === "DISCUSSION" && game.turn?.currentPlayerPublicId === selfPlayer?.publicId;
    const canStartGame = game.phase === "LOBBY" && isHost;
    const canBeginVote = game.phase === "DISCUSSION" && isHost && game.turn?.canStartVote === true;
    const hasNextWord = game.phase === "RESULTS" &&
        game.result !== undefined &&
        game.result.wordNumber < game.settings.wordCount;
    const canStartNextWord = hasNextWord && isHost;
    const hasCurrentPlayerVoted = game.players.some(
        (player) => player.isSelf && player.hasVoted,
    );
    const connectedPlayerCount = connectedPlayerPublicIds?.length ?? 0;
    const hasEnoughConnectedPlayers = connectedPlayerCount >= 3;
    const isPlayerConnected = (publicId: string) => connectedPlayerPublicIds?.includes(publicId) ?? true;

    return (
        <main className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <Card className="flex-1">
                    <CardContent>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <p className="text-sm uppercase tracking-widest text-orange-300">
                                    {game.phase === "LOBBY" ? "Salon" :
                                        game.phase === "DISCUSSION" ? "Tour en cours"
                                            : game.phase === "VOTING" ? "Vote"
                                                : game.result
                                                    ? `Résultats · manche ${game.result.wordNumber}/${game.settings.wordCount}`
                                                    : "Résultats"}
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

                        <h1 className="mt-2 text-3xl">
                            {game.phase === "LOBBY"
                                ? "En attente des joueurs"
                                : game.phase === "DISCUSSION"
                                    ? `Ton mot : ${game.currentPlayer.word ?? "?"}`
                                    : game.phase === "RESULTS"
                                        ? game.endReason === "NOT_ENOUGH_PLAYERS"
                                            ? "Partie terminée"
                                            : game.winner === "CIVILIANS"
                                                ? "Les civils gagnent la manche"
                                                : game.settings.impostorCount > 1
                                                    ? "Les imposteurs gagnent la manche"
                                                    : "L’imposteur gagne la manche"
                                        : "Qui est l’imposteur ?"}
                        </h1>

                        {game.phase === "RESULTS" && game.result && (
                            <>
                                <dl className="mt-6 grid gap-3 border bg-muted/40 p-4 sm:grid-cols-3">
                                    <div>
                                        <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                                            {game.result.impostorNames.length > 1 ? "Imposteurs" : "Imposteur"}
                                        </dt>
                                        <dd className="mt-1">
                                            {game.result.impostorNames.join(", ")}
                                        </dd>
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
                                {hasNextWord && !isHost && (
                                    <p className="mt-4 text-sm text-muted-foreground" role="status">
                                        En attente de l’hôte pour lancer la manche suivante.
                                    </p>
                                )}
                                {!hasNextWord && (
                                    <p className="mt-4 text-sm text-muted-foreground" role="status">
                                        Toutes les manches sont terminées.
                                    </p>
                                )}
                            </>
                        )}

                        {game.endReason === "NOT_ENOUGH_PLAYERS" && (
                            <p className="mt-2 text-sm text-muted-foreground" role="status">
                                Il ne reste plus assez de joueurs pour continuer la partie.
                            </p>
                        )}

                        {game.phase === "DISCUSSION" && game.turn && (
                            <div className="mt-5 flex items-center justify-between border border-orange-400/20 bg-orange-400/10 p-4">
                                <div>
                                    <p>
                                        {currentTurnPlayer?.name}
                                        {canSubmitClue ? " — c’est toi" : ""}
                                    </p>
                                    <p className="mt-1 text-sm text-foreground">
                                        Manche {game.turn.wordNumber}/{game.settings.wordCount} · tour {game.turn.roundNumber}/{game.settings.roundCount}
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
                                                className={`grid aspect-square min-w-0 place-items-center border border-dotted p-3 ${player.isHost ? "border-white bg-white text-black" : ""} ${canTransferHost ? "cursor-context-menu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : ""} transition-opacity ${isPlayerConnected(player.publicId) ? "" : "opacity-40"}`}
                                                tabIndex={canTransferHost ? 0 : undefined}
                                                aria-label={canTransferHost ? `${player.name}, menu de gestion du joueur` : undefined}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <AvatarCircle />
                                                    <div
                                                        className={`flex max-w-full flex-col items-center gap-1`}
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

                                    const content = clue.trim();
                                    if (!content) return;

                                    void play({ action: "clue", content }).then((succeeded) => {
                                        if (succeeded) setClue("");
                                    });
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

                        {canSubmitClue && clueError?.turnKey === activeTurnKey && (
                            <Alert variant="destructive" className="mt-3">
                                <WarningDiamond aria-hidden="true" />
                                <AlertTitle>Indice refusé</AlertTitle>
                                <AlertDescription>{clueError.message}</AlertDescription>
                            </Alert>
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
                                                    void play({
                                                        action: "vote",
                                                        targetPublicId: player.publicId,
                                                    })
                                                }
                                            />
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
                    {(canBeginVote || canStartNextWord) && (
                        <CardFooter>
                            {canBeginVote ? (
                                <Button
                                    onClick={() => void play({ action: "beginVote" })}
                                >
                                    Passer au vote
                                </Button>
                            ) : (
                                <Button onClick={() => void play({ action: "nextWord" })}>
                                    Lancer la manche suivante
                                </Button>
                            )}
                        </CardFooter>
                    )}
                </Card>
                {game.phase === "LOBBY" && (
                    <Card>
                        <CardContent>
                            <Settings
                                game={game}
                                isHost={isHost}
                                onSave={async (payload) => {
                                    await play(payload);
                                }}
                            />
                        </CardContent>
                        {canStartGame && (
                            <CardFooter>
                                    {hasEnoughConnectedPlayers ? (
                                        <Button className="w-full" onClick={() => void play({ action: "start" })}>
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
                                                <p>
                                                    {connectedPlayerPublicIds === null
                                                        ? "Vérification des joueurs connectés…"
                                                        : `Il manque ${3 - connectedPlayerCount} joueur${connectedPlayerCount === 2 ? "" : "s"} pour commencer`}
                                                </p>
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
