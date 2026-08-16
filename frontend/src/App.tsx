import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "./components/LoginForm.js";
import { ConversationList } from "./components/ConversationList.js";
import { ChatWindow } from "./components/ChatWindow.js";
import * as api from "./api/client.js";
import type { AuthUser, Conversation, Message } from "./types.js";

const STORAGE_KEY = "customer-support-auth";

interface StoredAuth {
  token: string;
  user: AuthUser;
}

export default function App() {
  const [auth, setAuth] = useState<StoredAuth | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const refreshConversations = useCallback(async () => {
    if (!auth) return;
    const { conversations } = await api.listConversations(auth.token);
    setConversations(conversations);
  }, [auth]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  async function selectConversation(id: number) {
    if (!auth) return;
    setActiveId(id);
    const { messages } = await api.getConversation(auth.token, id);
    setMessages(messages);
  }

  function startNewConversation() {
    setActiveId(null);
    setMessages([]);
  }

  async function handleDelete(id: number) {
    if (!auth) return;
    await api.deleteConversation(auth.token, id);
    if (activeId === id) startNewConversation();
    refreshConversations();
  }

  function handleUserMessageSent(text: string) {
    // Optimistic append so the customer's own message shows immediately;
    // reconciled with the persisted row once the turn settles.
    setMessages((prev) => [
      ...prev,
      { id: -Date.now(), conversationId: activeId ?? -1, role: "user", content: text, agentType: null, createdAt: new Date().toISOString() },
    ]);
  }

  async function handleMessageSettled(conversationId: number) {
    if (!auth) return;
    setActiveId(conversationId);
    const { messages } = await api.getConversation(auth.token, conversationId);
    setMessages(messages);
    refreshConversations();
  }

  function handleLogin(token: string, user: AuthUser) {
    const value = { token, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setAuth(value);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
    setConversations([]);
    setActiveId(null);
    setMessages([]);
  }

  if (!auth) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <h1>Customer Support</h1>
        <div className="user-info">
          <span>{auth.user.name}</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <div className="app-body">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={startNewConversation}
          onDelete={handleDelete}
        />
        <ChatWindow
          token={auth.token}
          conversationId={activeId}
          messages={messages}
          onUserMessageSent={handleUserMessageSent}
          onMessageSettled={handleMessageSettled}
        />
      </div>
    </div>
  );
}
