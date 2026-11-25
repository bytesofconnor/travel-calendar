import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1920, 2560]

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function box(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  })
}

async function contentEdges(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      left: Math.round(rect.left + Number.parseFloat(style.paddingLeft)),
      right: Math.round(rect.right - Number.parseFloat(style.paddingRight)),
    }
  })
}

test("list and month keep the same header and toolbar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Header boxes run once on Chromium")
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
    await ready(page)
    const cover = await box(page, ".trip-cover")
    const toolbar = await box(page, "[data-trip-toolbar]")
    await page.getByRole("button", { name: "Month", exact: true }).click()
    await expect(page.getByRole("grid", { name: /2026/ })).toBeVisible()
    const coverMonth = await box(page, ".trip-cover")
    const toolbarMonth = await box(page, "[data-trip-toolbar]")
    expect(coverMonth, `cover at ${width}`).toEqual(cover)
    expect(toolbarMonth, `toolbar at ${width}`).toEqual(toolbar)
    const gutter = await page.locator("[data-trip-scroll]").evaluate((element) => getComputedStyle(element).scrollbarGutter)
    expect(gutter, `scrollbar gutter at ${width}`).toContain("stable")
    await expect(page.locator(".trip-cover__title")).toHaveText("Lisbon with you")
    expect(await overflow(page), `overflow at ${width}`).toBeLessThanOrEqual(1)
  }
})

test("content lines up with the toolbar on every page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Edge alignment runs once on Chromium")
  const tripPages = ["/review?screen=trip", "/review?screen=month", "/review?screen=vietnam"]
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of tripPages) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await ready(page)
      const toolbar = await contentEdges(page, "[data-trip-toolbar] .page-inset")
      const story = await contentEdges(page, "[data-trip-scroll] > .trip-stage-inset")
      const dock = await contentEdges(page, ".capture-dock .page-inset")
      const cover = await contentEdges(page, ".trip-cover__content")
      expect(story, `${path} story at ${width}`).toEqual(toolbar)
      expect(dock, `${path} composer at ${width}`).toEqual(toolbar)
      expect(cover, `${path} cover at ${width}`).toEqual(toolbar)
      expect(await overflow(page), `${path} overflow at ${width}`).toBeLessThanOrEqual(1)
    }
  }

  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ["/privacy", "/terms", "/review?screen=create", "/"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      const main = page.locator("#main-content")
      await expect(main).toBeVisible()
      expect(await overflow(page), `${path} overflow at ${width}`).toBeLessThanOrEqual(1)
      const shell = await page.locator("#main-content").evaluate((element) => element.className)
      expect(shell).toContain("page-shell")
    }
  }
})

test("focus is not covered by the trip mast", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Focus check runs once on Chromium")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  const card = page.locator(".plan-card").first()
  await card.focus()
  const covered = await page.evaluate(() => {
    const active = document.activeElement
    const toolbar = document.querySelector("[data-trip-toolbar]")
    if (!(active instanceof HTMLElement) || !(toolbar instanceof HTMLElement)) {
      return { covered: true, toolbarSticky: false }
    }
    const focusBox = active.getBoundingClientRect()
    const bar = toolbar.getBoundingClientRect()
    const toolbarSticky = getComputedStyle(toolbar).position === "sticky"
    const covered = toolbarSticky && focusBox.top < bar.bottom - 1 && focusBox.bottom > bar.top + 1
    return { covered, toolbarSticky }
  })
  expect(covered.covered).toBe(false)
  expect(covered.toolbarSticky).toBe(true)

  await page.setViewportSize({ width: 390, height: 400 })
  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await ready(page)
  const short = await page.locator("[data-trip-toolbar]").evaluate((element) => getComputedStyle(element).position)
  expect(short).not.toBe("sticky")
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})

test("200% text on an iPhone SE does not overflow or stick the mast", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Text scaling runs once on Chromium")
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.locator(".trip-cover__title")).toBeVisible()
  await expect(page.getByRole("button", { name: "List", exact: true })).toBeVisible()
  const position = await page.locator("[data-trip-mast]").evaluate((element) => getComputedStyle(element).position)
  expect(position).not.toBe("sticky")
  expect(await overflow(page)).toBeLessThanOrEqual(1)
  await page.getByRole("button", { name: "Month", exact: true }).click()
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})

test("temperature is a labeled menu control", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  await expect(page.locator(".weather-scale")).toHaveCount(0)
  await page.getByRole("button", { name: "More actions" }).click()
  await expect(page.getByText("Temperature: °F / °C")).toBeVisible()
  await page.getByRole("menuitemradio", { name: "°C" }).click()
  await page.getByRole("button", { name: "More actions" }).click()
  await expect(page.getByRole("menuitemradio", { name: "°C" })).toBeChecked()
})

test("trip shell keeps contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  const themes = [
    { path: "/review?screen=trip", scheme: "light" as const },
    { path: "/review?screen=month", scheme: "dark" as const },
    { path: "/review?screen=trip&theme=golden-hour", scheme: "light" as const },
    { path: "/review?screen=trip&theme=dusk-rose", scheme: "light" as const },
    { path: "/review?screen=trip&theme=coastal-infra", scheme: "light" as const },
    { path: "/review?screen=trip&theme=sage-coast", scheme: "light" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(theme.path, { waitUntil: "domcontentloaded" })
    await ready(page)
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    await page.evaluate(() => document.fonts.ready)
    let results = await new AxeBuilder({ page }).include("#main-content").analyze()
    if (results.violations.some((violation) => violation.id === "color-contrast")) {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      results = await new AxeBuilder({ page }).include("#main-content").analyze()
    }
    expect(results.violations, theme.path).toEqual([])
  }
})

test("your trips is a centered modal on a desktop window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/review?screen=trips", { waitUntil: "domcontentloaded" })
  await ready(page)
  const dialog = page.getByRole("dialog", { name: "Your trips" })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(480)
  expect(box!.width).toBeGreaterThan(280)
  expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(16)
  expect(box!.y).toBeGreaterThan(40)
  expect(box!.y + box!.height).toBeLessThan(880)
  const results = await new AxeBuilder({ page }).include("[data-slot='sheet-content']").analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trips", { waitUntil: "domcontentloaded" })
  await ready(page)
  const phone = await page.getByRole("dialog", { name: "Your trips" }).boundingBox()
  expect(phone).not.toBeNull()
  expect(phone!.width).toBeGreaterThan(360)
  expect(phone!.x).toBeLessThan(20)
})

test("switching views does not animate when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.getByRole("button", { name: "Month", exact: true }).click()
  const motion = await page.locator(".trip-stage__panel").evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })
  expect(motion.name === "none" || motion.duration === "0s" || motion.duration.startsWith("0.01")).toBe(true)
})
