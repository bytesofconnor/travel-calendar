import { TripCalendarApp } from "@/components/trip-calendar-app"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

interface PageProps {
  searchParams?: Promise<{
    join?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const joinCode = resolvedSearchParams?.join

  if (!isSupabaseConfigured()) {
    return <TripCalendarApp initialUser={null} joinCode={joinCode} />
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <TripCalendarApp
      initialUser={user ? { id: user.id, email: user.email, userMetadata: user.user_metadata } : null}
      joinCode={joinCode}
    />
  )
}
