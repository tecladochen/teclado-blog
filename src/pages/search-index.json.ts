import type { APIRoute } from 'astro'
import type { SearchIndexItem } from '~/types'
import { getPostDescription, getPostPlainText, getPosts } from '~/utils'

export const prerender = true

export const GET: APIRoute = async () => {
  const posts = await getPosts()
  const index: SearchIndexItem[] = posts.map(post => ({
    title: post.data.title,
    url: `/posts/${post.id}/`,
    description: getPostDescription(post),
    categories: post.data.categories,
    series: post.data.series?.name,
    publishedAt: post.data.pubDate.toISOString(),
    updatedAt: post.data.modDate?.toISOString(),
    content: getPostPlainText(post),
  }))

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
