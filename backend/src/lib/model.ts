import { createGroq } from "@ai-sdk/groq";
import { env } from "../config/env.js";

// building the provider once here, reading the key through env.ts rather
// than letting the SDK fall back to reading process.env itself
const groq = createGroq({ apiKey: env.groqApiKey });

// router gets the small/fast model - customer's waiting on this before the
// actual sub-agent even starts streaming, so latency matters more than quality
export const routerModel = groq("llama-3.1-8b-instant");

// bigger model for the actual tool-calling replies. Went with Llama 3.3 70b
// over Gemini after Gemini 3.x turned out to require echoing a
// thought_signature back on every tool-calling turn, which the AI SDK
// version this is built on doesn't support in streamText yet - kept
// 400ing mid-stream. Groq's plain OpenAI-style tool calling just works, and
// both models here are free-tier (console.groq.com, no card needed).
export const chatModel = groq("llama-3.3-70b-versatile");
