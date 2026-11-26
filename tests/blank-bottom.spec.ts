import { expect, test, type Page } from "@playwright/test"

const PHONE = new Set(["mobile-webkit", "android-chrome"])

const VIEWS = [
  { name: "Today", path: "/review?screen=today&today=2026-11-20" },
  { name: "List", path: "/review?screen=trip&today=2026-10-01" },
  { name: "Month", path: "/review?screen=month&today=2026-11-20" },
] as const

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function openView(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await ready(page)
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => {
    const scroller = document.querySelector("[data-trip-scroll]")
    if (scroller instanceof HTMLElement) scroller.scrollTop = scroller.scrollHeight
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
}

async function shell(page: Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector("[data-trip-scroll]")
    const dock = document.querySelector(".capture-dock")
    const chips = document.querySelector(".capture-dock__chips")
    const field = document.querySelector(".capture-dock__field")
    if (
      !(scroller instanceof HTMLElement) ||
      !(dock instanceof HTMLElement) ||
      !(chips instanceof HTMLElement) ||
      !(field instanceof HTMLElement)
    ) {
      throw new Error("trip shell is missing")
    }
    scroller.scrollTop = scroller.scrollHeight
    window.scrollTo(0, document.documentElement.scrollHeight)
    const doc = document.documentElement
    const dockRect = dock.getBoundingClientRect()
    const chipRect = chips.getBoundingClientRect()
    const fieldRect = field.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    const cards = [
      ...scroller.querySelectorAll(".plan-card, .month-view, .story-secondary, .arrive-row, .month-add"),
    ]
    let lastCardBottom = scrollerRect.top
    for (const card of cards) {
      lastCardBottom = Math.max(lastCardBottom, card.getBoundingClientRect().bottom)
    }
    const paddingBottom = Number.parseFloat(getComputedStyle(dock).paddingBottom)
    return {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      composerBottom: dockRect.bottom + window.scrollY,
      scrollerClient: scroller.clientHeight,
      scrollerBottom: scrollerRect.bottom,
      dockTop: dockRect.top,
      chipTop: chipRect.top,
      chipBottom: chipRect.bottom,
      chipHeight: chipRect.height,
      fieldTop: fieldRect.top,
      fieldHeight: fieldRect.height,
      lastCardBottom,
      paddingBottom,
    }
  })
}

test.describe("the page does not scroll into empty space below the composer", () => {
  test.skip(({ browserName }) => browserName === "firefox", "Phone and desktop Chromium cover this shell")

  test("List, Month, and Today stay within the composer on a phone and a desktop window", async ({ page }, testInfo) => {
    test.skip(!PHONE.has(testInfo.project.name) && testInfo.project.name !== "chromium", "iPhone, Pixel, and desktop")
    const heights = testInfo.project.name === "chromium" ? [800] : [664, 844]
    const width = testInfo.project.name === "chromium" ? 1280 : 390
    for (const height of heights) {
      await page.setViewportSize({ width, height })
      for (const view of VIEWS) {
        await openView(page, view.path)
        await scrollToEnd(page)
        const box = await shell(page)
        expect(box.scrollHeight, `${view.name} ${width}x${height} document`).toBeLessThanOrEqual(
          Math.ceil(box.composerBottom) + 1,
        )
        expect(box.scrollerClient, `${view.name} ${width}x${height} story`).toBeGreaterThan(120)
        expect(box.scrollerBottom, `${view.name} story meets the composer`).toBeLessThanOrEqual(box.dockTop + 1)
        expect(box.lastCardBottom, `${view.name} last card above the composer`).toBeLessThanOrEqual(box.dockTop + 1)
        expect(box.lastCardBottom, `${view.name} last card still on screen`).toBeGreaterThan(box.dockTop - box.scrollerClient - 1)
        expect(box.chipBottom, `${view.name} chips on screen`).toBeLessThanOrEqual(box.clientHeight + 1)
        expect(box.chipTop, `${view.name} chips not stranded at the top`).toBeGreaterThan(box.clientHeight * 0.35)
        expect(box.fieldHeight, `${view.name} composer field`).toBeGreaterThan(40)
      }
    }
  })

  test("a viewport-sized safe area cannot blank the screen under the chips", async ({ page }, testInfo) => {
    test.skip(!PHONE.has(testInfo.project.name), "iPhone and Pixel")
    for (const height of [664, 844]) {
      await page.setViewportSize({ width: 390, height })
      for (const view of VIEWS) {
        await openView(page, view.path)
        await page.addStyleTag({ content: ":root { --safe-bottom: 80vh !important; }" })
        await scrollToEnd(page)
        const box = await shell(page)
        expect(box.scrollHeight, `${view.name} ${height} document`).toBeLessThanOrEqual(Math.ceil(box.composerBottom) + 1)
        expect(box.scrollerClient, `${view.name} ${height} story`).toBeGreaterThan(160)
        expect(box.chipTop, `${view.name} ${height} chips`).toBeGreaterThan(box.clientHeight * 0.35)
        expect(box.clientHeight - box.chipBottom, `${view.name} ${height} blank under the chips`).toBeLessThan(
          box.clientHeight * 0.45,
        )
        expect(box.paddingBottom, `${view.name} ${height} inset cap`).toBeLessThan(120)
        expect(box.lastCardBottom, `${view.name} ${height} last card`).toBeLessThanOrEqual(box.dockTop + 1)
      }
    }
  })

  test("the home-indicator inset still pads the composer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Safe area check runs on iPhone")
    await page.setViewportSize({ width: 390, height: 844 })
    await openView(page, "/review?screen=today&today=2026-11-20")
    await page.addStyleTag({ content: ":root { --safe-bottom: 34px !important; }" })
    const box = await shell(page)
    expect(box.paddingBottom).toBeGreaterThanOrEqual(34)
    expect(box.chipBottom).toBeLessThanOrEqual(box.clientHeight - 34 + 1)
    expect(box.scrollerClient).toBeGreaterThan(200)
    expect(box.scrollHeight).toBeLessThanOrEqual(Math.ceil(box.composerBottom) + 1)
  })

  test("the composer stays usable at 200% text and 400% zoom", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit" && testInfo.project.name !== "android-chrome", "Phone text and zoom")
    await page.setViewportSize({ width: 390, height: 844 })
    await openView(page, "/review?screen=today&today=2026-11-20")
    await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
    const large = await shell(page)
    expect(large.scrollerClient).toBeGreaterThan(80)
    expect(large.fieldHeight).toBeGreaterThan(44)
    expect(large.chipHeight).toBeGreaterThan(32)
    expect(large.chipBottom).toBeLessThanOrEqual(large.clientHeight + 1)
    expect(large.scrollHeight).toBeLessThanOrEqual(Math.ceil(large.composerBottom) + 1)
    expect(large.lastCardBottom).toBeLessThanOrEqual(large.dockTop + 1)

    await page.evaluate(() => {
      document.documentElement.style.fontSize = "16px"
      document.documentElement.style.zoom = "4"
    })
    const zoomed = await page.evaluate(() => {
      const field = document.querySelector(".capture-dock__field")
      const chips = document.querySelector(".capture-dock__chips")
      const dock = document.querySelector(".capture-dock")
      const doc = document.documentElement
      if (!(field instanceof HTMLElement) || !(chips instanceof HTMLElement) || !(dock instanceof HTMLElement)) return null
      dock.scrollIntoView({ block: "end" })
      const fieldRect = field.getBoundingClientRect()
      const chipRect = chips.getBoundingClientRect()
      const dockRect = dock.getBoundingClientRect()
      return {
        fieldHeight: fieldRect.height,
        chipHeight: chipRect.height,
        chipTop: chipRect.top,
        chipBottom: chipRect.bottom,
        clientHeight: doc.clientHeight,
        scrollHeight: doc.scrollHeight,
        composerBottom: dockRect.bottom + window.scrollY,
      }
    })
    expect(zoomed).not.toBeNull()
    expect(zoomed!.fieldHeight).toBeGreaterThan(20)
    expect(zoomed!.chipHeight).toBeGreaterThan(16)
    expect(zoomed!.chipTop).toBeLessThan(zoomed!.clientHeight)
    expect(zoomed!.chipBottom).toBeGreaterThan(0)
    expect(zoomed!.scrollHeight).toBeLessThanOrEqual(Math.ceil(zoomed!.composerBottom) + 1)
  })
})
