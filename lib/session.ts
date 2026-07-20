import { cookies } from "next/headers";
import { roomPlayerCookieName } from "@/lib/player-cookie";

export async function getRoomPlayerId(code: string) {
  return (await cookies()).get(roomPlayerCookieName(code))?.value;
}

export async function setRoomPlayerId(code: string, playerId: string) {
  (await cookies()).set(roomPlayerCookieName(code), playerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearRoomPlayerId(code: string) {
  (await cookies()).delete(roomPlayerCookieName(code));
}
