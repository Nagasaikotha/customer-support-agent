import { useCallback, useState } from "react";
import { sendMessage } from "../api/client.js";
import type { AgentType } from "../types.js";

interface StreamingState {
  isTyping: boolean;
  agentType: AgentType | null;
  partialText: string;
  error: string | null;
}

const IDLE_STATE: StreamingState = { isTyping: false, agentType: null, partialText: "", error: null };

// holds the in-flight state for one chat turn - is something typing, which
// agent, and how much text has streamed in so far
export function useChatStream(token: string) {
  const [streaming, setStreaming] = useState<StreamingState>(IDLE_STATE);

  const send = useCallback(
    async (
      conversationId: number | undefined,
      message: string,
      onDone: (result: { conversationId: number; agentType: AgentType }) => void,
    ) => {
      setStreaming({ isTyping: true, agentType: null, partialText: "", error: null });
      let accumulated = "";

      await sendMessage(
        token,
        { conversationId, message },
        {
          onRouting: ({ agentType }) => {
            setStreaming((s) => ({ ...s, agentType: agentType as AgentType }));
          },
          onToken: (delta) => {
            accumulated += delta;
            setStreaming((s) => ({ ...s, partialText: accumulated }));
          },
          onDone: ({ conversationId: cid, agentType }) => {
            setStreaming(IDLE_STATE);
            onDone({ conversationId: cid, agentType: agentType as AgentType });
          },
          onError: (message) => {
            setStreaming({ ...IDLE_STATE, error: message });
          },
        },
      );
    },
    [token],
  );

  return { streaming, send };
}
