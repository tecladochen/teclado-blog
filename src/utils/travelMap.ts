import type { TravelPlace } from '~/.config/travels'
import { geoConicEqualArea, geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo'
import { travels as configuredTravels } from '~/.config/travels'
import chinaMap from '~/data/travel/china.json'
import cityRecords from '~/data/travel/cities.json'
import worldMap from '~/data/travel/world.json'

interface CityRecord {
  name: string
  province: string
  lng: number
  lat: number
}

interface ChinaProps {
  name: string
  short: string
  inset: boolean
  kind: 'province' | 'islands' | 'dash'
}

interface WorldProps {
  iso: string
  partOf: string
  name: string
  zh: string
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Point {
  x: number
  y: number
}

interface PlacedTravel {
  city?: string
  province?: string
  country: string
  countryId: string
  visited?: string
  place?: string
  kind: 'birth' | 'residence' | 'visit'
  until?: string
  lng?: number
  lat?: number
}

export interface TravelMapEntry {
  id: string
  key: string
  city?: string
  title: string
  visited?: string
  place?: string
  kind: PlacedTravel['kind']
  dateLabel: string
  tag: string
}

export interface TravelMapRegion {
  key: string
  name: string
  d: string
  visited: boolean
  entry?: string
  order: number
  label?: Point
  contextLabel?: Point
}

export interface TravelLabelSpot {
  dx: number
  dy: number
  anchor: 'start' | 'middle' | 'end'
  /** 与其他标注不冲突才显示；全国视图太挤，城市名交给卡片 */
  show: boolean
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'

export interface TravelMapCity {
  key: string
  city: string
  entry: string
  name: string
  home: boolean
  x: number
  y: number
  /** 直辖市、特别行政区和省名重名，只留一个名字：面积太小时留城市名，否则留省名 */
  named: boolean
  label: TravelLabelSpot
  compactLabel: TravelLabelSpot
}

export interface TravelMapGroup {
  key: string
  name: string
  cities: number
  entry: string
  /** 城市卡片放在不遮挡该省的角上 */
  corner: Corner
  items: TravelMapEntry[]
  more: number
}

export interface TravelMapLocator {
  width: number
  height: number
  corner: Corner
  regions: Array<{ d: string, visited: boolean }>
  frame: Box
}

export interface TravelMapInset {
  x: number
  y: number
  width: number
  height: number
  lines: Array<{ d: string, kind: string, visited: boolean }>
}

export interface TravelMapStat {
  label: string
  value: number
  total?: number
}

/** 同一个月的到访合并展示，居住经历单独展示。 */
export interface TravelTimelinePoint {
  id: string
  keys: string[]
  cities: string[]
  title: string
  visited: string
  home: boolean
  year: number
}

export interface TravelTimeline {
  segments: Array<{ gap: true, start: number, end: number } | { gap: false, point: TravelTimelinePoint }>
  points: TravelTimelinePoint[]
}

export interface TravelMapModel {
  empty: boolean
  scope: 'region' | 'china' | 'world'
  summary: string
  span: string
  viewBox: string
  labelSize: number
  dotRadius: number
  regions: TravelMapRegion[]
  cities: TravelMapCity[]
  groups: TravelMapGroup[]
  inset?: TravelMapInset
  locator?: TravelMapLocator
  stats: TravelMapStat[]
  timeline?: TravelTimeline
  milestones: TravelMapEntry[]
}

interface MapGeometry {
  type: string
  coordinates: unknown
}

interface MapFeature<Props> {
  type: string
  properties: Props
  geometry: MapGeometry
}

type ChinaFeature = MapFeature<ChinaProps>
type WorldFeature = MapFeature<WorldProps>
type Projector = (coordinates: [number, number]) => [number, number] | null

const NATIONAL_RATIO = 0.7
const REGION_PAD = 0.2
const REGION_MIN_WIDTH = 0.3
const REGION_ASPECT = 1.6
const LOCATOR_WIDTH = 160
const LOCATOR_SHARE = 0.22
const LOCATOR_COMPACT_SHARE = 0.26
const CITY_LABEL_RATIO = 0.74
const CONTEXT_LABEL_RATIO = 0.7
const CARD_ITEMS = 6
const DESKTOP_SCALE = { label: 1, dot: 1 }
const COMPACT_SCALE = { label: 1.7, dot: 1.5 }

const cities = cityRecords as CityRecord[]
const china = chinaMap as { features: ChinaFeature[] }
const world = worldMap as { features: WorldFeature[] }

const COUNTRY_ALIASES: Record<string, string> = {
  中华人民共和国: '中国',
  大韩民国: '韩国',
  朝鲜民主主义人民共和国: '朝鲜',
  俄罗斯联邦: '俄罗斯',
  美利坚合众国: '美国',
  阿拉伯联合酋长国: '阿联酋',
}

const ADMIN_SUFFIXES = ['特别行政区', '维吾尔自治区', '壮族自治区', '回族自治区', '自治区', '省', '市']

function shortAdmin(name: string) {
  for (const suffix of ADMIN_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length)
      return name.slice(0, -suffix.length)
  }
  return name
}

function emptyModel(): TravelMapModel {
  return {
    empty: true,
    scope: 'region',
    summary: '',
    span: '',
    viewBox: '0 0 1 1',
    labelSize: 12,
    dotRadius: 3,
    regions: [],
    cities: [],
    groups: [],
    stats: [],
    milestones: [],
  }
}

function formatVisited(value: string | undefined, warnings: string[]) {
  if (!value?.trim())
    return
  const matched = value.trim().match(/^(\d{4})(?:-(\d{2}))?$/)
  if (!matched) {
    warnings.push(`时间格式应为 YYYY-MM：${value}`)
    return
  }
  return matched[2] ? `${matched[1]}.${matched[2]}` : matched[1]
}

function resolveCountry(input: string | undefined) {
  const raw = input?.trim() || '中国'
  const name = COUNTRY_ALIASES[raw] ?? raw
  const feature = world.features.find(item => item.properties.zh === name || item.properties.name === name)
  return {
    name: feature?.properties.partOf === 'CHN' ? '中国' : (feature?.properties.zh ?? name),
    id: feature?.properties.partOf ?? name,
    known: Boolean(feature) || name === '中国',
  }
}

function findCity(name: string, province: string | undefined) {
  const bare = name.endsWith('市') ? name.slice(0, -1) : name
  const hits = cities.filter(city => city.name === name || city.name === bare)
  if (province) {
    const matched = hits.find(city => city.province === province)
    if (matched)
      return matched
  }
  return hits.length === 1 ? hits[0] : undefined
}

function normalize(input: TravelPlace[], warnings: string[]) {
  const provinces = new Set(
    china.features
      .filter(feature => feature.properties.kind === 'province')
      .map(feature => feature.properties.short),
  )
  const records: PlacedTravel[] = []

  input.forEach((item, index) => {
    const country = resolveCountry(item.country)
    if (item.country && !country.known)
      warnings.push(`没有找到国家：${item.country}`)

    let province = item.province ? shortAdmin(item.province.trim()) : undefined
    const cityName = item.city?.trim()
    const manual = typeof item.lng === 'number' && typeof item.lat === 'number'
    let lng = manual ? item.lng : undefined
    let lat = manual ? item.lat : undefined

    if (cityName && country.name === '中国' && !manual) {
      const city = findCity(cityName, province)
      if (!city) {
        warnings.push(province
          ? `没有找到城市：${province} ${cityName}，可以补上 lng / lat`
          : `没有找到城市：${cityName}，可以补上 province 和 lng / lat`)
      }
      else {
        lng = city.lng
        lat = city.lat
        if (province && province !== city.province)
          warnings.push(`${cityName} 属于${city.province}，这里写成了${province}`)
        province ||= city.province
      }
    }

    if (country.name === '中国' && province && !provinces.has(province))
      warnings.push(`没有找到省份：${province}`)

    if (manual && country.name === '中国' && !province)
      warnings.push(`${cityName ?? '手动坐标'} 需要写上 province`)

    if (!cityName && !province && country.name === '中国') {
      warnings.push(`第 ${index + 1} 条没有城市或省份`)
      return
    }

    records.push({
      city: cityName,
      province,
      country: country.name,
      countryId: country.id,
      visited: formatVisited(item.visited, warnings),
      place: item.place?.trim(),
      kind: item.kind ?? 'visit',
      until: item.until === 'present' ? 'present' : formatVisited(item.until, warnings),
      lng,
      lat,
    })
  })

  return records
}

type Ring = [number, number][]
type PolygonRings = Ring[]

function ringArea(ring: Ring) {
  let sum = 0
  for (let index = 0; index < ring.length - 1; index++)
    sum += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]
  return sum
}

function polygonsOf(geometry: MapGeometry): PolygonRings[] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates as PolygonRings]
    : geometry.coordinates as PolygonRings[]
}

function rewindForD3<Props>(feature: MapFeature<Props>): MapFeature<Props> {
  const geometry = structuredClone(feature.geometry)
  polygonsOf(geometry).forEach((polygon) => {
    polygon.forEach((ring, index) => {
      const area = ringArea(ring)
      const exterior = index === 0
      if ((exterior && area > 0) || (!exterior && area < 0))
        ring.reverse()
    })
  })
  return { ...feature, geometry }
}

/** 零面积的“多边形”会被 d3 当成覆盖全球，九段线和小岛只能按线来画 */
function asLines<Props>(feature: MapFeature<Props>): MapFeature<Props> {
  return {
    ...feature,
    geometry: { type: 'MultiLineString', coordinates: polygonsOf(feature.geometry).flat() },
  }
}

function collection(features: unknown[]) {
  return { type: 'FeatureCollection', features } as never
}

function projectedPoints(projection: Projector, feature: ChinaFeature | WorldFeature) {
  const points: Array<[number, number]> = []
  const walk = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0)
      return
    if (typeof node[0] === 'number') {
      const projected = projection([node[0], node[1]])
      if (projected)
        points.push(projected)
      return
    }
    node.forEach(child => walk(child))
  }
  walk(feature.geometry.coordinates)
  return points
}

function boxFromPoints(points: Array<[number, number]>): Box {
  let x0 = Number.POSITIVE_INFINITY
  let y0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let y1 = Number.NEGATIVE_INFINITY
  points.forEach(([x, y]) => {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  })
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }
}

function boundsOf(projection: Projector, features: Array<ChinaFeature | WorldFeature>) {
  return boxFromPoints(features.flatMap(feature => projectedPoints(projection, feature)))
}

function featureAnchor(projection: Projector, feature: ChinaFeature | WorldFeature) {
  const points = projectedPoints(projection, feature)
  if (!points.length)
    return
  const box = boxFromPoints(points)
  const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
  const ring = largestRing(feature.geometry.coordinates)
  if (!ring)
    return center
  const projected = ring.flatMap((coord) => {
    const point = projection(coord)
    return point ? [point] : []
  })
  const anchor = ringCentroid(projected)
  if (!anchor || !inside(anchor.x, anchor.y, pad(box, 0.2)))
    return center
  return anchor
}

function largestRing(node: unknown): Array<[number, number]> | undefined {
  let best: Array<[number, number]> | undefined
  const walk = (current: unknown) => {
    if (!Array.isArray(current) || current.length === 0 || typeof current[0] === 'number')
      return
    if (Array.isArray(current[0]) && typeof current[0][0] === 'number') {
      const ring = current as Array<[number, number]>
      if (!best || ring.length > best.length)
        best = ring
      return
    }
    current.forEach(child => walk(child))
  }
  walk(node)
  return best
}

function ringCentroid(ring: Array<[number, number]>) {
  let twiceArea = 0
  let x = 0
  let y = 0
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const cross = ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1]
    twiceArea += cross
    x += (ring[previous][0] + ring[index][0]) * cross
    y += (ring[previous][1] + ring[index][1]) * cross
  }
  if (!twiceArea)
    return
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) }
}

function pad(box: Box, ratio: number): Box {
  const xPad = box.w * ratio
  const yPad = box.h * ratio
  return { x: box.x - xPad, y: box.y - yPad, w: box.w + xPad * 2, h: box.h + yPad * 2 }
}

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  }
}

function widen(box: Box, minWidth: number, aspect: number): Box {
  const w = Math.max(box.w, minWidth, box.h * aspect)
  const h = w / aspect
  return { x: box.x + box.w / 2 - w / 2, y: box.y + box.h / 2 - h / 2, w, h }
}

function intersects(box: Box, frame: Box) {
  return box.x < frame.x + frame.w
    && box.x + box.w > frame.x
    && box.y < frame.y + frame.h
    && box.y + box.h > frame.y
}

function viewBoxOf(box: Box) {
  return `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`
}

function inside(x: number, y: number, box: Box) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
}

function pointInRing(x: number, y: number, ring: Array<[number, number]>) {
  let contained = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]
    const before = ring[previous]
    const crosses = (current[1] > y) !== (before[1] > y)
    const xHit = (before[0] - current[0]) * (y - current[1]) / (before[1] - current[1] || 1e-9) + current[0]
    if (crosses && x < xHit)
      contained = !contained
  }
  return contained
}

function projectedRing(projection: Projector, feature: ChinaFeature | WorldFeature) {
  const ring = largestRing(feature.geometry.coordinates)
  if (!ring)
    return
  const projected = ring.flatMap((coord) => {
    const point = projection(coord)
    return point ? [point] : []
  })
  return projected.length >= 3 ? projected : undefined
}

function clearance(point: Point, others: Point[]) {
  return Math.min(Number.POSITIVE_INFINITY, ...others.map(other => Math.hypot(other.x - point.x, other.y - point.y)))
}

function placeAreaLabel(
  anchor: Point,
  ring: Array<[number, number]>,
  cities: Point[],
  labelSize: number,
) {
  if (!cities.length)
    return anchor
  if (pointInRing(anchor.x, anchor.y, ring) && clearance(anchor, cities) >= labelSize * 2)
    return anchor
  const nearest = cities.reduce((best, city) => {
    const distance = Math.hypot(city.x - anchor.x, city.y - anchor.y)
    return distance < best.distance ? { city, distance } : best
  }, { city: cities[0], distance: Number.POSITIVE_INFINITY })
  const vx = anchor.x - nearest.city.x
  const vy = anchor.y - nearest.city.y
  const length = Math.hypot(vx, vy)
  const directions = length > labelSize * 0.4
    ? [[vx / length, vy / length]]
    : [[-1, 0], [0, -1], [0, 1], [1, 0], [-0.7, -0.7], [-0.7, 0.7]]
  let best = anchor
  let bestScore = pointInRing(anchor.x, anchor.y, ring) ? clearance(anchor, cities) : -1
  directions.forEach(([dx, dy]) => {
    ;[1.6, 2.4].forEach((scale) => {
      const point = { x: anchor.x + dx * labelSize * scale, y: anchor.y + dy * labelSize * scale }
      if (!pointInRing(point.x, point.y, ring))
        return
      const room = clearance(point, cities)
      const score = room - scale * labelSize * 0.2
      if (room >= labelSize * 1.7 && score > bestScore) {
        best = point
        bestScore = score
      }
    })
  })
  return best
}

interface AreaLabel {
  point: Point
  text: string
  ratio: number
  tracking: number
}

function textWidth(text: string, size: number, tracking = 1) {
  return [...text].reduce((sum, char) => sum + (char.charCodeAt(0) < 0x2E80 ? 0.6 : 1), 0) * size * tracking
}

function centeredBox(point: Point, w: number, h: number): Box {
  return { x: point.x - w / 2, y: point.y - h / 2, w, h }
}

function overlap(a: Box, b: Box) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return x > 0 && y > 0 ? x * y : 0
}

function contains(outer: Box, box: Box) {
  return box.x >= outer.x && box.y >= outer.y && box.x + box.w <= outer.x + outer.w && box.y + box.h <= outer.y + outer.h
}

/** 依次尝试右、左、上、下四个位置，放不下的城市名隐藏，由卡片列出 */
function placeCityLabels(
  cities: TravelMapCity[],
  areaLabels: AreaLabel[],
  blocked: Box[],
  frame: Box,
  labelSize: number,
  dotRadius: number,
  scale: { label: number, dot: number },
): TravelLabelSpot[] {
  const size = labelSize * CITY_LABEL_RATIO * scale.label
  const radius = dotRadius * scale.dot
  const gap = radius * 1.7 + size * 0.3
  const h = size * 1.15
  const room = pad(frame, -0.05)
  const obstacles: Box[] = [
    ...blocked,
    ...areaLabels.map((label) => {
      const fontSize = labelSize * label.ratio * scale.label
      return centeredBox(label.point, textWidth(label.text, fontSize, label.tracking), fontSize * 1.15)
    }),
    ...cities.map(city => centeredBox(city, radius * 2.6, radius * 2.6)),
  ]
  return cities.map((city) => {
    if (!city.named)
      return { dx: 0, dy: 0, anchor: 'start', show: false }
    const w = textWidth(city.name, size, 1.04)
    const options = [
      { dx: gap, dy: 0, anchor: 'start' as const, box: { x: city.x + gap, y: city.y - h / 2, w, h } },
      { dx: -gap, dy: 0, anchor: 'end' as const, box: { x: city.x - gap - w, y: city.y - h / 2, w, h } },
      { dx: 0, dy: -(gap + h / 2), anchor: 'middle' as const, box: { x: city.x - w / 2, y: city.y - gap - h, w, h } },
      { dx: 0, dy: gap + h / 2, anchor: 'middle' as const, box: { x: city.x - w / 2, y: city.y + gap, w, h } },
    ]
    const best = options
      .map(option => ({
        option,
        score: obstacles.reduce((sum, box) => sum + overlap(option.box, box), 0) + (contains(room, option.box) ? 0 : w * h),
      }))
      .reduce((winner, item) => item.score < winner.score ? item : winner)
    obstacles.push(best.option.box)
    return { dx: best.option.dx, dy: best.option.dy, anchor: best.option.anchor, show: best.score === 0 }
  })
}

function cardCorner(frame: Box, area: Box | undefined, avoid: Corner[]): Corner {
  const corners: Corner[] = ['bl', 'tl', 'tr', 'br']
  if (!area)
    return corners.find(corner => !avoid.includes(corner)) ?? 'bl'
  const w = frame.w * 0.42
  const h = frame.h * 0.5
  return corners
    .map((corner) => {
      const box = {
        x: corner.endsWith('r') ? frame.x + frame.w - w : frame.x,
        y: corner.startsWith('b') ? frame.y + frame.h - h : frame.y,
        w,
        h,
      }
      return { corner, score: overlap(box, area) / (w * h) + (avoid.includes(corner) ? 0.12 : 0) }
    })
    .reduce((best, item) => item.score < best.score - 1e-6 ? item : best)
    .corner
}

function locatorBox(frame: Box, aspect: number, corner: TravelMapLocator['corner'], share: number): Box {
  const w = frame.w * share
  const h = w * aspect
  return {
    x: corner.endsWith('r') ? frame.x + frame.w - w : frame.x,
    y: corner.startsWith('b') ? frame.y + frame.h - h : frame.y,
    w,
    h,
  }
}

function chooseCorner(frame: Box, aspect: number, obstacles: Point[]): TravelMapLocator['corner'] {
  const corners = ['br', 'bl', 'tr', 'tl'] as const
  const scored = corners.map((corner) => {
    const box = locatorBox(frame, aspect, corner, LOCATOR_SHARE)
    return { corner, hits: obstacles.filter(point => inside(point.x, point.y, box)).length }
  })
  return scored.reduce((best, item) => item.hits < best.hits ? item : best).corner
}

function buildStats(records: PlacedTravel[], scope: TravelMapModel['scope']): TravelMapStat[] {
  const stats: TravelMapStat[] = []
  if (scope === 'world') {
    stats.push({ label: '国家', value: new Set(records.map(record => record.countryId)).size })
  }
  else {
    const total = china.features.filter(feature => feature.properties.kind === 'province').length
    const provinces = new Set(records.map(record => record.province).filter(Boolean)).size
    stats.push({ label: '省份', value: provinces, total })
  }
  const cityCount = new Set(
    records
      .filter(record => record.city)
      .map(record => `${record.countryId}:${record.province ?? ''}:${record.city}`),
  ).size
  if (cityCount)
    stats.push({ label: '城市', value: cityCount })
  return stats
}

function byVisitedDesc(a: { visited?: string }, b: { visited?: string }) {
  if (a.visited && b.visited)
    return b.visited.localeCompare(a.visited)
  if (a.visited)
    return -1
  if (b.visited)
    return 1
  return 0
}

function buildEntries(records: PlacedTravel[], mode: 'province' | 'country'): TravelMapEntry[] {
  const provincesWithCity = new Set(
    records.filter(record => record.city && record.province).map(record => record.province as string),
  )
  return records.flatMap((record) => {
    const bare = !record.city && !record.visited
    if (mode === 'province' && bare && record.province && provincesWithCity.has(record.province))
      return []
    const key = mode === 'country'
      ? record.countryId
      : (record.province ?? record.city ?? record.country)
    return [{
      key,
      city: record.city ? `${key}:${record.city}` : undefined,
      title: record.city || record.province || record.country,
      visited: record.visited,
      place: record.place,
      kind: record.kind,
      dateLabel: record.until ? `${record.visited ?? ''} — ${record.until === 'present' ? '至今' : record.until}` : record.visited ?? '',
      tag: record.kind === 'birth' ? '出生地' : record.kind === 'residence' ? (record.until === 'present' ? '常住' : '曾居') : '到访',
    }]
  })
    .sort(byVisitedDesc)
    .map((entry, index) => ({ id: `t${index}`, ...entry }))
}

function buildGroups(
  records: PlacedTravel[],
  entries: TravelMapEntry[],
  mode: 'province' | 'country',
  cornerOf: (key: string) => Corner,
): TravelMapGroup[] {
  const groups = new Map<string, { name: string, cities: Set<string> }>()
  records.forEach((record) => {
    const key = mode === 'country' ? record.countryId : record.province
    if (!key)
      return
    const group = groups.get(key) ?? { name: mode === 'country' ? record.country : key, cities: new Set<string>() }
    if (record.city)
      group.cities.add(record.city)
    groups.set(key, group)
  })
  const rank = (id: string) => Number(id.slice(1))
  return [...groups.entries()]
    .flatMap(([key, group]) => {
      const own = entries.filter(item => item.key === key)
      if (!own.length)
        return []
      return [{
        key,
        name: group.name,
        cities: group.cities.size,
        entry: own[0].id,
        corner: cornerOf(key),
        items: own.slice(0, CARD_ITEMS),
        more: Math.max(0, own.length - CARD_ITEMS),
      }]
    })
    .sort((a, b) => b.cities - a.cities || rank(a.entry) - rank(b.entry))
}

function buildSpan(entries: TravelMapEntry[]) {
  const years = entries.flatMap(entry => entry.visited ? [entry.visited.slice(0, 4)] : []).sort()
  if (!years.length)
    return ''
  const first = years[0]
  const last = entries.some(entry => entry.tag === '常住') ? '至今' : years[years.length - 1]
  return first === last ? first : `${first} — ${last}`
}

function visitedValue(visited: string) {
  const [year, month] = visited.split('.').map(Number)
  return month ? year + (month - 0.5) / 12 : year + 0.5
}

function buildTimeline(entries: TravelMapEntry[]): TravelTimeline | undefined {
  const months = new Map<string, TravelMapEntry[]>()
  entries.forEach((entry) => {
    if (entry.visited && entry.kind !== 'residence')
      months.set(entry.visited, [...(months.get(entry.visited) ?? []), entry])
  })
  const dated = [...months.entries()]
    .map(([visited, list]) => ({ list, visited, value: visitedValue(visited) }))
    .sort((a, b) => a.value - b.value)
  if (!dated.length)
    return
  const points = dated.map(({ list, visited, value }) => ({
    id: list[0].id,
    keys: [...new Set(list.map(entry => entry.key))],
    cities: [...new Set(list.flatMap(entry => entry.city ? [entry.city] : []))],
    title: list.map(entry => entry.place ?? entry.title).join(' · '),
    visited,
    home: list.some(entry => entry.kind === 'birth'),
    year: Math.floor(value),
  }))
  const segments: TravelTimeline['segments'] = []
  points.forEach((point, index) => {
    const previous = points[index - 1]
    if (previous && point.year - previous.year > 1)
      segments.push({ gap: true, start: previous.year + 1, end: point.year - 1 })
    segments.push({ gap: false, point })
  })
  return { segments, points }
}

function latestEntry(entries: TravelMapEntry[], match: (entry: TravelMapEntry) => boolean) {
  return entries.find(match)?.id
}

function chinaProjection() {
  return geoConicEqualArea().parallels([25, 47]).rotate([-104, 0])
}

function projectChina(records: PlacedTravel[]): TravelMapModel {
  const mainland = china.features.filter(feature => !feature.properties.inset)
  const mainlandShape = collection(mainland.map(feature => rewindForD3(feature)))
  const projection = chinaProjection().fitExtent([[12, 12], [820, 700]], mainlandShape)
  const path = geoPath(projection)
  const full = boundsOf(projection, mainland)
  const visitedNames = new Set(records.map(record => record.province).filter((name): name is string => Boolean(name)))
  const visitedFeatures = mainland.filter(feature => visitedNames.has(feature.properties.short))
  const focusSource = visitedFeatures.length ? boundsOf(projection, visitedFeatures) : full
  const national = !visitedFeatures.length
    || focusSource.w / full.w >= NATIONAL_RATIO
    || focusSource.h / full.h >= NATIONAL_RATIO

  let frame = national
    ? full
    : widen(pad(focusSource, REGION_PAD), full.w * REGION_MIN_WIDTH, REGION_ASPECT)

  let inset: TravelMapInset | undefined
  let insetBox: Box | undefined
  if (national) {
    const south = china.features.filter(feature => feature.properties.inset).map(feature => asLines(feature))
    const box = { x: 0, y: 0, w: full.w * 0.13, h: full.w * 0.13 * 1.45 }
    box.x = full.x + full.w - box.w
    box.y = full.y + full.h - box.h
    const land = mainland.flatMap(feature => projectedPoints(projection, feature))
    const gap = full.w * 0.015
    for (let step = 0; step < 60 && land.some(([x, y]) => inside(x, y, { x: box.x - gap, y: box.y - gap, w: box.w + gap * 2, h: box.h + gap * 2 })); step++)
      box.x += full.w * 0.01
    frame = pad(union(full, box), 0.015)
    insetBox = box
    const southProjection = geoMercator().fitExtent(
      [[box.x + box.w * 0.12, box.y + box.h * 0.08], [box.x + box.w * 0.88, box.y + box.h * 0.92]],
      collection(south),
    )
    const southPath = geoPath(southProjection)
    inset = {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      lines: south.flatMap((feature) => {
        const d = southPath(feature as never)
        return d
          ? [{ d, kind: feature.properties.kind, visited: visitedNames.has(feature.properties.short) }]
          : []
      }),
    }
  }

  const labelSize = frame.w / 54
  const dotRadius = frame.w / 230
  const chinaRecords = records.filter(record => record.country === '中国')
  const entries = buildEntries(chinaRecords, 'province')

  const areaRings = new Map<string, Array<[number, number]>>()
  const areaBoxes = new Map<string, Box>()
  const contextCandidates = new Map<string, Point>()
  const contextFrame = pad(frame, -0.1)
  let order = 0
  const regions: TravelMapRegion[] = mainland.flatMap((feature) => {
    const box = boundsOf(projection, [feature])
    if (!national && !intersects(box, frame))
      return []
    const d = path(rewindForD3(feature) as never)
    if (!d)
      return []
    const key = feature.properties.short
    const visited = visitedNames.has(key)
    const anchor = featureAnchor(projection, feature)
    const ring = projectedRing(projection, feature)
    if (ring)
      areaRings.set(key, ring)
    areaBoxes.set(key, box)
    if (!national && !visited && anchor && box.w >= labelSize * 2.4 && inside(anchor.x, anchor.y, contextFrame))
      contextCandidates.set(key, anchor)
    return [{
      key,
      name: key,
      d,
      visited,
      entry: visited ? latestEntry(entries, entry => entry.key === key) : undefined,
      order: visited ? order++ : 0,
      label: visited && anchor && inside(anchor.x, anchor.y, frame) ? anchor : undefined,
    }]
  })

  const cityDots = new Map<string, TravelMapCity>()
  chinaRecords.forEach((record) => {
    if (!record.city || !record.province || record.lng == null || record.lat == null)
      return
    const projected = projection([record.lng, record.lat])
    if (!projected || !inside(projected[0], projected[1], frame))
      return
    const city = `${record.province}:${record.city}`
    if (cityDots.has(city))
      return
    const hidden = { dx: 0, dy: 0, anchor: 'start' as const, show: false }
    cityDots.set(city, {
      key: record.province,
      city,
      entry: latestEntry(entries, entry => entry.city === city) ?? '',
      name: record.city,
      home: entries.some(entry => entry.city === city && entry.kind === 'birth'),
      x: projected[0],
      y: projected[1],
      named: record.city.replace(/市$/, '') !== record.province,
      label: hidden,
      compactLabel: hidden,
    })
  })
  const cityList = [...cityDots.values()]
    .sort((a, b) => Number(a.entry.slice(1)) - Number(b.entry.slice(1)))

  if (!national) {
    regions.forEach((region) => {
      const box = areaBoxes.get(region.key)
      const local = cityList.filter(city => city.key === region.key)
      if (!region.label || !box || !local.length || Math.max(box.w, box.h) >= labelSize * 2.6)
        return
      region.label = undefined
      local.forEach((city) => {
        city.named = true
      })
    })
  }

  regions.forEach((region) => {
    if (!region.label)
      return
    const ring = areaRings.get(region.key)
    const localCities = cityList.filter(city => city.key === region.key)
    if (!ring || !localCities.length)
      return
    region.label = placeAreaLabel(region.label, ring, localCities, labelSize)
  })

  const placed: Point[] = [
    ...regions.flatMap(region => region.label ? [region.label] : []),
    ...cityList,
  ]
  regions.forEach((region) => {
    const candidate = contextCandidates.get(region.key)
    if (!candidate || clearance(candidate, placed) < labelSize * 2.4)
      return
    region.contextLabel = candidate
    placed.push(candidate)
  })

  const blocked: Box[] = insetBox ? [insetBox] : []
  const compactBlocked: Box[] = [...blocked]
  let locator: TravelMapLocator | undefined
  if (!national) {
    const aspect = full.h / full.w
    const width = LOCATOR_WIDTH
    const height = width * aspect
    const locatorProjection = chinaProjection().fitExtent([[2, 2], [width - 2, height - 2]], mainlandShape)
    const locatorPath = geoPath(locatorProjection).digits(1)
    const topLeft = locatorProjection(projection.invert!([frame.x, frame.y])!)!
    const bottomRight = locatorProjection(projection.invert!([frame.x + frame.w, frame.y + frame.h])!)!
    const obstacles = [
      ...visitedFeatures.flatMap(feature => projectedPoints(projection, feature))
        .filter((_, index) => index % 4 === 0)
        .map(([x, y]) => ({ x, y })),
      ...placed,
    ]
    const corner = chooseCorner(frame, aspect, obstacles)
    const cover = locatorBox(frame, aspect, corner, LOCATOR_COMPACT_SHARE)
    blocked.push(locatorBox(frame, aspect, corner, LOCATOR_SHARE))
    compactBlocked.push(cover)
    regions.forEach((region) => {
      if (region.contextLabel && inside(region.contextLabel.x, region.contextLabel.y, pad(cover, 0.12)))
        region.contextLabel = undefined
    })
    locator = {
      width,
      height,
      corner,
      regions: mainland.flatMap((feature) => {
        const d = locatorPath(rewindForD3(feature) as never)
        return d ? [{ d, visited: visitedNames.has(feature.properties.short) }] : []
      }),
      frame: {
        x: Math.max(topLeft[0], 0.5),
        y: Math.max(topLeft[1], 0.5),
        w: Math.min(bottomRight[0], width - 0.5) - Math.max(topLeft[0], 0.5),
        h: Math.min(bottomRight[1], height - 0.5) - Math.max(topLeft[1], 0.5),
      },
    }
  }

  const areaLabels: AreaLabel[] = regions.flatMap(region => [
    ...(region.label ? [{ point: region.label, text: region.name, ratio: 1, tracking: 1.12 }] : []),
    ...(region.contextLabel ? [{ point: region.contextLabel, text: region.name, ratio: CONTEXT_LABEL_RATIO, tracking: 1.24 }] : []),
  ])
  const spots = placeCityLabels(cityList, areaLabels, blocked, frame, labelSize, dotRadius, DESKTOP_SCALE)
  const compactSpots = placeCityLabels(cityList, areaLabels, compactBlocked, frame, labelSize, dotRadius, COMPACT_SCALE)
  cityList.forEach((city, index) => {
    city.label = { ...spots[index], show: spots[index].show && !national }
    city.compactLabel = { ...compactSpots[index], show: compactSpots[index].show && !national }
  })

  const avoid: Corner[] = locator ? [locator.corner] : ['br']
  const scope = national ? 'china' : 'region'
  return {
    empty: false,
    scope,
    summary: [...new Set(entries.map(entry => entry.key))].join('、'),
    span: buildSpan(entries),
    viewBox: viewBoxOf(frame),
    labelSize,
    dotRadius,
    regions,
    cities: cityList,
    groups: buildGroups(chinaRecords, entries, 'province', key => cardCorner(frame, areaBoxes.get(key), avoid)),
    inset,
    locator,
    stats: buildStats(chinaRecords, scope),
    timeline: buildTimeline(entries),
    milestones: entries.filter(entry => entry.kind !== 'visit').reverse(),
  }
}

function projectWorld(records: PlacedTravel[]): TravelMapModel {
  const features = world.features
  const projection = geoNaturalEarth1().fitExtent([[8, 8], [860, 460]], collection(features))
  const path = geoPath(projection)
  const frame = { x: 8, y: 8, w: 852, h: 452 }
  const labelSize = frame.w / 72
  const visited = new Set(records.map(record => record.countryId))
  const names = new Map(
    features
      .filter(feature => feature.properties.iso === feature.properties.partOf)
      .map(feature => [feature.properties.iso, feature.properties.zh]),
  )
  const entries = buildEntries(records, 'country')
  const countryBoxes = new Map(
    features
      .filter(feature => feature.properties.iso === feature.properties.partOf && visited.has(feature.properties.iso))
      .map(feature => [feature.properties.iso, boundsOf(projection, [feature])]),
  )
  let order = 0
  const regions: TravelMapRegion[] = features.flatMap((feature) => {
    const d = path(rewindForD3(feature) as never)
    if (!d)
      return []
    const key = feature.properties.partOf
    const isVisited = visited.has(key)
    const anchor = featureAnchor(projection, feature)
    const canLabel = isVisited && feature.properties.iso === key && anchor && inside(anchor.x, anchor.y, frame)
    return [{
      key,
      name: names.get(key) ?? feature.properties.zh,
      d,
      visited: isVisited,
      entry: isVisited ? latestEntry(entries, entry => entry.key === key) : undefined,
      order: isVisited ? order++ : 0,
      label: canLabel && anchor ? anchor : undefined,
    }]
  })

  return {
    empty: false,
    scope: 'world',
    summary: [...new Set(records.map(record => record.country))].join('、'),
    span: buildSpan(entries),
    viewBox: viewBoxOf(frame),
    labelSize,
    dotRadius: 0,
    regions,
    cities: [],
    groups: buildGroups(records, entries, 'country', key => cardCorner(frame, countryBoxes.get(key), [])),
    stats: buildStats(records, 'world'),
    timeline: buildTimeline(entries),
    milestones: entries.filter(entry => entry.kind !== 'visit').reverse(),
  }
}

export function projectTravels(input: TravelPlace[]) {
  const warnings: string[] = []
  const records = normalize(input, warnings)
  if (warnings.length)
    console.warn(`[足迹]\n${warnings.join('\n')}`)
  if (!records.length)
    return emptyModel()
  if (records.some(record => record.country !== '中国'))
    return projectWorld(records)
  return projectChina(records)
}

export function buildTravelMap() {
  return projectTravels(configuredTravels)
}
