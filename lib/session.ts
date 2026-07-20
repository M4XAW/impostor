import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { roomSessionCookieName } from "@/lib/player-cookie";
import {
  hashSessionToken,
  isValidSessionToken,
  SESSION_DURATION_SECONDS,
  type PlayerSessionCredential,
} from "@/lib/session-token";

const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 30_000;

export { createPlayerSessionCredential } from "@/lib/session-token";
export type { PlayerSessionCredential } from "@/lib/session-token";

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

export async function authenticateRoomSession(code: string, token: string | undefined) {
  if (!token || !isValidSessionToken(token)) return null;

  const player = await prisma.player.findFirst({
    where: {
      sessionTokenHash: hashSessionToken(token),
      sessionExpiresAt: { gt: new Date() },
      room: { code },
    },
    select: {
      id: true,
      publicId: true,
      roomId: true,
      lastSeenAt: true,
    },
  });

  if (!player) return null;

  const activityThreshold = new Date(Date.now() - SESSION_ACTIVITY_WRITE_INTERVAL_MS);
  if (player.lastSeenAt < activityThreshold) {
    await prisma.player.updateMany({
      where: { id: player.id, lastSeenAt: { lt: activityThreshold } },
      data: { lastSeenAt: new Date() },
    });
  }

  return player;
}

export async function touchPlayerSessions(playerIds: string[]) {
  if (playerIds.length === 0) return;

  await prisma.player.updateMany({
    where: { id: { in: playerIds } },
    data: { lastSeenAt: new Date() },
  });
}
