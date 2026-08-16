import { supportAgent } from "./support.agent.js";
import { orderAgent } from "./order.agent.js";
import { billingAgent } from "./billing.agent.js";
import { fallbackAgent } from "./fallback.agent.js";
import type { AgentType, SubAgentDefinition } from "./types.js";

// one place that knows "what agents exist" - router, orchestrator, and the
// /agents endpoints all read from this instead of each hardcoding the list
export const AGENT_REGISTRY: Record<AgentType, SubAgentDefinition> = {
  support: supportAgent,
  order: orderAgent,
  billing: billingAgent,
  fallback: fallbackAgent,
};

export function getAgent(type: AgentType): SubAgentDefinition {
  return AGENT_REGISTRY[type];
}

export { isKnownAgentType } from "./router.agent.js";
export * from "./types.js";
