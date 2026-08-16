import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message } from "../types.js";
import { MessageBubble } from "./MessageBubble.js";
import { TypingIndicator } from "./TypingIndicator.js";
import { useChatStream } from "../hooks/useChatStream.js";

interface Props {
  token: string;
  conversationId: number | null;
  messages: Message[];
  onUserMessageSent: (text: string) => void;
  onMessageSettled: (conversationId: number) => void;
}

export function ChatWindow({
  token,
  conversationId,
  messages,
  onUserMessageSent,
  onMessageSettled,
}: Props) {
  const [input, setInput] = useState("");
  const { streaming, send } = useChatStream(token);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming.partialText]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming.isTyping) return;
    setInput("");
    onUserMessageSent(text);

    await send(conversationId ?? undefined, text, ({ conversationId: cid }) => {
      onMessageSettled(cid);
    });
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.length === 0 && !streaming.isTyping && (
          <p className="empty-state">Ask about an order, a billing issue, or anything else.</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming.isTyping && streaming.partialText && (
          <MessageBubble
            message={{ role: "assistant", content: streaming.partialText, agentType: streaming.agentType }}
          />
        )}
        {streaming.isTyping && !streaming.partialText && <TypingIndicator agentType={streaming.agentType} />}
        {streaming.error && <p className="error">{streaming.error}</p>}
        <div ref={scrollRef} />
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={streaming.isTyping}
        />
        <button type="submit" disabled={streaming.isTyping || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
