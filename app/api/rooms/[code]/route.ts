import { NextRequest } from "next/server";
import { z } from "zod";
import { publicErrorResponse, PublicError } from "@/lib/errors";
import {
  beginVote,
  castVote,
  getSnapshot,
  kickPlayer,
  removePlayer,
  startGame,
  submitClue,
  transferHost,
  updateSettings,
} from "@/lib/game";
import { getClientAddress, readJsonBody, validateMutationOrigin } from "@/lib/http-security";
import { enforceRateLimit } from "@/lib/rate-limit";
import { notifyRoomChanged } from "@/lib/realtime";
import { getValidRoomCode } from "@/lib/room-code";
import {
  authenticateRoomSession,
  clearRoomSessionToken,
  getRoomSessionToken,
} from "@/lib/session";
import type { GameSnapshot } from "@/types/game";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("beginVote") }),
  z.object({ action: z.literal("vote"), targetPublicId: z.string().uuid() }),
  z.object({ action: z.literal("transferHost"), targetPlayerPublicId: z.string().uuid() }),
  z.object({ action: z.literal("kick"), targetPlayerPublicId: z.string().uuid() }),
  z.object({ action: z.literal("leave") }),
  z.object({
    action: z.literal("clue"),
    content: z.string().trim().min(1).max(40),
  }),
  z.object({
    action: z.literal("settings"),
    wordCount: z.number().int().min(1).max(20),
    roundCount: z.number().int().min(1).max(10),
    turnSeconds: z.number().int().min(10).max(120),
    impostorCount: z.number().int().min(1).max(3),
  }),
]);

async function getAuthorizedPlayer(code: string) {
  const player = await authenticateRoomSession(code, await getRoomSessionToken(code));
  if (!player) throw new PublicError("La partie a expiré ou tu n'y as pas accès.", 403);
  return player;
}

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest, context: RouteContext<"/api/rooms/[code]">) {
  const serverReceivedAt = Date.now();

  try {
    const { code: rawCode } = await context.params;
    const code = getValidRoomCode(rawCode);
    if (!code) throw new PublicError("Code de partie invalide.");

    const player = await getAuthorizedPlayer(code);
    enforceRateLimit(`room:get:${getClientAddress(request)}:${player.id}`, 120, 60_000);

    const snapshot = await getSnapshot(code, player.id);
    if (!snapshot) throw new PublicError("Partie introuvable.", 404);

    const synchronizedSnapshot: GameSnapshot = {
      ...snapshot,
      serverTiming: {
        receivedAt: serverReceivedAt,
        sentAt: Date.now(),
      },
    };

    return privateJson(synchronizedSnapshot);
  } catch (error) {
    const response = publicErrorResponse(error, "Impossible de charger la partie.");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/rooms/[code]">) {
  try {
    validateMutationOrigin(request);

    const { code: rawCode } = await context.params;
    const code = getValidRoomCode(rawCode);
    if (!code) throw new PublicError("Action invalide.");

    const clientAddress = getClientAddress(request);
    enforceRateLimit(`room:post:${clientAddress}:${code}`, 90, 60_000);

    const player = await getAuthorizedPlayer(code);
    enforceRateLimit(`room:action:${code}:${player.id}`, 60, 60_000);

    const parsed = actionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new PublicError("Action invalide.");
    let removedPlayerPublicId: string | undefined;

    if (parsed.data.action === "start") await startGame(code, player.id);
    if (parsed.data.action === "beginVote") await beginVote(code, player.id);
    if (parsed.data.action === "vote") {
      await castVote(code, player.id, parsed.data.targetPublicId);
    }
    if (parsed.data.action === "transferHost") {
      await transferHost(code, player.id, parsed.data.targetPlayerPublicId);
    }
    if (parsed.data.action === "kick") {
      await kickPlayer(code, player.id, parsed.data.targetPlayerPublicId);
      removedPlayerPublicId = parsed.data.targetPlayerPublicId;
    }
    if (parsed.data.action === "clue") await submitClue(code, player.id, parsed.data.content);
    if (parsed.data.action === "leave") {
      await removePlayer(code, player.id);
      await clearRoomSessionToken(code);
      removedPlayerPublicId = player.publicId;
    }
    if (parsed.data.action === "settings") {
      const { wordCount, roundCount, turnSeconds, impostorCount } = parsed.data;
      await updateSettings(code, player.id, {
        wordCount,
        roundCount,
        turnSeconds,
        impostorCount,
      });
    }

    notifyRoomChanged(code, { removedPlayerPublicId });
    return privateJson({ ok: true });
  } catch (error) {
    const response = publicErrorResponse(error, "Action impossible.");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
}
