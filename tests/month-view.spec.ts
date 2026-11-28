import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function pageOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function brokenWord(locator: { evaluate: <T>(fn: (element: HTMLElement) => T) => Promise<T> }) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    if (style.display === "none") return "hidden"
    if (style.overflowWrap === "anywhere" || style.wordBreak === "break-all" || style.wordBreak === "break-word") {
      return `style ${style.overflowWrap} ${style.wordBreak}`
    }
    const text = element.textContent ?? ""
    const node = element.firstChild
    if (!node || node.nodeType !== Node.TEXT_NODE) return "missing"
    const line = Number.parseFloat(style.lineHeight)
    if ((style.whiteSpace === "nowrap" || style.whiteSpace === "pre") && line > 0) {
      return element.getBoundingClientRect().height / line > 1.4 ? "wrapped" : ""
    }
    const range = document.createRange()
    let index = 0
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const start = text.indexOf(word, index)
      if (start < 0) return word
      range.setStart(node, start)
      range.setEnd(node, start + word.length)
      if (range.getClientRects().length > 1) return word
      index = start + word.length
    }
    return ""
  })
}

async function visibleLetters(locator: { evaluate: <T>(fn: (element: HTMLElement) => T) => Promise<T> }) {
  return locator.evaluate((element) => {
    const text = element.textContent ?? ""
    const node = element.firstChild
    if (!node || node.nodeType !== Node.TEXT_NODE) return 0
    if (element.scrollWidth <= element.clientWidth + 1) return (text.match(/[A-Za-z0-9]/g) ?? []).length
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const left = box.left + Number.parseFloat(style.paddingLeft)
    const right = box.right - Number.parseFloat(style.paddingRight)
    const range = document.createRange()
    let count = 0
    for (let index = 0; index < text.length; index += 1) {
      range.setStart(node, index)
      range.setEnd(node, index + 1)
      const rect = range.getBoundingClientRect()
      if (rect.width <= 0) continue
      const center = rect.left + rect.width / 2
      if (center < left || center > right) continue
      if (/[A-Za-z0-9]/.test(text[index] ?? "")) count += 1
    }
    return count
  })
}

async function waitUntilInteractive(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function openMonth(page: Page, path = "/review?screen=month") {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "November 2026" })).toBeVisible()
}

test("list and month switcher", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  const list = page.getByRole("button", { name: "List", exact: true })
  const month = page.getByRole("button", { name: "Month", exact: true })
  await expect(list).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()

  await month.focus()
  await month.press("Enter")
  await expect(month).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "November 2026" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "What's next" })).toHaveCount(0)

  await list.click()
  await expect(list).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "November 2026" })).toHaveCount(0)
})

test("previous and next month", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  await page.getByRole("button", { name: "Next month" }).click()
  await expect(page.getByRole("heading", { name: "December 2026" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "December 2026" })).toBeVisible()
  await page.getByRole("button", { name: "Previous month" }).click()
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
})

test("a day opens its plans and an empty day can add that date", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)

  const tripDay = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await expect(tripDay).toHaveAttribute("aria-current", "date")
  await tripDay.click()
  await expect(page.getByRole("heading", { name: "Wednesday, November 18" })).toBeVisible()
  await page.getByRole("button", { name: /Flight TAP to Lisbon/ }).click()
  const edit = page.getByRole("dialog")
  await expect(edit).toBeVisible()
  await expect(edit.locator("#plan-title")).toHaveValue("TAP to Lisbon")
  await page.keyboard.press("Escape")
  await expect(edit).toBeHidden()

  await page.getByRole("gridcell", { name: /Monday November 2, no events/ }).click()
  await expect(page.getByRole("heading", { name: "Monday, November 2" })).toBeVisible()
  await page.getByRole("button", { name: "Add something" }).click()
  const add = page.getByRole("dialog")
  await expect(add).toBeVisible()
  await expect(add.locator("#plan-start")).toHaveValue("2026-11-02")
  await expect(add.getByRole("heading", { name: "Add an activity" })).toBeVisible()
})

test("arrow keys move between days", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  const start = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await start.focus()
  const focus = await start.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(focus.style).not.toBe("none")
  expect(focus.width).toBeGreaterThan(0)

  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("gridcell", { name: /Thursday November 19/ })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("gridcell", { name: /Thursday November 26/ })).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByRole("gridcell", { name: /Wednesday November 25/ })).toBeFocused()
  await page.keyboard.press("ArrowUp")
  await expect(page.getByRole("gridcell", { name: /Wednesday November 18/ })).toBeFocused()
})

test("phone month shows plan titles and a stay bar inside the screen", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await openMonth(page)
    const day = page.getByRole("gridcell", { name: /Wednesday November 18, today, 4 events/ })
    await expect(day).toHaveAccessibleName(/Flight SFO to LIS/)
    await expect(day).toHaveAccessibleName(/Stay Alfama apartment/)
    await expect(day).toHaveAccessibleName(/Activity Dinner/)
    await expect(day).toHaveAccessibleName(/Activity Tram 28/)

    const column = page.locator('.month-day__chips[data-date="2026-11-18"]')
    await expect(column).toHaveAttribute("data-fit", /^(label|count)$/)
    const fit = await column.getAttribute("data-fit")
    if (width === 390) expect(fit).toBe("label")
    if (fit === "label") {
      await expect(column.locator(".month-chip:visible")).toHaveCount(2)
      const flight = column.locator(".month-chip").nth(0).locator(".month-chip__route:visible, .month-chip__short:visible")
      const dinner = column.locator(".month-chip").nth(1).locator(".month-chip__route:visible, .month-chip__short:visible")
      await expect(flight).toBeVisible()
      await expect(flight).toHaveText(/^SFO→/)
      await expect(dinner).toHaveText("Dinner")
      await expect(column.locator(".month-chip__title").first()).toBeHidden()
      await expect(column.locator(".month-chip__kind").first()).toBeHidden()
      await expect(column.locator(".month-chip__dot:visible")).toHaveCount(0)
      await expect(column.locator(".month-more")).toHaveText("+1")
      await expect(column.locator(".month-more")).toBeVisible()
      await expect(column.locator(".month-squeeze")).toBeHidden()
      expect(await brokenWord(flight)).toBe("")
      expect(await brokenWord(dinner)).toBe("")
      expect(await visibleLetters(flight)).toBeGreaterThan(2)
      expect(await visibleLetters(dinner)).toBeGreaterThan(2)
      const metrics = await flight.evaluate((element) => {
        const style = getComputedStyle(element)
        const column = element.closest(".month-day__chips")
        const chip = element.closest(".month-chip")
        return {
          size: Number.parseFloat(style.fontSize),
          space: style.whiteSpace,
          wrap: style.overflowWrap,
          word: style.wordBreak,
          chipBox: chip?.getBoundingClientRect().width ?? 0,
          columnBox: column?.getBoundingClientRect().width ?? 0,
        }
      })
      expect(metrics.size).toBeGreaterThanOrEqual(14)
      expect(metrics.space).toBe("nowrap")
      expect(metrics.wrap).not.toBe("anywhere")
      expect(metrics.word).not.toBe("break-all")
      expect(metrics.chipBox).toBeGreaterThan(metrics.columnBox - 6)
    } else {
      await expect(column.locator(".month-chip__short")).toBeHidden()
      await expect(column.locator(".month-squeeze__count")).toHaveText("3")
      await expect(column.locator(".month-squeeze__bar")).toHaveCount(2)
    }

    const bar = page.locator(".month-bar", { hasText: "Alfama apartment" }).first()
    await expect(bar).toBeVisible()
    await expect(page.locator(".month-bar__kind").first()).toBeHidden()
    const barBox = await bar.boundingBox()
    const dayBox = await day.boundingBox()
    expect(barBox?.width ?? 0).toBeGreaterThan((dayBox?.width ?? 0) * 1.5)
    expect(dayBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(dayBox?.height ?? 0).toBeGreaterThanOrEqual(44)
    const barTitle = bar.locator(".month-bar__title")
    const barFit = await barTitle.evaluate((element) => ({
      size: Number.parseFloat(getComputedStyle(element).fontSize),
      fits: element.scrollWidth <= element.clientWidth + 1,
      text: element.textContent,
    }))
    expect(barFit.size).toBeGreaterThanOrEqual(14)
    expect(barFit.text).toBe("Alfama apartment")
    expect(barFit.fits).toBe(true)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await openMonth(page)
  const start = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await start.focus()
  const focus = await start.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(focus.style).not.toBe("none")
  expect(focus.width).toBeGreaterThan(0)
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("gridcell", { name: /Thursday November 19/ })).toBeFocused()
  await page.getByRole("gridcell", { name: /Wednesday November 18/ }).click()
  await expect(page.getByRole("heading", { name: "Wednesday, November 18" })).toBeVisible()
  await expect(page.getByRole("button", { name: /TAP to Lisbon/ })).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  const desktopDay = page.locator('.month-day__chips[data-date="2026-11-18"]')
  await expect(desktopDay.locator(".month-chip", { hasText: "TAP to Lisbon" })).toBeVisible()
  await expect(desktopDay.locator(".month-chip", { hasText: "Flight" })).toBeVisible()
  await expect(desktopDay.locator(".month-chip", { hasText: "Dinner" })).toContainText("Activity")
  await expect(desktopDay.locator(".month-chip")).toHaveCount(3)
  await expect(desktopDay.locator(".month-more")).toBeHidden()
  await expect(page.locator(".month-bar", { hasText: "Alfama apartment" })).toHaveCount(2)
  await expect(page.locator(".month-bar__kind").first()).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("month view stays readable at large text and 200% zoom", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  await expect(page.locator(".month-agenda")).toBeVisible()
  const agendaTitle = page.locator(".month-agenda__title", { hasText: "Alfama apartment" }).first()
  await expect(agendaTitle).toBeVisible()
  const agendaText = await agendaTitle.evaluate((element) => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    return { whiteSpace: style.whiteSpace, text: element.textContent, right: box.right, width: box.width }
  })
  expect(agendaText.whiteSpace).not.toBe("nowrap")
  expect(agendaText.text).toBe("Alfama apartment")
  expect(agendaText.right).toBeLessThanOrEqual(320)
  expect(await brokenWord(agendaTitle)).toBe("")
  const agendaSize = await agendaTitle.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  expect(agendaSize).toBeGreaterThanOrEqual(14)
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  const phoneTitle = page.locator(".month-agenda__title", { hasText: "TAP to Lisbon" }).first()
  await expect(page.locator(".month-agenda")).toBeVisible()
  await expect(phoneTitle).toBeVisible()
  const phoneText = await phoneTitle.evaluate((element) => getComputedStyle(element).whiteSpace)
  expect(phoneText).not.toBe("nowrap")
  expect(await brokenWord(phoneTitle)).toBe("")
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)

  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2"
  })
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)

  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.evaluate(() => {
    document.documentElement.style.zoom = "4"
  })
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  const zoomedAgenda = page.locator(".month-agenda__title", { hasText: "Alfama apartment" }).first()
  const zoomedBar = page.locator(".month-bar", { hasText: "Alfama apartment" }).first()
  if (await page.locator(".month-agenda").isVisible()) {
    await expect(zoomedAgenda).toBeVisible()
  } else {
    await expect(zoomedBar).toBeVisible()
  }
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("month view keeps contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  const themes = [
    { path: "/review?screen=month", scheme: "light" as const },
    { path: "/review?screen=month", scheme: "dark" as const },
    { path: "/review?screen=month&theme=golden-hour", scheme: "light" as const },
    { path: "/review?screen=month&theme=dusk-rose", scheme: "light" as const },
    { path: "/review?screen=month&theme=coastal-infra", scheme: "light" as const },
    { path: "/review?screen=month&theme=sage-coast", scheme: "light" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme })
    await page.setViewportSize({ width: 1280, height: 800 })
    await openMonth(page, theme.path)
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
      const sample = await page.evaluate(() => {
      function rgb(color: string) {
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (!context) return [0, 0, 0]
        context.fillStyle = "#000"
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      function luminance(channels: number[]) {
        const channel = (value: number) => {
          const scaled = value / 255
          return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * channel(channels[0]) + 0.7152 * channel(channels[1]) + 0.0722 * channel(channels[2])
      }
      function contrast(foreground: string, background: string) {
        const lighter = Math.max(luminance(rgb(foreground)), luminance(rgb(background)))
        const darker = Math.min(luminance(rgb(foreground)), luminance(rgb(background)))
        return (lighter + 0.05) / (darker + 0.05)
      }
      const fill = document.querySelector('.month-bg[data-trip="true"]')
      const date = document.querySelector(".month-day__date")
      const chip = document.querySelector(".month-chip")
      const title = document.querySelector(".month-chip__title")
      const bar = document.querySelector(".month-bar")
      const dot = chip?.querySelector(".month-chip__dot")
      const more = document.querySelector(".month-more")
      if (!(fill instanceof HTMLElement) || !(date instanceof HTMLElement) || !(chip instanceof HTMLElement) || !(title instanceof HTMLElement) || !(bar instanceof HTMLElement)) {
        return null
      }
      const fillStyle = getComputedStyle(fill)
      const dateStyle = getComputedStyle(date)
      const chipStyle = getComputedStyle(chip)
      const titleStyle = getComputedStyle(title)
      const barStyle = getComputedStyle(bar)
      const dotStyle = dot instanceof HTMLElement ? getComputedStyle(dot) : null
      const moreStyle = more instanceof HTMLElement ? getComputedStyle(more) : null
      return {
        dateOnFill: contrast(dateStyle.color, fillStyle.backgroundColor),
        chip: contrast(chipStyle.color, chipStyle.backgroundColor),
        bar: contrast(barStyle.color, barStyle.backgroundColor),
        dot: dotStyle && dotStyle.display !== "none" ? contrast(dotStyle.backgroundColor, chipStyle.backgroundColor) : null,
        more: moreStyle && moreStyle.display !== "none" ? contrast(moreStyle.color, fillStyle.backgroundColor) : null,
        fillLuminance: luminance(rgb(fillStyle.backgroundColor)),
        titleSize: Number.parseFloat(titleStyle.fontSize),
        titleSpace: titleStyle.whiteSpace,
        chipWrap: chipStyle.flexWrap,
        rail: Number.parseFloat(chipStyle.borderLeftWidth) >= 3 ? contrast(chipStyle.borderLeftColor, chipStyle.backgroundColor) : null,
        shortSpace: (() => {
          const labels = [...chip.querySelectorAll(".month-chip__short, .month-chip__route")].filter(
            (node): node is HTMLElement => node instanceof HTMLElement && getComputedStyle(node).display !== "none",
          )
          return labels[0] ? getComputedStyle(labels[0]).whiteSpace : null
        })(),
        shortWrap: (() => {
          const labels = [...chip.querySelectorAll(".month-chip__short, .month-chip__route")].filter(
            (node): node is HTMLElement => node instanceof HTMLElement && getComputedStyle(node).display !== "none",
          )
          return labels[0] ? getComputedStyle(labels[0]).overflowWrap : null
        })(),
      }
    })
    expect(sample, `${theme.path} ${width}`).not.toBeNull()
    expect(sample!.dateOnFill, theme.path).toBeGreaterThanOrEqual(4.5)
    expect(sample!.chip, theme.path).toBeGreaterThanOrEqual(4.5)
    expect(sample!.bar, theme.path).toBeGreaterThanOrEqual(4.5)
    if (sample!.dot != null) expect(sample!.dot, theme.path).toBeGreaterThanOrEqual(3)
    if (sample!.rail != null) expect(sample!.rail, theme.path).toBeGreaterThanOrEqual(3)
    if (sample!.more != null) expect(sample!.more, theme.path).toBeGreaterThanOrEqual(4.5)
    expect(sample!.titleSize, theme.path).toBeGreaterThanOrEqual(14)
    expect(sample!.chipWrap, theme.path).toBe("nowrap")
    if (width === 1280) expect(sample!.titleSpace, theme.path).toBe("nowrap")
    if (sample!.shortSpace != null) {
      expect(sample!.shortSpace, theme.path).toBe("nowrap")
      expect(sample!.shortWrap, theme.path).not.toBe("anywhere")
    }
      if (theme.scheme === "light") {
        expect(sample!.fillLuminance, theme.path).toBeGreaterThan(0.75)
      }
    }
    if (testInfo.project.name === "firefox") continue
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole("gridcell", { name: /Wednesday November 18/ }).click()
    const phoneResults = await new AxeBuilder({ page }).include("[data-month-view]").analyze()
    expect(phoneResults.violations, `${theme.path} 390`).toEqual([])
    await page.setViewportSize({ width: 1280, height: 800 })
    const desktopResults = await new AxeBuilder({ page }).include("[data-month-view]").analyze()
    expect(desktopResults.violations, `${theme.path} 1280`).toEqual([])
  }
})

test("home, end, and page keys move through the month", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Key map runs once on Chromium")
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  const start = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await start.focus()
  await page.keyboard.press("PageDown")
  await expect(page.getByRole("heading", { name: "December 2026" })).toBeVisible()
  await expect(page.getByRole("gridcell", { name: /Friday December 18/ })).toBeFocused()
  await page.keyboard.press("PageUp")
  await expect(page.getByRole("gridcell", { name: /Wednesday November 18/ })).toBeFocused()
  await page.keyboard.press("Home")
  await expect(page.getByRole("gridcell", { name: /Sunday November 15/ })).toBeFocused()
  await page.keyboard.press("End")
  await expect(page.getByRole("gridcell", { name: /Saturday November 21/ })).toBeFocused()
  await page.keyboard.press("Control+Home")
  await expect(page.getByRole("gridcell", { name: /Sunday November 1, no events/ })).toBeFocused()
  await page.keyboard.press("Control+End")
  await expect(page.getByRole("gridcell", { name: /Monday November 30/ })).toBeFocused()
})

test("the month grid fills the width without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Width matrix runs once on Chromium")
  for (const width of [320, 390, 768, 1280, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 })
    await openMonth(page)
    expect(await pageOverflow(page), `overflow at ${width}`).toBeLessThanOrEqual(1)
    const grid = page.locator(".month-grid")
    await expect(grid).toBeVisible()
    const gridBox = await grid.boundingBox()
    const viewBox = await page.locator(".month-view").boundingBox()
    expect(gridBox?.width ?? 0).toBeGreaterThan((viewBox?.width ?? 1) * 0.85)
    if (width >= 768 && width <= 1920) {
      expect(gridBox?.width ?? 0).toBeGreaterThan(width * 0.75)
    }
    if (width >= 1280) {
      expect(gridBox?.height ?? 0).toBeGreaterThan(420)
    }
    if (width === 2560) {
      expect(gridBox?.width ?? 0).toBeGreaterThan(1400)
      expect(gridBox?.width ?? 0).toBeLessThan(2000)
      const left = gridBox?.x ?? 0
      const right = width - ((gridBox?.x ?? 0) + (gridBox?.width ?? 0))
      expect(Math.abs(left - right)).toBeLessThan(48)
    }
  }
})

test("a multi-day stay is one bar that wraps at the week", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto("/review?screen=vietnam", { waitUntil: "domcontentloaded" })
    await waitUntilInteractive(page)
    await expect(page.getByRole("heading", { name: "June 2027" })).toBeVisible()
    const bars = page.locator(".month-bar", { hasText: "Old Quarter apartment" })
    await expect(bars).toHaveCount(2)
    const first = await bars.nth(0).boundingBox()
    const friday = await page.getByRole("gridcell", { name: /Friday June 11/ }).boundingBox()
    expect(first?.width ?? 0).toBeGreaterThan((friday?.width ?? 0) * 1.5)
    const flight = page.locator(".month-chip:visible", { hasText: width === 390 ? "SFO→HAN" : "SFO to HAN" })
    await expect(flight).toBeVisible()
    if (width === 1440) {
      await expect(flight).toContainText("Flight")
      await expect(flight).toContainText("SFO to HAN")
    } else {
      await expect(page.locator('.month-day__chips[data-date="2027-06-11"]')).toHaveAttribute("data-fit", "label")
      const short = page.locator('.month-day__chips[data-date="2027-06-11"] .month-chip').first().locator(".month-chip__route:visible, .month-chip__short:visible")
      await expect(short).toHaveText(/^SFO→/)
      expect(await brokenWord(short)).toBe("")
      expect(await visibleLetters(short)).toBeGreaterThan(2)
      const lantern = page.locator('.month-day__chips[data-date="2027-06-20"] .month-chip__short')
      await expect(lantern).toHaveText("Lantern")
      expect(await brokenWord(lantern)).toBe("")
      expect(await visibleLetters(lantern)).toBeGreaterThan(2)
      const market = page.locator('.month-day__chips[data-date="2027-06-26"] .month-chip__short')
      await expect(market).toHaveText("Ben Thanh")
      expect(await brokenWord(market)).toBe("")
      expect(await visibleLetters(market)).toBeGreaterThan(2)
      const train = page.locator('.month-day__chips[data-date="2027-06-12"] .month-chip__short')
      await expect(train).toHaveText("Train")
      expect(await brokenWord(train)).toBe("")
      expect(await visibleLetters(train)).toBeGreaterThan(2)
      await expect(page.locator(".month-chip__dot:visible")).toHaveCount(0)
    }
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
  }
})

test("a column too narrow for three letters shows a count instead of a fragment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const install = () => {
      if (document.getElementById("chip-test-size")) return
      const style = document.createElement("style")
      style.id = "chip-test-size"
      style.textContent = ".month-chip { font-size: 28px !important; letter-spacing: 0.3em !important; }"
      ;(document.head ?? document.documentElement).appendChild(style)
    }
    if (document.head) install()
    document.addEventListener("DOMContentLoaded", install)
  })
  await openMonth(page)
  const column = page.locator('.month-day__chips[data-date="2026-11-18"]')
  await expect(column.locator(".month-squeeze")).toBeVisible()
  await expect(column.locator(".month-chip:visible")).toHaveCount(0)
  await expect(column.locator(".month-squeeze__count")).toHaveText("3")
  const bars = column.locator(".month-squeeze__bar")
  await expect(bars).toHaveCount(2)
  const day = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await expect(day).toHaveAccessibleName(/Flight SFO to LIS/)
  await expect(day).toHaveAccessibleName(/Activity Dinner/)
  await expect(day).toHaveAccessibleName(/Activity Tram 28/)
  const rail = await bars.first().evaluate((element) => {
    const bar = getComputedStyle(element)
    const plate = getComputedStyle(element.parentElement ?? element)
    return { bar: bar.backgroundColor, plate: plate.backgroundColor, height: element.getBoundingClientRect().height }
  })
  expect(rail.bar).not.toBe(rail.plate)
  expect(rail.height).toBeGreaterThanOrEqual(3)
  await expect(page.locator(".month-bar", { hasText: "Alfama apartment" }).first()).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("add something stays above the composer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Dock clearance runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 700 })
  await openMonth(page)
  await page.getByRole("gridcell", { name: /Wednesday November 18/ }).click()
  const add = page.getByRole("button", { name: "Add something", exact: true })
  await add.evaluate((element) => {
    const scroller = element.closest("[data-trip-scroll]")
    const button = document.querySelector(".add-trip")
    if (!(scroller instanceof HTMLElement) || !(button instanceof HTMLElement)) return
    const delta = element.getBoundingClientRect().bottom - (button.getBoundingClientRect().top - 8)
    if (delta > 0) scroller.scrollTop += delta
  })
  const addBox = await add.boundingBox()
  const fab = await page.getByRole("button", { name: "Add to the trip" }).boundingBox()
  expect(addBox?.y ?? 0).toBeGreaterThanOrEqual(0)
  expect((addBox?.y ?? 0) + (addBox?.height ?? 0)).toBeLessThanOrEqual((fab?.y ?? 0) + 1)
  const card = page.locator(".month-detail .plan-card").last()
  const overlap = await card.evaluate((element) => {
    const button = element.closest(".month-detail")?.querySelector(".month-add")
    if (!(button instanceof HTMLElement)) return 99
    const cardRect = element.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    return Math.max(0, Math.min(cardRect.bottom, buttonRect.bottom) - Math.max(cardRect.top, buttonRect.top))
  })
  expect(overlap).toBeLessThan(1)
})

test("text spacing does not overflow the month", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Text spacing runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const style = document.createElement("style")
    style.textContent = `
      * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
      p { margin-bottom: 2em !important; }
    `
    document.head.appendChild(style)
  })
  await openMonth(page)
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("tapping a day on a phone reveals its plans and moves focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openMonth(page)
  await page.getByRole("gridcell", { name: /Wednesday November 18/ }).click()
  const panel = page.locator(".month-detail")
  await expect(panel).toBeFocused()
  const revealed = await page.evaluate(() => {
    const detail = document.querySelector(".month-detail")
    const scroller = document.querySelector("[data-trip-scroll]")
    const toolbar = document.querySelector("[data-trip-toolbar]")
    const card = detail?.querySelector(".plan-card")
    const add = detail?.querySelector(".month-add")
    if (
      !(detail instanceof HTMLElement) ||
      !(scroller instanceof HTMLElement) ||
      !(card instanceof HTMLElement) ||
      !(add instanceof HTMLElement)
    ) {
      return null
    }
    const stickyToolbar =
      toolbar instanceof HTMLElement && getComputedStyle(toolbar).position === "sticky"
    const visibleTop = stickyToolbar
      ? toolbar.getBoundingClientRect().bottom
      : scroller.getBoundingClientRect().top
    const visibleBottom = scroller.getBoundingClientRect().bottom
    const cardRect = card.getBoundingClientRect()
    const addRect = add.getBoundingClientRect()
    const overlap = Math.max(0, Math.min(cardRect.bottom, addRect.bottom) - Math.max(cardRect.top, addRect.top))
    return { cardTop: cardRect.top, visibleTop, visibleBottom, overlap }
  })
  expect(revealed).not.toBeNull()
  expect(revealed!.cardTop).toBeGreaterThanOrEqual(revealed!.visibleTop - 1)
  expect(revealed!.cardTop).toBeLessThan(revealed!.visibleBottom)
  expect(revealed!.overlap).toBeLessThan(1)

  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto("/review?screen=timing", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.getByRole("button", { name: "Month", exact: true }).click()
  await page.getByRole("gridcell", { name: /Saturday June 12/ }).click()
  const dayPanel = page.locator(".month-detail")
  await expect(dayPanel).toBeFocused()
  const airbnb = dayPanel.getByRole("button", { name: /Airbnb/ })
  await expect(airbnb).toBeVisible()
  const covered = await airbnb.evaluate((card) => {
    const add = card.closest(".month-detail")?.querySelector(".month-add")
    const scroller = document.querySelector("[data-trip-scroll]")
    if (!(add instanceof HTMLElement) || !(scroller instanceof HTMLElement)) return { overlap: 99, inView: false }
    const cardRect = card.getBoundingClientRect()
    const addRect = add.getBoundingClientRect()
    const overlap = Math.max(0, Math.min(cardRect.bottom, addRect.bottom) - Math.max(cardRect.top, addRect.top))
    const view = scroller.getBoundingClientRect()
    return { overlap, inView: cardRect.top < view.bottom && cardRect.bottom > view.top }
  })
  expect(covered.inView).toBe(true)
  expect(covered.overlap).toBeLessThan(1)
})

test("month view does not animate when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openMonth(page)
  const motion = await page.locator("[data-month-view]").evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })
  expect(motion.name === "none" || motion.duration === "0s" || motion.duration.startsWith("0.01")).toBe(true)
})
