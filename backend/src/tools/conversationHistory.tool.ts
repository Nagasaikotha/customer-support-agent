import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, ilike, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";

// Lets the Support Agent look past the current conversation's context
// window - queries Postgres directly instead of relying on what's already
// in the model's context. Scoped to userId like every other tool here, so
// there's no way to accidentally read someone else's conversations.
export function createConversationHistoryTool(userId: number, currentConversationId: number) {
  return tool({
    description:
      "Search the customer's past conversations (other than the current one) for prior context, " +
      "e.g. to check if they've asked about this issue before. Optionally filter by a keyword.",
    parameters: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Optional keyword to filter messages by content, case-insensitive."),
      limit: z.number().int().min(1).max(20).default(5),
    }),
    execute: async ({ keyword, limit }) => {
      const otherConversations = await db
        .select({ id: conversations.id, title: conversations.title, updatedAt: conversations.updatedAt })
        .from(conversations)
        .where(and(eq(conversations.userId, userId), ne(conversations.id, currentConversationId)))
        .orderBy(desc(conversations.updatedAt))
        .limit(limit);

      if (otherConversations.length === 0) {
        return { conversations: [], note: "No prior conversations found for this customer." };
      }

      const conversationIds = otherConversations.map((c) => c.id);
      const priorMessages = await db.query.messages.findMany({
        where: keyword
          ? and(ilike(messages.content, `%${keyword}%`))
          : undefined,
        orderBy: desc(messages.createdAt),
        limit: limit * 3,
      });

      const relevant = priorMessages.filter((m) => conversationIds.includes(m.conversationId));

      return {
        conversations: otherConversations,
        matchingMessages: relevant.map((m) => ({
          conversationId: m.conversationId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      };
    },
  });
}
