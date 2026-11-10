import type { XiaoheiSelection } from '~/types/companion'

export function getXiaoheiRotation(config: XiaoheiSelection, available: readonly string[]) {
  const catalog = new Set(available)
  return [...new Set(config.enabled)].filter(id => catalog.has(id))
}

export function selectXiaoheiAnimation(config: XiaoheiSelection, available: readonly string[], date: string): string | undefined {
  const fallback = available.includes(config.fixed) ? config.fixed : available[0]
  if (config.mode === 'fixed')
    return fallback
  const ids = getXiaoheiRotation(config, available)
  if (!ids.length)
    return fallback
  // The caller supplies Shanghai calendar dates; UTC arithmetic counts whole calendar days.
  const elapsed = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${config.startsOn}T00:00:00Z`)) / 86400000
  if (!Number.isFinite(elapsed) || elapsed < 0)
    return fallback
  return ids[elapsed % ids.length]
}
