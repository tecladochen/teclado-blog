const DAY = 86400000

function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10) === value ? date.getTime() / DAY : null
}

export function getSiteDays(startedOn: string | null, now = new Date(), timeZone = 'Asia/Shanghai'): number | null {
  if (!startedOn)
    return null
  const start = calendarDay(startedOn)
  if (start === null)
    return null
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)?.value
  const today = calendarDay(`${part('year')}-${part('month')}-${part('day')}`)
  return today === null || today < start ? null : today - start
}

const patches = [
  [-0.47, -0.12, 0.82],
  [0.39, -0.35, 0.86],
  [-0.12, -0.72, 0.87],
  [-0.77, -0.20, 0.88],
  [0.76, -0.03, 0.88],
  [0.13, -0.78, 0.91],
  [-0.60, -0.62, 0.83],
  [0.57, -0.62, 0.87],
  [-0.67, 0.31, 0.94],
  [0.57, 0.35, 0.98],
  [-0.22, 0.05, 1.05],
  [0.24, -0.04, 1.04],
  [-0.91, 0.12, 0.72],
  [0.91, 0.17, 0.69],
  [-0.30, -0.40, 0.99],
  [0.36, -0.43, 1],
  [-0.30, 0.42, 0.82],
  [0.12, 0.42, 0.95],
  [0.03, -0.22, 1.04],
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
function noise(seed: number) {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453
  return n - Math.floor(n)
}
const n = (value: number) => Number(value.toFixed(2))

function leaf(x: number, y: number, length: number, angle: number, shade: number, vein = false): string {
  const w = length * 0.25
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})"><path d="M0 0 C${n(-w)} ${n(-length * 0.16)} ${n(-w * 1.34)} ${n(-length * 0.68)} 0 ${n(-length)} C${n(w)} ${n(-length * 0.72)} ${n(w * 1.4)} ${n(-length * 0.24)} 0 0Z" fill="var(--tree-leaf-${shade})"/>${vein ? `<path d="M0 -1 Q.7 ${n(-length * 0.4)} 0 ${n(-length * 0.86)}" stroke="var(--tree-vein)" stroke-width=".45" opacity=".42" fill="none"/>` : ''}</g>`
}

function organicPatch(x: number, y: number, rx: number, ry: number, seed: number): string {
  const points = Array.from({ length: 18 }, (_, i) => {
    const angle = Math.PI * 2 * i / 18
    const radius = 0.80 + noise(seed * 41 + i) * 0.23
    return [x + Math.cos(angle) * rx * radius, y + Math.sin(angle) * ry * radius]
  })
  return closedOutline(points)
}

function closedOutline(points: number[][]): string {
  const count = points.length
  const mid = (i: number) => [(points[i % count][0] + points[(i + 1) % count][0]) / 2, (points[i % count][1] + points[(i + 1) % count][1]) / 2]
  let d = `M${mid(count - 1).map(n).join(' ')}`
  for (let i = 0; i < count; i++)
    d += ` Q${points[i].map(n).join(' ')} ${mid(i).map(n).join(' ')}`
  return `${d}Z`
}

/** Fixed mature osmanthus artwork; site uptime never changes its shape. */
export function renderSiteTree(): string {
  const height = 232
  const spread = 108
  const width = 13
  // Every branch joins the same tapered stem and sways around its attachment.
  const stemPoint = (t: number) => [160 + Math.sin(t * Math.PI * 1.3) * 2 - t * 2.5, 268 - height * t]
  const left: number[][] = []
  const right: number[][] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const [x, y] = stemPoint(t)
    const radius = width * 0.55 * (1 - t) ** 0.8 + 0.2
    left.push([x - radius, y])
    right.unshift([x + radius, y])
  }
  const trunk = `<path data-tree-trunk="" d="${closedOutline([...left, ...right])}" fill="var(--tree-bark)"/>`
  const ground = '<ellipse cx="160" cy="271" rx="25" ry="2.8" fill="var(--tree-ground)" opacity=".32"/><path d="M130 270 Q147 268 160 270 T190 270" stroke="var(--tree-ground)" stroke-width=".7" fill="none" opacity=".5"/>'
  const centerY = 268 - height * 0.66
  const crownHeight = height * 0.40
  const canopyOpacity = 0.90
  let rear = ''
  let branches = ''
  let front = ''
  for (let p = 0; p < patches.length; p++) {
    const [px, py, size] = patches[p]
    const x = 160 + px * spread
    const y = centerY + py * crownHeight
    const radius = (10 + spread * 0.25) * size
    const attachment = clamp((268 - y) / height - 0.20 - noise(p) * 0.09, 0.33, 0.64)
    const [originX, originY] = stemPoint(attachment)
    const rise = originY - y
    const delay = n(-noise(p + 2) * 12)
    const style = `style="transform-origin:${n(originX)}px ${n(originY)}px;--branch-period:${n(8 + noise(p) * 5)}s;--branch-delay:${delay}s" opacity="1"`
    branches += `<g class="tree-branch" ${style}><path data-tree-limb="" d="M${n(originX)} ${n(originY)} C${n(originX + px * spread * 0.16)} ${n(originY - rise * 0.3)} ${n(x - px * spread * 0.12)} ${n(y + rise * 0.2)} ${n(x)} ${n(y)}" fill="none" stroke="var(--tree-bark)" stroke-width="${n(Math.max(0.7, width * (0.17 + noise(p) * 0.08)))}" stroke-linecap="round"/></g>`
    const massShade = py < -0.3 ? 2 : py > 0.2 ? 0 : 1
    const mass = `<path d="${organicPatch(x, y, radius * 1.2, radius, p)}" fill="var(--tree-leaf-${massShade})" opacity="${n(canopyOpacity)}"/>`
    if (p < 10)
      rear += `<g class="tree-branch" ${style}>${mass}</g>`
    else
      front += `<g class="tree-branch" ${style}>${mass}</g>`
    let foliage = ''
    const totalLeaves = 29
    for (let l = 0; l < totalLeaves; l++) {
      const id = p * 97 + l * 7
      const angle = l * 2.39996 + noise(p) * 2
      const r = Math.sqrt((l + 0.5) / totalLeaves)
      const lx = x + Math.cos(angle) * r * radius * 1.12
      const ly = y + Math.sin(angle) * r * radius * 0.91
      const length = 8.4 + noise(id + 6) * 5
      const rotation = Math.sin(angle) * 64 + (noise(id) - 0.5) * 65
      const tone = noise(id + 11)
      const leafShade = tone < 0.3 ? 0 : tone < 0.65 ? 1 : tone < 0.92 ? 2 : 3
      foliage += leaf(lx, ly, length, rotation, leafShade, l % 7 === 0)
      if (l % 9 === 0)
        foliage += `<path d="M${n(lx + 2)} ${n(ly + 5)} Q${n(lx)} ${n(ly + 1)} ${n(lx)} ${n(ly - 5)}" stroke="var(--tree-twig)" stroke-width=".45" fill="none" opacity=".6"/>`
    }
    if (p % 3 === 1) {
      const flowers = 8
      for (let f = 0; f < flowers; f++) {
        const fx = x + (noise(p * 19 + f) - 0.5) * radius * 1.2
        const fy = y + (noise(p * 29 + f + 6) - 0.5) * radius
        foliage += `<g fill="var(--tree-flower)" opacity=".9"><circle cx="${n(fx)}" cy="${n(fy)}" r="1.2"/><circle cx="${n(fx + 1.7)}" cy="${n(fy + 0.7)}" r=".9"/><circle cx="${n(fx + 0.3)}" cy="${n(fy + 1.9)}" r="1"/></g>`
      }
    }
    front += `<g class="tree-branch" ${style}>${foliage}</g>`
  }
  const roots = `<path d="M${n(160 - width / 2)} 265 Q155 269 ${n(157 - width)} 270 M${n(160 + width / 2)} 265 Q167 269 ${n(164 + width)} 270" stroke="var(--tree-bark)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="1"/>`
  return `${ground}<g class="tree-sway">${rear}${trunk}${branches}${roots}${front}</g>`
}
