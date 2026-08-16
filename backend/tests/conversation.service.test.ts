import { describe, it, expect, vi } from "vitest";

/**
 * Minimal stand-in for Drizzle's chainable query builder: every property
 * access returns the same proxy (so `.from().where().orderBy().limit()`
 * all "work"), and awaiting the proxy resolves to the configured result.
 * This lets us unit-test service logic (trimming/reversing/ownership
 * checks) without a real Postgres connection.
 */
function chainable(result: unknown) {
  const proxy: unknown = new Proxy(function chainableTarget() {}, {
    get(_target, prop) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy;
}

const dbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
vi.mock("../src/db/client.js", () => ({ db: dbMock, pool: {} }));

const { buildHistoryForModel, getConversationOrThrow } = await import(
  "../src/services/conversation.service.js"
);
const { AppError } = await import("../src/lib/errors.js");

describe("buildHistoryForModel", () => {
  it("reverses newest-first DB rows into chronological CoreMessage[]", async () => {
    const rows = [
      { role: "assistant", content: "second", createdAt: new Date(2000) },
      { role: "user", content: "first", createdAt: new Date(1000) },
    ];
    dbMock.select.mockReturnValueOnce(chainable(rows));

    const history = await buildHistoryForModel(1);

    expect(history).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
    ]);
  });

  it("returns an empty array for a conversation with no messages", async () => {
    dbMock.select.mockReturnValueOnce(chainable([]));
    const history = await buildHistoryForModel(1);
    expect(history).toEqual([]);
  });
});

describe("getConversationOrThrow", () => {
  it("throws a 404 AppError when no conversation matches userId + conversationId", async () => {
    dbMock.select.mockReturnValueOnce(chainable([]));
    await expect(getConversationOrThrow(1, 999)).rejects.toThrow(AppError);
  });

  it("returns the conversation row when found", async () => {
    const row = { id: 5, userId: 1, title: "Test", createdAt: new Date(), updatedAt: new Date() };
    dbMock.select.mockReturnValueOnce(chainable([row]));
    await expect(getConversationOrThrow(1, 5)).resolves.toEqual(row);
  });
});
