import type { XiaoheiSelection } from '~/types/companion'

function hash(value: string) {
  let result = 2166136261
  for (let i = 0; i < value.length; i++)
    result = Math.imul(result ^ value.charCodeAt(i), 16777619)
  return result >>> 0
}

/** A seeded shuffle: stable across reloads, devices and catalog ordering. */
function shuffle(ids: string[], cycle: number) {
  const order = [...ids]
  for (let i = order.length - 1; i > 0; i--) {
    const j = hash(`${ids.join(',')}:${cycle}:${i}`) % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function selectXiaoheiAnimation(config: XiaoheiSelection, available: readonly string[], date: string): string | undefined {
  const fallback = available.includes(config.fixed) ? config.fixed : available[0]
  if (config.mode === 'fixed')
    return fallback
  const ids = [...new Set(config.enabled)].filter(id => available.includes(id)).sort()
  if (ids.length === 0)
    return fallback
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000)
  if (!Number.isFinite(day))
    return fallback
  const index = ((day % ids.length) + ids.length) % ids.length
  // With two choices, alternate them so adjacent dates never repeat.
  if (ids.length <= 2)
    return shuffle(ids, 0)[index]
  const cycle = Math.floor(day / ids.length)
  const order = shuffle(ids, cycle)
  const previousLast = shuffle(ids, cycle - 1).at(-1)
  // Swapping the first two never changes the last, even in the previous cycle.
  if (order[0] === previousLast)
    [order[0], order[1]] = [order[1], order[0]]
  return order[index]
}
