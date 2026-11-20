import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))

const roots = ["app", "components"]
const extras = [
  "shared/confirmCopy.ts",
  "lib/calendar/ics.ts",
  "convex/proposals.ts",
  "convex/ResendOTP.ts",
  "README.md",
  "mcp/travel-calendar/server.mjs",
]

const phrases = [/both of you/i, /the two of you/i, /heartbeat/i]

function filesIn(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue
      found.push(...filesIn(path))
      continue
    }
    if (!/\.(tsx|ts|mjs|md)$/.test(entry)) continue
    if (/\.test\./.test(entry)) continue
    found.push(path)
  }
  return found
}

function uiPartner(line: string): boolean {
  const cleaned = line.replace(/(['"`])partner\1/gi, "")
  return /\bpartner\b/i.test(cleaned)
}

test("UI strings do not assume a couple", () => {
  const files = [...roots.flatMap((dir) => filesIn(join(root, dir))), ...extras.map((path) => join(root, path))]
  const hits: string[] = []
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n")
    lines.forEach((line, index) => {
      const partner = uiPartner(line)
      const phrase = phrases.some((pattern) => pattern.test(line))
      if (!partner && !phrase) return
      hits.push(`${file.slice(root.length)}:${index + 1}: ${line.trim()}`)
    })
  }
  assert.deepEqual(hits, [])
})
