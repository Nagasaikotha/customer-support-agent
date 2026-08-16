import "dotenv/config";

// everything reads env vars through here instead of process.env directly -
// means a missing var blows up at startup with a clear message instead of
// showing up as some weird undefined error three layers deep later
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  // DEV-ONLY escape hatch: when true, skips real model calls and uses a
  // keyword-based mock classifier + templated responses (still backed by
  // real DB tool queries) so the app can be exercised without an API key.
  // Never true in production - see README "Testing without an API key".
  mockLlm: process.env.MOCK_LLM === "true",
  // Groq has a genuinely free API tier (no card required) at
  // console.groq.com, with standard OpenAI-style tool calling - which is
  // why it's the provider here (see src/lib/model.ts for why not Gemini).
  groqApiKey: process.env.MOCK_LLM === "true" ? "" : required("GROQ_API_KEY"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 20),
  },
};
