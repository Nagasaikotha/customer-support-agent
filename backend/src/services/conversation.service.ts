import { and, desc, eq } from "drizzle-orm";
import type { CoreMessage } from "ai";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import type { AgentType } from "../agents/types.js";
import { NotFoundError } from "../lib/errors.js";

const MAX_HISTORY_MESSAGES = 20;

// all conversation/message persistence goes through here - routes and the
// orchestrator don't touch Drizzle directly. userId scoping on every query
// below, same pattern as the tools.

export async function listConversations(userId: number) {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationOrThrow(userId: number, conversationId: number) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));

  if (!conversation) {
    throw NotFoundError("Conversation");
  }
  return conversation;
}

export async function getConversationWithMessages(userId: number, conversationId: number) {
  const conversation = await getConversationOrThrow(userId, conversationId);
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return { conversation, messages: rows };
}

export async function createConversation(userId: number, title = "New conversation") {
  const [conversation] = await db.insert(conversations).values({ userId, title }).returning();
  return conversation;
}

export async function deleteConversation(userId: number, conversationId: number) {
  await getConversationOrThrow(userId, conversationId); // 404s if not owned
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

export async function appendMessage(
  conversationId: number,
  role: "user" | "assistant" | "system",
  content: string,
  agentType?: AgentType,
) {
  const [message] = await db
    .insert(messages)
    .values({ conversationId, role, content, agentType })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return message;
}

// Trims to the last MAX_HISTORY_MESSAGES turns and hands back whatever the
// AI SDK expects. Every sub-agent sees the same trimmed history regardless
// of who answered what before - that's how context carries across an
// agent handoff (order question then billing question, same conversation).
//
// Went with a flat cap instead of a real token-budget compactor - simpler
// to reason about, and honestly hasn't hit a limit yet since Postgres
// stores the full history anyway and only the last 20 go to the model.
export async function buildHistoryForModel(conversationId: number): Promise<CoreMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);

  return rows
    .reverse()
    .map((m): CoreMessage => ({ role: m.role, content: m.content }));
}
