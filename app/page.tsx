import { ConvexTripCalendarApp } from "@/components/convex-trip-calendar-app"

interface PageProps {
  searchParams?: Promise<{
    join?: string
    confirm?: string
    trip?: string
    plan?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const joinCode = resolvedSearchParams?.join
  const confirmId = resolvedSearchParams?.confirm
  const tripId = resolvedSearchParams?.trip
  const planId = resolvedSearchParams?.plan

  return <ConvexTripCalendarApp joinCode={joinCode} confirmId={confirmId} tripId={tripId} planId={planId} />
}
