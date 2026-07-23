import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import consola from 'consola'
import dayjs from 'dayjs'
import { themeConfig } from '../src/.config'

interface PostInput {
  title: string
  pubDate: string
  description: string
  categories: string[]
  series?: {
    name: string
    order: number
  }
  draft: boolean
}

const POSTS_DIR = path.resolve('src/content/posts')
const NO_SERIES = '__none__'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createPost()
}

async function createPost(): Promise<void> {
  consola.start('创建一篇新文章')

  try {
    const title = await promptRequiredText('文章标题')
    const suggestedSlug = toSlug(title)
    const slug = await promptSlug(suggestedSlug)
    const extension = await consola.prompt('文件格式', {
      type: 'select',
      options: ['.md', '.mdx'],
      initial: '.md',
      cancel: 'reject',
    })
    const draft = await consola.prompt('保存为草稿？', {
      type: 'confirm',
      initial: true,
      cancel: 'reject',
    })
    const description = await promptDescription(draft)
    const categories = await promptCategories()
    const series = await promptSeries()

    const postDir = path.join(POSTS_DIR, slug)
    const fullPath = path.join(postDir, `index${extension}`)

    if (fs.existsSync(postDir)) {
      throw new Error(`文章目录已存在：${path.relative(process.cwd(), postDir)}`)
    }

    fs.mkdirSync(postDir)
    fs.writeFileSync(
      fullPath,
      buildFrontmatter({
        title,
        pubDate: dayjs().format('YYYY-MM-DD'),
        description,
        categories,
        series,
        draft,
      }),
      { flag: 'wx' },
    )

    consola.success(`文章已创建：${path.relative(process.cwd(), fullPath)}`)

    const open = await consola.prompt('用 VS Code 打开？', {
      type: 'confirm',
      initial: true,
      cancel: 'reject',
    })

    if (open) {
      try {
        execFileSync('code', [fullPath], { stdio: 'ignore' })
      }
      catch {
        consola.warn('文章已创建，但无法自动打开 VS Code。')
      }
    }
  }
  catch (error) {
    consola.error((error as Error).message || '创建文章失败。')
    process.exitCode = 1
  }
}

async function promptRequiredText(message: string, initial?: string): Promise<string> {
  while (true) {
    const value = await consola.prompt(message, {
      type: 'text',
      initial,
      cancel: 'reject',
    })
    const normalized = value.trim()

    if (normalized) {
      return normalized
    }

    consola.warn('此项不能为空。')
  }
}

async function promptSlug(initial: string): Promise<string> {
  while (true) {
    const slug = await promptRequiredText(
      '文章目录名（小写英文、数字和连字符）',
      initial || undefined,
    )

    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return slug
    }

    consola.warn('目录名格式不正确，例如：my-first-post。')
  }
}

async function promptDescription(draft: boolean): Promise<string> {
  while (true) {
    const description = await consola.prompt(
      draft ? '文章摘要（草稿可留空）' : '文章摘要',
      {
        type: 'text',
        cancel: 'reject',
      },
    )
    const normalized = description.trim()

    if (draft || normalized) {
      return normalized
    }

    consola.warn('正式文章需要填写摘要。')
  }
}

async function promptCategories(): Promise<string[]> {
  const categoryHint = themeConfig.site.categoryMap.map(category => category.name).join('、')

  while (true) {
    const value = await consola.prompt(`分类（多个用逗号分隔，例如：${categoryHint}）`, {
      type: 'text',
      cancel: 'reject',
    })
    const categories = Array.from(
      new Set(value.split(/[,，]/).map(category => category.trim()).filter(Boolean)),
    )

    if (categories.length > 0) {
      return categories
    }

    consola.warn('请至少填写一个分类。')
  }
}

async function promptSeries(): Promise<PostInput['series']> {
  const seriesName = await consola.prompt('所属系列', {
    type: 'select',
    options: [
      { label: '不加入系列', value: NO_SERIES },
      ...themeConfig.site.seriesMap.map(series => ({
        label: series.name,
        value: series.name,
      })),
    ],
    initial: NO_SERIES,
    cancel: 'reject',
  })

  if (seriesName === NO_SERIES) {
    return undefined
  }

  while (true) {
    const value = await consola.prompt('系列中的顺序', {
      type: 'text',
      placeholder: '例如：3',
      cancel: 'reject',
    })
    const order = Number(value)

    if (Number.isInteger(order) && order > 0) {
      return { name: seriesName, order }
    }

    consola.warn('顺序必须是大于 0 的整数。')
  }
}

export function toSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildFrontmatter(post: PostInput): string {
  const lines = [
    '---',
    `title: ${yamlString(post.title)}`,
    `pubDate: ${post.pubDate}`,
    `description: ${yamlString(post.description)}`,
    `categories: [${post.categories.map(yamlString).join(', ')}]`,
  ]

  if (post.series) {
    lines.push(
      'series:',
      `  name: ${yamlString(post.series.name)}`,
      `  order: ${post.series.order}`,
    )
  }

  lines.push(`draft: ${post.draft}`, '---', '', '')
  return lines.join('\n')
}

function yamlString(value: string): string {
  return `'${value.replaceAll('\'', '\'\'')}'`
}
