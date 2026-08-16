import type { Context, Next } from "hono";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";
import { TooManyRequestsError } from "../lib/errors.js";

interface Bucket {
  count: number;
  windowStart: number;
}

// In-memory fixed-window rate limiter, keyed per authenticated user. This is
// intentionally simple (no Redis) since the assessment only needs one
// process; swapping the Map for a Redis-backed store would be the change
// needed to scale this across multiple server instances.
const buckets = new Map<string, Bucket>();

export function rateLimiter(c: Context<AppEnv>, next: Next) {
  const key = String(c.get("userId") ?? c.req.header("x-forwarded-for") ?? "anonymous");
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > env.rateLimit.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (bucket.count >= env.rateLimit.max) {
    throw TooManyRequestsError(
      `Rate limit exceeded: max ${env.rateLimit.max} requests per ${env.rateLimit.windowMs / 1000}s`,
    );
  }

  bucket.count += 1;
  return next();
}
