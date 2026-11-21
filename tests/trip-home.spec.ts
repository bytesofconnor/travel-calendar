import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const widths = [320, 375, 390, 1280] as const

async function openTrip(page: Page, path = "/review?screen=trip") {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Lisbon with you" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()
}

async function pageOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test("trip home shows what's next, a hole, and a claim", async ({ page }) => {
  await openTrip(page)
  await expect(page.getByText("Tomorrow").first()).toBeVisible()
  await expect(page.getByText("No ride from LIS")).toBeVisible()
  await expect(page.getByText("No ride to SFO")).toBeVisible()
  await expect(page.getByText("Everything's covered")).toHaveCount(0)

  const claim = page.getByRole("button", { name: "I'll handle it: No ride from LIS" })
  await claim.focus()
  const focus = await claim.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(focus.style).not.toBe("none")
  expect(focus.width).toBeGreaterThan(0)
  await claim.press("Enter")
  await expect(page.getByText("You're handling this").first()).toBeVisible()
  await expect(page.locator(".trip-home__live")).toHaveText("You're handling No ride from LIS")
  await expect(page.getByRole("button", { name: "Undo handling No ride from LIS" })).toBeVisible()
  await expect(page.getByText("I'll handle it means you're taking this on.")).toBeVisible()

  await page.getByRole("button", { name: "Add ride: No ride from LIS" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.locator("#plan-title")).toHaveValue("Ride from LIS")
  await expect(dialog.locator("#plan-start")).toHaveValue("2026-11-18")
  await expect(dialog.locator("#plan-location")).toHaveValue("LIS")
  await expect(dialog.locator("#plan-location-to")).toHaveValue("Lisbon")
})

test("a covered trip says everything is covered", async ({ page }) => {
  await page.goto("/review?screen=covered", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Everything's covered")
  await expect(page.getByRole("button", { name: /I'll handle it/ })).toHaveCount(0)
})

test("trip home stays on the screen at phone widths and at 200% text", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Width sweep runs once on Chromium")
  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 1024 ? 800 : 844 })
    await openTrip(page)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
    const button = page.getByRole("button", { name: "I'll handle it: No ride from LIS" })
    const box = await button.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  await page.setViewportSize({ width: 375, height: 667 })
  await page.addInitScript(() => {
    const bump = () => {
      document.documentElement.style.fontSize = "32px"
    }
    bump()
    document.addEventListener("DOMContentLoaded", bump)
  })
  await openTrip(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px"
  })
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "2"
  })
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("trip home keeps contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  const themes = [
    { path: "/review?screen=trip", scheme: "light" as const },
    { path: "/review?screen=trip", scheme: "dark" as const },
    { path: "/review?screen=trip&theme=golden-hour", scheme: "light" as const },
    { path: "/review?screen=trip&theme=dusk-rose", scheme: "light" as const },
    { path: "/review?screen=trip&theme=coastal-infra", scheme: "light" as const },
    { path: "/review?screen=trip&theme=sage-coast", scheme: "light" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme })
    await openTrip(page, theme.path)
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    const results = await new AxeBuilder({ page }).include("[data-trip-home]").analyze()
    expect(results.violations).toEqual([])
  }
})

test("trip home does not animate when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openTrip(page)
  const motion = await page.locator("[data-trip-home]").evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })
  expect(motion.name === "none" || motion.duration === "0s" || motion.duration.startsWith("0.01")).toBe(true)
})
