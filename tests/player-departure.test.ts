import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldEndGameAfterDeparture,
  shouldPreservePlayerAfterDeparture,
} from "@/lib/player-departure";

test("players remain in the summary after departing a finished game", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("RESULTS", true, true), true);
});

test("players remain visible after an interrupted game ends", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("RESULTS", false, false), true);
});

test("players can leave between two matches", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("RESULTS", false, true), false);
});

test("players are still removed when departing an active room", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("LOBBY", false, false), false);
  assert.equal(shouldPreservePlayerAfterDeparture("DISCUSSION", false, false), false);
  assert.equal(shouldPreservePlayerAfterDeparture("VOTING", false, false), false);
});

test("the departing player remains when their departure ends the game", () => {
  assert.equal(shouldEndGameAfterDeparture("DISCUSSION", 2), true);
  assert.equal(shouldEndGameAfterDeparture("VOTING", 2), true);
  assert.equal(shouldEndGameAfterDeparture("DISCUSSION", 3), false);
  assert.equal(shouldEndGameAfterDeparture("LOBBY", 2), false);
});
