import assert from "node:assert/strict";
import test from "node:test";
import { getNextTurnProgress } from "@/lib/turn-progress";

test("the turn moves to the next player during a round", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 0,
      playerCount: 3,
      clueRoundNumber: 1,
      clueRoundCount: 2,
      matchNumber: 1,
    }),
    {
      phase: "DISCUSSION",
      currentPlayerIndex: 1,
      clueRoundNumber: 1,
      matchNumber: 1,
    },
  );
});

test("the last player starts the next configured round", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 2,
      playerCount: 3,
      clueRoundNumber: 1,
      clueRoundCount: 2,
      matchNumber: 1,
    }),
    {
      phase: "DISCUSSION",
      currentPlayerIndex: 0,
      clueRoundNumber: 2,
      matchNumber: 1,
    },
  );
});

test("voting starts after all configured clue rounds even when more matches remain", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 2,
      playerCount: 3,
      clueRoundNumber: 2,
      clueRoundCount: 2,
      matchNumber: 1,
    }),
    { phase: "VOTING" },
  );
});

test("the same match remains active throughout three configured clue rounds", () => {
  const playerCount = 3;
  const clueRoundCount = 3;
  const activeWordNumbers: number[] = [];
  let currentTurn = {
    phase: "DISCUSSION" as const,
    currentPlayerIndex: 0,
    clueRoundNumber: 1,
    matchNumber: 1,
  };

  for (let turnNumber = 0; turnNumber < playerCount * clueRoundCount; turnNumber += 1) {
    activeWordNumbers.push(currentTurn.matchNumber);

    const nextTurn = getNextTurnProgress({
      currentPlayerIndex: currentTurn.currentPlayerIndex,
      playerCount,
      clueRoundNumber: currentTurn.clueRoundNumber,
      clueRoundCount,
      matchNumber: currentTurn.matchNumber,
    });

    if (turnNumber < playerCount * clueRoundCount - 1) {
      assert.equal(nextTurn.phase, "DISCUSSION");
      if (nextTurn.phase === "DISCUSSION") currentTurn = nextTurn;
    } else {
      assert.deepEqual(nextTurn, { phase: "VOTING" });
    }
  }

  assert.deepEqual(activeWordNumbers, Array<number>(9).fill(1));
});

test("voting starts after the final configured turn", () => {
  assert.deepEqual(
    getNextTurnProgress({
      currentPlayerIndex: 2,
      playerCount: 3,
      clueRoundNumber: 2,
      clueRoundCount: 2,
      matchNumber: 2,
    }),
    { phase: "VOTING" },
  );
});
