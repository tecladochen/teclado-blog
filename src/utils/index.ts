import type { Post, SeriesChapter, SeriesMapItem, SeriesOverview } from '~/types'
import { getCollection } from 'astro:content'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import { themeConfig } from '~/.config'

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

export async function getSeriesOverviews(): Promise<SeriesOverview[]> {
  const postsBySeries = await getSeries()
  const overviews = themeConfig.site.seriesMap.map((config, configIndex) => {
    const posts = postsBySeries.get(config.name) ?? []
    const chapters = new Map<number, SeriesChapter>()

    for (const item of config.roadmap) {
      chapters.set(item.order, {
        order: item.order,
        title: item.title,
        description: item.description,
        state: 'planned',
      })
    }

    for (const post of posts) {
      const order = post.data.series?.order
      if (order == null) {
        continue
      }
      chapters.set(order, {
        order,
        title: post.data.title,
        description: getPostDescription(post),
        state: 'published',
        url: `/posts/${post.id}/`,
        publishedAt: post.data.pubDate,
      })
    }

    const sortedChapters = [...chapters.values()].sort((a, b) => a.order - b.order)
    const publishedCount = sortedChapters.filter(chapter => chapter.state === 'published').length
    const updatedAt = posts.reduce<Date | undefined>((latest, post) => {
      const date = post.data.modDate ?? post.data.pubDate
      return !latest || date.getTime() > latest.getTime() ? date : latest
    }, undefined)

    return {
      name: config.name,
      path: config.path,
      description: config.description,
      status: config.status,
      chapters: sortedChapters,
      posts,
      publishedCount,
      totalCount: sortedChapters.length,
      progress: sortedChapters.length ? publishedCount / sortedChapters.length : 0,
      updatedAt,
      configIndex,
    }
  })

  const statusOrder = { active: 0, planned: 1, complete: 2 }
  return overviews
    .sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff) {
        return statusDiff
      }
      if (a.status === 'active' && b.status === 'active') {
        const updatedDiff = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
        if (updatedDiff) {
          return updatedDiff
        }
      }
      return a.configIndex - b.configIndex
    })
    .map(({ configIndex: _, ...overview }) => overview)
}

export async function getSeriesOverviewByPath(path: string) {
  const overviews = await getSeriesOverviews()
  return overviews.find(series => series.path === path)
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

  if (import.meta.env.PROD) {
    return posts.filter(post => post.data.draft !== true)
  }

  return posts
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
  seriesMap: Pick<SeriesMapItem, 'name' | 'path'>[],
) {
  const mappingPath = seriesMap.find(l => l.name === series)
  return mappingPath ? mappingPath.path : series
}

export function getSeriesDescription(
  series: string,
  seriesMap: Pick<SeriesMapItem, 'name' | 'description'>[],
) {
  return seriesMap.find(l => l.name === series)?.description
}
