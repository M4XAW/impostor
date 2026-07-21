import assert from "node:assert/strict";
import test from "node:test";
import { buildRoundRows } from "@/lib/round-rows";

const clues = [
  { wordNumber: 2, roundNumber: 1 },
  { wordNumber: 2, roundNumber: 2 },
];

test("voting displays every round like the result summary", () => {
  const expectedRows = [
    { wordNumber: 2, roundNumber: 1 },
    { wordNumber: 2, roundNumber: 2 },
    { wordNumber: 2, roundNumber: 3 },
  ];

  assert.deepEqual(
    buildRoundRows({
      clues,
      phase: "VOTING",
      roundCount: 3,
      showAllWords: false,
    }),
    expectedRows,
  );
  assert.deepEqual(
    buildRoundRows({
      clues,
      phase: "RESULTS",
      roundCount: 3,
      showAllWords: false,
      resultWordNumber: 2,
    }),
    expectedRows,
  );
});

test("discussion only displays reached rounds and the active round", () => {
  assert.deepEqual(
    buildRoundRows({
      clues: clues.slice(0, 1),
      phase: "DISCUSSION",
      roundCount: 3,
      showAllWords: false,
      turn: { wordNumber: 2, roundNumber: 2 },
    }),
    clues,
  );
});

test("the final game summary contains every round grouped by word", () => {
  assert.deepEqual(
    buildRoundRows({
      clues: [
        { wordNumber: 1, roundNumber: 1 },
        { wordNumber: 2, roundNumber: 1 },
      ],
      phase: "RESULTS",
      roundCount: 2,
      showAllWords: true,
      resultWordNumber: 2,
    }),
    [
      { wordNumber: 1, roundNumber: 1 },
      { wordNumber: 1, roundNumber: 2 },
      { wordNumber: 2, roundNumber: 1 },
      { wordNumber: 2, roundNumber: 2 },
    ],
  );
});
