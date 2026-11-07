import { siteLifetimeConfig } from '~/.config/user'
import { mountXiaohei } from '~/scripts/companions/xiaohei'
import { getSiteDate, getSiteDays } from '~/utils/siteLifetime'

let ready = false
let cleanup: (() => void) | undefined

export function setupSiteCompanions() {
  if (ready)
    return
  ready = true
  document.addEventListener('astro:page-load', mountCompanions)
  window.addEventListener('pageshow', mountCompanions)
  window.addEventListener('pagehide', () => cleanup?.())
  mountCompanions()
}

function mountCompanions() {
  cleanup?.()
  const companions = Array.from(document.querySelectorAll<HTMLElement>('[data-site-companion]'))
  if (!companions.length)
    return

  const abort = new AbortController()
  const { signal } = abort
  const visible = new Set<HTMLElement>()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const xiaoheiCompanions = new Map<HTMLElement, ReturnType<typeof mountXiaohei>>()

  function syncMotion() {
    companions.forEach((companion) => {
      companion.dataset.paused = String(document.hidden || reducedMotion.matches || !visible.has(companion) || companion.dataset.userPaused === 'true')
    })
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const companion = entry.target as HTMLElement
      if (entry.isIntersecting)
        visible.add(companion)
      else
        visible.delete(companion)
    })
    syncMotion()
    if (entries.some(entry => entry.isIntersecting))
      updateDates()
  })

  companions.forEach((companion) => {
    companion.dataset.ready = 'true'
    observer.observe(companion)
    if (companion.dataset.variant === 'xiaohei')
      xiaoheiCompanions.set(companion, mountXiaohei(companion, signal))

    const pause = companion.querySelector<HTMLButtonElement>('[data-companion-pause]')
    pause?.addEventListener('click', () => {
      const paused = companion.dataset.userPaused !== 'true'
      companion.dataset.userPaused = String(paused)
      pause.setAttribute('aria-pressed', String(paused))
      pause.setAttribute('aria-label', `${paused ? '继续' : '暂停'}${pause.dataset.companionName ?? '小伙伴'}的动作`)
      pause.title = paused ? '继续动作' : '暂停动作'
      syncMotion()
    }, { signal })
  })

  function updateDates() {
    const now = new Date()
    const days = getSiteDays(siteLifetimeConfig.startedOn, now, siteLifetimeConfig.timeZone)
    const date = getSiteDate(now, siteLifetimeConfig.timeZone)
    companions.forEach((companion) => {
      if (!document.hidden && visible.has(companion))
        xiaoheiCompanions.get(companion)?.updateDate(date.iso)
      companion.querySelectorAll<HTMLElement>('[data-site-days]').forEach(label => label.textContent = days === null ? '' : String(days))
      const time = companion.querySelector<HTMLTimeElement>('[data-site-date]')
      if (time)
        time.dateTime = date.iso
      const monthDay = companion.querySelector('[data-site-month-day]')
      if (monthDay)
        monthDay.textContent = date.monthDay
      const weekday = companion.querySelector('[data-site-weekday]')
      if (weekday)
        weekday.textContent = date.weekdayYear
    })
  }

  document.addEventListener('visibilitychange', () => {
    syncMotion()
    if (!document.hidden)
      updateDates()
  }, { signal })
  reducedMotion.addEventListener('change', syncMotion, { signal })
  syncMotion()
  updateDates()
  const dailyTimer = window.setInterval(updateDates, 60000)
  cleanup = () => {
    abort.abort()
    observer.disconnect()
    window.clearInterval(dailyTimer)
    xiaoheiCompanions.forEach(xiaohei => xiaohei.dispose())
  }
}
