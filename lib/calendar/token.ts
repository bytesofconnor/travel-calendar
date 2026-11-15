const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function isCalendarToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

export function calendarToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export async function hashCalendarToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function tokenFromSegment(segment: string): string | null {
  let decoded = segment
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    return null
  }
  const bare = decoded.toLowerCase().endsWith(".ics") ? decoded.slice(0, -4) : decoded
  return isCalendarToken(bare) ? bare : null
}
