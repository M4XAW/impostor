import assert from "node:assert/strict";
import test from "node:test";
import { PublicError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

test("rate limiting rejects requests over the configured quota", () => {
  const key = `test:${crypto.randomUUID()}`;

  enforceRateLimit(key, 2, 60_000);
  enforceRateLimit(key, 2, 60_000);

  assert.throws(
    () => enforceRateLimit(key, 2, 60_000),
    (error: unknown) => error instanceof PublicError && error.status === 429,
  );
});
