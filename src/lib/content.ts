import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'

export type Post = CollectionEntry<'posts'>

const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']

const KIND_LABEL = {
  reading: '读书笔记',
  note: '笔记',
  life: '生活',
} as const

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })

  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}

export function kindLabel(kind: Post['data']['kind']): string {
  return KIND_LABEL[kind]
}

export function formatDotDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

export function formatChineseDate(date: Date): string {
  const year = String(date.getUTCFullYear()).replace(/\d/g, digit => DIGITS[Number(digit)] ?? digit)
  return `${year}年${zhNum(date.getUTCMonth() + 1)}月${zhNum(date.getUTCDate())}日`
}

function zhNum(n: number): string {
  if (n <= 10)
    return ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n] ?? String(n)
  if (n < 20)
    return `十${DIGITS[n - 10]}`
  if (n % 10 === 0)
    return `${DIGITS[Math.floor(n / 10)]}十`
  return `${DIGITS[Math.floor(n / 10)]}十${DIGITS[n % 10]}`
}
