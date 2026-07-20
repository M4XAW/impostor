import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlayerSessionCredential,
  hashSessionToken,
  isValidSessionToken,
} from "@/lib/session-token";

test("player session credentials use a non-reversible random token", () => {
  const first = createPlayerSessionCredential();
  const second = createPlayerSessionCredential();

  assert.equal(isValidSessionToken(first.token), true);
  assert.equal(first.token.length, 43);
  assert.equal(first.tokenHash.length, 64);
  assert.equal(first.tokenHash, hashSessionToken(first.token));
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, second.tokenHash);
  assert.equal(first.tokenHash.includes(first.token), false);
});
