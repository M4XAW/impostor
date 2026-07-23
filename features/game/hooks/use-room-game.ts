"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  createNotificationSound,
  disposeNotificationSound,
  playNotificationSound,
} from "@/lib/notification-sound";
import { isPlayerActivityEvent } from "@/lib/player-activity";
import {
  estimateServerClockOffsetMs,
  getCountdownSeconds,
  getNextCountdownUpdateDelay,
} from "@/lib/server-clock";
import type { GameSnapshot } from "@/types/game";

const FALLBACK_REFRESH_INTERVAL_MS = 30_000;

interface RoomPresence {
  connectedPlayerPublicIds: string[];
}

export interface ClueError {
  turnKey: string;
  message: string;
}

export type PlayRoomAction = (
  payload: Record<string, unknown>,
) => Promise<boolean>;

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
    value.connectedPlayerPublicIds.every(
      (publicId) => typeof publicId === "string",
    )
  );
}

function getResponseError(payload: unknown, fallback: string) {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export function useRoomGame(code: string) {
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [error, setError] = useState("");
  const [clue, setClue] = useState("");
  const [clueError, setClueError] = useState<ClueError | null>(null);
  const [copiedSlotIndex, setCopiedSlotIndex] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [connectedPlayerPublicIds, setConnectedPlayerPublicIds] = useState<
    string[] | null
  >(null);
  const [now, setNow] = useState(0);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  const refreshVersion = useRef(0);
  const selfPlayerPublicId = useRef<string | undefined>(undefined);
  const observedTurn = useRef<{ roomCode: string; turnKey: string } | null>(
    null,
  );
  const turnSound = useRef<HTMLAudioElement | null>(null);
  const turnEndsAt = game?.turn?.endsAt;
  const activeTurnKey = game?.turn
    ? `${game.turn.matchNumber}:${game.turn.clueRoundNumber}:${game.turn.currentPlayerPublicId}`
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

    try {
      const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      const clientReceivedAt = Date.now();
      const payload: unknown = await response.json().catch(() => null);

      if (version !== refreshVersion.current) return;

      if (!response.ok || !isGameSnapshot(payload)) {
        if (response.status === 403 || response.status === 404) {
          setGame(null);
        }
        setError(getResponseError(payload, "Impossible de charger la partie."));
        return;
      }

      setServerClockOffsetMs(
        estimateServerClockOffsetMs(
          clientSentAt,
          clientReceivedAt,
          payload.serverTiming,
        ),
      );
      setNow(clientReceivedAt);
      setGame(payload);
      selfPlayerPublicId.current = payload.players.find(
        (player) => player.isSelf,
      )?.publicId;
      setError("");
    } catch {
      if (version === refreshVersion.current) {
        setError("Connexion à la partie momentanément indisponible.");
      }
    }
  }, [code]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const initial = window.setTimeout(refreshWhenVisible, 0);
    const interval = window.setInterval(
      refreshWhenVisible,
      FALLBACK_REFRESH_INTERVAL_MS,
    );

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
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
    socket.on("disconnect", () => setConnectedPlayerPublicIds(null));
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

  const play: PlayRoomAction = async (payload) => {
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = getResponseError(result, "Action impossible.");

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
    } catch {
      setError("Connexion au serveur momentanément indisponible.");
      return false;
    }
  };

  async function copyInvite(slotIndex: number) {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopiedSlotIndex(slotIndex);
  }

  async function leaveRoom() {
    setIsLeaving(true);

    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getResponseError(result, "Impossible de quitter la partie."));
        setIsLeaving(false);
        return;
      }

      window.location.assign("/");
    } catch {
      setError("Impossible de quitter la partie pour le moment.");
      setIsLeaving(false);
    }
  }

  const secondsLeft = game?.turn
    ? getCountdownSeconds(
        Date.parse(game.turn.endsAt),
        now + serverClockOffsetMs,
      )
    : 0;

  return {
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
  };
}
