const header = document.querySelector<HTMLElement>('[data-header]')
const progress = document.querySelector<HTMLElement>('[data-progress]')
const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
const label = document.querySelector<HTMLElement>('[data-theme-label]')

let lastY = window.scrollY

function currentTheme() {
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day'
}

function syncThemeLabel() {
  if (label)
    label.textContent = currentTheme() === 'night' ? '夜' : '昼'
}

function onScroll() {
  const y = window.scrollY
  header?.classList.toggle('is-thin', y > 12)
  header?.classList.toggle('is-hidden', y > lastY && y > 80)
  lastY = y

  const article = document.querySelector<HTMLElement>('[data-article]')
  if (!progress || !article)
    return

  const rect = article.getBoundingClientRect()
  const total = article.offsetHeight - window.innerHeight
  const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1))
  progress.style.width = `${(passed / Math.max(total, 1)) * 100}%`
}

function onPointer(event: PointerEvent) {
  document.body.style.setProperty('--lamp-x', `${event.clientX}px`)
  document.body.style.setProperty('--lamp-y', `${event.clientY}px`)
}

toggle?.addEventListener('click', () => {
  const next = currentTheme() === 'night' ? 'day' : 'night'
  document.documentElement.dataset.theme = next
  localStorage.setItem('theme', next)
  syncThemeLabel()
})

window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('pointermove', onPointer, { passive: true })
document.addEventListener('astro:page-load', () => {
  syncThemeLabel()
  onScroll()
})

syncThemeLabel()
onScroll()
