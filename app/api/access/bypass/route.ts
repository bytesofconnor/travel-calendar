import { NextRequest, NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isValidBypassCode } from "@/lib/supabase/env"

export async function POST(request: NextRequest) {
  // Authenticate the caller
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let code: string
  try {
    const body = await request.json() as { code?: string }
    code = body.code ?? ""
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!isValidBypassCode(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 403 })
  }

  // Grant access via admin client (bypasses RLS)
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from("access").upsert(
    { user_id: user.id, method: "code" },
    { onConflict: "user_id" },
  )

  if (error) {
    return NextResponse.json({ error: "Failed to grant access." }, { status: 500 })
  }

  return NextResponse.json({ granted: true })
}
