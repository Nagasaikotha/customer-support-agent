import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types.js";
import { login } from "../services/auth.service.js";
import { BadRequestError } from "../lib/errors.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw BadRequestError(parsed.error.errors[0]?.message ?? "Invalid request body");
  }

  const result = await login(parsed.data.email, parsed.data.password);
  return c.json(result);
});
