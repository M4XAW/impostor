import { PublicError } from "@/lib/errors";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  impostorRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets = globalForRateLimit.impostorRateLimitBuckets ?? new Map<string, RateLimitBucket>();
globalForRateLimit.impostorRateLimitBuckets = buckets;

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new PublicError(`Trop de requêtes. Réessaie dans ${retryAfterSeconds} seconde${retryAfterSeconds > 1 ? "s" : ""}.`, 429);
  }

  current.count += 1;
}
