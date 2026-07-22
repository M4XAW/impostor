import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { advanceExpiredTurn, getNextTurnExpiration, removePlayer } from "@/lib/game";
import { getCookieValue, roomSessionCookieName } from "@/lib/player-cookie";
import { markPlayerConnected, markPlayerDisconnected } from "@/lib/player-presence";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  notifyRoomChanged,
  subscribeToAnyRoomChange,
  subscribeToRoomChanges,
} from "@/lib/realtime";
import { ROOM_CODE_PATTERN } from "@/lib/room-code";
import { authenticateRoomSession, touchPlayerSessions } from "@/lib/session-auth";

const DISCONNECTION_GRACE_PERIOD_MS = 10_000;
const MAX_SOCKETS_PER_PLAYER = 3;
const MAX_TIMER_DELAY_MS = 2_147_483_647;
const TURN_SCHEDULER_RECONCILIATION_MS = 1_000;

interface PlayerPresence {
  code: string;
  playerId: string;
  playerPublicId: string;
  playerName: string;
  socketIds: Set<string>;
  removalTimer?: ReturnType<typeof setTimeout>;
  isPermanentlyRemoved?: boolean;
}

interface RoomSubscription {
  socketCount: number;
  unsubscribe: () => void;
}

const development = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev: development, hostname, port });
const handle = app.getRequestHandler();

function getDirectClientAddress(request: IncomingMessage) {
  if (process.env.TRUST_PROXY === "true") {
    const forwardedFor = request.headers["x-forwarded-for"];
    const firstAddress = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(",")[0]
      ?.trim();
    if (firstAddress) return firstAddress;
  }

  return request.socket.remoteAddress ?? "unknown";
}

function isAllowedSocketOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const configuredOrigin = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (configuredOrigin) return origin === configuredOrigin;

  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

void app.prepare().then(async () => {
  const server = createServer((request, response) => {
    request.headers["x-impostor-client-ip"] = getDirectClientAddress(request);
    handle(request, response);
  });
  const io = new Server(server, {
    path: "/socket.io",
    serveClient: false,
    maxHttpBufferSize: 16_384,
    allowRequest: (request, callback) => {
      try {
        if (!isAllowedSocketOrigin(request)) {
          callback("Origine refusée.", false);
          return;
        }

        enforceRateLimit(`socket:connect:${getDirectClientAddress(request)}`, 30, 60_000);
        callback(null, true);
      } catch {
        callback("Trop de connexions.", false);
      }
    },
  });
  const presenceByPlayer = new Map<string, PlayerPresence>();
  const roomSubscriptions = new Map<string, RoomSubscription>();
  let scheduledTurnTimer: ReturnType<typeof setTimeout> | undefined;
  let scheduledTurn: { code: string; endsAt: number } | undefined;
  let turnScheduleVersion = 0;

  async function scheduleNextTurnExpiration() {
    const scheduleVersion = ++turnScheduleVersion;

    try {
      const nextExpiration = await getNextTurnExpiration();
      if (scheduleVersion !== turnScheduleVersion) return;

      if (!nextExpiration) {
        if (scheduledTurnTimer) clearTimeout(scheduledTurnTimer);
        scheduledTurnTimer = undefined;
        scheduledTurn = undefined;
        return;
      }

      const nextExpirationTime = nextExpiration.endsAt.getTime();
      if (
        scheduledTurnTimer &&
        scheduledTurn?.code === nextExpiration.code &&
        scheduledTurn.endsAt === nextExpirationTime
      ) {
        return;
      }

      if (scheduledTurnTimer) clearTimeout(scheduledTurnTimer);
      scheduledTurn = { code: nextExpiration.code, endsAt: nextExpirationTime };

      const delay = Math.min(
        MAX_TIMER_DELAY_MS,
        Math.max(0, nextExpirationTime - Date.now()),
      );

      scheduledTurnTimer = setTimeout(() => {
        scheduledTurnTimer = undefined;
        scheduledTurn = undefined;

        void advanceExpiredTurn(nextExpiration.code)
          .then((changed) => {
            if (changed) {
              notifyRoomChanged(nextExpiration.code);
              return;
            }

            void scheduleNextTurnExpiration();
          })
          .catch((error: unknown) => {
            console.error("Impossible de faire avancer le tour expiré.", error);
            void scheduleNextTurnExpiration();
          });
      }, delay);
    } catch (error) {
      if (scheduleVersion !== turnScheduleVersion) return;

      console.error("Impossible de programmer la prochaine fin de tour.", error);
    }
  }

  subscribeToAnyRoomChange(() => void scheduleNextTurnExpiration());
  setInterval(
    () => void scheduleNextTurnExpiration(),
    TURN_SCHEDULER_RECONCILIATION_MS,
  );

  setInterval(() => {
    const connectedPlayerIds = [...presenceByPlayer.values()]
      .filter((presence) => presence.socketIds.size > 0)
      .map((presence) => presence.playerId);

    void touchPlayerSessions(connectedPlayerIds).catch((error: unknown) => {
      console.error("Impossible de rafraîchir la présence des joueurs.", error);
    });
  }, 30_000);

  function presenceKey(code: string, playerId: string) {
    return `${code}:${playerId}`;
  }

  function emitRoomPresence(code: string) {
    const connectedPlayerPublicIds = [...presenceByPlayer.values()]
      .filter((presence) => presence.code === code && presence.socketIds.size > 0)
      .map((presence) => presence.playerPublicId);

    io.to(code).emit("room:presence", { connectedPlayerPublicIds });
  }

  function addRoomSubscription(code: string) {
    const current = roomSubscriptions.get(code);
    if (current) {
      current.socketCount += 1;
      return;
    }

    roomSubscriptions.set(code, {
      socketCount: 1,
      unsubscribe: subscribeToRoomChanges(code, (change) => {
        if (change.removedPlayerPublicId) {
          const removedPresenceEntry = [...presenceByPlayer.entries()].find(
            ([, presence]) =>
              presence.code === code &&
              presence.playerPublicId === change.removedPlayerPublicId,
          );

          const [removedPresenceKey, removedPresence] = removedPresenceEntry ?? [];
          if (removedPresence?.removalTimer) clearTimeout(removedPresence.removalTimer);
          if (removedPresence) removedPresence.isPermanentlyRemoved = true;
          if (removedPresenceKey) presenceByPlayer.delete(removedPresenceKey);

          removedPresence?.socketIds.forEach((socketId) => {
            io.sockets.sockets.get(socketId)?.disconnect(true);
          });
        }

        if (change.playerActivity) {
          io.to(code).emit("room:player-activity", change.playerActivity);
        }
        io.to(code).emit("room:changed");
      }),
    });
  }

  function removeRoomSubscription(code: string) {
    const current = roomSubscriptions.get(code);
    if (!current) return;

    current.socketCount -= 1;
    if (current.socketCount > 0) return;

    current.unsubscribe();
    roomSubscriptions.delete(code);
  }

  io.on("connection", (socket) => {
    socket.on("room:watch", async (code: string) => {
      if (!ROOM_CODE_PATTERN.test(code)) return;
      if (socket.data.watchPending === true || typeof socket.data.presenceKey === "string") return;
      socket.data.watchPending = true;

      try {
        const sessionToken = getCookieValue(
          socket.request.headers.cookie,
          roomSessionCookieName(code),
        );
        const player = await authenticateRoomSession(code, sessionToken);
        if (!player || !socket.connected) return;

        const key = presenceKey(code, player.id);
        const presence = presenceByPlayer.get(key) ?? {
          code,
          playerId: player.id,
          playerPublicId: player.publicId,
          playerName: player.name,
          socketIds: new Set<string>(),
        };

        if (presence.socketIds.size >= MAX_SOCKETS_PER_PLAYER) {
          socket.emit("room:error", { error: "Trop de connexions pour ce joueur." });
          socket.disconnect(true);
          return;
        }

        if (presence.removalTimer) clearTimeout(presence.removalTimer);
        presence.removalTimer = undefined;
        presence.socketIds.add(socket.id);
        presenceByPlayer.set(key, presence);
        markPlayerConnected(code, player.id);
        socket.data.presenceKey = key;
        socket.data.roomCode = code;
        socket.join(code);
        addRoomSubscription(code);
        emitRoomPresence(code);

        socket.once("disconnect", () => {
          presence.socketIds.delete(socket.id);
          removeRoomSubscription(code);

          if (presence.socketIds.size > 0) return;

          markPlayerDisconnected(code, player.id);
          emitRoomPresence(code);
          if (presence.isPermanentlyRemoved) return;

          presence.removalTimer = setTimeout(() => {
            if (presence.socketIds.size > 0) return;

            void removePlayer(code, player.id)
              .then(() => {
                presenceByPlayer.delete(key);
                notifyRoomChanged(code, {
                  playerActivity: {
                    type: "left",
                    playerPublicId: presence.playerPublicId,
                    playerName: presence.playerName,
                  },
                });
                emitRoomPresence(code);
              })
              .catch((error: unknown) => {
                console.error("Impossible de retirer le joueur déconnecté.", error);
              });
          }, DISCONNECTION_GRACE_PERIOD_MS);
        });
      } finally {
        socket.data.watchPending = false;
      }
    });
  });

  await scheduleNextTurnExpiration();

  server.listen(port, hostname, () => {
    console.log(`Impostor est disponible sur http://localhost:${port}`);
  });
});
