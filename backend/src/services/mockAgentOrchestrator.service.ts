import { eq, and, ne, desc } from "drizzle-orm";
import type { CoreMessage } from "ai";
import { db } from "../db/client.js";
import { orders, deliveries, invoices, refunds, conversations } from "../db/schema.js";
import { getAgent } from "../agents/index.js";
import type { AgentType } from "../agents/types.js";
import type { RouterDecision } from "../agents/router.agent.js";
import type { OrchestrationResult } from "./agentOrchestrator.service.js";

// Dev-only stand-in for the real pipeline, only active when MOCK_LLM=true
// (config/env.ts). Wanted a way to click through the whole app - real
// Postgres, real persistence, real SSE/typing-indicator wiring - without
// needing a Groq key on hand every time. To be clear about what this
// ISN'T: the classification below is just keyword matching, not the actual
// Router Agent (that's router.agent.ts), and replies are templated strings
// built from real query results rather than anything a model wrote -
// every one gets a "[mock ...]" prefix so it can't be confused for the
// real thing.
//
// Also worth noting: this hits the DB with plain Drizzle calls instead of
// going through the tools in src/tools/*. Those are built around the AI
// SDK's tool-calling contract (parameters schema, execute signature meant
// to be called by the model), which is awkward to invoke directly here -
// easier to just write the same queries again than fight that shape.

function extractOrderNumber(text: string): string | undefined {
  return text.match(/ord-\d+/i)?.[0]?.toUpperCase();
}

function extractInvoiceNumber(text: string): string | undefined {
  return text.match(/inv-\d+/i)?.[0]?.toUpperCase();
}

function lastUserMessageText(history: CoreMessage[]): string {
  const message = [...history].reverse().find((m) => m.role === "user");
  return typeof message?.content === "string" ? message.content : "";
}

function classifyMock(history: CoreMessage[]): RouterDecision {
  const text = lastUserMessageText(history).toLowerCase();

  if (/\b(order|track|ship|deliver|cancel|package)\b/.test(text)) {
    return { agent: "order", confidence: 0.8, reasoning: "[mock] matched order/shipping keywords." };
  }
  if (/\b(bill|invoice|refund|payment|charge|subscription)\b/.test(text)) {
    return { agent: "billing", confidence: 0.8, reasoning: "[mock] matched billing keywords." };
  }
  if (text.trim().length < 4) {
    return { agent: "fallback", confidence: 0.4, reasoning: "[mock] message too short to classify confidently." };
  }
  return { agent: "support", confidence: 0.6, reasoning: "[mock] no order/billing keywords - defaulting to support." };
}

async function buildOrderReply(userId: number, text: string): Promise<string> {
  const orderNumber = extractOrderNumber(text);

  if (!orderNumber) {
    const rows = await db.select().from(orders).where(eq(orders.userId, userId));
    if (rows.length === 0) return "[mock order agent] I don't see any orders on this account yet.";
    return `[mock order agent] Here are your recent orders: ${rows
      .map((o) => `${o.orderNumber} (${o.status})`)
      .join(", ")}. Ask about a specific order number for tracking details.`;
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)));

  if (!order) {
    return `[mock order agent] I couldn't find an order with number ${orderNumber} on this account.`;
  }

  const [delivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, order.id));
  const shipping = delivery
    ? `Shipped via ${delivery.carrier}, tracking ${delivery.trackingNumber}. Latest update: ${delivery.lastUpdate}`
    : "No shipment tracking yet (still processing).";

  return `[mock order agent] Order ${orderNumber} is "${order.status}". ${shipping}`;
}

async function buildBillingReply(userId: number, text: string): Promise<string> {
  const invoiceNumber = extractInvoiceNumber(text);

  if (!invoiceNumber) {
    const rows = await db.select().from(invoices).where(eq(invoices.userId, userId));
    if (rows.length === 0) return "[mock billing agent] I don't see any invoices on this account yet.";
    return `[mock billing agent] Here are your invoices: ${rows
      .map((i) => `${i.invoiceNumber} ($${i.amount}, ${i.status})`)
      .join(", ")}. Ask about a specific invoice number for more detail.`;
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.invoiceNumber, invoiceNumber)));

  if (!invoice) {
    return `[mock billing agent] I couldn't find an invoice with number ${invoiceNumber} on this account.`;
  }

  const refundRows = await db.select().from(refunds).where(eq(refunds.invoiceId, invoice.id));
  const refundText =
    refundRows.length > 0
      ? `Refund status: ${refundRows[0].status}.`
      : "No refund has been requested for this invoice.";

  return `[mock billing agent] Invoice ${invoiceNumber}: $${invoice.amount}, status "${invoice.status}". ${refundText}`;
}

async function buildSupportReply(userId: number, conversationId: number): Promise<string> {
  const priorConversations = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), ne(conversations.id, conversationId)))
    .orderBy(desc(conversations.updatedAt))
    .limit(5);

  return `[mock support agent] Thanks for reaching out - happy to help with general questions or troubleshooting. ${
    priorConversations.length > 0
      ? `I can see ${priorConversations.length} other conversation(s) on file if that's relevant.`
      : "This looks like your first conversation with us."
  }`;
}

async function buildReply(agentType: AgentType, userId: number, conversationId: number, text: string): Promise<string> {
  switch (agentType) {
    case "order":
      return buildOrderReply(userId, text);
    case "billing":
      return buildBillingReply(userId, text);
    case "support":
      return buildSupportReply(userId, conversationId);
    default:
      return "[mock fallback agent] I'm not fully sure what you're asking - could you clarify whether this is about an existing order, a billing matter, or something else?";
  }
}

// fakes the word-by-word streaming so the frontend still gets to exercise
// its SSE parsing / typing indicator instead of just getting one blob back
async function* wordsAsStream(text: string): AsyncGenerator<string> {
  for (const word of text.split(" ")) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    yield `${word} `;
  }
}

export async function runMockOrchestration(input: {
  userId: number;
  conversationId: number;
  history: CoreMessage[];
}): Promise<OrchestrationResult> {
  const decision = classifyMock(input.history);
  const agent = getAgent(decision.agent);
  const text = await buildReply(decision.agent, input.userId, input.conversationId, lastUserMessageText(input.history));

  return { decision, agent, stream: { textStream: wordsAsStream(text) } };
}
