import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { AppError } from "../lib/errors.js";
import { env } from "../config/env.js";

// registered via app.onError in index.ts - this is the only place that
// turns a thrown error into an actual response. routes/services just throw
// (AppError, or let something unexpected bubble up) and never format
// anything themselves.
export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ error: { message: err.message, status: err.status } }, err.status);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: { message: err.message, status: err.status } }, err.status);
  }

  // Unexpected error: log full detail server-side, but never leak internals
  // to the client. Stack trace only surfaces outside production.
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: {
        message: "Internal server error",
        status: 500,
        ...(env.nodeEnv !== "production" ? { detail: err.message } : {}),
      },
    },
    500,
  );
}
