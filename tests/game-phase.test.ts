import assert from "node:assert/strict";
import test from "node:test";
import { assertGamePhaseTransition, canTransitionGamePhase } from "@/lib/game-phase";

test("the game state machine allows the expected match lifecycle", () => {
  assert.equal(canTransitionGamePhase("LOBBY", "DISCUSSION"), true);
  assert.equal(canTransitionGamePhase("DISCUSSION", "VOTING"), true);
  assert.equal(canTransitionGamePhase("VOTING", "RESULTS"), true);
  assert.equal(canTransitionGamePhase("RESULTS", "DISCUSSION"), true);
  assert.equal(canTransitionGamePhase("RESULTS", "LOBBY"), true);
});

test("the game state machine rejects skipped phases", () => {
  assert.equal(canTransitionGamePhase("LOBBY", "VOTING"), false);
  assert.throws(() => assertGamePhaseTransition("LOBBY", "RESULTS"), {
    message: "La transition LOBBY vers RESULTS n’est pas autorisée.",
  });
});
