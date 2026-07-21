import assert from "node:assert/strict";
import test from "node:test";
import { buildVoteResults } from "@/lib/vote-results";

test("vote results rank every player and preserve tied leaders", () => {
  const players = [
    { id: "player-1", publicId: "public-1", name: "Alice" },
    { id: "player-2", publicId: "public-2", name: "Benoît" },
    { id: "player-3", publicId: "public-3", name: "Chloé" },
  ];
  const votes = [
    { targetId: "player-1" },
    { targetId: "player-2" },
  ];

  assert.deepEqual(buildVoteResults(players, votes), [
    {
      playerPublicId: "public-1",
      playerName: "Alice",
      voteCount: 1,
      isMostVoted: true,
    },
    {
      playerPublicId: "public-2",
      playerName: "Benoît",
      voteCount: 1,
      isMostVoted: true,
    },
    {
      playerPublicId: "public-3",
      playerName: "Chloé",
      voteCount: 0,
      isMostVoted: false,
    },
  ]);
});
