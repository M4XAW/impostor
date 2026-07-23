import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldEndGameAfterDeparture,
} from "@/lib/player-departure";

test("an active match ends when fewer than three players remain", () => {
  assert.equal(shouldEndGameAfterDeparture("DISCUSSION", 2), true);
  assert.equal(shouldEndGameAfterDeparture("VOTING", 2), true);
  assert.equal(shouldEndGameAfterDeparture("DISCUSSION", 3), false);
  assert.equal(shouldEndGameAfterDeparture("LOBBY", 2), false);
  assert.equal(shouldEndGameAfterDeparture("RESULTS", 2), false);
});
