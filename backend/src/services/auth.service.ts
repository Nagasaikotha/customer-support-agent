import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { signToken } from "../lib/jwt.js";
import { UnauthorizedError } from "../lib/errors.js";

export interface LoginResult {
  token: string;
  user: { id: number; email: string; name: string };
}

// no signup here on purpose - just login against the seeded users in
// db/seed.ts. Didn't want auth eating into time that should go toward the
// actual multi-agent stuff.
export async function login(email: string, password: string): Promise<LoginResult> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw UnauthorizedError("Invalid email or password");
  }

  const token = signToken({ userId: user.id, email: user.email });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}
