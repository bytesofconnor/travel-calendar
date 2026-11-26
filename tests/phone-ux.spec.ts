import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const themes = [
  { theme: "", scheme: "light" as const },
  { theme: "", scheme: "dark" as const },
  { theme: "golden-hour", scheme: "light" as const },
  { theme: "dusk-rose", scheme: "light" as const },
  { theme: "coastal-infra", scheme: "light" as const },
  { theme: "sage-coast", scheme: "light" as const },
]

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function applyTheme(page: Page, theme: string, scheme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: scheme })
  await page.evaluate((name) => {
    if (name) document.documentElement.dataset.theme = name
    else delete document.documentElement.dataset.theme
  }, theme)
  if (scheme === "dark") {
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
  }
}

test("a phone shows the day under a short shared header", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Phone header runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)

  const stack = await page.evaluate(() => {
    const cover = document.querySelector(".trip-cover")?.getBoundingClientRect()
    const toolbar = document.querySelector("[data-trip-toolbar]")?.getBoundingClientRect()
    const nights = document.querySelector(".trip-list .trip-nights")?.getBoundingClientRect()
    const today = document.querySelector("[data-today-screen]")?.getBoundingClientRect()
    const headerBottom = (cover?.bottom ?? 0) > (toolbar?.bottom ?? 0) ? (cover?.bottom ?? 0) : (toolbar?.bottom ?? 0)
    return {
      header: Math.round((cover?.height ?? 0) + (toolbar?.height ?? 0)),
      headerBottom: Math.round(headerBottom),
      nightsTop: Math.round(nights?.y ?? 9999),
      todayTop: Math.round(today?.y ?? 9999),
      nightsInHeader: document.querySelector("[data-trip-toolbar] .trip-nights, [data-trip-mast] .trip-nights") != null,
    }
  })
  expect(stack.header).toBeLessThan(200)
  expect(stack.nightsInHeader).toBe(false)
  expect(stack.nightsTop).toBeGreaterThan(stack.headerBottom - 2)
  expect(stack.todayTop).toBeGreaterThan(stack.nightsTop)
  expect(stack.todayTop).toBeLessThan(520)

  await page.getByRole("button", { name: "Full trip", exact: true }).click()
  const full = await page.evaluate(() => {
    const day = document.querySelector(".story-chapter__date")?.getBoundingClientRect()
    const home = document.querySelector("[data-trip-home]")?.getBoundingClientRect()
    const nights = document.querySelector(".trip-list .trip-nights")?.getBoundingClientRect()
    return {
      dayTop: Math.round(day?.y ?? 9999),
      homeTop: Math.round(home?.y ?? 0),
      nightsTop: Math.round(nights?.y ?? 9999),
    }
  })
  expect(full.nightsTop).toBeLessThan(full.dayTop)
  expect(full.dayTop).toBeGreaterThan(40)
  expect(full.dayTop).toBeLessThan(520)
  expect(full.homeTop).toBeGreaterThan(full.dayTop)

  const listCover = await page.locator(".trip-cover").boundingBox()
  const listBar = await page.locator("[data-trip-toolbar]").boundingBox()
  await page.getByRole("button", { name: "Month", exact: true }).click()
  await expect(page.getByRole("grid", { name: /2026/ })).toBeVisible()
  const monthCover = await page.locator(".trip-cover").boundingBox()
  const monthBar = await page.locator("[data-trip-toolbar]").boundingBox()
  expect(monthCover).toEqual(listCover)
  expect(monthBar).toEqual(listBar)

  await page.getByRole("button", { name: "List", exact: true }).click()
  await page.getByRole("button", { name: "Mom, show their plans" }).click()
  await expect(page.getByText("Showing Mom's plans")).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})

test("plan essentials fit in the phone dialog without scrolling", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Dialog fit runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 844 })

  async function essentials(path: string, dateLabel: string) {
    await page.goto(path, { waitUntil: "domcontentloaded" })
    await ready(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    const fit = await dialog.evaluate((node, label) => {
      const root = node as HTMLElement
      const scroller = root.querySelector(".overflow-y-auto")
      const box = root.getBoundingClientRect()
      function inside(selector: string) {
        const field = selector.startsWith("#")
          ? root.querySelector(selector)
          : [...root.querySelectorAll("label, p, button")].find((element) => element.textContent?.trim() === selector)
        if (!(field instanceof HTMLElement)) return false
        const rect = field.getBoundingClientRect()
        return rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1 && rect.height > 0
      }
      return {
        scroll: scroller instanceof HTMLElement ? scroller.scrollTop : 0,
        title: inside("#plan-title"),
        date: inside(label),
        who: inside("Who's in"),
        save: inside("Add place") || inside("Add flight") || [...root.querySelectorAll("button")].some((button) => {
          const rect = button.getBoundingClientRect()
          return button.getAttribute("type") === "submit" && rect.bottom <= box.bottom + 1 && rect.top >= box.top
        }),
      }
    }, dateLabel)
    expect(fit.scroll).toBe(0)
    expect(fit.title).toBe(true)
    expect(fit.date).toBe(true)
    expect(fit.who).toBe(true)
    expect(fit.save).toBe(true)
  }

  await essentials("/review?screen=add", "Date")
  await page.goto("/review?screen=add", { waitUntil: "domcontentloaded" })
  await ready(page)
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Travel" }).click()
  await expect(dialog.getByRole("radio", { name: "Flight" })).toBeVisible()
  await expect(dialog.getByLabel("From")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Details" })).toBeVisible()
  const travel = await dialog.evaluate((node) => {
    const root = node as HTMLElement
    const scroller = root.querySelector(".overflow-y-auto")
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0
    const box = root.getBoundingClientRect()
    function seen(name: string) {
      const labeled = [...root.querySelectorAll("label, p, button")].find((element) => element.textContent?.trim() === name)
      if (!(labeled instanceof HTMLElement)) return false
      const rect = (labeled instanceof HTMLLabelElement ? labeled.parentElement ?? labeled : labeled).getBoundingClientRect()
      return rect.bottom <= box.bottom + 1 && rect.top >= box.top - 1
    }
    return {
      scroll: scroller instanceof HTMLElement ? scroller.scrollTop : 0,
      from: seen("From"),
      depart: seen("Depart"),
      who: seen("Who's in"),
    }
  })
  expect(travel.scroll).toBe(0)
  expect(travel.from).toBe(true)
  expect(travel.depart).toBe(true)
  expect(travel.who).toBe(true)

  await dialog.getByRole("button", { name: "Details" }).click()
  await expect(dialog.getByLabel("Notes")).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(page.locator("[role=dialog] :focus")).toBeVisible()
  const trapped = await page.evaluate(() => document.activeElement?.closest("[role=dialog]") != null)
  expect(trapped).toBe(true)
})

test("the signed-out landing is high contrast and filled in", async ({ page }, testInfo) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Plan the trip together" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
    const preview = page.locator(".landing-preview")
    await expect(preview).toBeVisible()
    await expect(preview).toContainText("Lisbon with you")
    await expect(preview).toContainText("TAP to Lisbon")
    const placed = await preview.boundingBox()
    expect(placed).not.toBeNull()
    if (width === 1440) expect(placed!.x).toBeGreaterThan(500)
    if (width === 390) expect(placed!.y).toBeLessThan(844)
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
  if (testInfo.project.name !== "firefox") {
    for (const theme of themes) {
      await applyTheme(page, theme.theme, theme.scheme)
      const results = await new AxeBuilder({ page }).include("#main-content").analyze()
      expect(results.violations, `${theme.theme || "default"} ${theme.scheme}`).toEqual([])
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.getByRole("heading", { name: "Plan the trip together" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.getByRole("button", { name: "Full trip", exact: true }).click()
  await expect(page.locator(".story-chapter__date").first()).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.zoom = "4"
  })
  await expect(page.getByRole("heading", { name: "Lisbon with you" })).toBeVisible()
  const zoomed = await page.evaluate(() => {
    const day = document.querySelector(".story-chapter__date")
    if (!(day instanceof HTMLElement)) return null
    day.scrollIntoView({ block: "nearest" })
    const rect = day.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      text: day.textContent,
      overflow: day.scrollWidth - day.clientWidth,
    }
  })
  expect(zoomed?.text).toContain("NOV 18")
  expect(zoomed?.width ?? 0).toBeGreaterThan(20)
  expect(zoomed?.height ?? 0).toBeGreaterThan(8)
  expect(zoomed?.overflow ?? 99).toBeLessThanOrEqual(1)
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})
