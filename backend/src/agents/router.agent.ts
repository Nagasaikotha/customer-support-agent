import { generateObject, type CoreMessage } from "ai";
import { z } from "zod";
import { routerModel } from "../lib/model.js";
import type { AgentType } from "./types.js";

const classificationSchema = z.object({
  agent: z.enum(["support", "order", "billing", "fallback"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().describe("One short sentence explaining the classification."),
});

export type RouterDecision = z.infer<typeof classificationSchema>;

const ROUTER_SYSTEM_PROMPT = `You are the Router Agent for a customer support system. Your only
job is to classify the customer's latest message into exactly one category, using the
recent conversation as context:

- "order": order status, tracking, shipping, delivery, modifying or cancelling an order.
- "billing": payments, charges, invoices, refunds, subscriptions.
- "support": general questions, FAQs, troubleshooting, account issues, anything that isn't
  clearly an order or billing matter.
- "fallback": the message is too ambiguous, off-topic, or unclear to confidently classify.

Use "fallback" rather than guessing when you're genuinely unsure - a wrong confident guess
sends the customer to the wrong specialist, which is worse than asking for clarification.`;

// generateObject instead of the full chat model - just want a fast, cheap
// classification here, don't want routing itself adding noticeable lag
// before the actual sub-agent starts streaming back.
export async function classifyQuery(history: CoreMessage[]): Promise<RouterDecision> {
  const { object } = await generateObject({
    model: routerModel,
    schema: classificationSchema,
    system: ROUTER_SYSTEM_PROMPT,
    messages: history,
  });

  return object;
}

export function isKnownAgentType(value: string): value is AgentType {
  return ["support", "order", "billing", "fallback"].includes(value);
}
