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

interface PlacedTravel {
  city?: string
  province?: string
  country: string
  countryId: string
  visited?: string
  note?: string
  post?: string
  lng?: number
  lat?: number
}

export interface TravelMapPlace {
  city?: string
  province?: string
  visited?: string
  note?: string
  post?: string
}

export interface TravelMapEntry {
  key: string
  title: string
  meta?: string
  visited?: string
  note?: string
  post?: string
}

export interface TravelMapGroup {
  key: string
  title: string
  places: TravelMapPlace[]
}

export interface TravelMapRegion {
  key: string
  name: string
  d: string
  visited: boolean
  kind?: string
  label?: { x: number, y: number }
}

export interface TravelMapModel {
  empty: boolean
  scope: 'region' | 'china' | 'world'
  summary: string
  countLabel: string
  viewBox: string
  labelSize: number
  dotRadius: number
  regions: TravelMapRegion[]
  inset?: {
    x: number
    y: number
    width: number
    height: number
    regions: TravelMapRegion[]
  }
  cities: Array<{
    key: string
    name: string
    x: number
    y: number
    align: 'start' | 'end'
  }>
  showCityNames: boolean
  showYears: boolean
  groups: TravelMapGroup[]
  entries: TravelMapEntry[]
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
const REGION_PAD = 0.12

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
    countLabel: '',
    viewBox: '0 0 1 1',
    labelSize: 12,
    dotRadius: 3,
    regions: [],
    cities: [],
    showCityNames: false,
    showYears: false,
    groups: [],
    entries: [],
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

function normalizePost(value: string | undefined, warnings: string[]) {
  if (!value?.trim())
    return
  const post = value.trim()
  if (!post.startsWith('/')) {
    warnings.push(`文章路径需要以 / 开头：${post}`)
    return
  }
  return post.endsWith('/') ? post : `${post}/`
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
    let lng: number | undefined
    let lat: number | undefined

    if (cityName && country.name === '中国') {
      const city = findCity(cityName, province)
      if (!city) {
        warnings.push(province
          ? `没有找到城市：${province} ${cityName}`
          : `没有找到城市：${cityName}`)
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
      note: item.note?.trim() || undefined,
      post: normalizePost(item.post, warnings),
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

function rewindForD3<Props>(feature: MapFeature<Props>): MapFeature<Props> {
  const geometry = structuredClone(feature.geometry)
  const polygons: PolygonRings[] = geometry.type === 'Polygon'
    ? [geometry.coordinates as PolygonRings]
    : geometry.coordinates as PolygonRings[]
  polygons.forEach((polygon) => {
    polygon.forEach((ring, index) => {
      const area = ringArea(ring)
      const exterior = index === 0
      if ((exterior && area > 0) || (!exterior && area < 0))
        ring.reverse()
    })
  })
  return { ...feature, geometry }
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

function placeAreaLabel(
  anchor: { x: number, y: number },
  ring: Array<[number, number]>,
  cities: Array<{ x: number, y: number }>,
  labelSize: number,
) {
  if (!cities.length)
    return anchor
  const clearanceOf = (point: { x: number, y: number }) =>
    Math.min(...cities.map(city => Math.hypot(city.x - point.x, city.y - point.y)))
  if (pointInRing(anchor.x, anchor.y, ring) && clearanceOf(anchor) >= labelSize * 2)
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
  let bestScore = pointInRing(anchor.x, anchor.y, ring) ? clearanceOf(anchor) : -1
  directions.forEach(([dx, dy]) => {
    ;[1.6, 2.4].forEach((scale) => {
      const point = { x: anchor.x + dx * labelSize * scale, y: anchor.y + dy * labelSize * scale }
      if (!pointInRing(point.x, point.y, ring))
        return
      const clearance = clearanceOf(point)
      const score = clearance - scale * labelSize * 0.2
      if (clearance >= labelSize * 1.7 && score > bestScore) {
        best = point
        bestScore = score
      }
    })
  })
  return best
}

function chooseCityAlign(
  city: { x: number, y: number },
  labels: Array<{ x: number, y: number }>,
  frame: Box,
  labelSize: number,
  dotRadius: number,
) {
  const gap = dotRadius * 2.8 + labelSize * 1.35
  const options = [
    { align: 'start' as const, x: city.x + gap },
    { align: 'end' as const, x: city.x - gap },
  ]
  const scored = options.map((option) => {
    const outside = option.x < frame.x + labelSize || option.x > frame.x + frame.w - labelSize ? 8 : 0
    const clash = labels.reduce((sum, label) => {
      const distance = Math.hypot(label.x - option.x, label.y - city.y)
      const limit = labelSize * 2.5
      return sum + (distance < limit ? limit - distance : 0)
    }, 0)
    return { align: option.align, score: outside + clash }
  })
  scored.sort((a, b) => a.score - b.score)
  return scored[0].align
}

function countLabel(records: PlacedTravel[], scope: 'region' | 'china' | 'world') {
  const parts: string[] = []
  if (scope === 'world') {
    const countries = new Set(records.map(record => record.country)).size
    if (countries)
      parts.push(`${countries} 个国家`)
  }
  else {
    const provinces = new Set(records.map(record => record.province).filter((name): name is string => Boolean(name))).size
    if (provinces)
      parts.push(`${provinces} 个省`)
  }
  const cities = new Set(
    records
      .filter(record => record.city)
      .map(record => `${record.country}:${record.province ?? ''}:${record.city}`),
  ).size
  if (cities)
    parts.push(`${cities} 座城`)
  return parts.join(' · ')
}

function buildEntries(records: PlacedTravel[], mode: 'province' | 'country'): TravelMapEntry[] {
  const provincesWithCity = new Set(
    records.filter(record => record.city && record.province).map(record => record.province as string),
  )
  return records.flatMap((record) => {
    const bare = !record.city && !record.note && !record.post && !record.visited
    if (mode === 'province' && bare && record.province && provincesWithCity.has(record.province))
      return []
    const key = mode === 'country'
      ? record.country
      : (record.province ?? record.city ?? record.country)
    const title = record.city || record.province || record.country
    let meta: string | undefined
    if (mode === 'country') {
      const parts = record.city
        ? [record.province, record.country]
        : [record.country]
      meta = parts.filter(name => name && name !== title).join(' · ') || undefined
    }
    else if (record.city && record.province && record.province !== title) {
      meta = record.province
    }
    return [{
      key,
      title,
      meta,
      visited: record.visited,
      note: record.note,
      post: record.post,
    }]
  }).sort((a, b) => {
    if (a.visited && b.visited)
      return b.visited.localeCompare(a.visited)
    if (a.visited)
      return -1
    if (b.visited)
      return 1
    return 0
  })
}

function buildGroups(records: PlacedTravel[], mode: 'province' | 'country') {
  const groups = new Map<string, TravelMapGroup>()
  records.forEach((record) => {
    const key = mode === 'country'
      ? record.country
      : (record.province ?? record.city ?? record.country)
    const group = groups.get(key) ?? { key, title: key, places: [] }
    if (record.city || record.note || record.post || record.visited || (mode === 'country' && record.province)) {
      group.places.push({
        city: record.city,
        province: record.province,
        visited: record.visited,
        note: record.note,
        post: record.post,
      })
    }
    groups.set(key, group)
  })

  return [...groups.values()].map(group => ({
    ...group,
    places: group.places.sort((a, b) => {
      if (a.visited && b.visited)
        return b.visited.localeCompare(a.visited)
      if (a.visited)
        return -1
      if (b.visited)
        return 1
      return (a.city ?? '').localeCompare(b.city ?? '', 'zh')
    }),
  }))
}

function projectChina(records: PlacedTravel[]): TravelMapModel {
  const mainland = china.features.filter(feature => !feature.properties.inset)
  const projection = geoConicEqualArea()
    .parallels([25, 47])
    .rotate([-104, 0])
    .fitExtent([[12, 12], [820, 700]], { type: 'FeatureCollection', features: mainland } as never)
  const path = geoPath(projection)
  const full = boundsOf(projection, mainland)
  const visitedNames = new Set(records.map(record => record.province).filter((name): name is string => Boolean(name)))
  const visitedFeatures = mainland.filter(feature => visitedNames.has(feature.properties.short))
  const focusSource = visitedFeatures.length ? boundsOf(projection, visitedFeatures) : full
  const national = !visitedFeatures.length
    || focusSource.w / full.w >= NATIONAL_RATIO
    || focusSource.h / full.h >= NATIONAL_RATIO
  const frame = national ? full : pad(focusSource, REGION_PAD)
  const labelSize = frame.w / 34
  const dotRadius = frame.w / 150

  const areaRings = new Map<string, Array<[number, number]>>()
  const regions = mainland.flatMap((feature) => {
    const box = boundsOf(projection, [feature])
    if (!national && !intersects(box, frame))
      return []
    const d = path(rewindForD3(feature) as never)
    if (!d)
      return []
    const visited = visitedNames.has(feature.properties.short)
    const anchor = featureAnchor(projection, feature)
    const ring = projectedRing(projection, feature)
    if (ring)
      areaRings.set(feature.properties.short, ring)
    const label = visited && anchor && inside(anchor.x, anchor.y, frame)
      ? anchor
      : undefined
    return [{
      key: feature.properties.short,
      name: feature.properties.short,
      d,
      visited,
      label,
    }]
  })

  const cityDots = new Map<string, TravelMapModel['cities'][number]>()
  records.forEach((record) => {
    if (!record.city || !record.province || record.lng == null || record.lat == null)
      return
    const projected = projection([record.lng, record.lat])
    if (!projected || !inside(projected[0], projected[1], frame))
      return
    const id = `${record.province}:${record.city}`
    if (cityDots.has(id))
      return
    cityDots.set(id, {
      key: record.province,
      name: record.city,
      x: projected[0],
      y: projected[1],
      align: 'start',
    })
  })
  const cityList = [...cityDots.values()]
  regions.forEach((region) => {
    if (!region.label)
      return
    const ring = areaRings.get(region.key)
    const localCities = cityList.filter(city => city.key === region.key)
    if (!ring || !localCities.length)
      return
    region.label = placeAreaLabel(region.label, ring, localCities, labelSize)
  })
  const labelPoints = regions.flatMap(region => region.label ? [region.label] : [])
  cityList.forEach((city) => {
    city.align = chooseCityAlign(city, labelPoints, frame, labelSize, dotRadius)
  })

  let inset: TravelMapModel['inset']
  if (national) {
    const south = china.features.filter(feature => feature.properties.inset)
    const box = {
      x: frame.x + frame.w * 0.74,
      y: frame.y + frame.h * 0.7,
      w: frame.w * 0.22,
      h: frame.h * 0.26,
    }
    const southProjection = geoMercator().fitExtent(
      [[box.x + box.w * 0.08, box.y + box.h * 0.08], [box.x + box.w * 0.92, box.y + box.h * 0.92]],
      { type: 'FeatureCollection', features: south } as never,
    )
    const southPath = geoPath(southProjection)
    inset = {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      regions: south.flatMap((feature) => {
        const d = southPath(rewindForD3(feature) as never)
        if (!d)
          return []
        return [{
          key: feature.properties.short,
          name: feature.properties.short,
          d,
          visited: visitedNames.has(feature.properties.short),
          kind: feature.properties.kind,
        }]
      }),
    }
  }

  const chinaRecords = records.filter(record => record.country === '中国')
  const scope = national ? 'china' : 'region'
  const groups = buildGroups(chinaRecords, 'province')
  return {
    empty: false,
    scope,
    summary: groups.map(group => group.title).join('、'),
    countLabel: countLabel(chinaRecords, scope),
    viewBox: viewBoxOf(frame),
    labelSize,
    dotRadius,
    regions,
    inset,
    cities: cityList,
    showCityNames: !national || cityList.length <= 8,
    showYears: !national,
    groups,
    entries: buildEntries(chinaRecords, 'province'),
  }
}

function projectWorld(records: PlacedTravel[]): TravelMapModel {
  const features = world.features
  const projection = geoNaturalEarth1().fitExtent(
    [[8, 8], [860, 460]],
    { type: 'FeatureCollection', features } as never,
  )
  const path = geoPath(projection)
  const frame = { x: 8, y: 8, w: 852, h: 452 }
  const labelSize = frame.w / 72
  const visited = new Set(records.map(record => record.countryId))
  const labeled = new Set<string>()
  const regions = features.flatMap((feature) => {
    const d = path(rewindForD3(feature) as never)
    if (!d)
      return []
    const id = feature.properties.partOf
    const isVisited = visited.has(id)
    const anchor = featureAnchor(projection, feature)
    const canLabel = isVisited && feature.properties.iso === id && !labeled.has(id) && anchor && inside(anchor.x, anchor.y, frame)
    if (canLabel)
      labeled.add(id)
    return [{
      key: feature.properties.zh,
      name: feature.properties.zh,
      d,
      visited: isVisited,
      label: canLabel && anchor ? anchor : undefined,
    }]
  })
  const groups = buildGroups(records, 'country')

  return {
    empty: false,
    scope: 'world',
    summary: groups.map(group => group.title).join('、'),
    countLabel: countLabel(records, 'world'),
    viewBox: viewBoxOf(frame),
    labelSize,
    dotRadius: 0,
    regions,
    cities: [],
    showCityNames: false,
    showYears: false,
    groups,
    entries: buildEntries(records, 'country'),
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
