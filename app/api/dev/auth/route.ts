import { NextRequest, NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getDevAuthBypassEmail, isDevAuthBypassEnabled } from "@/lib/supabase/env"

export async function POST(request: NextRequest) {
  if (!isDevAuthBypassEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const requestUrl = new URL(request.url)
  const redirectTo = `${requestUrl.origin}/auth/callback?next=${encodeURIComponent("/")}`
  const email = getDevAuthBypassEmail()
  const admin = createSupabaseAdminClient()

  let actionLink: string | undefined

  try {
    const linkResult = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    })

    const tokenHash = linkResult.data.properties?.hashed_token
    actionLink = tokenHash
      ? `${requestUrl.origin}/auth/callback?next=${encodeURIComponent("/")}&token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`
      : undefined
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create dev magic link."

    if (!message.toLowerCase().includes("user")) {
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const createResult = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })

    if (createResult.error) {
      return NextResponse.json({ error: createResult.error.message }, { status: 500 })
    }

    const retryResult = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    })

    const tokenHash = retryResult.data.properties?.hashed_token
    actionLink = tokenHash
      ? `${requestUrl.origin}/auth/callback?next=${encodeURIComponent("/")}&token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`
      : undefined
  }

  if (!actionLink) {
    return NextResponse.json({ error: "Unable to create dev auth link." }, { status: 500 })
  }

  return NextResponse.json({ actionLink })
}
