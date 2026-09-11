/** Stripe webhook signature verify (Web Crypto — no Node crypto / "use node"). */

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((part) => {
        const [k, ...rest] = part.split("=")
        return [k, rest.join("=")]
      }),
    )
    const timestamp = parts["t"]
    const signature = parts["v1"]
    if (!timestamp || !signature) return false

    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
    if (Number.isNaN(age) || age > 300) return false

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    )
    return timingSafeEqualHex(bytesToHex(signed), signature)
  } catch {
    return false
  }
}
