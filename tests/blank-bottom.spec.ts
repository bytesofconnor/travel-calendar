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
    const button = document.querySelector(".add-trip")
    if (!(scroller instanceof HTMLElement) || !(button instanceof HTMLElement)) {
      throw new Error("trip shell is missing")
    }
    scroller.scrollTop = scroller.scrollHeight
    window.scrollTo(0, document.documentElement.scrollHeight)
    const doc = document.documentElement
    const buttonRect = button.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    const cards = [
      ...scroller.querySelectorAll(".plan-card, .month-view, .story-secondary, .arrive-row, .month-add"),
    ]
    let lastCardBottom = scrollerRect.top
    for (const card of cards) {
      lastCardBottom = Math.max(lastCardBottom, card.getBoundingClientRect().bottom)
    }
    const inset = Number.parseFloat(getComputedStyle(button).bottom)
    return {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      composerBottom: buttonRect.bottom + window.scrollY,
      scrollerClient: scroller.clientHeight,
      scrollerBottom: scrollerRect.bottom,
      dockTop: buttonRect.top,
      buttonBottom: buttonRect.bottom,
      buttonHeight: buttonRect.height,
      lastCardBottom,
      inset,
    }
  })
}

test.describe("a stuck safe area cannot blank the trip under the add button", () => {
  test.skip(({ browserName }) => browserName === "firefox", "Phone and desktop Chromium cover this shell")

  test("List, Month, and Today keep the last plan above the add button", async ({ page }, testInfo) => {
    test.skip(!PHONE.has(testInfo.project.name) && testInfo.project.name !== "chromium", "iPhone, Pixel, and desktop")
    const heights = testInfo.project.name === "chromium" ? [800] : [664, 844]
    const width = testInfo.project.name === "chromium" ? 1280 : 390
    for (const height of heights) {
      await page.setViewportSize({ width, height })
      for (const view of VIEWS) {
        await openView(page, view.path)
        await scrollToEnd(page)
        const box = await shell(page)
        expect(box.scrollHeight, `${view.name} ${width}x${height} document`).toBeLessThanOrEqual(box.clientHeight + 1)
        expect(box.scrollerClient, `${view.name} ${width}x${height} story`).toBeGreaterThan(120)
        expect(box.lastCardBottom, `${view.name} last plan above the add button`).toBeLessThanOrEqual(box.dockTop + 1)
        expect(box.buttonBottom, `${view.name} add button on screen`).toBeLessThanOrEqual(box.clientHeight + 1)
        expect(box.dockTop, `${view.name} add button stays low`).toBeGreaterThan(box.clientHeight * 0.35)
        expect(box.buttonHeight, `${view.name} add button`).toBeGreaterThanOrEqual(56)
      }
    }
  })

  test("a viewport-sized safe area cannot blank the screen under the add button", async ({ page }, testInfo) => {
    test.skip(!PHONE.has(testInfo.project.name), "iPhone and Pixel")
    for (const height of [664, 844]) {
      await page.setViewportSize({ width: 390, height })
      for (const view of VIEWS) {
        await openView(page, view.path)
        await page.addStyleTag({ content: ":root { --safe-bottom: 80vh !important; }" })
        await scrollToEnd(page)
        const box = await shell(page)
        expect(box.scrollHeight, `${view.name} ${height} document`).toBeLessThanOrEqual(box.clientHeight + 1)
        expect(box.scrollerClient, `${view.name} ${height} story`).toBeGreaterThan(160)
        expect(box.dockTop, `${view.name} ${height} add button`).toBeGreaterThan(box.clientHeight * 0.35)
        expect(box.clientHeight - box.buttonBottom, `${view.name} ${height} blank under the button`).toBeLessThan(
          box.clientHeight * 0.45,
        )
        expect(box.inset, `${view.name} ${height} inset cap`).toBeLessThan(120)
        expect(box.lastCardBottom, `${view.name} ${height} last plan`).toBeLessThanOrEqual(box.dockTop + 1)
      }
    }
  })

  test("the home-indicator inset still lifts the add button", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Safe area check runs on iPhone")
    await page.setViewportSize({ width: 390, height: 844 })
    await openView(page, "/review?screen=today&today=2026-11-20")
    await page.addStyleTag({ content: ":root { --safe-bottom: 34px !important; }" })
    const box = await shell(page)
    expect(box.inset).toBeGreaterThanOrEqual(34)
    expect(box.buttonBottom).toBeLessThanOrEqual(box.clientHeight - 34 + 1)
    expect(box.scrollerClient).toBeGreaterThan(200)
    expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight + 1)
  })

  test("the add button stays usable at 200% text and 400% zoom", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit" && testInfo.project.name !== "android-chrome", "Phone text and zoom")
    await page.setViewportSize({ width: 390, height: 844 })
    await openView(page, "/review?screen=today&today=2026-11-20")
    await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
    const large = await shell(page)
    expect(large.scrollerClient).toBeGreaterThan(80)
    expect(large.buttonHeight).toBeGreaterThanOrEqual(44)
    expect(large.buttonBottom).toBeLessThanOrEqual(large.clientHeight + 1)
    expect(large.scrollHeight).toBeLessThanOrEqual(large.clientHeight + 1)
    expect(large.lastCardBottom).toBeLessThanOrEqual(large.dockTop + 1)

    await page.evaluate(() => {
      document.documentElement.style.fontSize = "16px"
      document.documentElement.style.zoom = "4"
    })
    const zoomed = await page.evaluate(() => {
      const button = document.querySelector(".add-trip")
      const doc = document.documentElement
      if (!(button instanceof HTMLElement)) return null
      button.scrollIntoView({ block: "end" })
      const buttonRect = button.getBoundingClientRect()
      return {
        buttonHeight: buttonRect.height,
        buttonTop: buttonRect.top,
        buttonBottom: buttonRect.bottom,
        clientHeight: doc.clientHeight,
        scrollHeight: doc.scrollHeight,
        composerBottom: buttonRect.bottom + window.scrollY,
      }
    })
    expect(zoomed).not.toBeNull()
    expect(zoomed!.buttonHeight).toBeGreaterThan(20)
    expect(zoomed!.buttonTop).toBeLessThan(zoomed!.clientHeight)
    expect(zoomed!.buttonBottom).toBeGreaterThan(0)
    expect(zoomed!.scrollHeight).toBeLessThanOrEqual(Math.ceil(zoomed!.composerBottom) + 1)
  })
})
