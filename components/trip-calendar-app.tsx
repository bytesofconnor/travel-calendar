"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Copy, Image as ImageIcon, Loader2, LogOut, Mail, PlusCircle, RefreshCcw, Users } from "lucide-react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_TRIP_END,
  DEFAULT_TRIP_NAME,
  DEFAULT_TRIP_START,
  withAuthorNames,
  type Location,
  type Trip,
  type TripItem,
  type TripItemInput,
  type TripMember,
  useCalendarStore,
} from "@/lib/kanban-store"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { isSupabaseConfigured, isPaywallEnabled, getPaymentLink } from "@/lib/supabase/env"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { PaywallScreen } from "./paywall-screen"
import { LoginScreen } from "./login-screen"

interface TripCalendarAppProps {
  initialUser: {
    id: string
    email?: string | null
    userMetadata?: Record<string, unknown>
  } | null
  joinCode?: string
}

type RawTripRow = {
  id: string
  name: string
  invite_code: string
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  cover_image_url: string | null
  cover_image_photographer: string | null
  cover_image_source_url: string | null
  cover_image_query: string | null
}

type RawTripMemberRow = {
  trip_id: string
  user_id: string
  role: "owner" | "editor"
  display_name: string
  created_at?: string
}

type RawTripItemRow = {
  id: string
  trip_id: string
  title: string
  notes: string | null
  link_label: string | null
  link_url: string | null
  start_date: string
  end_date: string
  location: Location
  location_to: Location | null
  created_by: string
  created_at: string
  updated_at: string
}

function toTrip(row: RawTripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    coverImageUrl: row.cover_image_url ?? undefined,
    coverImagePhotographer: row.cover_image_photographer ?? undefined,
    coverImageSourceUrl: row.cover_image_source_url ?? undefined,
    coverImageQuery: row.cover_image_query ?? undefined,
  }
}

function toMember(row: RawTripMemberRow, email?: string | null): TripMember {
  return {
    tripId: row.trip_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    email,
  }
}

function toTripItem(row: RawTripItemRow): TripItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    notes: row.notes ?? undefined,
    link: row.link_url ? { label: row.link_label ?? "Link", url: row.link_url } : undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    locationTo: row.location_to ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function guessDisplayName(user: TripCalendarAppProps["initialUser"]) {
  if (!user) {
    return ""
  }

  const fullName = user.userMetadata?.full_name
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim()
  }

  const name = user.userMetadata?.name
  if (typeof name === "string" && name.trim()) {
    return name.trim()
  }

  const emailPrefix = user.email?.split("@")[0]
  return emailPrefix ? emailPrefix.replace(/[._-]+/g, " ") : ""
}

function buildItemPayload(input: TripItemInput, tripId: string, createdBy: string) {
  return {
    trip_id: tripId,
    title: input.title,
    notes: input.notes ?? null,
    link_label: input.link?.label ?? null,
    link_url: input.link?.url ?? null,
    start_date: input.startDate,
    end_date: input.endDate,
    location: input.location,
    location_to: input.locationTo ?? null,
    created_by: createdBy,
  }
}

export function TripCalendarApp({ initialUser, joinCode }: TripCalendarAppProps) {
  const supabase = useMemo(() => (isSupabaseConfigured() ? createSupabaseBrowserClient() : null), [])
  const { viewMode, initializeForTrip } = useCalendarStore()

  const [user, setUser] = useState<TripCalendarAppProps["initialUser"]>(initialUser)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [allTrips, setAllTrips] = useState<Trip[]>([])
  const [items, setItems] = useState<TripItem[]>([])
  const [members, setMembers] = useState<TripMember[]>([])
  const [email, setEmail] = useState(initialUser?.email ?? "")
  const [displayName, setDisplayName] = useState(guessDisplayName(initialUser))
  const [tripName, setTripName] = useState(DEFAULT_TRIP_NAME)
  const [tripStart, setTripStart] = useState(DEFAULT_TRIP_START)
  const [tripEnd, setTripEnd] = useState(DEFAULT_TRIP_END)
  const [joinInput, setJoinInput] = useState(joinCode ?? "")
  const [authMessage, setAuthMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(Boolean(initialUser))
  const [isSendingAuth, setIsSendingAuth] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const [mobileHeaderExpanded, setMobileHeaderExpanded] = useState(false)
  const [isRefreshingCover, setIsRefreshingCover] = useState(false)
  const [coverAttemptedTripId, setCoverAttemptedTripId] = useState<string | null>(null)
  // null = checking, true = granted, false = needs payment
  const [hasAccess, setHasAccess] = useState<boolean | null>(!isPaywallEnabled() ? true : null)

  const currentMember = members.find((member) => member.userId === user?.id)

  useEffect(() => {
    if (!supabase) {
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) {
        setUser(null)
        setTrip(null)
        setItems([])
        setMembers([])
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email,
        userMetadata: session.user.user_metadata,
      })
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Check paywall access whenever the user changes
  useEffect(() => {
    if (!supabase || !user || !isPaywallEnabled()) {
      return
    }

    supabase
      .from("access")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { user_id: string } | null }) => {
        setHasAccess(Boolean(data))
      })
  }, [supabase, user?.id])

  useEffect(() => {
    if (!supabase || !user) {
      setIsLoading(false)
      return
    }

    void loadMemberships()
  }, [joinCode, supabase, user?.id])

  useEffect(() => {
    if (!supabase || !trip) {
      return
    }

    initializeForTrip(trip.startDate, trip.endDate)

    const channel = supabase
      .channel(`trip:${trip.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_items", filter: `trip_id=eq.${trip.id}` },
        () => {
          void loadTripState(trip.id)
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${trip.id}` },
        () => {
          void loadTripState(trip.id)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [initializeForTrip, supabase, trip])

  useEffect(() => {
    if (!trip || currentMember?.role !== "owner" || trip.coverImageUrl || coverAttemptedTripId === trip.id) {
      return
    }

    setCoverAttemptedTripId(trip.id)
    void handleRefreshCover({ silent: true, tripId: trip.id })
  }, [coverAttemptedTripId, currentMember?.role, trip])

  async function loadMemberships(preferredTripId?: string) {
    if (!supabase || !user) {
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    const { data, error } = await supabase
      .from("trip_members")
      .select("trip_id, user_id, role, display_name")
      .eq("user_id", user.id)

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
      return
    }

    const memberships = (data ?? []) as RawTripMemberRow[]

    if (memberships.length === 0) {
      setAllTrips([])
      if (joinCode) {
        await handleJoinTrip(joinCode, displayName || guessDisplayName(user))
        return
      }
      setTrip(null)
      setItems([])
      setMembers([])
      setIsLoading(false)
      return
    }

    const tripIds = memberships.map((membership) => membership.trip_id)
    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select("id, name, invite_code, start_date, end_date, created_by, created_at, cover_image_url, cover_image_photographer, cover_image_source_url, cover_image_query")
      .in("id", tripIds)
      .order("start_date", { ascending: true })

    if (tripsError) {
      setErrorMessage(tripsError.message)
      setIsLoading(false)
      return
    }

    const nextTrips = ((tripsData ?? []) as RawTripRow[]).map((tripRow) => toTrip(tripRow))
    setAllTrips(nextTrips)

    const savedTripId =
      typeof window !== "undefined" ? window.localStorage.getItem("travel-calendar:last-trip-id") : null
    const nextTripId =
      nextTrips.find((candidate) => candidate.id === preferredTripId)?.id ??
      nextTrips.find((candidate) => candidate.id === savedTripId)?.id ??
      nextTrips.find((candidate) => candidate.id === trip?.id)?.id ??
      memberships[0].trip_id
    await loadTripState(nextTripId)
  }

  async function loadTripState(tripId: string) {
    if (!supabase) {
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    const [tripResult, membersResult, itemsResult] = await Promise.all([
      supabase.from("trips").select("id, name, invite_code, start_date, end_date, created_by, created_at, cover_image_url, cover_image_photographer, cover_image_source_url, cover_image_query").eq("id", tripId).single(),
      supabase.from("trip_members").select("trip_id, user_id, role, display_name").eq("trip_id", tripId),
      supabase.from("trip_items").select("id, trip_id, title, notes, link_label, link_url, start_date, end_date, location, location_to, created_by, created_at, updated_at").eq("trip_id", tripId).order("start_date", { ascending: true }),
    ])

    if (tripResult.error) {
      setErrorMessage(tripResult.error.message)
      setIsLoading(false)
      return
    }

    if (membersResult.error) {
      setErrorMessage(membersResult.error.message)
      setIsLoading(false)
      return
    }

    if (itemsResult.error) {
      setErrorMessage(itemsResult.error.message)
      setIsLoading(false)
      return
    }

    const nextTrip = toTrip(tripResult.data as RawTripRow)
    const nextMembers = ((membersResult.data ?? []) as RawTripMemberRow[]).map((member) =>
      toMember(member, member.user_id === user?.id ? user?.email : null),
    )
    const nextItems = withAuthorNames(
      ((itemsResult.data ?? []) as RawTripItemRow[]).map((item) => toTripItem(item)),
      nextMembers,
    )

    setTrip(nextTrip)
    setMembers(nextMembers)
    setItems(nextItems)
    setTripName(nextTrip.name)
    setTripStart(nextTrip.startDate)
    setTripEnd(nextTrip.endDate)
    setDisplayName(nextMembers.find((member) => member.userId === user?.id)?.displayName ?? displayName)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("travel-calendar:last-trip-id", nextTrip.id)
    }
    setIsLoading(false)
  }

  async function handleSendMagicLink() {
    if (!supabase || !email.trim()) {
      return
    }

    setIsSendingAuth(true)
    setAuthMessage("")
    setErrorMessage("")

    const nextPath = joinInput.trim() ? `/?join=${encodeURIComponent(joinInput.trim())}` : "/"
    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true,
      },
    })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setAuthMessage(`Magic link sent to ${email.trim()}. Open it on any device you want signed in.`)
    }

    setIsSendingAuth(false)
  }

  async function handleCreateTrip() {
    if (!supabase || !user || !displayName.trim() || !tripName.trim()) {
      return
    }

    setIsMutating(true)
    setErrorMessage("")

    const { data: tripRow, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: tripName.trim(),
        start_date: tripStart,
        end_date: tripEnd,
        created_by: user.id,
      })
      .select("id, name, invite_code, start_date, end_date, created_by, created_at, cover_image_url, cover_image_photographer, cover_image_source_url, cover_image_query")
      .single()

    if (tripError || !tripRow) {
      setErrorMessage(tripError?.message ?? "Unable to create trip.")
      setIsMutating(false)
      return
    }

    const { error: memberError } = await supabase.from("trip_members").insert({
      trip_id: tripRow.id,
      user_id: user.id,
      role: "owner",
      display_name: displayName.trim(),
    })

    if (memberError) {
      setErrorMessage(memberError.message)
      setIsMutating(false)
      return
    }

    await loadMemberships(tripRow.id)
    setJoinInput((tripRow as RawTripRow).invite_code)
    setIsMutating(false)
  }

  async function handleJoinTrip(inviteCode: string, nextDisplayName: string) {
    if (!supabase || !user || !inviteCode.trim()) {
      return
    }

    setIsMutating(true)
    setErrorMessage("")

    const normalizedCode = inviteCode.trim().toLowerCase()
    const { data: tripRow, error: tripError } = await supabase
      .from("trips")
      .select("id, name, invite_code, start_date, end_date, created_by, created_at, cover_image_url, cover_image_photographer, cover_image_source_url, cover_image_query")
      .eq("invite_code", normalizedCode)
      .single()

    if (tripError || !tripRow) {
      setErrorMessage(tripError?.message ?? "Invite code not found.")
      setIsLoading(false)
      setIsMutating(false)
      return
    }

    const { error: memberError } = await supabase.from("trip_members").upsert(
      {
        trip_id: tripRow.id,
        user_id: user.id,
        role: "editor",
        display_name: nextDisplayName.trim() || guessDisplayName(user),
      },
      { onConflict: "trip_id,user_id" },
    )

    if (memberError) {
      setErrorMessage(memberError.message)
      setIsLoading(false)
      setIsMutating(false)
      return
    }

    await loadMemberships(tripRow.id)
    setIsLoading(false)
    setIsMutating(false)
  }

  async function handleSaveItem(input: TripItemInput, existingItem?: TripItem) {
    if (!supabase || !trip || !user) {
      return
    }

    setIsMutating(true)
    setErrorMessage("")

    if (existingItem) {
      const { error } = await supabase
        .from("trip_items")
        .update({
          title: input.title,
          notes: input.notes ?? null,
          link_label: input.link?.label ?? null,
          link_url: input.link?.url ?? null,
          start_date: input.startDate,
          end_date: input.endDate,
          location: input.location,
          location_to: input.locationTo ?? null,
        })
        .eq("id", existingItem.id)

      if (error) {
        setErrorMessage(error.message)
        setIsMutating(false)
        return
      }
    } else {
      const { error } = await supabase.from("trip_items").insert(buildItemPayload(input, trip.id, user.id))

      if (error) {
        setErrorMessage(error.message)
        setIsMutating(false)
        return
      }
    }

    await loadTripState(trip.id)
    setIsMutating(false)
  }

  async function handleDeleteItem(itemId: string) {
    if (!supabase || !trip) {
      return
    }

    setIsMutating(true)
    setErrorMessage("")

    const { error } = await supabase.from("trip_items").delete().eq("id", itemId)
    if (error) {
      setErrorMessage(error.message)
      setIsMutating(false)
      return
    }

    await loadTripState(trip.id)
    setIsMutating(false)
  }

  async function handleCopyInvite() {
    if (!trip) {
      return
    }

    const inviteUrl = `${window.location.origin}/?join=${trip.inviteCode}`
    await navigator.clipboard.writeText(inviteUrl)
    setShareMessage("Invite link copied.")
    window.setTimeout(() => setShareMessage(""), 2000)
  }

  async function handleRefreshCover(options?: { silent?: boolean; tripId?: string }) {
    const activeTripId = options?.tripId ?? trip?.id
    if (!activeTripId) {
      return
    }

    setIsRefreshingCover(true)
    if (!options?.silent) {
      setErrorMessage("")
    }

    try {
      const response = await fetch(`/api/trips/${activeTripId}/cover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        if (!options?.silent) {
          setErrorMessage(payload?.error ?? "Unable to refresh the trip cover.")
        }
        return
      }

      if (trip?.id === activeTripId) {
        await loadTripState(activeTripId)
      } else {
        await loadMemberships(activeTripId)
      }

      if (!options?.silent) {
        setShareMessage("Trip cover refreshed.")
        window.setTimeout(() => setShareMessage(""), 2000)
      }
    } finally {
      setIsRefreshingCover(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    window.location.assign("/")
  }

  function handleSwitchTrip(nextTripId: string) {
    if (!nextTripId || nextTripId === trip?.id) {
      return
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("travel-calendar:last-trip-id", nextTripId)
    }
    void loadTripState(nextTripId)
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex h-svh items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/80 p-6">
          <h1 className="text-xl font-semibold">Supabase setup needed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your Supabase URL and publishable key to `.env.local`, then run the SQL in
            `supabase/schema.sql`.
          </p>
          <div className="mt-4 rounded-lg bg-secondary/60 p-4 text-sm text-muted-foreground">
            <div>`NEXT_PUBLIC_SUPABASE_URL=...`</div>
            <div>`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`</div>
          </div>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <LoginScreen
        email={email}
        joinInput={joinInput}
        isSendingAuth={isSendingAuth}
        authMessage={authMessage}
        errorMessage={errorMessage}
        onEmailChange={setEmail}
        onJoinInputChange={(v) => setJoinInput(v.toLowerCase())}
        onSendMagicLink={() => void handleSendMagicLink()}
      />
    )
  }

  if (isLoading) {
    return (
      <main className="flex h-svh items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your trip...
        </div>
      </main>
    )
  }

  if (!trip) {
    return (
      <>
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "url('/bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "grayscale(100%)",
            opacity: 0.09,
          }}
        />
        <main className="relative z-10 flex min-h-svh items-center justify-center p-6">
          <div className="grid w-full max-w-5xl gap-4 md:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
              <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Create a trip</div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">Start your shared vacation calendar.</h1>
              <div className="mt-6 space-y-3">
                <Input placeholder="Your display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                <Input placeholder="Trip name" value={tripName} onChange={(event) => setTripName(event.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={tripStart} onChange={(event) => setTripStart(event.target.value)} />
                  <Input type="date" value={tripEnd} min={tripStart} onChange={(event) => setTripEnd(event.target.value)} />
                </div>
                <Button className="w-full" onClick={() => void handleCreateTrip()} disabled={isMutating || !displayName.trim() || !tripName.trim()}>
                  {isMutating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating trip
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create shared trip
                    </>
                  )}
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
              <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Join a trip</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Open the calendar your partner shared.</h2>
              <div className="mt-6 space-y-3">
                <Input placeholder="Your display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                <Input
                  placeholder="Invite code"
                  value={joinInput}
                  onChange={(event) => setJoinInput(event.target.value.toLowerCase())}
                />
                <Button className="w-full" variant="secondary" onClick={() => void handleJoinTrip(joinInput, displayName)} disabled={isMutating || !joinInput.trim() || !displayName.trim()}>
                  {isMutating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining trip
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Join with invite code
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Tip: invite links look like `/?join=yourcode` and can be opened on mobile too.
              </p>
            </section>
          </div>

          {errorMessage && <p className="absolute bottom-6 text-sm text-rose-300">{errorMessage}</p>}
        </main>
      </>
    )
  }

  // Paywall: null = still checking, false = no access
  if (hasAccess === null) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasAccess === false && user) {
    return (
      <PaywallScreen
        userId={user.id}
        paymentLink={getPaymentLink(user.id)}
        onAccessGranted={() => setHasAccess(true)}
      />
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: trip.coverImageUrl ? `url('${trip.coverImageUrl}')` : "url('/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: trip.coverImageUrl ? "grayscale(15%)" : "grayscale(100%)",
          opacity: trip.coverImageUrl ? 0.32 : 0.09,
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/72" />
      <main className="relative z-10 flex h-svh flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-background/92 px-4 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Shared Trip Calendar</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-2xl">{trip.name}</h1>
              <p className="text-base text-muted-foreground md:text-sm">
                {trip.startDate} to {trip.endDate}
              </p>
            </div>

            <button
              onClick={() => setMobileHeaderExpanded((value) => !value)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-border bg-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 md:hidden"
            >
              {mobileHeaderExpanded ? "Hide" : "Details"}
              {mobileHeaderExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Button variant="secondary" size="sm" className="h-11 rounded-2xl text-base" onClick={() => void handleCopyInvite()}>
              <Copy className="mr-2 h-5 w-5" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 rounded-2xl text-base"
              onClick={() => void (currentMember?.role === "owner" ? handleRefreshCover() : loadTripState(trip.id))}
              disabled={isLoading || isMutating || isRefreshingCover}
            >
              {currentMember?.role === "owner" ? <ImageIcon className="mr-2 h-5 w-5" /> : <RefreshCcw className="mr-2 h-5 w-5" />}
              {currentMember?.role === "owner" ? (isRefreshingCover ? "Refreshing..." : "New cover") : "Refresh"}
            </Button>
          </div>

          <div className={`${mobileHeaderExpanded ? "flex" : "hidden"} flex-col gap-3 md:flex md:flex-row md:flex-wrap md:items-center`}>
            <label className="relative block md:min-w-[220px]">
              <select
                value={trip.id}
                onChange={(event) => handleSwitchTrip(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-border bg-secondary px-4 pr-10 text-base text-foreground outline-none transition-colors hover:border-border/80 focus:border-primary md:h-10 md:text-sm"
              >
                {allTrips.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </label>
            {members.map((member) => (
              <div key={member.userId} className={`rounded-full px-4 py-2.5 text-base md:px-3 md:py-1.5 md:text-sm ${member.userId === user?.id ? "bg-secondary text-foreground font-medium" : "bg-secondary/60 text-muted-foreground"}`}>
                {member.displayName}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
              <Button variant="secondary" size="sm" className="hidden h-12 rounded-2xl text-base md:flex md:h-9 md:text-sm" onClick={() => void handleCopyInvite()}>
                <Copy className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                Copy invite
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-12 rounded-2xl text-base md:flex md:h-9 md:text-sm"
                onClick={() => void handleRefreshCover()}
                disabled={currentMember?.role !== "owner" || isRefreshingCover || isLoading || isMutating}
              >
                <ImageIcon className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                {isRefreshingCover ? "Refreshing cover" : "Refresh cover"}
              </Button>
              <Button variant="ghost" size="sm" className="hidden h-12 rounded-2xl text-base md:flex md:h-9 md:text-sm" onClick={() => void loadTripState(trip.id)} disabled={isLoading || isMutating}>
                <RefreshCcw className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                Refresh data
              </Button>
              <Button variant="ghost" size="sm" className="col-span-2 h-12 rounded-2xl text-base md:col-span-1 md:h-9 md:text-sm" onClick={() => void handleSignOut()}>
                <LogOut className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                Sign out
              </Button>
            </div>
          </div>
          {trip.coverImagePhotographer && trip.coverImageSourceUrl && (
            <div className="text-xs text-muted-foreground">
              Photo by{" "}
              <a
                href={trip.coverImageSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {trip.coverImagePhotographer}
              </a>
              {trip.coverImageQuery ? ` for “${trip.coverImageQuery}”` : ""} on Pexels
            </div>
          )}
        </header>

        {shareMessage && <div className="border-b border-border bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{shareMessage}</div>}
        {errorMessage && <div className="border-b border-border bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{errorMessage}</div>}

        <div className="flex-1 overflow-hidden">
          {viewMode === "week" ? (
            <WeekView
              items={items}
              currentUserName={currentMember?.displayName ?? guessDisplayName(user)}
              isMutating={isMutating}
              onSaveItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
            />
          ) : (
            <MonthView
              items={items}
              currentUserName={currentMember?.displayName ?? guessDisplayName(user)}
              isMutating={isMutating}
              onSaveItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </div>
      </main>
    </>
  )
}
