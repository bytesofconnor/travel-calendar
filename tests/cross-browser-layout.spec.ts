import { expect, test, type Page } from "@playwright/test"

const coreScreens = [
  { id: "landing", path: "/", ready: "Continue with Google" },
  { id: "join-link", path: "/?join=ab12cd34ef56", ready: "Invite ab12cd34ef56 is ready" },
  { id: "trip-list", path: "/review?screen=trips", ready: "Your trips" },
  { id: "trip", path: "/review?screen=trip", ready: "Lisbon with you" },
  { id: "today", path: "/review?screen=today", ready: "on for today" },
  { id: "add", path: "/review?screen=add", ready: "Add an activity" },
  { id: "edit", path: "/review?screen=edit", ready: "Edit activity" },
  { id: "edit-trip", path: "/review?screen=edit-trip", ready: "Edit trip details" },
  { id: "invite", path: "/review?screen=invite", ready: "https://www.travelcalendar.space/?join=ab12cd34ef56" },
  { id: "join", path: "/review?screen=join", ready: "Join trip" },
  { id: "create", path: "/review?screen=create", ready: "Create trip" },
  { id: "theme", path: "/review?screen=theme", ready: "Golden Hour" },
  { id: "confirm", path: "/review?screen=confirm", ready: "Alex proposed Time Out Market" },
] as const

const themePacks = ["golden-hour", "dusk-rose", "coastal-infra", "sage-coast"] as const

const phoneProjects = new Set(["mobile-webkit", "mobile-se", "android-chrome"])

function watchProblems(page: Page) {
  const problems: string[] = []
  page.on("console", (message) => {
    const text = message.text()
    const url = message.location().url ?? ""
    if (url.includes("/_vercel/") || text.includes("/_vercel/")) return
    if (text.startsWith("Failed to load resource")) return
    if (text.includes("Viewport argument key \"interactive-widget\" not recognized")) return
    if (message.type() === "error" || /hydration/i.test(text)) problems.push(text)
  })
  page.on("response", (response) => {
    if (response.status() < 400) return
    if (response.url().includes("/_vercel/")) return
    problems.push(`${response.status()} ${response.url()}`)
  })
  page.on("pageerror", (error) => problems.push(error.message))
  return problems
}

async function audit(page: Page, safeTop: number, safeBottom: number) {
  return page.evaluate(
    ({ safeTop, safeBottom }) => {
      const violations: string[] = []
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      const extra = document.documentElement.scrollWidth - viewportWidth
      if (extra > 1) violations.push(`page scrolls sideways by ${extra}px`)

      const tapSelector = [
        "button",
        "input",
        "textarea",
        "select",
        "[role='button']",
        "[role='tab']",
        "[role='menuitem']",
        "[role='menuitemradio']",
      ].join(",")

      function labelOf(element: Element) {
        const aria = element.getAttribute("aria-label")
        if (aria) return aria
        const text = (element.textContent ?? "").replace(/\s+/g, " ").trim()
        if (text) return text.slice(0, 48)
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          return element.id || element.name || element.type
        }
        return element.tagName.toLowerCase()
      }

      function isVisible(element: HTMLElement) {
        const style = getComputedStyle(element)
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false
        if (style.pointerEvents === "none") return false
        if (element.closest("[inert], [aria-hidden='true']")) return false
        const box = element.getBoundingClientRect()
        return box.width >= 8 && box.height >= 8
      }

      function shownBox(element: HTMLElement) {
        const raw = element.getBoundingClientRect()
        let left = raw.left
        let right = raw.right
        let top = raw.top
        let bottom = raw.bottom
        let node = element.parentElement
        while (node && node !== document.documentElement) {
          const style = getComputedStyle(node)
          const host = node.getBoundingClientRect()
          const clipsX = style.overflowX === "hidden" || style.overflowX === "clip" || style.overflowX === "auto" || style.overflowX === "scroll"
          const clipsY = style.overflowY === "hidden" || style.overflowY === "clip" || style.overflowY === "auto" || style.overflowY === "scroll"
          if (clipsX) {
            left = Math.max(left, host.left)
            right = Math.min(right, host.right)
          }
          if (clipsY) {
            top = Math.max(top, host.top)
            bottom = Math.min(bottom, host.bottom)
          }
          node = node.parentElement
        }
        left = Math.max(left, 0)
        right = Math.min(right, viewportWidth)
        top = Math.max(top, 0)
        bottom = Math.min(bottom, viewportHeight)
        return {
          left,
          right,
          top,
          bottom,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        }
      }

      function clippedBy(element: HTMLElement) {
        const box = element.getBoundingClientRect()
        let revealedX = false
        let revealedY = false
        let hiddenX = false
        let hiddenY = false
        let node = element.parentElement
        while (node) {
          const style = getComputedStyle(node)
          const host = node.getBoundingClientRect()
          const overX = box.left < host.left - 1 || box.right > host.right + 1
          const overY = box.top < host.top - 1 || box.bottom > host.bottom + 1
          const scrollableX = (style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth + 1 && node.clientWidth + 1 >= box.width
          const scrollableY = (style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1 && node.clientHeight + 1 >= box.height
          if (overX && scrollableX) revealedX = true
          if (overY && scrollableY) revealedY = true
          const hardX = style.overflowX === "hidden" || style.overflowX === "clip" || ((style.overflowX === "auto" || style.overflowX === "scroll") && !scrollableX)
          const hardY = style.overflowY === "hidden" || style.overflowY === "clip" || ((style.overflowY === "auto" || style.overflowY === "scroll") && !scrollableY)
          if (overX && hardX) hiddenX = true
          if (overY && hardY) hiddenY = true
          node = node.parentElement
        }
        if ((hiddenX && !revealedX) || (hiddenY && !revealedY)) return "a parent that cannot scroll to it"
        return null
      }

      const controls = [...document.querySelectorAll<HTMLElement>(tapSelector)].filter(isVisible)

      for (const control of controls) {
        const box = control.getBoundingClientRect()
        const name = labelOf(control)
        const style = getComputedStyle(control)
        const tag = control.tagName
        const role = control.getAttribute("role")
        const isField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        const text = (control.innerText || "").replace(/\s+/g, " ").trim()
        const iconSized = !isField && text.length === 0
        if (box.height < 43.5) violations.push(`${name} is ${Math.round(box.height)}px tall`)
        if (iconSized && box.width < 43.5) violations.push(`${name} is ${Math.round(box.width)}px wide`)
        if ((box.left < -1 || box.right > viewportWidth + 1) && clippedBy(control)) {
          violations.push(`${name} runs off the side of the window`)
        }
        if (!isField && (role === "menuitem" || role === "menuitemradio" || tag === "BUTTON" || role === "button" || role === "tab")) {
          const clip = clippedBy(control)
          if (clip) violations.push(`${name} is clipped by ${clip}`)
        }
        if (viewportWidth < 768 && isField) {
          const fontSize = Number.parseFloat(style.fontSize)
          if (fontSize < 16) violations.push(`${name} text is ${fontSize}px, so iOS will zoom the page`)
        }
      }

      for (let i = 0; i < controls.length; i += 1) {
        const a = controls[i]
        for (let j = i + 1; j < controls.length; j += 1) {
          const b = controls[j]
          if (a.contains(b) || b.contains(a)) continue
          const boxA = shownBox(a)
          const boxB = shownBox(b)
          if (boxA.width < 8 || boxA.height < 8 || boxB.width < 8 || boxB.height < 8) continue
          const width = Math.min(boxA.right, boxB.right) - Math.max(boxA.left, boxB.left)
          const height = Math.min(boxA.bottom, boxB.bottom) - Math.max(boxA.top, boxB.top)
          if (width <= 1 || height <= 1) continue
          const area = width * height
          const smaller = Math.min(boxA.width * boxA.height, boxB.width * boxB.height)
          if (area > 16 && area > smaller * 0.15) {
            violations.push(`${labelOf(a)} overlaps ${labelOf(b)}`)
          }
        }
      }

      for (const dialog of document.querySelectorAll<HTMLElement>("[data-slot=dialog-content], [data-slot=sheet-content], [data-slot=dropdown-menu-content]")) {
        if (!isVisible(dialog)) continue
        const box = dialog.getBoundingClientRect()
        const name = dialog.getAttribute("data-slot") ?? "overlay"
        if (box.left < -1 || box.right > viewportWidth + 1) violations.push(`${name} runs off the side`)
        if (name === "sheet-content") {
          if (box.top < -2 || box.bottom > viewportHeight + 2) violations.push(`${name} runs off the screen`)
        } else {
          const scrolls = dialog.scrollHeight > dialog.clientHeight + 1 && (getComputedStyle(dialog).overflowY === "auto" || getComputedStyle(dialog).overflowY === "scroll")
          if (!scrolls && (box.top < safeTop - 1 || box.bottom > viewportHeight - safeBottom + 2)) {
            violations.push(`${name} misses the safe area`)
          }
        }
        const title = dialog.querySelector<HTMLElement>("[data-slot=dialog-title], [data-slot=sheet-title]")
        const close = [...dialog.querySelectorAll<HTMLElement>("button")].find((button) => labelOf(button) === "Close")
        if (title && close && isVisible(close)) {
          const closeBox = close.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(title)
          for (const textBox of range.getClientRects()) {
            const overlap = Math.min(textBox.right, closeBox.right) - Math.max(textBox.left, closeBox.left)
            const vertical = Math.min(textBox.bottom, closeBox.bottom) - Math.max(textBox.top, closeBox.top)
            if (overlap > 2 && vertical > 2) {
              violations.push(`${labelOf(title)} runs under Close`)
              break
            }
          }
        }
      }

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      for (const input of document.querySelectorAll<HTMLInputElement>("input[type=date]")) {
        if (!isVisible(input)) continue
        const box = input.getBoundingClientRect()
        const style = getComputedStyle(input)
        const name = input.labels?.[0]?.textContent?.trim() || input.id || "Date"
        if (box.height < 43.5) violations.push(`${name} date field is ${Math.round(box.height)}px tall`)
        const appearance = style.appearance || style.webkitAppearance
        if (appearance === "none" || appearance === "textfield") {
          violations.push(`${name} date field has no picker`)
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.value)) violations.push(`${name} date field is blank`)
        if (input.scrollWidth > input.clientWidth + 1) violations.push(`${name} date text is clipped inside the field`)
        const cell = input.parentElement
        if (cell) {
          const cellBox = cell.getBoundingClientRect()
          if (box.left < cellBox.left - 1 || box.right > cellBox.right + 1) {
            violations.push(`${name} date field leaves its column`)
          }
        }
        const clip = clippedBy(input)
        if (clip) violations.push(`${name} date field is clipped by ${clip}`)
        if (context) {
          context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
          const [year, month, day] = input.value.split("-")
          const samples = year
            ? [`${month}/${day}/${year}`, `${Number(month)}/${Number(day)}/${year}`, `${day}/${month}/${year}`, `${year}-${month}-${day}`]
            : ["mm/dd/yyyy"]
          const text = Math.max(...samples.map((sample) => context.measureText(sample).width))
          const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
          const needed = text + padding + 28
          if (input.clientWidth + 1 < needed) {
            violations.push(`${name} date field is ${Math.round(input.clientWidth)}px wide and needs ${Math.round(needed)}px`)
          }
        }
      }

      function parseColor(value: string) {
        const match = value.match(/rgba?\(([^)]+)\)/)
        if (!match) return null
        const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number)
        if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null
        return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }
      }

      function channel(value: number) {
        const scaled = value / 255
        return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
      }

      function contrast(foreground: string, background: { r: number; g: number; b: number }) {
        const ink = parseColor(foreground)
        if (!ink) return null
        const lum = (color: { r: number; g: number; b: number }) =>
          0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
        const lighter = Math.max(lum(ink), lum(background))
        const darker = Math.min(lum(ink), lum(background))
        return (lighter + 0.05) / (darker + 0.05)
      }

      function paintBehind(element: HTMLElement) {
        let node: HTMLElement | null = element
        while (node) {
          const parsed = parseColor(getComputedStyle(node).backgroundColor)
          if (parsed && parsed.a >= 0.9) return parsed
          node = node.parentElement
        }
        return { r: 255, g: 255, b: 255, a: 1 }
      }

      for (const sample of document.querySelectorAll<HTMLElement>(".plan-card__title, .trip-cover__title, .create-join__title, .btn-together, [data-slot=dropdown-menu-content] [role=menuitemradio]")) {
        if (!isVisible(sample)) continue
        const style = getComputedStyle(sample)
        const ratio = contrast(style.color, paintBehind(sample))
        if (ratio == null) continue
        const fontSize = Number.parseFloat(style.fontSize)
        const bold = Number.parseInt(style.fontWeight, 10) >= 700
        const large = fontSize >= 24 || (bold && fontSize >= 18.67)
        const minimum = large ? 3 : 4.5
        if (ratio < minimum) {
          violations.push(`${labelOf(sample)} contrast is ${ratio.toFixed(2)} on ${document.documentElement.dataset.theme || "default"}`)
        }
      }

      if (safeTop > 0) {
        const brand = document.querySelector<HTMLElement>(".create-join__brand, .trip-cover__brand, .create-join__mast-bar")
        if (brand && isVisible(brand)) {
          const top = brand.getBoundingClientRect().top
          if (top < safeTop - 1) violations.push(`title sits ${Math.round(safeTop - top)}px under the notch`)
        }
        const scroller = document.querySelector<HTMLElement>(".story-scroll")
        const chrome = document.querySelector<HTMLElement>(".story-chrome-sticky")
        if (scroller && chrome && getComputedStyle(chrome).position === "sticky") {
          const port = scroller.getBoundingClientRect().top
          scroller.scrollTop = Math.max(scroller.scrollHeight, 800)
          const stuck = chrome.getBoundingClientRect().top
          if (stuck < port + safeTop - 1) {
            violations.push(`trip header sticks under the notch at ${Math.round(stuck)}px`)
          } else if (scroller.scrollTop > 80 && Math.abs(stuck - (port + safeTop)) > 2) {
            violations.push(`trip header sticks at ${Math.round(stuck)}px instead of the ${safeTop}px notch`)
          }
          scroller.scrollTop = 0
        }
        for (const control of document.querySelectorAll<HTMLElement>(".add-trip, [data-slot=sheet-content] button")) {
          if (!isVisible(control)) continue
          const shown = shownBox(control)
          if (shown.height < 8) continue
          if (shown.bottom > viewportHeight - safeBottom + 1) {
            violations.push(`${labelOf(control)} sits under the home indicator`)
          }
        }
      }

      return violations
    },
    { safeTop, safeBottom },
  )
}

test("core screens hold in this browser", async ({ page }, testInfo) => {
  const problems = watchProblems(page)
  const viewport = page.viewportSize()
  expect(viewport).toBeTruthy()
  const phone = phoneProjects.has(testInfo.project.name) || viewport!.width < 500
  await page.emulateMedia({ reducedMotion: "reduce" })
  const failures: string[] = []

  for (const screen of coreScreens) {
    await page.goto(screen.path, { waitUntil: "domcontentloaded" })
    await page.addStyleTag({
      content: "*,*::before,*::after{animation:none !important;transition:none !important;}",
    })
    await expect(page.getByText(screen.ready, { exact: false }).first()).toBeVisible()
    const violations = await audit(page, 0, 0)
    failures.push(...violations.map((violation) => `${screen.id}: ${violation}`))

    if (screen.id === "trip") {
      for (const pack of themePacks) {
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme
        }, pack)
        const themed = await audit(page, 0, 0)
        failures.push(
          ...themed
            .filter((violation) => violation.includes("contrast"))
            .map((violation) => `${screen.id} ${pack}: ${violation}`),
        )
      }
      await page.evaluate(() => {
        delete document.documentElement.dataset.theme
      })
    }

    if (phone && (screen.id === "landing" || screen.id === "join" || screen.id === "create" || screen.id === "trip" || screen.id === "today" || screen.id === "trip-list" || screen.id === "add" || screen.id === "edit" || screen.id === "edit-trip" || screen.id === "invite")) {
      await page.addStyleTag({
        content: ":root{--safe-top:47px !important;--safe-right:0px !important;--safe-bottom:34px !important;--safe-left:0px !important;}",
      })
      const withNotch = await audit(page, 47, 34)
      failures.push(
        ...withNotch
          .filter((violation) => /notch|safe area|home indicator/.test(violation))
          .map((violation) => `${screen.id} safe area: ${violation}`),
      )
    }
  }

  if (phone) {
    await page.setViewportSize({ width: viewport!.width, height: 360 })
    await page.goto("/review?screen=today", { waitUntil: "domcontentloaded" })
    const add = page.getByRole("button", { name: "Add to the trip" })
    await expect(add).toBeVisible()
    const addBox = await add.boundingBox()
    expect(addBox!.y + addBox!.height).toBeLessThanOrEqual(361)
    const keyboard = await audit(page, 0, 0)
    failures.push(...keyboard.map((violation) => `today keyboard: ${violation}`))

    await page.setViewportSize({ width: viewport!.width, height: 520 })
    await page.goto("/review?screen=add")
    const where = page.getByLabel("Where")
    await where.focus()
    await expect(where).toBeInViewport()
    const whereBox = await where.boundingBox()
    const save = page.getByRole("button", { name: "Add activity" })
    const saveBox = await save.boundingBox()
    expect(whereBox!.y + whereBox!.height).toBeLessThanOrEqual((saveBox?.y ?? 520) + 1)
    const dates = await audit(page, 0, 0)
    failures.push(...dates.map((violation) => `add keyboard: ${violation}`))
  }

  expect(failures).toEqual([])
  expect(problems).toEqual([])
})
