import assert from "node:assert/strict";
import test from "node:test";
import {
  areAllRoomPlayersConnected,
  hasMinimumConnectedPlayers,
  markPlayerConnected,
  markPlayerDisconnected,
} from "@/lib/player-presence";

test("a game cannot start when one of three lobby players disconnects", () => {
  const code = `presence-${crypto.randomUUID()}`;
  const playerIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

  playerIds.forEach((playerId) => markPlayerConnected(code, playerId));
  assert.equal(hasMinimumConnectedPlayers(code, playerIds, 3), true);

  markPlayerDisconnected(code, playerIds[2]);
  assert.equal(hasMinimumConnectedPlayers(code, playerIds, 3), false);
});

test("connected players outside the room are not counted", () => {
  const code = `presence-${crypto.randomUUID()}`;
  const roomPlayerIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

  roomPlayerIds.slice(0, 2).forEach((playerId) => markPlayerConnected(code, playerId));
  markPlayerConnected(code, crypto.randomUUID());

  assert.equal(hasMinimumConnectedPlayers(code, roomPlayerIds, 3), false);
});

test("every room player must be connected before a game starts", () => {
  const code = "RDY-ROOM";
  const playerIds = ["ready-a", "ready-b", "ready-c"];

  playerIds.forEach((playerId) => markPlayerConnected(code, playerId));
  assert.equal(areAllRoomPlayersConnected(code, playerIds), true);

  markPlayerDisconnected(code, playerIds[1]);
  assert.equal(areAllRoomPlayersConnected(code, playerIds), false);
});
