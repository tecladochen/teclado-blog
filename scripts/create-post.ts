import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import consola from 'consola'
import dayjs from 'dayjs'

const POSTS_DIR = path.resolve('src/content/posts')
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const KINDS = ['reading', 'note', 'life'] as const

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createPost()
}

async function createPost(): Promise<void> {
  consola.start('创建一篇新文章')

  const title = String(await consola.prompt('文章标题', { type: 'text', cancel: 'reject' })).trim()
  const suggested = toSlug(title)
  const slug = String(await consola.prompt('目录名 / slug', { type: 'text', initial: suggested, cancel: 'reject' })).trim()
  if (!SLUG_RE.test(slug))
    throw new Error('slug 只用小写英文、数字和连字符')

  const kind = await consola.prompt('类型', {
    type: 'select',
    options: [...KINDS],
    initial: 'note',
    cancel: 'reject',
  }) as typeof KINDS[number]

  const description = String(await consola.prompt('摘要', { type: 'text', cancel: 'reject' })).trim()
  const draft = Boolean(await consola.prompt('保存为草稿？', { type: 'confirm', initial: true, cancel: 'reject' }))

  const postDir = path.join(POSTS_DIR, slug)
  const fullPath = path.join(postDir, 'index.md')
  if (fs.existsSync(postDir))
    throw new Error(`文章目录已存在：${path.relative(process.cwd(), postDir)}`)

  fs.mkdirSync(postDir)
  fs.writeFileSync(fullPath, [
    '---',
    `title: ${quote(title)}`,
    `pubDate: ${dayjs().format('YYYY-MM-DD')}`,
    `kind: ${kind}`,
    `description: ${quote(description)}`,
    `draft: ${draft}`,
    '---',
    '',
    '',
  ].join('\n'), { flag: 'wx' })

  consola.success(`文章已创建：${path.relative(process.cwd(), fullPath)}`)

  const open = Boolean(await consola.prompt('用 VS Code 打开？', { type: 'confirm', initial: true, cancel: 'reject' }))
  if (open)
    execFileSync('code', [fullPath], { stdio: 'inherit' })
}

function toSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\u4E00-\u9FA5a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled'
}

function quote(value: string): string {
  return JSON.stringify(value)
}
