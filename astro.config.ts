import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import robotsTxt from 'astro-robots-txt'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import UnoCSS from 'unocss/astro'
import devtoolsJson from 'vite-plugin-devtools-json'
import { themeConfig } from './src/.config'

// https://astro.build/config
export default defineConfig({
  site: themeConfig.site.website,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  base: '/',
  vite: {
    plugins: [
      devtoolsJson(),
    ],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      theme: 'dracula',
      wrap: true,
    },
  },
  integrations: [
    UnoCSS({ injectReset: true }),
    mdx({}),
    robotsTxt(),
    sitemap(),
  ],
})
