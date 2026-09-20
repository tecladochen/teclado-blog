import type { CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>

export * from './friends.ts'
export * from './themeConfig.ts'
