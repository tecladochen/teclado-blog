import { file, glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection, reference } from 'astro:content'
import { isLibraryDate, parseLibraryEntries } from './utils/library'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      pubDate: z.coerce.date(),
      modDate: z.coerce.date().optional(),
      categories: z.array(z.string()).default([]),
      draft: z.boolean().default(false).optional(),
      description: z.string().optional(),
      customData: z.string().optional(),
      series: z.optional(z.object({
        name: z.string(),
        order: z.number().optional(),
      })),
      banner: image()
        .refine(img => Math.max(img.width, img.height) <= 4096, { message: 'Width and height of the banner must less than 4096 pixels' })
        .optional(),
      author: z.string().optional(),
      commentsUrl: z.string().optional(),
      source: z.optional(z.object({ url: z.string(), title: z.string() })),
      enclosure: z.optional(z.object({ url: z.string(), length: z.number(), type: z.string() })),
      pin: z.boolean().default(false).optional(),
    }),
})

const spec = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/spec' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    labels: z.array(z.string()).max(5).optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
})

const journey = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/journey' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      kind: z.enum(['life', 'project', 'learning', 'blog']),
      summary: z.string(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      images: z.array(image()).max(4).optional(),
      imageAlts: z.array(z.string()).max(4).optional(),
      links: z.array(z.object({
        label: z.string(),
        url: z.string(),
      })).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
})

const libraryDate = z.string().refine(isLibraryDate, '日期须为有效的 YYYY、YYYY-MM 或 YYYY-MM-DD')
const entryId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id 须使用小写字母、数字和连字符')
const label = z.string().trim().min(1)
const listeningUrl = z.url().refine(value => /^https?:\/\//.test(value), '链接须为 HTTP 或 HTTPS')

const library = defineCollection({
  loader: file('src/data/library/works.json', { parser: parseLibraryEntries }),
  schema: ({ image }) => z.object({
    id: entryId,
    type: z.enum(['book', 'movie', 'series']),
    title: label,
    creator: label.optional(),
    cover: image().optional(),
    note: label.optional(),
    url: listeningUrl.optional(),
    status: z.enum(['completed', 'in-progress', 'planned']).default('completed'),
    addedOn: libraryDate.optional(),
    completedOn: libraryDate.optional(),
    releasedOn: libraryDate.optional(),
  }).superRefine((entry, ctx) => {
    if (entry.status === 'completed' && !entry.completedOn && !entry.releasedOn) {
      ctx.addIssue({ code: 'custom', path: ['completedOn'], message: '已完成作品须填写完成日期；历史补录可填写发布时间 releasedOn' })
    }
    if (entry.status !== 'completed' && entry.completedOn) {
      ctx.addIssue({ code: 'custom', path: ['completedOn'], message: '只有已完成作品可以填写完成日期' })
    }
  }),
})

const musicArtists = defineCollection({
  loader: file('src/data/library/artists.json', { parser: parseLibraryEntries }),
  schema: ({ image }) => z.object({
    id: entryId,
    name: label,
    avatar: image().optional(),
  }),
})

const musicAlbums = defineCollection({
  loader: file('src/data/library/albums.json', { parser: parseLibraryEntries }),
  schema: ({ image }) => z.object({
    id: entryId,
    title: label,
    artists: z.array(reference('musicArtists')).min(1).refine(
      artists => new Set(artists.map(artist => artist.id)).size === artists.length,
      '同一张专辑不能重复关联同一位歌手',
    ),
    cover: image().optional(),
    coverScale: z.number().min(1).max(2).optional(),
    language: label.optional(),
    note: label.optional(),
    addedOn: libraryDate.optional(),
    url: listeningUrl.optional(),
  }),
})

export const collections = {
  library,
  musicArtists,
  musicAlbums,
  journey,
  posts,
  spec,
}
