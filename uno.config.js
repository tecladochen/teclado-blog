import presetAttributify from '@unocss/preset-attributify'
import transformerDirectives from '@unocss/transformer-directives'
import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWind3,
  transformerVariantGroup,
} from 'unocss'
import presetTheme from 'unocss-preset-theme'
import { themeConfig } from './src/.config'
import { getSocialIconClass } from './src/utils/socialIcons'

const { colorsDark, colorsLight, fonts } = themeConfig.appearance

export default defineConfig({
  rules: [
    [
      /^row-(\d+)-(\d)$/,
      ([, start, end]) => ({ 'grid-row': `${start}/${end}` }),
    ],
    [
      /^col-(\d+)-(\d)$/,
      ([, start, end]) => ({ 'grid-column': `${start}/${end}` }),
    ],
  ],
  presets: [
    presetWind3(),
    presetTypography(),
    presetAttributify(),
    presetIcons({ scale: 1.2, warn: true }),
    presetTheme({
      theme: {
        dark: {
          colors: { ...colorsDark, shadow: '#FFFFFF14' },
        },
        light: {
          colors: { ...colorsLight, shadow: '#00000014' },
        },
      },
    }),
  ],
  theme: {
    colors: { ...colorsLight, shadow: '#0000000A' },
    fontFamily: fonts,
  },
  shortcuts: [
    ['post-title', 'text-5 font-bold lh-7.5 m-0'],
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  safelist: [
    ...themeConfig.site.socialLinks.map(social => getSocialIconClass(social.name)),
    'i-mdi-content-copy',
    'i-mdi-check',
    'i-tabler-search',
  ],
})
