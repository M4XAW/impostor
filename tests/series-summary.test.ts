import assert from "node:assert/strict";
import test from "node:test";
import { buildSeriesSummary } from "@/lib/series-summary";

const matches = [
  {
    matchNumber: 1,
    winner: "CIVILIANS" as const,
    isVoteTie: false,
    civilianWord: "chat",
    impostorWord: "tigre",
    playerResults: [
      { playerPublicId: "alice", playerName: "Alice", role: "CIVILIAN" as const, receivedVoteCount: 0, votedForImpostor: true, isMatchWinner: true },
      { playerPublicId: "bob", playerName: "Bob", role: "CIVILIAN" as const, receivedVoteCount: 1, votedForImpostor: true, isMatchWinner: true },
      { playerPublicId: "charlie", playerName: "Charlie", role: "IMPOSTOR" as const, receivedVoteCount: 2, votedForImpostor: false, isMatchWinner: false },
    ],
  },
  {
    matchNumber: 2,
    winner: "IMPOSTORS" as const,
    isVoteTie: true,
    civilianWord: "plage",
    impostorWord: "désert",
    playerResults: [
      { playerPublicId: "alice", playerName: "Alice", role: "IMPOSTOR" as const, receivedVoteCount: 1, votedForImpostor: false, isMatchWinner: true },
      { playerPublicId: "bob", playerName: "Bob", role: "CIVILIAN" as const, receivedVoteCount: 1, votedForImpostor: true, isMatchWinner: false },
      { playerPublicId: "charlie", playerName: "Charlie", role: "CIVILIAN" as const, receivedVoteCount: 1, votedForImpostor: true, isMatchWinner: false },
    ],
  },
  {
    matchNumber: 3,
    winner: "CIVILIANS" as const,
    isVoteTie: false,
    civilianWord: "piano",
    impostorWord: "guitare",
    playerResults: [
      { playerPublicId: "alice", playerName: "Alice", role: "CIVILIAN" as const, receivedVoteCount: 0, votedForImpostor: true, isMatchWinner: true },
      { playerPublicId: "bob", playerName: "Bob", role: "IMPOSTOR" as const, receivedVoteCount: 2, votedForImpostor: false, isMatchWinner: false },
      { playerPublicId: "charlie", playerName: "Charlie", role: "CIVILIAN" as const, receivedVoteCount: 1, votedForImpostor: true, isMatchWinner: true },
    ],
  },
];

test("the final summary calculates the global winner and player match wins", () => {
  const summary = buildSeriesSummary(matches);

  assert.equal(summary.globalWinner, "CIVILIANS");
  assert.equal(summary.civilianMatchWins, 2);
  assert.equal(summary.impostorMatchWins, 1);
  assert.deepEqual(summary.playerScores, [
    { playerPublicId: "alice", playerName: "Alice", matchWins: 3 },
    { playerPublicId: "bob", playerName: "Bob", matchWins: 1 },
    { playerPublicId: "charlie", playerName: "Charlie", matchWins: 1 },
  ]);
});

test("the final summary awards the best detective and stealthiest impostor", () => {
  const summary = buildSeriesSummary(matches);

  assert.deepEqual(summary.bestDetective, {
    playerNames: ["Alice", "Bob", "Charlie"],
    value: 2,
  });
  assert.deepEqual(summary.stealthiestImpostor, {
    playerNames: ["Alice"],
    value: 1,
  });
});

test("the final summary preserves match details and tied votes", () => {
  const summary = buildSeriesSummary(matches);

  assert.equal(summary.matches[1]?.isVoteTie, true);
  assert.deepEqual(summary.matches[1]?.impostorNames, ["Alice"]);
  assert.equal(summary.matches[1]?.voteResults.filter((result) => result.isMostVoted).length, 3);
});
