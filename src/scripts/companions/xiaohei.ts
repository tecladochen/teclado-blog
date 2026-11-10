import type { XiaoheiAnimation } from '~/types/companion'
import { xiaoheiConfig } from '~/.config/user'
import { xiaoheiAnimations } from '~/assets/companions/xiaohei/catalog'
import { selectXiaoheiAnimation } from '~/utils/xiaoheiSelection'

const animationIds = xiaoheiAnimations.map(item => item.id)

/** The source cels play unchanged; greetings do not restart the animation. */
export function mountXiaohei(companion: HTMLElement, signal: AbortSignal) {
  const xiaohei = companion.querySelector<HTMLElement>('[data-xiaohei]')
  const touch = xiaohei?.querySelector<HTMLButtonElement>('[data-xiaohei-touch]')
  const pause = companion.querySelector<HTMLButtonElement>('[data-companion-pause]')
  const response = xiaohei?.querySelector<HTMLElement>('[data-xiaohei-response]')
  const character = xiaohei?.querySelector<HTMLElement>('[data-xiaohei-character]')
  const initialStrip = xiaohei?.querySelector<HTMLImageElement>('[data-xiaohei-strip]')
  const initialPoster = xiaohei?.querySelector<HTMLImageElement>('[data-xiaohei-poster]')
  if (!xiaohei || !touch || !response || !character || !initialStrip || !initialPoster)
    return { updateDate: (_date: string) => {}, dispose: () => {} }

  let strip = initialStrip
  let poster = initialPoster
  let active = xiaoheiAnimations.find(item => item.id === xiaohei.dataset.animationId)
  let pending: string | undefined
  let request = 0
  let greeting = 0
  let timer: number | undefined
  let disposed = false

  function updateDate(date: string) {
    // The preview URL is development-only; production follows the site config.
    const override = import.meta.env.DEV
      ? xiaohei!.dataset.animationOverride ?? new URLSearchParams(window.location.search).get('xiaohei')
      : null
    const id = override && animationIds.includes(override)
      ? override
      : selectXiaoheiAnimation(xiaoheiConfig, animationIds, date)
    const next = xiaoheiAnimations.find(item => item.id === id)
    if (next)
      loadAnimation(next)
  }

  function loadAnimation(next: XiaoheiAnimation) {
    if (disposed || next.id === pending)
      return
    const version = ++request
    pending = undefined
    if (next.id === active?.id) {
      // A remount can inherit the first images while decoding is still in progress.
      if (character!.dataset.loaded !== 'true') {
        void strip.decode().then(() => {
          if (!disposed && request === version)
            character!.dataset.loaded = 'true'
        }).catch(() => {})
      }
      return
    }
    pending = next.id
    const firstLoad = !active
    const nextStrip = strip.cloneNode(false) as HTMLImageElement
    const nextPoster = poster.cloneNode(false) as HTMLImageElement
    nextStrip.width = next.width * next.count
    nextStrip.height = next.height
    nextPoster.width = next.width
    nextPoster.height = next.height
    nextPoster.src = next.poster
    nextStrip.src = next.strip
    // Show the first poster as it loads. Later changes keep the current pose until both images are ready.
    if (firstLoad)
      showAnimation(next, nextStrip, nextPoster)
    const decoded = firstLoad ? nextStrip.decode() : Promise.all([nextStrip.decode(), nextPoster.decode()])
    void decoded.then(() => {
      if (disposed || version !== request)
        return
      if (!firstLoad)
        showAnimation(next, nextStrip, nextPoster)
      character!.dataset.loaded = 'true'
    }).catch(() => {
      // Keep showing the current poster or animation on a failed decode.
    }).finally(() => {
      if (version === request)
        pending = undefined
    })
  }

  function showAnimation(animation: XiaoheiAnimation, nextStrip: HTMLImageElement, nextPoster: HTMLImageElement) {
    character!.style.setProperty('--frame-ratio', `${animation.width} / ${animation.height}`)
    character!.style.setProperty('--frame-count', String(animation.count))
    character!.style.setProperty('--loop-duration', `${animation.duration}ms`)
    character!.style.setProperty('--character-width', `${animation.displayWidth}px`)
    strip.replaceWith(nextStrip)
    poster.replaceWith(nextPoster)
    strip = nextStrip
    poster = nextPoster
    xiaohei!.dataset.animationId = animation.id
    active = animation
    const characterName = animation.characterName ?? '小黑'
    const touchLabel = `和${characterName}打招呼`
    touch!.setAttribute('aria-label', touchLabel)
    touch!.title = touchLabel
    if (pause) {
      pause.dataset.companionName = characterName
      const action = pause.getAttribute('aria-pressed') === 'true' ? '继续' : '暂停'
      pause.setAttribute('aria-label', `${action}${characterName}的动作`)
    }
    touch!.disabled = false
    greeting = 0
    window.clearTimeout(timer)
    endResponse()
  }

  function endResponse() {
    delete xiaohei!.dataset.reacting
    response!.textContent = ''
  }

  touch.disabled = !active
  touch.addEventListener('click', () => {
    if (!active)
      return
    window.clearTimeout(timer)
    response.textContent = active.greetings[greeting++ % active.greetings.length]
    xiaohei.dataset.reacting = 'true'
    timer = window.setTimeout(endResponse, 2600)
  }, { signal })

  return {
    updateDate,
    dispose() {
      disposed = true
      window.clearTimeout(timer)
      touch.disabled = true
      endResponse()
    },
  }
}
