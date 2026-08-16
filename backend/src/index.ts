import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppEnv } from "./types.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.routes.js";
import { chatRoutes } from "./routes/chat.routes.js";
import { agentsRoutes } from "./routes/agents.routes.js";
import { healthRoutes } from "./routes/health.routes.js";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", cors({ origin: env.corsOrigin, allowHeaders: ["Content-Type", "Authorization"] }));
app.onError(errorHandler);

app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/agents", agentsRoutes);

// Everything under /api/chat requires a valid JWT.
app.use("/api/chat/*", authMiddleware);
app.route("/api/chat", chatRoutes);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend listening on http://localhost:${info.port}`);
});
