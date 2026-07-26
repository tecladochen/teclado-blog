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

const cssExtend = {
  ':root': {
    '--prose-borders': '#eee',
  },

  'code::before,code::after': {
    content: 'none',
  },

  ':where(:not(pre):not(a) > code)': {
    'white-space': 'normal',
    'word-wrap': 'break-word',
    'padding': '2px 4px',
    'color': '#c7254e',
    'font-size': '90%',
    'background-color': '#f9f2f4',
    'border-radius': '4px',
  },

  'li': {
    'white-space': 'normal',
    'word-wrap': 'break-word',
  },

  // 正文列只有约 520px。收紧单元格内边距（默认 .625em 1em，三列光 padding 就吃掉近 100px），
  // 并给出最小宽度，让宽表沿用 presetTypography 的 overflow-x: auto 横向滚动，
  // 而不是把单元格挤成两三个字一行的竖条。
  'td,th': {
    'padding': '0.5em 0.75em',
    'min-width': '5rem',
  },
}

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
    [
      /^scrollbar-hide$/,
      ([_]) => `.scrollbar-hide { scrollbar-width:none;-ms-overflow-style: none; }
      .scrollbar-hide::-webkit-scrollbar {display:none;}`,
    ],
  ],
  presets: [
    presetWind3(),
    presetTypography({ cssExtend }),
    presetAttributify(),
    presetIcons({ scale: 1.2, warn: true }),
    presetTheme ({
      theme: {
        dark: {
          colors: { ...colorsDark, shadow: '#FFFFFF0A' },
          // TODO 需要配置代码块颜色
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
  ],
})
