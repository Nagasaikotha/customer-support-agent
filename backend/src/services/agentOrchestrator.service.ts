import { streamText, type CoreMessage } from "ai";
import { chatModel } from "../lib/model.js";
import { classifyQuery, type RouterDecision } from "../agents/router.agent.js";
import { getAgent } from "../agents/index.js";
import type { SubAgentDefinition } from "../agents/types.js";
import { env } from "../config/env.js";
import { runMockOrchestration } from "./mockAgentOrchestrator.service.js";

// Only pulling out the bit of streamText's return value that anything
// downstream actually uses. Kept it this narrow on purpose so the mock
// orchestrator (mockAgentOrchestrator.service.ts) can stand in for the real
// one - it just needs to produce something with a textStream, not fake the
// whole SDK shape.
export interface AgentTextStream {
  textStream: AsyncIterable<string>;
}

export interface OrchestrationResult {
  decision: RouterDecision;
  agent: SubAgentDefinition;
  stream: AgentTextStream;
}

// router -> sub-agent, in three steps:
//   1. classify the latest message against conversation history
//   2. pull the matching agent out of the registry, tools bound to this
//      user/conversation
//   3. let it stream its answer, calling tools along the way
//
// Returns the stream itself rather than awaiting the full text - the route
// pipes tokens out as they come in and only writes to Postgres once the
// stream's done.
//
// MOCK_LLM=true short-circuits to a keyword-based fake (see README) so this
// runs without a Groq key. Nothing else changes in that mode - DB tools,
// persistence, SSE, the typing indicator all behave the same either way.
export async function runOrchestration(input: {
  userId: number;
  conversationId: number;
  history: CoreMessage[];
}): Promise<OrchestrationResult> {
  if (env.mockLlm) {
    return runMockOrchestration(input);
  }

  const decision = await classifyQuery(input.history);
  const agent = getAgent(decision.agent);
  const tools = agent.buildTools({ userId: input.userId, conversationId: input.conversationId });

  const stream = streamText({
    model: chatModel,
    system: agent.systemPrompt,
    messages: input.history,
    tools,
    maxSteps: 5,
  });

  return { decision, agent, stream };
}
