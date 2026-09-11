let lastY = window.scrollY

function currentTheme() {
  return document.documentElement.dataset.theme === 'day' ? 'day' : 'night'
}

function syncThemeLabel() {
  const label = document.querySelector<HTMLElement>('[data-theme-label]')
  if (label)
    label.textContent = currentTheme() === 'day' ? '纸' : '墨'
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

let x = window.innerWidth * 0.7
let y = 120
let tx = x
let ty = y

function loop() {
  x += (tx - x) * 0.18
  y += (ty - y) * 0.18
  const cursor = document.querySelector<HTMLElement>('[data-cursor]')
  const cursorDot = document.querySelector<HTMLElement>('[data-cursor-dot]')
  cursor?.style.setProperty('--cx', `${x}px`)
  cursor?.style.setProperty('--cy', `${y}px`)
  cursorDot?.style.setProperty('--cx', `${tx}px`)
  cursorDot?.style.setProperty('--cy', `${ty}px`)
  requestAnimationFrame(loop)
}

function bindOnce() {
  const g = globalThis as typeof globalThis & { __tecladoUi?: boolean }
  if (g.__tecladoUi)
    return
  g.__tecladoUi = true

  document.addEventListener('click', (event) => {
    const toggle = (event.target as HTMLElement | null)?.closest('[data-theme-toggle]')
    if (!toggle)
      return
    const next = currentTheme() === 'night' ? 'day' : 'night'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    syncThemeLabel()
  })

  window.addEventListener('pointermove', (event) => {
    tx = event.clientX
    ty = event.clientY
    document.body.style.setProperty('--lamp-x', `${event.clientX}px`)
    document.body.style.setProperty('--lamp-y', `${event.clientY}px`)
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
  loop()
}

function boot() {
  bindOnce()
  syncThemeLabel()
  bindMagnetic()
  onScroll()
}

document.addEventListener('astro:page-load', boot)
boot()
