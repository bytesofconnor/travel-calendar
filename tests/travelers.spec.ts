import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function openTrip(page: Page, party: number) {
  await page.goto(`/review?screen=trip&party=${party}`, { waitUntil: "domcontentloaded" })
  const stack = page.getByRole("button", { name: new RegExp(`^${party} travelers?:`) })
  await expect(stack).toBeVisible()
  return stack
}

test("header labels fit 1, 2, 3, and 5 travelers", async ({ page }) => {
  const cases = [
    { party: 1, label: "Just you", name: "1 traveler: you. Just you", faces: 1, extra: null },
    { party: 2, label: "you & Caitlin", name: "2 travelers: you, Caitlin. you & Caitlin", faces: 2, extra: null },
    {
      party: 3,
      label: "you & Caitlin & Alex",
      name: "3 travelers: you, Caitlin, Alex. you & Caitlin & Alex",
      faces: 3,
      extra: null,
    },
    {
      party: 5,
      label: "you + 4 others",
      name: "5 travelers: you, Caitlin, Alex, Sam, Jordan. you + 4 others",
      faces: 4,
      extra: "+1",
    },
  ] as const

  for (const item of cases) {
    const stack = await openTrip(page, item.party)
    await expect(stack).toHaveAccessibleName(item.name)
    await expect(stack).toContainText(item.label)
    const faces = page.locator("[data-travelers] [data-traveler-face]")
    await expect(faces).toHaveCount(item.faces)
    if (item.extra) {
      await expect(page.locator("[data-travelers] [data-traveler-extra]")).toHaveText(item.extra)
    } else {
      await expect(page.locator("[data-travelers] [data-traveler-extra]")).toHaveCount(0)
    }
    await expect(page.getByText(item.label).first()).toBeVisible()
  }
})

test("tapping the stack opens the member list", async ({ page }) => {
  const stack = await openTrip(page, 5)
  await stack.focus()
  const focus = await stack.evaluate((element) => {
    const style = getComputedStyle(element)
    return `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`
  })
  expect(focus).not.toBe("none 0px none")
  await expect.poll(async () => {
    const box = await stack.boundingBox()
    return Math.min(box?.width ?? 0, box?.height ?? 0)
  }).toBeGreaterThanOrEqual(44)
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Invite someone else" })).toBeVisible()
  await expect(dialog.getByRole("list", { name: "Trip travelers" })).toBeVisible()
  for (const name of ["Connor", "Caitlin", "Alex", "Sam", "Jordan"]) {
    await expect(dialog.getByText(name, { exact: false }).first()).toBeVisible()
  }
})

test("invite copy is a group invite", async ({ page }) => {
  await page.goto("/review?screen=invite&party=1", { waitUntil: "domcontentloaded" })
  const solo = page.getByRole("dialog")
  await expect(solo.getByRole("heading", { name: "Invite the people you're traveling with" })).toBeVisible()
  await expect(solo.getByText("https://www.travelcalendar.space/?join=ab12cd34ef56")).toBeVisible()
  await expect(solo).not.toContainText(/partner|heartbeat|both of you/i)

  await page.goto("/review?screen=invite&party=5", { waitUntil: "domcontentloaded" })
  const group = page.getByRole("dialog")
  await expect(group.getByRole("heading", { name: "Invite someone else" })).toBeVisible()
  await expect(group.getByText("Caitlin, Alex, Sam, and Jordan are already on this trip")).toBeVisible()
  const link = group.getByText("https://www.travelcalendar.space/?join=ab12cd34ef56")
  const list = group.getByRole("list", { name: "Trip travelers" })
  await expect(link).toBeVisible()
  const linkBox = await link.boundingBox()
  const listBox = await list.boundingBox()
  expect(linkBox && listBox && linkBox.y < listBox.y).toBe(true)
  await expect(group).not.toContainText(/partner|heartbeat|both of you/i)
})

test("add says everyone, or the people who are in", async ({ page }) => {
  await page.goto("/review?screen=add", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Add a place" })).toBeVisible()
  await expect(dialog.getByText("Everyone", { exact: true })).toBeVisible()
  await dialog.getByRole("button", { name: "Mom, included, toggle" }).click()
  await dialog.getByRole("button", { name: "Dad, included, toggle" }).click()
  await expect(dialog.getByRole("heading", { name: "Add a place" })).toBeVisible()
  await expect(dialog.getByText("2 of 4 · not Mom or Dad", { exact: true })).toBeVisible()
})

test("traveler stack and invite keep contrast across themes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  const themes = [
    { query: "", scheme: "light" as const },
    { query: "", scheme: "dark" as const },
    { query: "&theme=golden-hour", scheme: "light" as const },
    { query: "&theme=dusk-rose", scheme: "light" as const },
    { query: "&theme=coastal-infra", scheme: "light" as const },
    { query: "&theme=sage-coast", scheme: "light" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme, reducedMotion: "reduce" })
    await page.goto(`/review?screen=trip&party=5${theme.query}`, { waitUntil: "domcontentloaded" })
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    await expect(page.getByRole("button", { name: /^5 travelers:/ })).toBeVisible()
    const stack = await new AxeBuilder({ page }).include("[data-travelers]").analyze()
    expect(stack.violations).toEqual([])

    await page.goto(`/review?screen=invite&party=5${theme.query}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Invite someone else" })).toBeVisible()
    const invite = await new AxeBuilder({ page }).include("[data-slot=dialog-content]").analyze()
    expect(invite.violations).toEqual([])
  }
})

test("a five-person header fits a narrow phone, large text, and 200% zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Layout edges run once on Chromium")
  await page.setViewportSize({ width: 320, height: 568 })
  const stack = await openTrip(page, 5)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px"
  })
  await expect(stack).toContainText("you + 4 others")
  await stack.scrollIntoViewIfNeeded()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect.poll(async () => (await stack.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  const covered = await page.evaluate(() => {
    const faces = document.querySelector("[data-travelers]")?.getBoundingClientRect()
    const dock = document.querySelector("[role='region']")?.getBoundingClientRect()
    if (!faces || !dock) return 0
    return Math.max(0, faces.bottom - dock.top)
  })
  expect(covered).toBeLessThanOrEqual(1)

  await page.goto("/review?screen=invite&party=5", { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px"
  })
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Invite someone else" })).toBeVisible()
  const link = dialog.locator("#invite-link")
  await link.scrollIntoViewIfNeeded()
  await expect(link).toBeInViewport()
  const inviteOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(inviteOverflow).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "2"
  })
  await page.goto("/review?screen=trip&party=5", { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2"
  })
  await expect(page.getByRole("button", { name: /^5 travelers:/ })).toBeVisible()
  const zoomed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(zoomed).toBeLessThanOrEqual(1)
})
