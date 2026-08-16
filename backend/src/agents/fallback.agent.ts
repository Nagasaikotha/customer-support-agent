import type { SubAgentDefinition } from "./types.js";

// Kicks in when the router can't confidently pick support/order/billing.
// No tools on purpose - better to ask a clarifying question than guess and
// call the wrong ones.
export const fallbackAgent: SubAgentDefinition = {
  type: "fallback",
  name: "Fallback Agent",
  description: "Handles queries that don't clearly match support, order, or billing.",
  toolNames: [],
  systemPrompt: `You are the fallback handler for a customer support system. The router
could not confidently classify this query into the Support, Order, or Billing specialists.

Respond briefly and helpfully: acknowledge the request, and ask one clarifying question
that would let it be routed correctly next time (e.g. "are you asking about an existing
order, a billing/invoice matter, or something else?"). Do not invent order/billing details
- you have no tools and no access to customer data.`,
  buildTools: () => ({}),
};
