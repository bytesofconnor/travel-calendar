export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
}

export function isPexelsConfigured() {
  return Boolean(process.env.PEXELS_API_KEY)
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error("Missing Supabase environment variables.")
  }

  return { url, publishableKey }
}

export function getPexelsApiKey() {
  const apiKey = process.env.PEXELS_API_KEY

  if (!apiKey) {
    throw new Error("Missing Pexels API key.")
  }

  return apiKey
}
