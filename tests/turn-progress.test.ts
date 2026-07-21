import assert from "node:assert/strict";
import test from "node:test";
import { getNextTurnProgress } from "@/lib/turn-progress";

test("the turn moves to the next player during a round", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 0,
      playerCount: 3,
      roundNumber: 1,
      roundCount: 2,
      wordNumber: 1,
      wordCount: 2,
    }),
    {
      phase: "DISCUSSION",
      currentPlayerIndex: 1,
      roundNumber: 1,
      wordNumber: 1,
    },
  );
});

test("the last player starts the next configured round", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 2,
      playerCount: 3,
      roundNumber: 1,
      roundCount: 2,
      wordNumber: 1,
      wordCount: 2,
    }),
    {
      phase: "DISCUSSION",
      currentPlayerIndex: 0,
      roundNumber: 2,
      wordNumber: 1,
    },
  );
});

test("the next word starts after all its configured rounds", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 2,
      playerCount: 3,
      roundNumber: 2,
      roundCount: 2,
      wordNumber: 1,
      wordCount: 2,
    }),
    {
      phase: "DISCUSSION",
      currentPlayerIndex: 0,
      roundNumber: 1,
      wordNumber: 2,
    },
  );
});

test("the same word remains active throughout three configured rounds", () => {
  const playerCount = 3;
  const roundCount = 3;
  const activeWordNumbers: number[] = [];
  let currentTurn = {
    phase: "DISCUSSION" as const,
    currentPlayerIndex: 0,
    roundNumber: 1,
    wordNumber: 1,
  };

  for (let turnNumber = 0; turnNumber < playerCount * roundCount; turnNumber += 1) {
    activeWordNumbers.push(currentTurn.wordNumber);

    const nextTurn = getNextTurnProgress({
      currentPlayerIndex: currentTurn.currentPlayerIndex,
      playerCount,
      roundNumber: currentTurn.roundNumber,
      roundCount,
      wordNumber: currentTurn.wordNumber,
      wordCount: 2,
    });

    assert.equal(nextTurn.phase, "DISCUSSION");
    if (nextTurn.phase === "DISCUSSION") currentTurn = nextTurn;
  }

  assert.deepEqual(activeWordNumbers, Array<number>(9).fill(1));
  assert.deepEqual(currentTurn, {
    phase: "DISCUSSION",
    currentPlayerIndex: 0,
    roundNumber: 1,
    wordNumber: 2,
  });
});

test("voting starts after the final configured turn", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 2,
      playerCount: 3,
      roundNumber: 2,
      roundCount: 2,
      wordNumber: 2,
      wordCount: 2,
    }),
    { phase: "VOTING" },
  );
});
