import type { Tool } from "ai";

/** The four possible values stored in messages.agent_type (see db/schema.ts). */
export type AgentType = "support" | "order" | "billing" | "fallback";

export interface AgentCapability {
  type: AgentType;
  name: string;
  description: string;
  tools: string[];
}

// buildTools is a factory, not a plain object - tools need to be rebuilt
// per request so they're scoped to whoever's actually asking (see tools/*).
export interface SubAgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  toolNames: string[];
  buildTools: (ctx: { userId: number; conversationId: number }) => Record<string, Tool>;
}
