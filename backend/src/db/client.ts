import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new Pool({ connectionString: env.databaseUrl });

// `db` is the single shared Drizzle instance, typed against our schema so
// that `db.query.conversations.with({ messages: true })`-style relational
// queries and inferred row types work everywhere it's imported.
export const db = drizzle(pool, { schema });
