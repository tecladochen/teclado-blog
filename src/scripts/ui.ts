let lastY = window.scrollY
let phraseTimer: number | undefined
let fieldRaf = 0
let fieldX = 0.72
let fieldY = 0.18
let fieldDirty = true

function scheduleField() {
  fieldDirty = true
  if (fieldRaf || reduceMotion() || document.hidden || document.documentElement.dataset.surface === 'read')
    return
  fieldRaf = window.requestAnimationFrame(() => {
    fieldRaf = 0
    if (!fieldDirty)
      return
    fieldDirty = false
    const canvas = document.querySelector<HTMLCanvasElement>('[data-field]')
    if (canvas)
      drawField(canvas)
  })
}

function startField() {
  window.cancelAnimationFrame(fieldRaf)
  fieldRaf = 0
  fieldDirty = true
  if (document.documentElement.dataset.surface === 'read')
    return
  const canvas = document.querySelector<HTMLCanvasElement>('[data-field]')
  if (!canvas)
    return
  drawField(canvas)
  fieldDirty = false
}

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'day' ? 'day' : 'night'
}

function syncThemeLabel() {
  const label = document.querySelector<HTMLElement>('[data-theme-label]')
  if (label)
    label.textContent = currentTheme() === 'day' ? '纸' : '墨'
}

function markVisit() {
  const root = document.documentElement
  if (!root.dataset.visit) {
    const again = sessionStorage.getItem('teclado.visit') === '1'
    root.dataset.visit = again ? 'again' : 'first'
    sessionStorage.setItem('teclado.visit', '1')
  }
  if (!reduceMotion())
    root.classList.add('has-motion')
  else
    root.classList.remove('has-motion')
}

function onScroll() {
  const header = document.querySelector<HTMLElement>('[data-header]')
  const progress = document.querySelector<HTMLElement>('[data-progress]')
  const yPos = window.scrollY
  header?.classList.toggle('is-thin', yPos > 8)
  header?.classList.toggle('is-hidden', yPos > lastY && yPos > 90)
  lastY = yPos

  const article = document.querySelector<HTMLElement>('[data-article]')
  if (!progress)
    return
  if (!article) {
    progress.style.width = '0%'
    return
  }
  const rect = article.getBoundingClientRect()
  const total = Math.max(article.offsetHeight - window.innerHeight, 1)
  const passed = Math.min(Math.max(-rect.top, 0), total)
  progress.style.width = `${(passed / total) * 100}%`
}

function bindMagnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    if (reduceMotion())
      return
    el.onpointermove = (event) => {
      const rect = el.getBoundingClientRect()
      const dx = (event.clientX - rect.left - rect.width / 2) / 14
      const dy = (event.clientY - rect.top - rect.height / 2) / 18
      el.style.setProperty('--lift-x', `${dx}px`)
      el.style.setProperty('--lift-y', `${dy}px`)
    }
    el.onpointerleave = () => {
      el.style.removeProperty('--lift-x')
      el.style.removeProperty('--lift-y')
    }
  })
}

function placeNavInk(to?: HTMLElement | null) {
  const nav = document.querySelector<HTMLElement>('[data-nav]')
  const ink = document.querySelector<HTMLElement>('[data-nav-ink]')
  if (!nav || !ink)
    return
  const target = to ?? nav.querySelector<HTMLElement>('a[aria-current="page"]') ?? nav.querySelector('a')
  if (!target)
    return
  const navRect = nav.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  ink.style.setProperty('--ink-x', `${rect.left - navRect.left + 10}px`)
  ink.style.setProperty('--ink-w', `${Math.max(rect.width - 20, 12)}px`)
}

function bindNavInk() {
  const nav = document.querySelector<HTMLElement>('[data-nav]')
  if (!nav)
    return
  placeNavInk()
  nav.querySelectorAll('a').forEach((link) => {
    link.onpointerenter = () => placeNavInk(link)
  })
  nav.onpointerleave = () => placeNavInk()
}

function reveal() {
  const nodes = document.querySelectorAll<HTMLElement>('[data-reveal], .prose h2, .prose img')
  nodes.forEach((node) => {
    if (!node.hasAttribute('data-reveal'))
      node.setAttribute('data-reveal', '')
  })

  if (reduceMotion() || !('IntersectionObserver' in window)) {
    nodes.forEach(node => node.classList.add('is-in'))
    document.querySelectorAll('.timeline').forEach(node => node.classList.add('is-in'))
    return
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting)
        continue
      entry.target.classList.add('is-in')
      io.unobserve(entry.target)
    }
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })

  document.querySelectorAll<HTMLElement>('[data-reveal], .timeline').forEach((node) => {
    io.observe(node)
  })
}

function cyclePhrases() {
  if (phraseTimer)
    window.clearInterval(phraseTimer)

  const root = document.querySelector<HTMLElement>('[data-phrases]')
  const now = document.querySelector<HTMLElement>('[data-phrase]')
  if (!root || !now)
    return

  let phrases: string[] = []
  try {
    phrases = JSON.parse(root.dataset.phrases || '[]') as string[]
  }
  catch {
    phrases = []
  }
  if (phrases.length < 2 || reduceMotion())
    return

  let index = 0
  phraseTimer = window.setInterval(() => {
    index = (index + 1) % phrases.length
    now.classList.add('is-out')
    window.setTimeout(() => {
      now.textContent = phrases[index] ?? phrases[0]
      now.classList.remove('is-out')
    }, 380)
  }, 3400)
}

function applyTheme(next: 'day' | 'night') {
  document.documentElement.dataset.theme = next
  localStorage.setItem('theme', next)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta)
    meta.setAttribute('content', next === 'day' ? '#ebe4d6' : '#131210')
  syncThemeLabel()
  startField()
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

function toggleTheme(origin?: HTMLElement | null) {
  const next = currentTheme() === 'night' ? 'day' : 'night'
  const doc = document as ViewTransitionDoc
  const canSwap = !reduceMotion() && typeof doc.startViewTransition === 'function' && origin

  if (!canSwap || !origin) {
    applyTheme(next)
    return
  }

  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const root = document.documentElement
  root.style.setProperty('--reveal-x', `${x}px`)
  root.style.setProperty('--reveal-y', `${y}px`)
  root.style.setProperty('--reveal-r', `${end}px`)
  root.classList.add('theme-swap')
  const transition = doc.startViewTransition!(() => applyTheme(next))
  transition.finished.finally(() => root.classList.remove('theme-swap'))
}

function drawField(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const cell = 28
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const px = fieldX * width
  const py = fieldY * height
  const day = document.documentElement.dataset.theme === 'day'

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * cell
      const y = row * cell
      const dist = Math.hypot(x - px, y - py)
      const glow = Math.max(0, 1 - dist / 420)
      const alpha = 0.03 + glow * 0.14
      ctx.globalAlpha = alpha
      ctx.fillStyle = glow > 0.22
        ? (day ? 'rgb(196, 59, 34)' : 'rgb(226, 76, 44)')
        : (day ? 'rgb(26, 22, 18)' : 'rgb(242, 236, 227)')
      ctx.beginPath()
      ctx.arc(x, y, glow > 0.08 ? 1.15 : 0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

let x = window.innerWidth * 0.7
let y = 120
let tx = x
let ty = y

function loopCursor() {
  if (reduceMotion())
    return
  x += (tx - x) * 0.18
  y += (ty - y) * 0.18
  const cursor = document.querySelector<HTMLElement>('[data-cursor]')
  const cursorDot = document.querySelector<HTMLElement>('[data-cursor-dot]')
  cursor?.style.setProperty('--cx', `${x}px`)
  cursor?.style.setProperty('--cy', `${y}px`)
  cursorDot?.style.setProperty('--cx', `${tx}px`)
  cursorDot?.style.setProperty('--cy', `${ty}px`)
  requestAnimationFrame(loopCursor)
}

function bindOnce() {
  const g = globalThis as typeof globalThis & { __tecladoUi?: boolean }
  if (g.__tecladoUi)
    return
  g.__tecladoUi = true

  document.addEventListener('click', (event) => {
    const toggle = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-theme-toggle]')
    if (!toggle)
      return
    toggleTheme(toggle)
  })

  window.addEventListener('pointermove', (event) => {
    tx = event.clientX
    ty = event.clientY
    fieldX = event.clientX / Math.max(window.innerWidth, 1)
    fieldY = event.clientY / Math.max(window.innerHeight, 1)
    document.body.style.setProperty('--lamp-x', `${event.clientX}px`)
    document.body.style.setProperty('--lamp-y', `${event.clientY}px`)
    scheduleField()
    const overLink = (event.target as HTMLElement | null)?.closest('a, button')
    document.querySelector<HTMLElement>('[data-cursor]')?.classList.toggle('is-link', Boolean(overLink))
  }, { passive: true })

  window.addEventListener('pointerdown', () => {
    document.querySelector<HTMLElement>('[data-cursor]')?.classList.add('is-down')
  })
  window.addEventListener('pointerup', () => {
    document.querySelector<HTMLElement>('[data-cursor]')?.classList.remove('is-down')
  })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => {
    placeNavInk()
    startField()
  })
  document.addEventListener('astro:before-swap', (event) => {
    const next = (event as Event & { newDocument: Document }).newDocument.documentElement
    const current = document.documentElement
    next.dataset.theme = current.dataset.theme
    next.dataset.visit = current.dataset.visit === 'first' ? 'again' : (current.dataset.visit || 'again')
    next.classList.toggle('has-motion', current.classList.contains('has-motion'))
    const themeColor = next.querySelector('meta[name="theme-color"]')
    if (themeColor)
      themeColor.setAttribute('content', current.dataset.theme === 'day' ? '#ebe4d6' : '#131210')
  })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden)
      startField()
  })
  if (!reduceMotion())
    loopCursor()
}

function boot() {
  markVisit()
  bindOnce()
  syncThemeLabel()
  bindMagnetic()
  bindNavInk()
  reveal()
  cyclePhrases()
  onScroll()
  startField()
}

document.addEventListener('astro:page-load', boot)
boot()
