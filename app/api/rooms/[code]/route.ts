import { NextRequest } from "next/server";
import { z } from "zod";
import { beginVote, castVote, getSnapshot, startGame } from "@/lib/game";
import { getValidRoomCode } from "@/lib/room-code";
import { getRoomPlayerId } from "@/lib/session";
import { notifyRoomChanged } from "@/lib/realtime";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("beginVote") }),
  z.object({ action: z.literal("vote"), targetId: z.string().cuid() }),
]);

async function getAuthorizedPlayer(code: string) {
  const playerId = await getRoomPlayerId(code);
  if (!playerId) throw new Error("Rejoignez cette partie pour continuer.");
  return playerId;
}

export async function GET(_request: NextRequest, context: RouteContext<"/api/rooms/[code]">) {
  const { code: rawCode } = await context.params;
  const code = getValidRoomCode(rawCode);
  if (!code) return Response.json({ error: "Code de partie invalide." }, { status: 400 });
  try {
    const snapshot = await getSnapshot(code, await getAuthorizedPlayer(code));
    return snapshot ? Response.json(snapshot) : Response.json({ error: "Partie introuvable." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Accès refusé." }, { status: 403 });
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/rooms/[code]">) {
  const { code: rawCode } = await context.params;
  const code = getValidRoomCode(rawCode);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!code || !parsed.success) return Response.json({ error: "Action invalide." }, { status: 400 });
  try {
    const playerId = await getAuthorizedPlayer(code);
    if (parsed.data.action === "start") await startGame(code, playerId);
    if (parsed.data.action === "beginVote") await beginVote(code, playerId);
    if (parsed.data.action === "vote") await castVote(code, playerId, parsed.data.targetId);
    notifyRoomChanged(code);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Action impossible." }, { status: 400 });
  }
}
