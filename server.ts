import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { isPlayerInRoom, removePlayer } from "@/lib/game";
import { getCookieValue, roomPlayerCookieName } from "@/lib/player-cookie";
import { notifyRoomChanged, subscribeToRoomChanges } from "@/lib/realtime";

const DISCONNECTION_GRACE_PERIOD_MS = 10_000;

interface PlayerPresence {
  code: string;
  playerId: string;
  socketIds: Set<string>;
  removalTimer?: ReturnType<typeof setTimeout>;
}

const development = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev: development, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const server = createServer(handle);
  const io = new Server(server, { path: "/socket.io" });
  const presenceByPlayer = new Map<string, PlayerPresence>();

  function presenceKey(code: string, playerId: string) {
    return `${code}:${playerId}`;
  }

  function emitRoomPresence(code: string) {
    const connectedPlayerIds = [...presenceByPlayer.values()]
      .filter((presence) => presence.code === code && presence.socketIds.size > 0)
      .map((presence) => presence.playerId);

    io.to(code).emit("room:presence", { connectedPlayerIds });
  }

  io.on("connection", (socket) => {
    socket.on("room:watch", async (code: string) => {
      if (!/^[A-Za-z0-9]{3,8}-[A-Za-z0-9]{4,8}$/.test(code)) return;
      if (typeof socket.data.presenceKey === "string") return;

      const playerId = getCookieValue(
        socket.request.headers.cookie,
        roomPlayerCookieName(code),
      );

      if (!playerId || !await isPlayerInRoom(code, playerId) || !socket.connected) return;

      const key = presenceKey(code, playerId);
      const presence = presenceByPlayer.get(key) ?? {
        code,
        playerId,
        socketIds: new Set<string>(),
      };

      if (presence.removalTimer) clearTimeout(presence.removalTimer);
      presence.removalTimer = undefined;
      presence.socketIds.add(socket.id);
      presenceByPlayer.set(key, presence);
      socket.data.presenceKey = key;
      socket.join(code);
      emitRoomPresence(code);

      const unsubscribe = subscribeToRoomChanges(code, () => io.to(code).emit("room:changed"));
      socket.once("disconnect", () => {
        unsubscribe();
        presence.socketIds.delete(socket.id);

        if (presence.socketIds.size > 0) return;

        emitRoomPresence(code);
        presence.removalTimer = setTimeout(() => {
          if (presence.socketIds.size > 0) return;

          void removePlayer(code, playerId)
            .then((removed) => {
              presenceByPlayer.delete(key);
              if (removed) notifyRoomChanged(code);
              emitRoomPresence(code);
            })
            .catch((error: unknown) => {
              console.error("Impossible de retirer le joueur déconnecté.", error);
            });
        }, DISCONNECTION_GRACE_PERIOD_MS);
      });
    });
  });

  server.listen(port, hostname, () => {
    console.log(`Impostor est disponible sur http://localhost:${port}`);
  });
});
