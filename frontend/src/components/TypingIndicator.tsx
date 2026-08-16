import { useEffect, useState } from "react";
import type { AgentType } from "../types.js";
import { AGENT_LABELS } from "../lib/agentLabels.js";

const THINKING_WORDS = ["Thinking", "Classifying", "Searching records", "Looking that up"];

// before routing finishes there's no agentType yet, so it cycles through
// generic words to at least show something's happening. once we know which
// agent picked it up, settles on "<Agent> is typing..."
export function TypingIndicator({ agentType }: { agentType: AgentType | null }) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (agentType) return; // settled - no need to keep cycling
    const id = setInterval(() => setWordIndex((i) => (i + 1) % THINKING_WORDS.length), 900);
    return () => clearInterval(id);
  }, [agentType]);

  const label = agentType ? `${AGENT_LABELS[agentType]} is typing` : THINKING_WORDS[wordIndex];

  return (
    <div className="typing-indicator">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <span className="typing-label">{label}...</span>
    </div>
  );
}
