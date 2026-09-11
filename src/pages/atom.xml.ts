import rss from '@astrojs/rss'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import { getPosts } from '~/lib/content'
import { site } from '~/site'

const parser = new MarkdownIt()
const allowedTags = sanitizeHtml.defaults.allowedTags.concat(['img'])

export async function GET() {
  const posts = await getPosts()
  return rss({
    title: site.title,
    description: site.description,
    site: site.website,
    items: posts.map(post => ({
      link: `/posts/${post.id}/`,
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      content: sanitizeHtml(parser.render(post.body || ''), { allowedTags }),
      author: site.author,
    })),
  })
}
