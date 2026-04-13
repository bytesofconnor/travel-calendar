import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const next = requestUrl.searchParams.get("next") ?? "/"
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null

  if (!isSupabaseConfigured() || (!code && !(tokenHash && type))) {
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  const { url, publishableKey } = getSupabaseEnv()
  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL(next, requestUrl.origin))

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
  }

  return response
}
