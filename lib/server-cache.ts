import { ConvexHttpClient } from "convex/browser"

import { api } from "@/convex/_generated/api"

const memory = new Map<string, { at: number; payload: string }>()
const DAY = 24 * 60 * 60 * 1000

function convexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return null
  return new ConvexHttpClient(url)
}

async function readConvex(key: string): Promise<string | null> {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.geoCache.read, { key })
  } catch {
    return null
  }
}

async function writeConvex(key: string, payload: string) {
  const client = convexClient()
  if (!client) return
  try {
    await client.mutation(api.geoCache.write, { key, payload })
  } catch {
    // The live deployment may not have the cache yet. Memory still holds the value.
  }
}

export async function cachedJson<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = memory.get(key)
  if (hit && now - hit.at < DAY) return JSON.parse(hit.payload) as T
  const remote = await readConvex(key)
  if (remote) {
    memory.set(key, { at: now, payload: remote })
    return JSON.parse(remote) as T
  }
  const fresh = await load()
  const payload = JSON.stringify(fresh)
  memory.set(key, { at: now, payload })
  void writeConvex(key, payload)
  return fresh
}
