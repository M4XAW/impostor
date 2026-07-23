import { randomInt, randomUUID } from "node:crypto";
import { PlayerRole } from "@/generated/prisma/client";
import { selectImpostorPlayerIds } from "@/lib/role-assignment";
import type { PlayerSessionCredential } from "@/lib/session-token";
import type { GameTransaction } from "@/features/game/server/game-transaction";

export function isRoomHost(room: { hostId: string | null }, playerId: string) {
  return room.hostId === playerId;
}

export function playerSessionData(credential: PlayerSessionCredential) {
  return {
    publicId: randomUUID(),
    sessionTokenHash: credential.tokenHash,
    sessionExpiresAt: credential.expiresAt,
    lastSeenAt: new Date(),
  };
}

export function shuffle<T>(items: readonly T[]) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(index + 1);
    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

export function shouldReverseMatchWords() {
  return randomInt(2) === 1;
}

export function normalizeClueContent(content: string) {
  return content
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .match(/[\p{L}\p{N}]+/gu)
    ?.join(" ") ?? "";
}

export async function assignMatchRoles(
  transaction: GameTransaction,
  roomId: string,
  players: readonly { id: string }[],
  impostorCount: number,
) {
  const impostorPlayerIds = selectImpostorPlayerIds(
    players.map((player) => player.id),
    impostorCount,
  );

  await transaction.player.updateMany({
    where: { roomId },
    data: { role: PlayerRole.CIVILIAN },
  });
  await transaction.player.updateMany({
    where: { id: { in: impostorPlayerIds }, roomId },
    data: { role: PlayerRole.IMPOSTOR },
  });
}
