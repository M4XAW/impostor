import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { subscribeToRoomChanges } from "@/lib/realtime";

const development = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev: development, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const server = createServer(handle);
  const io = new Server(server, { path: "/socket.io" });

  io.on("connection", (socket) => {
    socket.on("room:watch", (code: string) => {
      if (!/^[A-Za-z0-9]{3,8}-[A-Za-z0-9]{4,8}$/.test(code)) return;
      socket.join(code);
      const unsubscribe = subscribeToRoomChanges(code, () => io.to(code).emit("room:changed"));
      socket.once("disconnect", unsubscribe);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`Impostor est disponible sur http://localhost:${port}`);
  });
});
