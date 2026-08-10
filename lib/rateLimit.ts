/**
 * A simple in-memory, per-process rate limiter — an honest stand-in for Redis/Upstash, not a
 * distributed-system-grade solution. Same "MVP stand-in" pattern as lib/storage.ts using local
 * disk instead of S3: correct for a single Container App instance, resets on restart, and
 * doesn't share state across instances if this ever scales horizontally. Good enough to stop
 * casual brute-forcing of login/invite-code guesses, not a defense against a determined,
 * distributed attacker.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Prevents unbounded growth from many distinct keys (e.g. one bucket per IP) — a request
// touches this on every check, so an old bucket only lingers until the next call for any key.
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns true if the call is allowed, false if `key` has exceeded `max` calls within
 * `windowMs`. Callers own the key shape (e.g. `login:${ip}`) so different actions get
 * independent limits. */
export function checkRateLimit(key: string, { max, windowMs }: { max: number; windowMs: number }): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}
