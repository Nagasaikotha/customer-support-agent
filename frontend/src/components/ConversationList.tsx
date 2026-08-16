import type { Conversation } from "../types.js";

interface Props {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="conversation-list">
      <button className="new-conversation" onClick={onNew}>
        + New conversation
      </button>
      <ul>
        {conversations.map((c) => (
          <li key={c.id} className={c.id === activeId ? "active" : ""}>
            <button className="conversation-title" onClick={() => onSelect(c.id)}>
              {c.title}
            </button>
            <button
              className="delete-btn"
              title="Delete conversation"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
            >
              ✕
            </button>
          </li>
        ))}
        {conversations.length === 0 && <li className="empty">No conversations yet</li>}
      </ul>
    </aside>
  );
}
