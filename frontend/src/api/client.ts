import type { AgentInfo, AuthUser, Conversation, Message, RouterDecision } from "../types.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  }

  return res.json();
}

export function login(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>("/api/auth/login", null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function listConversations(token: string) {
  return request<{ conversations: Conversation[] }>("/api/chat/conversations", token);
}

export function getConversation(token: string, id: number) {
  return request<{ conversation: Conversation; messages: Message[] }>(
    `/api/chat/conversations/${id}`,
    token,
  );
}

export function deleteConversation(token: string, id: number) {
  return request<{ success: true }>(`/api/chat/conversations/${id}`, token, { method: "DELETE" });
}

export function listAgents(token: string) {
  return request<{ agents: AgentInfo[] }>("/api/agents", token);
}

export interface StreamCallbacks {
  onRouting: (info: { conversationId: number; agentType: string; decision: RouterDecision }) => void;
  onToken: (delta: string) => void;
  onDone: (info: { messageId: number; conversationId: number; agentType: string }) => void;
  onError: (message: string) => void;
}

// posts the message, reads the response body as SSE manually. can't use
// EventSource here since it's GET-only and this needs a POST body - so
// this just parses the same "event: X\ndata: Y\n\n" format the backend
// writes (chat.routes.ts) by hand.
export async function sendMessage(
  token: string,
  body: { conversationId?: number; message: string },
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errBody = await res.json().catch(() => ({}));
    callbacks.onError(errBody?.error?.message ?? `Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      handleSseEvent(rawEvent, callbacks);
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function handleSseEvent(raw: string, callbacks: StreamCallbacks) {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  const data = dataLines.join("\n");

  if (event === "routing") callbacks.onRouting(JSON.parse(data));
  else if (event === "token") callbacks.onToken(JSON.parse(data));
  else if (event === "done") callbacks.onDone(JSON.parse(data));
}
