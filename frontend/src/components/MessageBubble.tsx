import type { Message } from "../types.js";
import { AGENT_LABELS } from "../lib/agentLabels.js";

interface Props {
  message: Pick<Message, "role" | "content" | "agentType">;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
      {!isUser && message.agentType && (
        <div className="agent-tag">{AGENT_LABELS[message.agentType]}</div>
      )}
      <p>{message.content}</p>
    </div>
  );
}
