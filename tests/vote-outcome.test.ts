import assert from "node:assert/strict";
import test from "node:test";
import { PlayerRole, WinnerTeam } from "@/generated/prisma/client";
import { determineVoteOutcome } from "@/lib/vote-outcome";

const players = [
  { id: "civilian-a", role: PlayerRole.CIVILIAN },
  { id: "civilian-b", role: PlayerRole.CIVILIAN },
  { id: "impostor", role: PlayerRole.IMPOSTOR },
];

test("civilians win only when one impostor is uniquely most voted", () => {
  const outcome = determineVoteOutcome(players, [
    { targetId: "impostor" },
    { targetId: "impostor" },
    { targetId: "civilian-a" },
  ]);

  assert.equal(outcome.winner, WinnerTeam.CIVILIANS);
  assert.equal(outcome.isTie, false);
});

test("impostors win when the highest vote is tied", () => {
  const outcome = determineVoteOutcome(players, [
    { targetId: "impostor" },
    { targetId: "civilian-a" },
    { targetId: "civilian-b" },
  ]);

  assert.equal(outcome.winner, WinnerTeam.IMPOSTORS);
  assert.equal(outcome.isTie, true);
  assert.deepEqual(outcome.mostVotedPlayerIds.sort(), players.map((player) => player.id).sort());
});

test("impostors win when a civilian is uniquely most voted", () => {
  const outcome = determineVoteOutcome(players, [
    { targetId: "civilian-a" },
    { targetId: "civilian-a" },
    { targetId: "impostor" },
  ]);

  assert.equal(outcome.winner, WinnerTeam.IMPOSTORS);
  assert.equal(outcome.isTie, false);
});
