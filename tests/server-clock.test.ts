import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateServerClockOffsetMs,
  getCountdownSeconds,
  getNextCountdownUpdateDelay,
} from "@/lib/server-clock";

test("server clock offset excludes request processing time and network latency", () => {
  const offset = estimateServerClockOffsetMs(1_000, 1_140, {
    receivedAt: 6_050,
    sentAt: 6_090,
  });

  assert.equal(offset, 5_000);
});

test("countdown seconds use the synchronized server time", () => {
  assert.equal(getCountdownSeconds(30_000, 0), 30);
  assert.equal(getCountdownSeconds(30_000, 1), 30);
  assert.equal(getCountdownSeconds(30_000, 1_000), 29);
  assert.equal(getCountdownSeconds(30_000, 30_000), 0);
  assert.equal(getCountdownSeconds(30_000, 31_000), 0);
});

test("countdown updates are aligned with the next displayed second", () => {
  assert.equal(getNextCountdownUpdateDelay(29_750), 755);
  assert.equal(getNextCountdownUpdateDelay(30_000), 1_005);
  assert.equal(getNextCountdownUpdateDelay(0), null);
});
