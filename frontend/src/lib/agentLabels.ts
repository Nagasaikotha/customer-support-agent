import type { AgentType } from "../types.js";

export const AGENT_LABELS: Record<AgentType, string> = {
  support: "Support Agent",
  order: "Order Agent",
  billing: "Billing Agent",
  fallback: "Fallback Agent",
};
