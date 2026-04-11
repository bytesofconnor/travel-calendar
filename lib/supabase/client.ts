import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseEnv } from "./env"

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseEnv()
    browserClient = createBrowserClient(url, publishableKey)
  }

  return browserClient
}
