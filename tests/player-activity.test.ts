import assert from "node:assert/strict";
import test from "node:test";
import { isPlayerActivityEvent } from "@/lib/player-activity";

test("player activity events accept joined and left players", () => {
  assert.equal(isPlayerActivityEvent({
    type: "joined",
    playerPublicId: "public-1",
    playerName: "Alice",
  }), true);
  assert.equal(isPlayerActivityEvent({
    type: "left",
    playerPublicId: "public-2",
    playerName: "Benoît",
  }), true);
});

test("player activity events reject malformed socket payloads", () => {
  assert.equal(isPlayerActivityEvent(null), false);
  assert.equal(isPlayerActivityEvent({ type: "disconnected", playerName: "Alice" }), false);
  assert.equal(isPlayerActivityEvent({
    type: "left",
    playerPublicId: 42,
    playerName: "Alice",
  }), false);
});
