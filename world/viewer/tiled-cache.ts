export interface ViewBounds { left: number, top: number, right: number, bottom: number }

/** Sorted, non-overlapping strips; query cost grows with nearby strips, not the world. */
export function visiblePreviewIndices(bounds: Pick<ViewBounds, 'left' | 'right'>, previews: readonly { x: number, width: number }[], padding = 0) {
  const left = bounds.left - padding
  const right = bounds.right + padding
  if (right <= left)
    return []
  let low = 0
  let high = previews.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    const preview = previews[middle]!
    if (preview.x + preview.width <= left)
      low = middle + 1
    else
      high = middle
  }
  const result: number[] = []
  for (let index = low; index < previews.length && previews[index]!.x < right; index++)
    result.push(index)
  return result
}

export function visibleTileIds(bounds: ViewBounds, width: number, height: number, size: number, padding = 0) {
  const left = Math.max(0, bounds.left - padding)
  const top = Math.max(0, bounds.top - padding)
  const right = Math.min(width, bounds.right + padding)
  const bottom = Math.min(height, bounds.bottom + padding)
  if (right <= left || bottom <= top)
    return []
  const result: string[] = []
  for (let row = Math.floor(top / size); row < Math.ceil(bottom / size); row++) {
    for (let column = Math.floor(left / size); column < Math.ceil(right / size); column++)
      result.push(`${column}-${row}`)
  }
  return result
}

export class ByteCache<T> {
  readonly entries = new Map<string, { value: T, bytes: number }>()
  constructor(readonly budget: number, private readonly release: (value: T) => void) {}
  get bytes() { return [...this.entries.values()].reduce((total, entry) => total + entry.bytes, 0) }
  get(id: string) {
    const entry = this.entries.get(id)
    if (!entry)
      return undefined
    this.entries.delete(id)
    this.entries.set(id, entry)
    return entry.value
  }

  put(id: string, value: T, bytes: number) {
    const old = this.entries.get(id)
    if (old)
      this.release(old.value)
    this.entries.delete(id)
    this.entries.set(id, { value, bytes })
  }

  trim(protectedIds: Set<string>) {
    for (const [id, entry] of this.entries) {
      if (this.bytes <= this.budget)
        break
      if (protectedIds.has(id))
        continue
      this.entries.delete(id)
      this.release(entry.value)
    }
  }

  clear() {
    for (const entry of this.entries.values())
      this.release(entry.value)
    this.entries.clear()
  }
}
