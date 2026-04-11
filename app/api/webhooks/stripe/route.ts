import { createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getStripeEnv } from "@/lib/supabase/env"

/**
 * Verifies a Stripe webhook signature without the Stripe npm package.
 * Stripe signs payloads as: t=<timestamp>,v1=<hmac-sha256>
 * Signed payload = "<timestamp>.<raw_body>"
 */
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")))
    const timestamp = parts["t"]
    const signature = parts["v1"]
    if (!timestamp || !signature) return false

    // Reject if timestamp is more than 5 minutes old
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
    if (age > 300) return false

    const signed = `${timestamp}.${payload}`
    const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex")
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Could not read body." }, { status: 400 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 })
  }

  let webhookSecret: string
  try {
    ;({ webhookSecret } = getStripeEnv())
  } catch {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 })
  }

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const userId = session["client_reference_id"] as string | null

    if (!userId) {
      // No user ID attached — can't grant access
      return NextResponse.json({ received: true })
    }

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from("access").upsert(
      { user_id: userId, method: "stripe" },
      { onConflict: "user_id" },
    )

    if (error) {
      console.error("Failed to grant access:", error.message)
      return NextResponse.json({ error: "Failed to grant access." }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
