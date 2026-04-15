export function isAiConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

export function getAiConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.")
  }

  return {
    provider: (process.env.AI_PROVIDER ?? "openrouter").toLowerCase(),
    model: process.env.AI_MODEL ?? "google/gemini-2.5-flash-lite",
    apiKey,
  }
}
