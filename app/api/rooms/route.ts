import { NextRequest } from "next/server";
import { z } from "zod";
import { createRoom, joinRoom } from "@/lib/game";
import { getValidRoomCode } from "@/lib/room-code";
import { setRoomPlayerId } from "@/lib/session";
import { notifyRoomChanged } from "@/lib/realtime";

const createSchema = z.object({ name: z.string().trim().min(2).max(24) });
const joinSchema = createSchema.extend({ code: z.string() });

export async function POST(request: NextRequest) {
    const body: unknown = await request.json().catch(() => null);
    
    try {
        const joinRequest = joinSchema.safeParse(body);
        
        if (joinRequest.success) {
            const code = getValidRoomCode(joinRequest.data.code);
            if (!code) {
                return Response.json(
                    { error: "Code de partie invalide." },
                    { status: 400 },
                );
            }

            const { player } = await joinRoom(code, joinRequest.data.name);
            
            await setRoomPlayerId(code, player.id);
            notifyRoomChanged(code);

            return Response.json({ code });
        }

        const createRequest = createSchema.safeParse(body);
        if (!createRequest.success) {
            return Response.json(
                { error: "Informations de partie invalides." },
                { status: 400 },
            );
        }

        const room = await createRoom(createRequest.data.name);
        const player = room.players[0];
        
        await setRoomPlayerId(room.code, player.id);
        notifyRoomChanged(room.code);
        
        return Response.json({ code: room.code }, { status: 201 });
    } catch (error) {
        return Response.json(
            {
                error: error instanceof Error ? error.message : "Erreur de partie.",
            },
            { status: 400 },
        );
    }
}
