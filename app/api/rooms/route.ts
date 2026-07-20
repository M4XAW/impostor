import { NextRequest } from "next/server";
import { z } from "zod";
import { publicErrorResponse, PublicError } from "@/lib/errors";
import { createRoom, joinRoom } from "@/lib/game";
import { getClientAddress, readJsonBody, validateMutationOrigin } from "@/lib/http-security";
import { enforceRateLimit } from "@/lib/rate-limit";
import { notifyRoomChanged } from "@/lib/realtime";
import { getValidRoomCode } from "@/lib/room-code";
import { createPlayerSessionCredential, setRoomSessionToken } from "@/lib/session";

const playerNameSchema = z
  .string({ error: "Le pseudo doit être du texte." })
  .trim()
  .min(2, { error: "Le pseudo doit contenir au moins 2 caractères." })
  .max(24, { error: "Le pseudo ne doit pas dépasser 24 caractères." });

const createSchema = z.object({ name: playerNameSchema });
const joinSchema = createSchema.extend({ code: z.string() });

export async function POST(request: NextRequest) {
  try {
    validateMutationOrigin(request);

    const clientAddress = getClientAddress(request);
    enforceRateLimit(`rooms:post:${clientAddress}`, 30, 60_000);

    const body = await readJsonBody(request);
    const joinRequest = joinSchema.safeParse(body);

    if (joinRequest.success) {
      const code = getValidRoomCode(joinRequest.data.code);
      if (!code) throw new PublicError("Code de partie invalide.");

      enforceRateLimit(`rooms:join:${clientAddress}:${code}`, 12, 60_000);
      const credential = createPlayerSessionCredential();
      await joinRoom(code, joinRequest.data.name, credential);
      await setRoomSessionToken(code, credential);
      notifyRoomChanged(code);

      return Response.json({ code });
    }

    const createRequest = createSchema.safeParse(body);
    if (!createRequest.success) {
      throw new PublicError(
        createRequest.error.issues[0]?.message ?? "Informations de partie invalides.",
      );
    }

    enforceRateLimit(`rooms:create:${clientAddress}`, 5, 10 * 60_000);
    const credential = createPlayerSessionCredential();
    const room = await createRoom(createRequest.data.name, credential);
    await setRoomSessionToken(room.code, credential);
    notifyRoomChanged(room.code);

    return Response.json({ code: room.code }, { status: 201 });
  } catch (error) {
    return publicErrorResponse(error, "Impossible de traiter la demande de partie.");
  }
}
