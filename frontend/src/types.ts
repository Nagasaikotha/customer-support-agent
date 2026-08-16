// Mirrors the backend's shapes (see backend/src/agents/types.ts and
// db/schema.ts). Hand-duplicated for now since this is a single repo, not
// the Turborepo+Hono-RPC monorepo - see README for why that's sequenced
// as a follow-up rather than done upfront.

export type AgentType = "support" | "order" | "billing" | "fallback";

export interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  tools: string[];
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  agentType: AgentType | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouterDecision {
  agent: AgentType;
  confidence: number;
  reasoning: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}
