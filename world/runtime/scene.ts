import { loadArt } from './art'
import { activeRegion } from './layout'
import { createTerrain } from './terrain'

export { loadArt } from './art'

export interface View { x: number, y: number, width: number, height: number }
type Tile = typeof activeRegion.tiles[number]
interface Entry { image?: ImageBitmap, pending?: Promise<void>, failed: boolean, used: number }

function intersects(tile: Tile, view: View, margin = 0) {
  const x = tile.x + activeRegion.bounds.x
  const y = tile.y + activeRegion.bounds.y
  return x < view.x + view.width + margin && x + tile.width > view.x - margin
    && y < view.y + view.height + margin && y + tile.height > view.y - margin
}

export function createPainter(images: Record<string, ImageBitmap>, signal: AbortSignal, changed: () => void) {
  const terrain = createTerrain(images)
  const cache = new Map<string, Entry>()
  const queue: { tile: Tile, entry: Entry, resolve: () => void }[] = []
  let running = 0
  let disposed = false
  let tick = 0
  let currentView: View | undefined
  const maximumCache = 40
  const maximumRequests = 6

  function trim() {
    const unused = [...cache.entries()]
      .filter(([id, entry]) => entry.image && !activeRegion.tiles.some(tile => tile.id === id && currentView && intersects(tile, currentView, 384)))
      .sort((a, b) => a[1].used - b[1].used)
    while (cache.size > maximumCache && unused.length) {
      const [id, entry] = unused.shift()!
      entry.image?.close()
      cache.delete(id)
    }
  }

  function pump() {
    if (disposed)
      return
    while (running < maximumRequests && queue.length) {
      const job = queue.shift()!
      running++
      void (async () => {
        try {
          const image = await loadArt(job.tile.url, signal)
          if (disposed) {
            image.close()
            return
          }
          job.entry.image = image
          job.entry.failed = false
        }
        catch {
          if (!disposed)
            job.entry.failed = true
        }
        finally {
          running--
          job.entry.pending = undefined
          job.resolve()
          if (!disposed) {
            trim()
            changed()
            pump()
          }
        }
      })()
    }
  }

  function request(tile: Tile) {
    const entry = cache.get(tile.id) ?? { failed: false, used: ++tick }
    cache.set(tile.id, entry)
    entry.used = ++tick
    if (entry.image || entry.failed)
      return Promise.resolve()
    if (entry.pending)
      return entry.pending
    entry.pending = new Promise<void>((resolve) => {
      queue.push({ tile, entry, resolve })
    })
    pump()
    return entry.pending ?? Promise.resolve()
  }

  function visible(view: View, margin = 0) {
    const centerX = view.x + view.width / 2
    const centerY = view.y + view.height / 2
    return activeRegion.tiles.filter(tile => intersects(tile, view, margin)).sort((a, b) => {
      const distance = (tile: Tile) => Math.hypot(tile.x + activeRegion.bounds.x + tile.width / 2 - centerX, tile.y + activeRegion.bounds.y + tile.height / 2 - centerY)
      return distance(a) - distance(b)
    })
  }

  return {
    async prepare(view: View) {
      currentView = view
      await Promise.all(visible(view).map(request))
    },
    draw(context: CanvasRenderingContext2D, view: View) {
      currentView = view
      terrain.ground(context, view)
      const onScreen = visible(view)
      for (const patch of activeRegion.patches) {
        const missing = onScreen.filter(tile => tile.id.startsWith(`${patch.id}-`) && !cache.get(tile.id)?.image)
        if (!missing.length)
          continue
        const clip = new Path2D()
        for (const tile of missing) clip.rect(tile.x, tile.y, tile.width, tile.height)
        context.save()
        context.clip(clip)
        context.drawImage(images[`scene-${patch.id}`]!, patch.x, patch.y, patch.width, patch.height)
        context.restore()
      }
      for (const tile of visible(view)) {
        const entry = cache.get(tile.id)
        if (!entry?.image)
          continue
        entry.used = ++tick
        context.drawImage(entry.image, tile.x, tile.y, tile.width, tile.height)
      }
      terrain.vegetation(context, view)
      // Sort queued work again after a fast pan; obsolete off-screen tiles don't block the view.
      const wanted = new Set(visible(view, 384).map(tile => tile.id))
      queue.sort((a, b) => Number(wanted.has(b.tile.id)) - Number(wanted.has(a.tile.id)))
      for (const tile of visible(view, 384))
        void request(tile)
      trim()
    },
    stats(view: View) {
      const wanted = visible(view)
      return {
        cached: [...cache.values()].filter(entry => entry.image).length,
        requests: running,
        queued: queue.length,
        visible: wanted.length,
        detailed: wanted.filter(tile => cache.get(tile.id)?.image).length,
        failed: wanted.filter(tile => cache.get(tile.id)?.failed).length,
      }
    },
    retry(view: View) {
      for (const tile of visible(view)) {
        const entry = cache.get(tile.id)
        if (entry)
          entry.failed = false
        void request(tile)
      }
    },
    dispose() {
      disposed = true
      for (const job of queue.splice(0))
        job.resolve()
      for (const entry of cache.values())
        entry.image?.close()
      cache.clear()
      for (const image of Object.values(images))
        image.close()
    },
  }
}
