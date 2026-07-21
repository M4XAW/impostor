const globalForPlayerPresence = globalThis as unknown as {
  connectedPlayerIdsByRoom?: Map<string, Set<string>>;
};

const connectedPlayerIdsByRoom =
  globalForPlayerPresence.connectedPlayerIdsByRoom ?? new Map<string, Set<string>>();

globalForPlayerPresence.connectedPlayerIdsByRoom = connectedPlayerIdsByRoom;

export function markPlayerConnected(code: string, playerId: string) {
  const connectedPlayerIds = connectedPlayerIdsByRoom.get(code) ?? new Set<string>();
  connectedPlayerIds.add(playerId);
  connectedPlayerIdsByRoom.set(code, connectedPlayerIds);
}

export function markPlayerDisconnected(code: string, playerId: string) {
  const connectedPlayerIds = connectedPlayerIdsByRoom.get(code);
  if (!connectedPlayerIds) return;

  connectedPlayerIds.delete(playerId);
  if (connectedPlayerIds.size === 0) connectedPlayerIdsByRoom.delete(code);
}

export function hasMinimumConnectedPlayers(
  code: string,
  roomPlayerIds: readonly string[],
  minimumPlayerCount: number,
) {
  const connectedPlayerIds = connectedPlayerIdsByRoom.get(code);
  if (!connectedPlayerIds) return false;

  let connectedRoomPlayerCount = 0;

  for (const playerId of roomPlayerIds) {
    if (!connectedPlayerIds.has(playerId)) continue;

    connectedRoomPlayerCount += 1;
    if (connectedRoomPlayerCount >= minimumPlayerCount) return true;
  }

  return false;
}
