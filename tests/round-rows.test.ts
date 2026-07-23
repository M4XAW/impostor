import assert from "node:assert/strict";
import test from "node:test";
import { buildClueRoundRows, hasPlayerTurnElapsed } from "@/lib/round-rows";

const clues = [
  { matchNumber: 2, clueRoundNumber: 1 },
  { matchNumber: 2, clueRoundNumber: 2 },
];

test("voting displays every round like the result summary", () => {
  const expectedRows = [
    { matchNumber: 2, clueRoundNumber: 1 },
    { matchNumber: 2, clueRoundNumber: 2 },
    { matchNumber: 2, clueRoundNumber: 3 },
  ];

  assert.deepEqual(
    buildClueRoundRows({
      clues,
      phase: "VOTING",
      clueRoundCount: 3,
      showAllMatches: false,
    }),
    expectedRows,
  );
  assert.deepEqual(
    buildClueRoundRows({
      clues,
      phase: "RESULTS",
      clueRoundCount: 3,
      showAllMatches: false,
      resultMatchNumber: 2,
    }),
    expectedRows,
  );
});

test("discussion only displays reached rounds and the active round", () => {
  assert.deepEqual(
    buildClueRoundRows({
      clues: clues.slice(0, 1),
      phase: "DISCUSSION",
      clueRoundCount: 3,
      showAllMatches: false,
      turn: { matchNumber: 2, clueRoundNumber: 2 },
    }),
    clues,
  );
});

test("the final game summary contains every clue round grouped by match", () => {
  assert.deepEqual(
    buildClueRoundRows({
      clues: [
        { matchNumber: 1, clueRoundNumber: 1 },
        { matchNumber: 2, clueRoundNumber: 1 },
      ],
      phase: "RESULTS",
      clueRoundCount: 2,
      showAllMatches: true,
      resultMatchNumber: 2,
    }),
    [
      { matchNumber: 1, clueRoundNumber: 1 },
      { matchNumber: 1, clueRoundNumber: 2 },
      { matchNumber: 2, clueRoundNumber: 1 },
      { matchNumber: 2, clueRoundNumber: 2 },
    ],
  );
});

test("only elapsed turns display a missing clue during discussion", () => {
  const turn = { matchNumber: 1, clueRoundNumber: 1 };

  assert.equal(hasPlayerTurnElapsed({
    phase: "DISCUSSION",
    row: turn,
    turn,
    playerIndex: 0,
    currentPlayerIndex: 0,
  }), false);
  assert.equal(hasPlayerTurnElapsed({
    phase: "DISCUSSION",
    row: turn,
    turn,
    playerIndex: 1,
    currentPlayerIndex: 0,
  }), false);
  assert.equal(hasPlayerTurnElapsed({
    phase: "DISCUSSION",
    row: turn,
    turn,
    playerIndex: 0,
    currentPlayerIndex: 1,
  }), true);
});

test("missing clues are expired in completed rounds and result screens", () => {
  assert.equal(hasPlayerTurnElapsed({
    phase: "DISCUSSION",
    row: { matchNumber: 1, clueRoundNumber: 1 },
    turn: { matchNumber: 1, clueRoundNumber: 2 },
    playerIndex: 2,
    currentPlayerIndex: 0,
  }), true);
  assert.equal(hasPlayerTurnElapsed({
    phase: "RESULTS",
    row: { matchNumber: 1, clueRoundNumber: 1 },
    playerIndex: 2,
    currentPlayerIndex: -1,
  }), true);
});
