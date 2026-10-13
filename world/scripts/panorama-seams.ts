export interface MasterPixels {
  start: number
  width: number
  pixelWidth: number
  pixelHeight: number
  channels: number
  data: Uint8Array
}

/**
 * Find a shared boundary through similar painted ground. This produces vector
 * masks, not altered images; the result still needs a visual continuity review.
 */
export function findSeam(left: MasterPixels, right: MasterPixels, height: number, protectedAreas: number[][] = []) {
  const xStep = 10
  const yStep = 5
  const from = right.start + 100
  const to = left.start + left.width - 100
  const columns = Math.floor((to - from) / xStep) + 1
  const rows = height / yStep + 1
  const parents = new Int16Array(rows * columns)
  let previous = new Float64Array(columns)
  const sample = (image: MasterPixels, x: number, y: number, channel: number) => {
    const px = Math.max(0, Math.min(image.pixelWidth - 1, Math.round((x - image.start) / image.width * image.pixelWidth)))
    const py = Math.max(0, Math.min(image.pixelHeight - 1, Math.round(y / height * image.pixelHeight)))
    return image.data[(py * image.pixelWidth + px) * image.channels + channel]!
  }
  for (let row = 0; row < rows; row++) {
    const current = new Float64Array(columns)
    for (let column = 0; column < columns; column++) {
      const x = from + column * xStep
      const y = row * yStep
      let error = 0
      for (const offset of [-10, 0, 10]) {
        for (let channel = 0; channel < 3; channel++)
          error += Math.abs(sample(left, x + offset, y, channel) - sample(right, x + offset, y, channel))
      }
      error /= 9
      error += Math.abs(x - (from + to) / 2) * 0.015
      // Hand-reviewed silhouettes must remain intact even when a cut through
      // similarly coloured boards or roof tiles would have a lower pixel cost.
      for (const area of protectedAreas) {
        if (x >= area[0]! && x <= area[1]! && y >= area[2]! && y <= area[3]!)
          error += 1000
      }
      if (row === 0) {
        current[column] = error
        continue
      }
      let best = Infinity
      let parent = column
      for (let candidate = Math.max(0, column - 2); candidate <= Math.min(columns - 1, column + 2); candidate++) {
        const value = previous[candidate]! + Math.abs(candidate - column) * 5
        if (value < best) {
          best = value
          parent = candidate
        }
      }
      current[column] = best + error
      parents[row * columns + column] = parent
    }
    previous = current
  }
  let cursor = previous.indexOf(Math.min(...previous))
  const averageCost = previous[cursor]! / rows
  const path: number[][] = []
  for (let row = rows - 1; row >= 0; row--) {
    path.push([from + cursor * xStep, row * yStep])
    cursor = parents[row * columns + cursor]!
  }
  path.reverse()
  // Keep corners while eliminating collinear points, without moving the boundary.
  const points = path.filter((point, index) => {
    if (index === 0 || index === path.length - 1)
      return true
    const before = path[index - 1]!
    const after = path[index + 1]!
    return point[0]! - before[0]! !== after[0]! - point[0]!
  })
  return { points, averageCost: Number(averageCost.toFixed(2)) }
}
