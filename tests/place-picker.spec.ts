import { mkdirSync } from "node:fs"

import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

mkdirSync("/opt/cursor/artifacts", { recursive: true })

const themes = [
  { query: "", scheme: "light" as const },
  { query: "", scheme: "dark" as const },
  { query: "&theme=golden-hour", scheme: "light" as const },
  { query: "&theme=dusk-rose", scheme: "light" as const },
  { query: "&theme=coastal-infra", scheme: "light" as const },
  { query: "&theme=sage-coast", scheme: "light" as const },
]

async function openFlight(page: Page) {
  await page.goto("/review?screen=add&party=5", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Travel" }).click()
  return dialog
}

async function scrollField(field: Locator) {
  await field.evaluate((el) => {
    const scroller = el.closest(".overflow-y-auto")
    if (!(scroller instanceof HTMLElement)) return
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.scrollTop += top - 12
  })
}

async function emptyDarkBoxes(list: Locator) {
  return list.locator("*").evaluateAll((nodes) =>
    nodes.filter((node) => {
      if (!(node instanceof HTMLElement)) return false
      const text = node.textContent?.replace(/\s+/g, "") ?? ""
      const box = node.getBoundingClientRect()
      if (text.length > 0 || box.height < 48 || box.width < 40) return false
      const bg = getComputedStyle(node).backgroundColor
      return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent"
    }).length,
  )
}

test("the place menu overlays the field and ranks DC, Vietnam, and HAN", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  const dialog = await openFlight(page)
  const to = dialog.getByRole("combobox", { name: "To" })
  const notes = dialog.getByLabel("Notes")
  await scrollField(to)
  const before = await notes.boundingBox()
  const formBefore = await dialog.locator("form").boundingBox()
  expect(before).not.toBeNull()
  expect(formBefore).not.toBeNull()

  await to.fill("DC")
  const list = dialog.getByRole("listbox", { name: "To suggestions" })
  await expect(list).toBeVisible({ timeout: 10_000 })
  await expect(list.getByRole("option").first()).toContainText("Washington")
  expect(await emptyDarkBoxes(list)).toBe(0)
  if (testInfo.project.name === "chromium" || testInfo.project.name === "mobile-webkit") {
    await dialog.screenshot({ path: `/opt/cursor/artifacts/place-menu-${testInfo.project.name}.png` })
  }
  await expect(list).not.toContainText("Open-Meteo")
  await expect(dialog.getByText("Cities by Open-Meteo. Addresses © OpenStreetMap via Photon.")).toBeVisible()

  const during = await notes.boundingBox()
  const formDuring = await dialog.locator("form").boundingBox()
  expect(Math.abs((during?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1)
  expect(Math.abs((during?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(1)
  expect(Math.abs((formDuring?.y ?? 0) - (formBefore?.y ?? 0))).toBeLessThan(1)
  expect(Math.abs((formDuring?.height ?? 0) - (formBefore?.height ?? 0))).toBeLessThan(1)

  await page.keyboard.press("Escape")
  await expect(list).toBeHidden()
  await expect(dialog).toBeVisible()
  const after = await notes.boundingBox()
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1)

  await to.focus()
  await page.keyboard.press("ArrowDown")
  await expect(list).toBeVisible()
  await page.keyboard.press("Home")
  await page.keyboard.press("Enter")
  await expect(to).toHaveValue("Washington, D.C.")
  await expect(list).toBeHidden()

  await dialog.getByLabel("Depart time").fill("10:00")
  await dialog.getByLabel("Arrive time").fill("12:00")
  const when = dialog.getByTestId("flight-when")
  await expect(when).toContainText("Arrives 12:00 PM Eastern (Washington)")
  await expect(dialog.getByLabel("Arriving time zone")).toHaveCount(0)

  await scrollField(to)
  await to.fill("Vietnam")
  await expect(list.getByRole("option").first()).toHaveAttribute("data-kind", "country", { timeout: 10_000 })
  await expect(list.getByRole("option").first()).toContainText("Vietnam")

  await scrollField(to)
  await to.fill("HAN")
  const airport = list.getByRole("option").first()
  await expect(airport).toHaveAttribute("data-kind", "airport")
  await expect(airport).toContainText("HAN")
  await airport.click()
  await expect(to).toHaveValue("HAN · Hanoi")
  await expect(to).toHaveAttribute("title", "Noi Bai Airport")
  await dialog.locator("#plan-end").fill("2026-11-20")
  await expect(when).toContainText("Vietnam (Hanoi) +1")
  if (testInfo.project.name === "chromium" || testInfo.project.name === "mobile-webkit") {
    await scrollField(when)
    await dialog.screenshot({ path: `/opt/cursor/artifacts/flight-when-${testInfo.project.name}.png` })
  }
  if (testInfo.project.name === "mobile-se") {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px"
    })
    await scrollField(when)
    await expect(when).toBeInViewport()
    await when.screenshot({ path: `/opt/cursor/artifacts/flight-when-${testInfo.project.name}.png` })
    await scrollField(to)
    await to.fill("DC")
    await expect(list.getByRole("option").first()).toContainText("Washington", { timeout: 10_000 })
    await dialog.screenshot({ path: `/opt/cursor/artifacts/place-menu-${testInfo.project.name}.png` })
  }
  await dialog.getByRole("button", { name: "Change" }).click()
  await expect(dialog.getByLabel("Arriving time zone")).toBeVisible()
})

test("the open place menu keeps contrast in every theme", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme, reducedMotion: "reduce" })
    await page.goto(`/review?screen=add&party=5${theme.query}`, { waitUntil: "domcontentloaded" })
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("radio", { name: "Travel" }).click()
    const to = dialog.getByRole("combobox", { name: "To" })
    await scrollField(to)
    await to.fill("DC")
    await expect(dialog.getByRole("listbox", { name: "To suggestions" })).toBeVisible({ timeout: 10_000 })
    const results = await new AxeBuilder({ page }).include("[role=dialog]").analyze()
    expect(results.violations).toEqual([])
  }
})
