import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import { AGENT_REGISTRY, isKnownAgentType } from "../agents/index.js";
import type { AgentCapability } from "../agents/types.js";
import { NotFoundError } from "../lib/errors.js";

export const agentsRoutes = new Hono<AppEnv>();

function toCapability(agent: (typeof AGENT_REGISTRY)[keyof typeof AGENT_REGISTRY]): AgentCapability {
  return { type: agent.type, name: agent.name, description: agent.description, tools: agent.toolNames };
}

agentsRoutes.get("/", (c) => {
  const agents = Object.values(AGENT_REGISTRY).map(toCapability);
  return c.json({ agents });
});

agentsRoutes.get("/:type/capabilities", (c) => {
  const type = c.req.param("type");
  if (!isKnownAgentType(type)) {
    throw NotFoundError("Agent");
  }

  return c.json(toCapability(AGENT_REGISTRY[type]));
});
