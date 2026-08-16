import { describe, it, expect, vi } from "vitest";

// Mock the AI SDK's generateObject so this test doesn't make a real network
// call to Gemini - it only verifies that classifyQuery wires the schema,
// system prompt, and message history through correctly.
const generateObjectMock = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: generateObjectMock };
});
vi.mock("../src/lib/model.js", () => ({ routerModel: { modelId: "mock-router-model" } }));

const { classifyQuery, isKnownAgentType } = await import("../src/agents/router.agent.js");

describe("classifyQuery", () => {
  it("returns the classification object produced by the model", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { agent: "order", confidence: 0.92, reasoning: "Customer asked about tracking." },
    });

    const result = await classifyQuery([
      { role: "user", content: "Where is my order ORD-1001?" },
    ]);

    expect(result.agent).toBe("order");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(generateObjectMock).toHaveBeenCalledTimes(1);

    const callArgs = generateObjectMock.mock.calls[0][0];
    expect(callArgs.messages).toEqual([
      { role: "user", content: "Where is my order ORD-1001?" },
    ]);
    expect(callArgs.system).toContain("Router Agent");
  });

  it("propagates fallback classification for ambiguous queries", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { agent: "fallback", confidence: 0.3, reasoning: "Too ambiguous to classify." },
    });

    const result = await classifyQuery([{ role: "user", content: "hey" }]);
    expect(result.agent).toBe("fallback");
  });
});

describe("isKnownAgentType", () => {
  it("accepts the four known agent types", () => {
    expect(isKnownAgentType("support")).toBe(true);
    expect(isKnownAgentType("order")).toBe(true);
    expect(isKnownAgentType("billing")).toBe(true);
    expect(isKnownAgentType("fallback")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isKnownAgentType("shipping")).toBe(false);
    expect(isKnownAgentType("")).toBe(false);
  });
});
