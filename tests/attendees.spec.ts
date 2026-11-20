import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function openEdit(page: Page) {
  await page.goto("/review?screen=edit", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("heading", { name: "Edit plan" })).toBeVisible()
  return dialog
}

test("a member can include or exclude faces on a plan", async ({ page }) => {
  const dialog = await openEdit(page)
  await expect(dialog.getByText("Connor and Alex", { exact: true })).toBeVisible()

  const mom = dialog.getByRole("button", { name: "Mom, not included" })
  const connor = dialog.getByRole("button", { name: "Connor, included" })
  await dialog.locator("#plan-title").focus()
  await page.keyboard.press("Tab")
  await expect(connor).toBeFocused()
  const focus = await connor.evaluate((element) => getComputedStyle(element).boxShadow)
  expect(focus).not.toBe("none")
  await expect.poll(async () => (await mom.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44)
  await expect.poll(async () => (await mom.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

  await mom.press("Space")
  await expect(dialog.getByRole("button", { name: "Mom, included" })).toHaveAttribute("aria-pressed", "true")
  await expect(dialog.getByText("Connor, Alex, and Mom", { exact: true })).toBeVisible()

  await connor.click()
  await expect(dialog.getByRole("button", { name: "Connor, not included" })).toHaveAttribute("aria-pressed", "false")
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(dialog).toBeHidden()

  const card = page.getByRole("button", { name: /Place: Time Out Market/ })
  await expect(card.locator("span.h-6.w-6")).toHaveCount(2)
  await expect(card).toHaveAttribute("aria-label", /Alex and Mom/)
})

test("a new plan starts as Everyone", async ({ page }) => {
  await page.goto("/review?screen=add", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Everyone", { exact: true })).toBeVisible()
  for (const name of ["Connor", "Alex", "Mom", "Dad"]) {
    await expect(dialog.getByRole("button", { name: `${name}, included` })).toHaveAttribute("aria-pressed", "true")
  }
})

test("the trip calendar shows faces only when someone is left out", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  const dinner = page.getByRole("button", { name: /Place: Time Out Market/ })
  await expect(dinner).toHaveAttribute("aria-label", /Connor and Alex/)
  const stay = page.getByRole("button", { name: /Stay: Alfama apartment/ })
  await expect(stay).not.toHaveAttribute("aria-label", /Connor and Alex/)
  await expect(dinner.locator("span.h-6.w-6")).toHaveCount(2)
  await expect(stay.locator("span.h-6.w-6")).toHaveCount(0)
})

test("who's in keeps contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  const themes = [
    { path: "/review?screen=edit", scheme: "light" as const },
    { path: "/review?screen=edit", scheme: "dark" as const },
    { path: "/review?screen=edit&theme=golden-hour", scheme: "light" as const },
    { path: "/review?screen=edit&theme=dusk-rose", scheme: "light" as const },
    { path: "/review?screen=edit&theme=coastal-infra", scheme: "light" as const },
    { path: "/review?screen=edit&theme=sage-coast", scheme: "light" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme, reducedMotion: "reduce" })
    await page.goto(theme.path, { waitUntil: "domcontentloaded" })
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("button", { name: "Mom, not included" })).toBeVisible()
    const results = await new AxeBuilder({ page }).include("[data-who=in]").analyze()
    expect(results.violations).toEqual([])
  }
})

test("who's in stays on screen at large text and 200% zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Large text runs once on Chromium")
  await page.setViewportSize({ width: 375, height: 667 })
  await page.addInitScript(() => {
    const bump = () => {
      document.documentElement.style.fontSize = "32px"
    }
    bump()
    document.addEventListener("DOMContentLoaded", bump)
  })
  const dialog = await openEdit(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px"
  })
  await expect(dialog.getByRole("button", { name: "Mom, not included" })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const dad = dialog.getByRole("button", { name: "Dad, not included" })
  await expect.poll(async () => (await dad.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44)
  await expect.poll(async () => (await dad.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

  await page.setViewportSize({ width: 320, height: 568 })
  await dad.scrollIntoViewIfNeeded()
  await expect.poll(async () => dad.evaluate((element) => {
    const button = element.getBoundingClientRect()
    const scroller = element.closest(".overflow-y-auto")?.getBoundingClientRect()
    if (!scroller) return 0
    const inside = button.top >= scroller.top - 1 && button.bottom <= scroller.bottom + 1
    return inside ? Math.min(button.width, button.height) : 0
  })).toBeGreaterThanOrEqual(44)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "2"
  })
  await expect(dialog.getByText("Connor and Alex", { exact: true })).toBeVisible()
  const zoomed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(zoomed).toBeLessThanOrEqual(1)
})
