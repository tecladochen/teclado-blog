import sitemap from '@astrojs/sitemap'
import robotsTxt from 'astro-robots-txt'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'
import { site } from './src/site'

export default defineConfig({
  site: site.website,
  prefetch: true,
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {
      theme: 'min-light',
      wrap: true,
    },
  },
  integrations: [
    UnoCSS({ injectReset: true }),
    robotsTxt(),
    sitemap(),
  ],
})
