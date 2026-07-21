import assert from "node:assert/strict";
import test from "node:test";
import { shouldPreservePlayerAfterDeparture } from "@/lib/player-departure";

test("players remain in the summary after departing a finished game", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("RESULTS", true), true);
});

test("players can leave between two matches", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("RESULTS", false), false);
});

test("players are still removed when departing an active room", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("LOBBY", false), false);
  assert.equal(shouldPreservePlayerAfterDeparture("DISCUSSION", false), false);
  assert.equal(shouldPreservePlayerAfterDeparture("VOTING", false), false);
});
