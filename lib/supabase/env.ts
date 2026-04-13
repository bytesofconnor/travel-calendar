export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
}

export function isDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" || process.env.DEV_AUTH_BYPASS === "true")
  )
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

export function getDevAuthBypassEmail() {
  const email = process.env.DEV_AUTH_BYPASS_EMAIL

  if (!email) {
    throw new Error("Missing DEV_AUTH_BYPASS_EMAIL.")
  }

  return email
}

export function getStripeEnv() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.")
  }

  return { webhookSecret }
}

export function isPaywallEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK)
}

export function getPaymentLink(userId: string) {
  const base = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK
  if (!base) return null
  return `${base}?client_reference_id=${userId}`
}

export function isValidBypassCode(code: string) {
  const raw = process.env.BYPASS_CODES ?? ""
  const valid = raw.split(",").map((c) => c.trim().toUpperCase())
  return valid.includes(code.trim().toUpperCase())
}
