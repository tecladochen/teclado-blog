import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import consola from 'consola'
import { themeConfig } from '../src/.config'

/**
 * 文章结构与展示规则检查。
 *
 * 用法：
 *   pnpm theme:check              检查全部文章
 *   pnpm theme:check uv-guide     只检查指定文章
 */

const POSTS_DIR = path.resolve('src/content/posts')

/** 宽度单位为半宽字符：汉字算 2，ASCII 算 1。 */
const LIMITS = {
  titleWidth: 40, // 20 个汉字，主标题占满正文列，可略长
  titleWidthMax: 48, // 24 个汉字，超过必须改短
  headingWidth: 28, // 14 个汉字，目录两列单行上限
  descriptionMin: 55, // 汉字数
  descriptionMax: 75,
  tableColumns: 3,
  tableColumnsMax: 4,
  paragraphChars: 240, // 汉字数，移动端约 12 行
}

/** 正文列宽约 520px，正文 16px 下半宽字符约 8px。 */
const PROSE_WIDTH = 520
const HALF_WIDTH_PX = 8
/** 单元格左右 padding 加边框，与 global.css 里的值对应。 */
const CELL_CHROME_PX = 26

/**
 * 单元格宽度上限：按列数分配正文宽度，并允许折到两行。
 * 2 列约 29 个汉字，3 列约 18 个，4 列约 13 个。
 */
function cellWidthLimit(columns: number): number {
  const contentPx = (PROSE_WIDTH - columns * CELL_CHROME_PX) / columns
  return Math.max(Math.round((contentPx / HALF_WIDTH_PX) * 2), 12)
}

type Level = 'error' | 'warn'

interface Issue {
  level: Level
  rule: string
  message: string
  line?: number
}

interface Frontmatter {
  raw: Record<string, string>
  title?: string
  pubDate?: string
  description?: string
  categories?: string[]
  draft?: boolean
  series?: { name?: string, order?: string }
}

interface PostFile {
  /** 相对 POSTS_DIR 的路径，例如 uv-guide/index.md */
  id: string
  slug: string
  filePath: string
  dir: string
  fileName: string
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkPosts(process.argv.slice(2))
}

function checkPosts(targets: string[]): void {
  const allPosts = collectPosts()

  if (allPosts.length === 0) {
    consola.warn('没有找到任何文章。')
    return
  }

  const selected = targets.length > 0 ? selectPosts(allPosts, targets) : allPosts

  if (selected.length === 0) {
    consola.error(`没有匹配的文章：${targets.join('、')}`)
    process.exitCode = 1
    return
  }

  // order 冲突要放在全量文章里判断，即使这次只检查一篇
  const seriesIndex = buildSeriesIndex(allPosts)

  const seriesMapIssues = checkSeriesMap()
  let errors = seriesMapIssues.filter(issue => issue.level === 'error').length
  let warnings = 0

  reportConfiguration(seriesMapIssues)

  for (const post of selected) {
    const issues = checkPost(post, seriesIndex)
    errors += issues.filter(issue => issue.level === 'error').length
    warnings += issues.filter(issue => issue.level === 'warn').length
    report(post, issues)
  }

  consola.log('')
  const summary = `检查 ${selected.length} 篇文章：${errors} 个 error，${warnings} 个 warning`

  if (errors > 0) {
    consola.error(summary)
    process.exitCode = 1
  }
  else if (warnings > 0) {
    consola.warn(summary)
  }
  else {
    consola.success(summary)
  }
}

function checkSeriesMap(): Issue[] {
  const issues: Issue[] = []
  const names = new Set<string>()
  const paths = new Set<string>()

  for (const series of themeConfig.site.seriesMap) {
    if (names.has(series.name)) {
      issues.push({
        level: 'error',
        rule: 'series-map',
        message: `专栏名称重复：「${series.name}」`,
      })
    }
    names.add(series.name)

    if (paths.has(series.path)) {
      issues.push({
        level: 'error',
        rule: 'series-map',
        message: `专栏路径重复：「${series.path}」`,
      })
    }
    paths.add(series.path)
  }

  return issues
}

function collectPosts(): PostFile[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return []
  }

  const posts: PostFile[] = []

  for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }

    const dir = path.join(POSTS_DIR, entry.name)

    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) {
        continue
      }

      posts.push({
        id: `${entry.name}/${file}`,
        slug: entry.name,
        filePath: path.join(dir, file),
        dir,
        fileName: file,
      })
    }
  }

  return posts.sort((a, b) => a.id.localeCompare(b.id))
}

function selectPosts(posts: PostFile[], targets: string[]): PostFile[] {
  const normalized = targets.map((target) => {
    const relative = path.relative(POSTS_DIR, path.resolve(target))
    return (relative.startsWith('..') ? target : relative).replaceAll(path.sep, '/')
  })

  return posts.filter(post =>
    normalized.some(target => post.slug === target || post.id === target || post.id.startsWith(`${target}/`)),
  )
}

function buildSeriesIndex(posts: PostFile[]): Map<string, Map<string, string[]>> {
  const index = new Map<string, Map<string, string[]>>()

  for (const post of posts) {
    const { frontmatter } = readPost(post)
    const name = frontmatter.series?.name
    const order = frontmatter.series?.order

    if (!name || !order) {
      continue
    }

    const orders = index.get(name) ?? new Map<string, string[]>()
    orders.set(order, [...(orders.get(order) ?? []), post.id])
    index.set(name, orders)
  }

  return index
}

function checkPost(post: PostFile, seriesIndex: Map<string, Map<string, string[]>>): Issue[] {
  const { frontmatter, body, bodyOffset } = readPost(post)

  return [
    ...checkFileName(post),
    ...checkFrontmatter(post, frontmatter, seriesIndex),
    ...checkHeadings(body, bodyOffset),
    ...checkTables(body, bodyOffset),
    ...checkParagraphs(body, bodyOffset),
    ...checkImages(post, body, bodyOffset),
  ]
}

function checkFileName(post: PostFile): Issue[] {
  const issues: Issue[] = []

  if (!/^index\.mdx?$/.test(post.fileName)) {
    issues.push({
      level: 'error',
      rule: 'filename',
      message: `正文文件必须叫 index.md 或 index.mdx，当前是「${post.fileName}」，文件名会被并进 URL：/posts/${post.slug}/<文件名>/`,
    })
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
    issues.push({
      level: 'error',
      rule: 'slug',
      message: `目录名要用小写英文数字加连字符，当前是「${post.slug}」`,
    })
  }

  return issues
}

function checkFrontmatter(
  post: PostFile,
  frontmatter: Frontmatter,
  seriesIndex: Map<string, Map<string, string[]>>,
): Issue[] {
  const issues: Issue[] = []
  const draft = frontmatter.draft === true

  if (!frontmatter.title) {
    issues.push({ level: 'error', rule: 'title', message: '缺少 title' })
  }
  else {
    const width = visualWidth(stripInline(frontmatter.title))

    if (width > LIMITS.titleWidthMax) {
      issues.push({
        level: 'error',
        rule: 'title',
        message: `标题视觉宽度 ${width}，超过上限 ${LIMITS.titleWidthMax}（约 ${LIMITS.titleWidthMax / 2} 个汉字），主标题也会折成过多行`,
      })
    }
    else if (width > LIMITS.titleWidth) {
      issues.push({
        level: 'warn',
        rule: 'title',
        message: `标题视觉宽度 ${width}，建议压到 ${LIMITS.titleWidth} 以内（约 ${LIMITS.titleWidth / 2} 个汉字）`,
      })
    }
  }

  if (!frontmatter.pubDate) {
    issues.push({ level: 'error', rule: 'pubDate', message: '缺少 pubDate' })
  }

  if (!frontmatter.description) {
    issues.push({
      level: draft ? 'warn' : 'error',
      rule: 'description',
      message: draft ? '草稿还没有 description，发布前要补上' : '缺少 description，列表页、SEO 和 RSS 都要用',
    })
  }
  else {
    const chars = countChars(frontmatter.description)

    if (chars < LIMITS.descriptionMin || chars > LIMITS.descriptionMax) {
      issues.push({
        level: 'warn',
        rule: 'description',
        message: `摘要 ${chars} 字，建议 ${LIMITS.descriptionMin}~${LIMITS.descriptionMax} 字`,
      })
    }
  }

  const categoryNames = themeConfig.site.categoryMap.map(category => category.name)

  if (!frontmatter.categories || frontmatter.categories.length === 0) {
    issues.push({ level: 'error', rule: 'categories', message: '缺少 categories' })
  }
  else {
    for (const category of frontmatter.categories) {
      if (!categoryNames.includes(category)) {
        issues.push({
          level: 'error',
          rule: 'categories',
          message: `分类「${category}」没有登记在 src/.config/user.ts 的 categoryMap 里，会生成中文 URL`,
        })
      }
    }
  }

  const series = frontmatter.series

  if (series) {
    const seriesNames = themeConfig.site.seriesMap.map(item => item.name)

    if (!series.name) {
      issues.push({ level: 'error', rule: 'series', message: 'series 缺少 name' })
    }
    else if (!seriesNames.includes(series.name)) {
      issues.push({
        level: 'error',
        rule: 'series',
        message: `专栏「${series.name}」没有登记在 src/.config/user.ts 的 seriesMap 里，会生成中文 URL`,
      })
    }

    const order = Number(series.order)

    if (series.order === undefined) {
      issues.push({ level: 'error', rule: 'series', message: 'series 缺少 order' })
    }
    else if (!Number.isInteger(order) || order <= 0) {
      issues.push({ level: 'error', rule: 'series', message: `series.order 必须是大于 0 的整数，当前是「${series.order}」` })
    }
    else if (series.name) {
      const conflicts = (seriesIndex.get(series.name)?.get(series.order) ?? []).filter(id => id !== post.id)

      if (conflicts.length > 0) {
        issues.push({
          level: 'error',
          rule: 'series',
          message: `专栏「${series.name}」里 order ${order} 与 ${conflicts.join('、')} 冲突`,
        })
      }
    }
  }

  return issues
}

function checkHeadings(body: string[], offset: number): Issue[] {
  const issues: Issue[] = []
  let previousLevel = 1

  for (const { line, index } of iterateContent(body)) {
    const match = /^(#{1,6})[ \t](.*)$/.exec(line)

    if (!match) {
      continue
    }

    const level = match[1].length
    const text = match[2].trim()
    const lineNumber = offset + index + 1

    if (level === 1) {
      issues.push({
        level: 'error',
        rule: 'heading',
        message: '正文里不要用一级标题，文章大标题由 Frontmatter 的 title 渲染',
        line: lineNumber,
      })
    }

    if (level >= 4) {
      issues.push({
        level: 'warn',
        rule: 'heading',
        message: `标题层级过深（h${level}），窄栏下层级感很弱，改用 h2/h3 或直接用加粗小节`,
        line: lineNumber,
      })
    }

    if (level > previousLevel + 1) {
      issues.push({
        level: 'warn',
        rule: 'heading',
        message: `标题层级从 h${previousLevel} 跳到 h${level}`,
        line: lineNumber,
      })
    }

    const width = visualWidth(stripInline(text))

    if (width > LIMITS.headingWidth) {
      issues.push({
        level: 'warn',
        rule: 'heading',
        message: `小标题视觉宽度 ${width}，建议压到 ${LIMITS.headingWidth} 以内（约 ${LIMITS.headingWidth / 2} 个汉字），否则目录两列会换行：${text}`,
        line: lineNumber,
      })
    }

    previousLevel = level
  }

  return issues
}

function checkTables(body: string[], offset: number): Issue[] {
  const issues: Issue[] = []
  const lines = [...iterateContent(body)]

  let tableStart = -1
  let rows: { cells: string[], index: number }[] = []

  const flush = (): void => {
    if (tableStart >= 0 && rows.length > 0) {
      issues.push(...checkTable(rows, offset, tableStart))
    }

    tableStart = -1
    rows = []
  }

  for (const { line, index } of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('|')) {
      if (tableStart < 0) {
        tableStart = index
      }

      if (!isDelimiterRow(trimmed)) {
        rows.push({ cells: splitRow(trimmed), index })
      }
    }
    else {
      flush()
    }
  }

  flush()

  return issues
}

function checkTable(
  rows: { cells: string[], index: number }[],
  offset: number,
  tableStart: number,
): Issue[] {
  const issues: Issue[] = []
  const columns = Math.max(...rows.map(row => row.cells.length))
  const line = offset + tableStart + 1
  const cellLimit = cellWidthLimit(columns)

  if (columns > LIMITS.tableColumnsMax) {
    issues.push({
      level: 'error',
      rule: 'table',
      message: `表格 ${columns} 列，正文只有约 32 个汉字宽，必须改成 ${LIMITS.tableColumns} 列以内或拆成「小标题 + 要点列表」`,
      line,
    })
  }
  else if (columns > LIMITS.tableColumns) {
    issues.push({
      level: 'warn',
      rule: 'table',
      message: `表格 ${columns} 列，建议收到 ${LIMITS.tableColumns} 列以内`,
      line,
    })
  }

  for (const row of rows) {
    for (const cell of row.cells) {
      const text = stripInline(cell)

      if (/\$[^$]+\$/.test(cell)) {
        issues.push({
          level: 'warn',
          rule: 'table',
          message: `单元格里有 LaTeX 公式，窄栏下会挤压变形，建议把公式移到表格下方：${truncate(cell)}`,
          line: offset + row.index + 1,
        })
        continue
      }

      if (/```|<br\s*\/?>|(?:^|\s)[-*]\s/.test(cell)) {
        issues.push({
          level: 'warn',
          rule: 'table',
          message: `单元格里有代码块、换行标签或列表，改成表格下方的段落：${truncate(cell)}`,
          line: offset + row.index + 1,
        })
        continue
      }

      const width = visualWidth(text)

      if (width > cellLimit) {
        issues.push({
          level: 'warn',
          rule: 'table',
          message: `单元格视觉宽度 ${width}，${columns} 列表格每格上限 ${cellLimit}（约 ${Math.floor(cellLimit / 2)} 个汉字）：${truncate(text)}`,
          line: offset + row.index + 1,
        })
      }
    }
  }

  return issues
}

function checkParagraphs(body: string[], offset: number): Issue[] {
  const issues: Issue[] = []
  let buffer: string[] = []
  let start = 0

  const flush = (): void => {
    if (buffer.length === 0) {
      return
    }

    const text = buffer.join('')
    const chars = countChars(stripInline(text))

    if (chars > LIMITS.paragraphChars) {
      issues.push({
        level: 'warn',
        rule: 'paragraph',
        message: `段落约 ${chars} 字，移动端要占十几行，建议按逻辑切开：${truncate(text)}`,
        line: offset + start + 1,
      })
    }

    buffer = []
  }

  for (const { line, index } of iterateContent(body)) {
    const trimmed = line.trim()
    const isProse = trimmed !== '' && !/^(?:[#>|\-*+<]|\d+\.|:::)/.test(trimmed)

    if (isProse) {
      if (buffer.length === 0) {
        start = index
      }

      buffer.push(trimmed)
    }
    else {
      flush()
    }
  }

  flush()

  return issues
}

function checkImages(post: PostFile, body: string[], offset: number): Issue[] {
  const issues: Issue[] = []

  for (const { line, index } of iterateContent(body)) {
    const lineNumber = offset + index + 1
    const references = [
      ...line.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g),
      ...line.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/g),
    ]

    for (const reference of references) {
      const source = reference[1]

      if (/^(?:https?:)?\/\//.test(source) || source.startsWith('data:')) {
        continue
      }

      if (source.startsWith('/')) {
        issues.push({
          level: 'warn',
          rule: 'image',
          message: `图片用了绝对路径「${source}」，建议放进文章目录并用 ./name.png 引用，这样能走 Astro 的图片优化`,
          line: lineNumber,
        })
        continue
      }

      const decoded = decodeURIComponent(source.split('#')[0])
      const resolved = path.resolve(post.dir, decoded)

      if (!fs.existsSync(resolved)) {
        issues.push({
          level: 'error',
          rule: 'image',
          message: `图片不存在：${source}`,
          line: lineNumber,
        })
        continue
      }

      const fileName = path.basename(decoded)

      if (/[^\w.\-]/.test(fileName)) {
        issues.push({
          level: 'warn',
          rule: 'image',
          message: `图片文件名有中文、空格或特殊字符，链接里会变成 URL 编码：${fileName}`,
          line: lineNumber,
        })
      }

      if (decoded.startsWith('..')) {
        issues.push({
          level: 'warn',
          rule: 'image',
          message: `图片放在文章目录外：${source}`,
          line: lineNumber,
        })
      }
    }
  }

  return issues
}

/** 跳过代码块内容，避免把注释里的 # 当标题、把 ASCII 图当表格。 */
function* iterateContent(lines: string[]): Generator<{ line: string, index: number }> {
  let inFence = false
  let fence = ''

  for (const [index, line] of lines.entries()) {
    const match = /^[ \t]*(`{3,}|~{3,})/.exec(line)

    if (match) {
      if (!inFence) {
        inFence = true
        fence = match[1][0]
      }
      else if (match[1][0] === fence) {
        inFence = false
      }

      continue
    }

    if (!inFence) {
      yield { line, index }
    }
  }
}

function readPost(post: PostFile): { frontmatter: Frontmatter, body: string[], bodyOffset: number } {
  const lines = fs.readFileSync(post.filePath, 'utf8').split(/\r?\n/)

  if (lines[0]?.trim() !== '---') {
    return { frontmatter: { raw: {} }, body: lines, bodyOffset: 0 }
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')

  if (end < 0) {
    return { frontmatter: { raw: {} }, body: lines, bodyOffset: 0 }
  }

  return {
    frontmatter: parseFrontmatter(lines.slice(1, end)),
    body: lines.slice(end + 1),
    bodyOffset: end + 1,
  }
}

/**
 * 只解析本项目 Frontmatter 用到的形状（标量、行内数组、series 的两个子字段），
 * 不引入 YAML 依赖。
 */
function parseFrontmatter(lines: string[]): Frontmatter {
  const raw: Record<string, string> = {}
  const nested: Record<string, Record<string, string | undefined>> = {}
  let currentKey = ''

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue
    }

    const nestedMatch = /^[ \t]+([a-z_]\w*):(.*)$/i.exec(line)

    if (nestedMatch && currentKey) {
      nested[currentKey] = { ...nested[currentKey], [nestedMatch[1]]: unquote(nestedMatch[2]) }
      continue
    }

    const match = /^([a-z_]\w*):(.*)$/i.exec(line)

    if (match) {
      currentKey = match[1]
      raw[currentKey] = match[2].trim()
    }
  }

  const series = nested.series

  return {
    raw,
    title: unquote(raw.title),
    pubDate: unquote(raw.pubDate),
    description: unquote(raw.description),
    categories: raw.categories === undefined ? undefined : parseArray(raw.categories),
    draft: raw.draft === undefined ? undefined : unquote(raw.draft) === 'true',
    series: series ? { name: series.name, order: series.order } : undefined,
  }
}

function parseArray(value: string): string[] {
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(item => unquote(item))
    .filter((item): item is string => Boolean(item))
}

function unquote(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return undefined
  }

  if (/^'.*'$/s.test(trimmed)) {
    return trimmed.slice(1, -1).replaceAll('\'\'', '\'')
  }

  if (/^".*"$/s.test(trimmed)) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function isDelimiterRow(line: string): boolean {
  return /^\|(?:\s*:?-+:?\s*\|)+$/.test(line)
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map(cell => cell.trim())
}

/** 去掉 Markdown 行内标记，只留渲染后可见的文字。 */
function stripInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function visualWidth(text: string): number {
  let width = 0

  for (const char of text) {
    width += isFullWidth(char.codePointAt(0) ?? 0) ? 2 : 1
  }

  return width
}

/** 汉字数，用于摘要和段落长度这类按字数表述的规则。 */
function countChars(text: string): number {
  return Math.round(visualWidth(text) / 2)
}

function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115F)
    || (code >= 0x2E80 && code <= 0xA4CF)
    || (code >= 0xAC00 && code <= 0xD7A3)
    || (code >= 0xF900 && code <= 0xFAFF)
    || (code >= 0xFE30 && code <= 0xFE6F)
    || (code >= 0xFF00 && code <= 0xFF60)
    || (code >= 0xFFE0 && code <= 0xFFE6)
    || (code >= 0x1F300 && code <= 0x1F9FF)
    || (code >= 0x20000 && code <= 0x3FFFD)
  )
}

function truncate(text: string, max = 24): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized
}

function report(post: PostFile, issues: Issue[]): void {
  if (issues.length === 0) {
    consola.log(`  ✔ ${post.id}`)
    return
  }

  consola.log(`  ${issues.some(issue => issue.level === 'error') ? '✖' : '!'} ${post.id}`)

  for (const issue of issues) {
    const location = issue.line === undefined ? '' : `:${issue.line}`
    consola.log(`      ${issue.level === 'error' ? 'error' : 'warn '}  ${issue.rule}${location}  ${issue.message}`)
  }
}

function reportConfiguration(issues: Issue[]): void {
  if (issues.length === 0) {
    consola.log('  ✔ seriesMap')
    return
  }

  consola.log('  ✖ seriesMap')
  for (const issue of issues) {
    consola.log(`      ${issue.level === 'error' ? 'error' : 'warn '}  ${issue.rule}  ${issue.message}`)
  }
}

export { cellWidthLimit, checkPost, countChars, LIMITS, visualWidth }
