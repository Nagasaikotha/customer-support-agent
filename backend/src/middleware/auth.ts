import type { Context, Next } from "hono";
import type { AppEnv } from "../types.js";
import { verifyToken } from "../lib/jwt.js";
import { UnauthorizedError } from "../lib/errors.js";

// checks the Bearer token, sticks userId/userEmail on the context for
// downstream handlers. Throws instead of returning a response directly so
// it goes through the same error middleware as everything else.
export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw UnauthorizedError("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);
    c.set("userId", payload.userId);
    c.set("userEmail", payload.email);
  } catch {
    throw UnauthorizedError("Invalid or expired token");
  }

  await next();
}
