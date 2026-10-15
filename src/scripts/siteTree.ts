import { siteLifetimeConfig } from '~/.config/user'
import { getSiteDays } from '~/utils/siteTree'

type TreeWindow = Window & { __tecladoTreesReady?: boolean }
let cleanup: (() => void) | undefined

export function setupSiteTrees() {
  const treeWindow = window as TreeWindow
  if (treeWindow.__tecladoTreesReady)
    return
  treeWindow.__tecladoTreesReady = true
  document.addEventListener('astro:page-load', mountTrees)
  mountTrees()
}

function mountTrees() {
  cleanup?.()
  const trees = Array.from(document.querySelectorAll<HTMLElement>('[data-site-tree]'))
  trees.forEach(tree => tree.hidden = false)
  const abort = new AbortController()
  const visible = new Set<HTMLElement>()
  function syncVisibility() {
    trees.forEach(tree => tree.dataset.paused = String(document.hidden || !visible.has(tree)))
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const tree = entry.target as HTMLElement
      if (entry.isIntersecting)
        visible.add(tree)
      else
        visible.delete(tree)
    })
    syncVisibility()
  })
  trees.forEach(tree => observer.observe(tree))
  document.addEventListener('visibilitychange', syncVisibility, { signal: abort.signal })

  // Refresh static builds at page load and when a new calendar day begins.
  function updateSiteDays() {
    const days = getSiteDays(siteLifetimeConfig.startedOn, new Date(), siteLifetimeConfig.timeZone)
    const label = document.querySelector('[data-site-days]')
    if (label && days !== null)
      label.textContent = String(days)
  }
  updateSiteDays()
  const dailyTimer = window.setInterval(updateSiteDays, 60000)
  cleanup = () => {
    abort.abort()
    observer.disconnect()
    window.clearInterval(dailyTimer)
  }
}
