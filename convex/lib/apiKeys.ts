export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `tc_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, 10)
}
