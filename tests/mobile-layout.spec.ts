import { expect, test } from "@playwright/test"

const screens = [
  { path: "/", ready: "Continue with Google" },
  { path: "/?join=ab12cd34ef56", ready: "Invite ab12cd34ef56 is ready" },
  { path: "/privacy", ready: "Privacy Policy" },
  { path: "/terms", ready: "Terms of Service" },
  { path: "/review?screen=trips", ready: "Your trips" },
  { path: "/review?screen=trip", ready: "Lisbon with you" },
  { path: "/review?screen=today", ready: "on for today" },
  { path: "/review?screen=add", ready: "Add for both of you" },
  { path: "/review?screen=edit", ready: "Edit plan" },
  { path: "/review?screen=edit-trip", ready: "Edit trip details" },
  { path: "/review?screen=invite", ready: "https://www.travelcalendar.space/?join=ab12cd34ef56" },
  { path: "/review?screen=join", ready: "Join trip" },
  { path: "/review?screen=create", ready: "Create trip" },
  { path: "/review?screen=theme", ready: "Golden Hour" },
  { path: "/review?screen=confirm", ready: "Alex proposed Time Out Market" },
  { path: "/review?screen=paywall", ready: "Plan trips together." },
] as const

test("screens stay inside the window without console or hydration errors", async ({ page }) => {
  const problems: string[] = []
  page.on("console", (message) => {
    const text = message.text()
    const url = message.location().url ?? ""
    if (url.includes("/_vercel/") || text.includes("/_vercel/")) return
    if (text.startsWith("Failed to load resource")) return
    if (message.type() === "error" || /hydration/i.test(text)) problems.push(text)
  })
  page.on("response", (response) => {
    if (response.status() < 400) return
    if (response.url().includes("/_vercel/")) return
    problems.push(`${response.status()} ${response.url()}`)
  })
  page.on("pageerror", (error) => problems.push(error.message))

  for (const screen of screens) {
    await page.goto(screen.path, { waitUntil: "domcontentloaded" })
    await expect(page.getByText(screen.ready, { exact: false }).first()).toBeVisible()
    const extra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(extra, screen.path).toBeLessThanOrEqual(1)
  }

  expect(problems).toEqual([])
})

test("primary controls are at least 44px and stay on screen", async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).toBeTruthy()

  await page.goto("/")
  const google = page.getByRole("button", { name: "Continue with Google" })
  await expect(google).toBeVisible()
  expect((await google.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  for (let step = 0; step < 8; step += 1) {
    const focused = await google.evaluate((element) => element === document.activeElement)
    if (focused) break
    await page.keyboard.press("Tab")
  }
  await expect(google).toBeFocused()
  const focusMark = await google.evaluate((element) => {
    const style = getComputedStyle(element)
    return `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`
  })
  expect(focusMark).not.toBe("none 0px none")

  await page.goto("/review?screen=trip")
  const more = page.getByRole("button", { name: "More actions" })
  const trip = page.getByRole("button", { name: "Trip", exact: true })
  await expect(more).toBeVisible()
  const moreBox = await more.boundingBox()
  const tripBox = await trip.boundingBox()
  expect(moreBox?.height).toBeGreaterThanOrEqual(44)
  expect(tripBox?.height).toBeGreaterThanOrEqual(44)
  expect((moreBox?.x ?? 0) + (moreBox?.width ?? 0)).toBeLessThanOrEqual(viewport!.width + 1)

  await page.goto("/review?screen=invite")
  const link = page.getByText("https://www.travelcalendar.space/?join=ab12cd34ef56")
  await expect(link).toBeVisible()
  const dialog = page.locator("[data-slot=dialog-content]")
  await expect.poll(async () => {
    const box = await dialog.boundingBox()
    if (!box) return false
    return (
      box.x >= -1 &&
      box.x + box.width <= viewport!.width + 1 &&
      box.y + box.height <= viewport!.height + 1
    )
  }).toBe(true)

  await page.goto("/review?screen=confirm")
  const confirm = page.getByRole("button", { name: "Confirm" }).first()
  await expect.poll(async () => (await confirm.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

  await page.goto("/review?screen=add")
  const close = page.getByRole("button", { name: "Close" })
  await expect.poll(async () => (await close.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

  await page.goto("/review?screen=create")
  for (const input of await page.locator("input[type=date]").all()) {
    expect((await input.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    if (viewport!.width < 768) {
      const fontSize = await input.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      expect(fontSize).toBeGreaterThanOrEqual(16)
    }
  }
})

test("the plan form keeps a focused field inside a short window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 520 })
  await page.goto("/review?screen=add")
  const where = page.getByLabel("Where")
  await where.focus()
  await expect(where).toBeInViewport()
})
