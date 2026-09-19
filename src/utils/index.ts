import type { Post } from '~/types'
import { getCollection } from 'astro:content'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

dayjs.extend(utc)

export async function getCategories() {
  const posts = await getPosts()
  const categories = new Map<string, Post[]>()

  for (const post of posts) {
    if (post.data.categories) {
      for (const c of post.data.categories) {
        const posts = categories.get(c) || []
        posts.push(post)
        categories.set(c, posts)
      }
    }
  }

  return categories
}

export async function getSeries() {
  const posts = await getPosts()
  const series = new Map<string, Post[]>()

  for (const post of posts) {
    const seriesName = post.data.series?.name
    if (seriesName) {
      const posts = series.get(seriesName) || []
      posts.push(post)
      series.set(seriesName, sortSeriesPosts(posts))
    }
  }

  return series
}

export function sortSeriesPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    const aOrder = a.data.series?.order ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.data.series?.order ?? Number.MAX_SAFE_INTEGER
    if (aOrder !== bOrder) {
      return aOrder - bOrder
    }

    return dayjs(a.data.pubDate).isBefore(dayjs(b.data.pubDate)) ? -1 : 1
  })
}

export async function getPosts(isArchivePage = false) {
  const posts = await getCollection('posts')

  posts.sort((a, b) => {
    if (isArchivePage) {
      const publishedDiff = b.data.pubDate.getTime() - a.data.pubDate.getTime()
      return publishedDiff || a.id.localeCompare(b.id)
    }

    const aDate = a.data.modDate ? dayjs(a.data.modDate) : dayjs(a.data.pubDate)
    const bDate = b.data.modDate ? dayjs(b.data.modDate) : dayjs(b.data.pubDate)
    const updatedDiff = bDate.valueOf() - aDate.valueOf()
    if (updatedDiff) {
      return updatedDiff
    }

    const publishedDiff = b.data.pubDate.getTime() - a.data.pubDate.getTime()
    return publishedDiff || a.id.localeCompare(b.id)
  })

  // 始终过滤草稿文章，确保纯净生活随笔与手札体验
  return posts.filter(post => post.data.draft !== true)
}

export function getWordCountAndReadTime(body: string = '') {
  // 去除 markdown 标记与空白字符，统计正文字数
  const text = body.replace(/[#*`~>[\]()\-+]/g, ' ').replace(/\s+/g, '')
  const count = Math.max(text.length, 1)
  // 中文静心阅读约 350-400 字/分钟
  const minutes = Math.max(1, Math.ceil(count / 380))
  return { count, minutes }
}

const parser = new MarkdownIt()
export function getPostDescription(post: Post) {
  if (post.data.description) {
    return post.data.description
  }

  return getPostPlainText(post).slice(0, 400)
}

export function getPostPlainText(post: Post) {
  const html = parser.render(post.body || '')
  const sanitized = sanitizeHtml(html, { allowedTags: [] })
  return sanitized.replace(/\s+/g, ' ').trim()
}

export function formatDate(date: Date, format: string = 'YYYY-MM-DD') {
  return dayjs.utc(date).format(format)
}

export function getPathFromCategory(
  category: string,
  category_map: { name: string, path: string }[],
) {
  const mappingPath = category_map.find(l => l.name === category)
  return mappingPath ? mappingPath.path : category
}

export function getPathFromSeries(
  series: string,
  seriesMap: { name: string, path: string }[],
) {
  const mappingPath = seriesMap.find(l => l.name === series)
  return mappingPath ? mappingPath.path : series
}

export function getSeriesDescription(
  series: string,
  seriesMap: { name: string, description?: string }[],
) {
  return seriesMap.find(l => l.name === series)?.description
}
