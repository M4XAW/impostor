import { cookies } from "next/headers";

function roomCookieName(code: string) {
  return `impostor_player_${code}`;
}

export async function getRoomPlayerId(code: string) {
  return (await cookies()).get(roomCookieName(code))?.value;
}

export async function setRoomPlayerId(code: string, playerId: string) {
  (await cookies()).set(roomCookieName(code), playerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}
