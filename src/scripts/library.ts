import type { LibraryWork } from '~/utils/library'
import { getWorkCountLabel, workTypes } from '~/utils/library'

const initializedPages = new WeakSet<HTMLElement>()

function initializeLibrary() {
  const page = document.querySelector<HTMLElement>('[data-library-page]')
  if (!page || initializedPages.has(page))
    return
  initializedPages.add(page)
  const tabs = Array.from(page.querySelectorAll<HTMLButtonElement>('[data-category]'))
  const cards = Array.from(page.querySelectorAll<HTMLElement>('[data-work]'))
  const shelf = page.querySelector<HTMLElement>('[data-panel="shelf"]')!
  const music = page.querySelector<HTMLElement>('[data-panel="music"]')!
  const summary = page.querySelector<HTMLElement>('[data-view-summary]')!
  const empty = page.querySelector<HTMLElement>('[data-work-empty]')!
  const groups = Array.from(page.querySelectorAll<HTMLElement>('[data-shelf-group]')).map(element => ({
    element,
    cards: Array.from(element.querySelectorAll<HTMLElement>('[data-work]')),
    count: element.querySelector<HTMLElement>('[data-group-count]')!,
  }))
  const countLabel = (entries: HTMLElement[]) => getWorkCountLabel(entries.map(card => card.dataset.type as LibraryWork['data']['type']))
  // Calculate the four shelf views once; switching only updates the existing DOM.
  const views = new Map(['all', ...Object.keys(workTypes)].map((category) => {
    const matches = (card: HTMLElement) => category === 'all' || card.dataset.type === category
    const entries = cards.filter(matches)
    return [category, {
      entries: new Set(entries),
      summary: countLabel(entries),
      groups: groups.map((group) => {
        const entries = group.cards.filter(matches)
        return { ...group, entries, summary: countLabel(entries) }
      }),
    }]
  }))
  const albumSummary = `${music.querySelectorAll('.album-card').length} 张专辑`
  let activeCategory: string | undefined
  let requestedCategory: string | undefined
  let transition: Animation | undefined
  let transitionSequence = 0
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  function updateTabs(category: string) {
    tabs.forEach((tab) => {
      const selected = tab.dataset.category === category
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
    })
  }

  function apply(category: string, updateUrl = true) {
    activeCategory = category
    updateTabs(category)
    shelf.hidden = category === 'music'
    music.hidden = category !== 'music'
    const view = views.get(category)
    if (view) {
      shelf.setAttribute('aria-labelledby', `category-${category}`)
      cards.forEach((card) => {
        const hidden = !view.entries.has(card)
        if (card.hidden !== hidden)
          card.hidden = hidden
      })
      view.groups.forEach((group) => {
        group.element.hidden = group.entries.length === 0
        group.count.textContent = group.summary
      })
      empty.hidden = view.entries.size > 0
      summary.textContent = view.summary
    }
    else {
      summary.textContent = albumSummary
    }
    if (!updateUrl)
      return
    const url = new URL(location.href)
    for (const obsolete of ['status', 'year', 'artist', 'q'])
      url.searchParams.delete(obsolete)
    if (category === 'all')
      url.searchParams.delete('category')
    else
      url.searchParams.set('category', category)
    history.replaceState(history.state, '', url)
  }

  async function select(category: string) {
    if (requestedCategory === category)
      return
    requestedCategory = category
    const sequence = ++transitionSequence
    const previous = activeCategory === 'music' ? music : shelf
    const opacity = getComputedStyle(previous).opacity
    transition?.cancel()
    updateTabs(category)
    if (reducedMotion.matches) {
      apply(category)
      return
    }
    // Match the journey filter's fade timings; the latest click always wins.
    const exit = transition = previous.animate(
      [{ opacity }, { opacity: 0 }],
      { duration: 120, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
    )
    await exit.finished.catch(() => undefined)
    if (sequence !== transitionSequence || !page?.isConnected) {
      exit.cancel()
      return
    }
    apply(category)
    exit.cancel()
    const next = category === 'music' ? music : shelf
    const enter = transition = next.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
    )
    await enter.finished.catch(() => undefined)
    enter.cancel()
    if (transition === enter)
      transition = undefined
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => void select(tab.dataset.category!))
    tab.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : undefined
      if (next === undefined)
        return
      event.preventDefault()
      void select(tabs[next].dataset.category!)
      tabs[next].focus({ preventScroll: true })
    })
  })
  const category = new URLSearchParams(location.search).get('category')
  requestedCategory = tabs.some(tab => tab.dataset.category === category) ? category! : 'all'
  apply(requestedCategory, false)
}
initializeLibrary()
document.addEventListener('astro:page-load', initializeLibrary)
