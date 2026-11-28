import { expect, test } from "@playwright/test"

const screens = [
  { path: "/", ready: "Continue with Google" },
  { path: "/?join=ab12cd34ef56", ready: "Invite ab12cd34ef56 is ready" },
  { path: "/privacy", ready: "Privacy Policy" },
  { path: "/terms", ready: "Terms of Service" },
  { path: "/review?screen=trips", ready: "Your trips" },
  { path: "/review?screen=trip", ready: "Lisbon with you" },
  { path: "/review?screen=today", ready: "on for today" },
  { path: "/review?screen=add", ready: "Add an activity" },
  { path: "/review?screen=edit", ready: "Edit activity" },
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
    // Playwright's WebKit build logs this for interactive-widget. iOS Safari
    // honors the key, and it is what keeps the in-flow add bar above the keyboard.
    if (text.includes("Viewport argument key \"interactive-widget\" not recognized")) return
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
  const trip = page.getByRole("button", { name: "List", exact: true })
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

test("trip header stays on one row from 320 to 430", async ({ page }, testInfo) => {
  const phoneProjects = new Set(["chromium", "mobile-webkit", "mobile-se", "android-chrome"])
  test.skip(!phoneProjects.has(testInfo.project.name))
  const widths =
    testInfo.project.name === "chromium" ? [320, 375, 390, 412, 430] : [page.viewportSize()?.width ?? 390]

  for (const width of widths) {
    if (testInfo.project.name === "chromium") {
      await page.setViewportSize({ width, height: 800 })
    }
    for (const path of ["/review?screen=trip", "/review?screen=today"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await expect(page.locator(".story-chrome")).toBeVisible()
      const controls = [
        page.getByRole("button", { name: "List", exact: true }),
        page.getByRole("button", { name: "Month", exact: true }),
        page.getByRole("button", { name: "Invite", exact: true }),
        page.getByRole("button", { name: "More actions" }),
      ]
      const boxes = []
      for (const control of controls) {
        const box = await control.boundingBox()
        expect(box, path).toBeTruthy()
        expect(box!.height, path).toBeGreaterThanOrEqual(44)
        expect(box!.width, path).toBeGreaterThanOrEqual(44)
        expect(box!.x, path).toBeGreaterThanOrEqual(-1)
        expect(box!.x + box!.width, path).toBeLessThanOrEqual(width + 1)
        boxes.push(box!)
      }
      const tops = boxes.map((box) => box.y)
      expect(Math.max(...tops) - Math.min(...tops), `${path} @ ${width}`).toBeLessThan(2)
      const switcher = page.getByRole("button", { name: /Switch trip/ })
      const switchBox = await switcher.boundingBox()
      expect(switchBox, path).toBeTruthy()
      expect(switchBox!.height, path).toBeGreaterThanOrEqual(44)
      expect(switchBox!.x, path).toBeGreaterThanOrEqual(-1)
      expect(switchBox!.x + switchBox!.width, path).toBeLessThanOrEqual(width + 1)
      const extra = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(extra, path).toBeLessThanOrEqual(1)
      await expect(page.getByRole("button", { name: /^\d+ travelers?:/ })).toBeVisible()
    }
  }
})

test("desktop trip header keeps the text invite and the avatars", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip")
  const invite = page.getByRole("button", { name: "Invite", exact: true })
  await expect(invite).toContainText("Invite")
  await expect(invite.locator("svg")).toBeHidden()
  await expect(page.getByRole("button", { name: /^\d+ travelers?:/ })).toBeVisible()
  const box = await invite.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(76)
})

test("the add button is a 56px target on a phone and a desktop window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium" && testInfo.project.name !== "webkit")
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto("/review?screen=today", { waitUntil: "domcontentloaded" })
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
  const add = page.getByRole("button", { name: "Add to the trip" })
  await expect(add).toBeVisible()
  await add.click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("textbox", { name: "Add to the trip…" })).toBeFocused()
  await page.waitForFunction(() => {
    const chip = document.querySelector("#plan-type-stay")
    return chip != null && chip.getBoundingClientRect().height >= 44
  })
  for (const name of ["Stay", "Travel", "Activity", "Note"]) {
    const chip = dialog.getByRole("radio", { name })
    const chipBox = await chip.boundingBox()
    expect(chipBox!.height).toBeGreaterThanOrEqual(44)
    expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(376)
  }
  await page.keyboard.press("Escape")
  const box = await add.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(56)
  expect(box!.height).toBeGreaterThanOrEqual(56)
  expect(box!.height).toBeLessThanOrEqual(64)
  expect(box!.x + box!.width).toBeLessThanOrEqual(376)
  expect(box!.y + box!.height).toBeLessThanOrEqual(668)

  await page.setViewportSize({ width: 320, height: 568 })
  const narrow = await add.boundingBox()
  expect(narrow!.x).toBeGreaterThanOrEqual(-1)
  expect(narrow!.x + narrow!.width).toBeLessThanOrEqual(321)
  expect(narrow!.height).toBeGreaterThanOrEqual(56)

  await page.setViewportSize({ width: 375, height: 340 })
  await expect(add).toBeInViewport()
  const withKeyboard = await add.boundingBox()
  expect(withKeyboard!.y + withKeyboard!.height).toBeLessThanOrEqual(341)

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip")
  const wide = await page.getByRole("button", { name: "Add to the trip" }).boundingBox()
  expect(wide!.width).toBeGreaterThanOrEqual(56)
  expect(wide!.height).toBeGreaterThanOrEqual(56)
})

test("the plan form keeps a focused field inside a short window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 520 })
  await page.goto("/review?screen=add")
  const where = page.getByLabel("Where")
  await where.focus()
  await expect(where).toBeInViewport()
})
