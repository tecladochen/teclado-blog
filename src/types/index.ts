import type { CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>
export type JourneyEntry = CollectionEntry<'journey'>

export interface SearchIndexItem {
  title: string
  url: string
  description: string
  categories: string[]
  series?: string
  publishedAt: string
  updatedAt?: string
  content: string
}

export * from './themeConfig.ts'
