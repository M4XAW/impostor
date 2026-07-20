import { cookies } from "next/headers";
import { roomSessionCookieName } from "@/lib/player-cookie";
import {
  SESSION_DURATION_SECONDS,
  type PlayerSessionCredential,
} from "@/lib/session-token";

export { createPlayerSessionCredential } from "@/lib/session-token";
export type { PlayerSessionCredential } from "@/lib/session-token";
export { authenticateRoomSession } from "@/lib/session-auth";

export async function getRoomSessionToken(code: string) {
  return (await cookies()).get(roomSessionCookieName(code))?.value;
}

export async function setRoomSessionToken(code: string, credential: PlayerSessionCredential) {
  (await cookies()).set(roomSessionCookieName(code), credential.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    expires: credential.expiresAt,
  });
}

export async function clearRoomSessionToken(code: string) {
  (await cookies()).set(roomSessionCookieName(code), "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
