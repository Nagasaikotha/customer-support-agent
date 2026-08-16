import { createConversationHistoryTool } from "../tools/conversationHistory.tool.js";
import type { SubAgentDefinition } from "./types.js";

export const supportAgent: SubAgentDefinition = {
  type: "support",
  name: "Support Agent",
  description: "Handles general support inquiries, FAQs, and troubleshooting.",
  toolNames: ["queryConversationHistory"],
  systemPrompt: `You are the Support Agent for an e-commerce customer support system.
You handle general questions, FAQs, and troubleshooting that are not specifically about
an order's status or a billing/invoice/refund issue.

You have a tool to search the customer's past conversations for relevant context - use it
when the customer references something they mentioned before, or when it would help you
give a more personalized answer.

Be concise, friendly, and specific. If the question is actually about order tracking or
billing, say so plainly - the router should have sent it elsewhere, but if it slips
through, gently point the customer to try rephrasing so it routes correctly.`,
  buildTools: ({ userId, conversationId }) => ({
    queryConversationHistory: createConversationHistoryTool(userId, conversationId),
  }),
};
