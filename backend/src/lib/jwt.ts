import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  userId: number;
  email: string;
}

const TOKEN_TTL = "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  // jwt.verify throws (TokenExpiredError / JsonWebTokenError) on any problem;
  // callers rely on that to reject invalid/expired tokens.
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
