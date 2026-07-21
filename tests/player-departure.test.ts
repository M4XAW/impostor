import assert from "node:assert/strict";
import test from "node:test";
import { shouldPreservePlayerAfterDeparture } from "@/lib/player-departure";

test("players remain in the summary after departing a finished game", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("RESULTS"), true);
});

test("players are still removed when departing an active room", () => {
  assert.equal(shouldPreservePlayerAfterDeparture("LOBBY"), false);
  assert.equal(shouldPreservePlayerAfterDeparture("DISCUSSION"), false);
  assert.equal(shouldPreservePlayerAfterDeparture("VOTING"), false);
});
