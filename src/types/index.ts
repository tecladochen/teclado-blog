import type { CollectionEntry } from 'astro:content'
import type { SeriesStatus } from './themeConfig'

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

export type KnowledgeNodeKind = 'post' | 'category' | 'series'

export interface KnowledgeNode {
  id: string
  kind: KnowledgeNodeKind
  label: string
  url: string
  description: string
  status?: 'planned' | 'active' | 'complete'
  categories?: string[]
  series?: string
}

export interface KnowledgeEdge {
  source: string
  target: string
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export interface SeriesChapter {
  order: number
  title: string
  description?: string
  state: 'published' | 'planned'
  url?: string
  publishedAt?: Date
}

export interface SeriesOverview {
  name: string
  path: string
  description?: string
  status: SeriesStatus
  chapters: SeriesChapter[]
  posts: Post[]
  publishedCount: number
  totalCount: number
  progress: number
  updatedAt?: Date
}

export * from './themeConfig.ts'
