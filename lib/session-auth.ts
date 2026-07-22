import { prisma } from "@/lib/prisma";
import { hashSessionToken, isValidSessionToken } from "@/lib/session-token";

const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 30_000;

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
      name: true,
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
