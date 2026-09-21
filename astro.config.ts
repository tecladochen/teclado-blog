import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import swup from '@swup/astro'
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
    swup({
      theme: false,
      animationClass: false,
      cache: true,
      preload: {
        hover: true,
        visible: true,
      },
      accessibility: true,
      smoothScrolling: true,
      updateHead: true,
      updateBodyClass: true,
      reloadScripts: true,
      loadOnIdle: false,
      globalInstance: true,
      ignore: [
        '/files/',
        /\.(yaml|yml|env|zip|pdf|tar|gz)$/i,
        'a[download]',
      ],
    }),
  ],
})
