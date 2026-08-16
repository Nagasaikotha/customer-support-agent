import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { AppEnv } from "../types.js";
import * as conversationService from "../services/conversation.service.js";
import { runOrchestration } from "../services/agentOrchestrator.service.js";
import { BadRequestError } from "../lib/errors.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

export const chatRoutes = new Hono<AppEnv>();

const sendMessageSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().min(1).max(4000),
});

// core endpoint. streams back as SSE with three event types:
//   routing - fires right after classification, before any answer text.
//             this is what drives the typing indicator AND is how the
//             frontend knows which agent picked up the request
//   token   - one text delta at a time
//   done    - the persisted message id, once it's actually saved
chatRoutes.post("/messages", rateLimiter, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw BadRequestError(parsed.error.errors[0]?.message ?? "Invalid request body");
  }
  const { message } = parsed.data;

  let convoId = parsed.data.conversationId;
  if (convoId) {
    await conversationService.getConversationOrThrow(userId, convoId); // 404s if missing/not owned
  } else {
    const title = message.length > 60 ? `${message.slice(0, 57)}...` : message;
    const conversation = await conversationService.createConversation(userId, title);
    convoId = conversation.id;
  }
  const conversationId: number = convoId;

  await conversationService.appendMessage(conversationId, "user", message);
  const history = await conversationService.buildHistoryForModel(conversationId);

  return streamSSE(c, async (stream) => {
    const { decision, agent, stream: modelStream } = await runOrchestration({
      userId,
      conversationId,
      history,
    });

    await stream.writeSSE({
      event: "routing",
      data: JSON.stringify({ conversationId, agentType: agent.type, decision }),
    });

    let fullText = "";
    for await (const delta of modelStream.textStream) {
      fullText += delta;
      // JSON-encode even this plain string: a raw delta containing "\n"
      // (e.g. a paragraph break) would otherwise break the SSE wire format,
      // since a bare newline inside "data:" isn't a valid continuation.
      await stream.writeSSE({ event: "token", data: JSON.stringify(delta) });
    }

    const saved = await conversationService.appendMessage(
      conversationId,
      "assistant",
      fullText,
      agent.type,
    );

    await stream.writeSSE({
      event: "done",
      data: JSON.stringify({ messageId: saved.id, conversationId, agentType: agent.type }),
    });
  });
});

chatRoutes.get("/conversations", async (c) => {
  const userId = c.get("userId");
  const conversations = await conversationService.listConversations(userId);
  return c.json({ conversations });
});

chatRoutes.get("/conversations/:id", async (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) throw BadRequestError("Invalid conversation id");

  const result = await conversationService.getConversationWithMessages(userId, id);
  return c.json(result);
});

chatRoutes.delete("/conversations/:id", async (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) throw BadRequestError("Invalid conversation id");

  await conversationService.deleteConversation(userId, id);
  return c.json({ success: true });
});
