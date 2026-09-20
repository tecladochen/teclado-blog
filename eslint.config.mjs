import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: false,
  unocss: true,
  astro: true,
  ignores: ['src/content/journey/_template.md'],
}, {
  files: ['pnpm-workspace.yaml'],
  rules: {
    'pnpm/yaml-enforce-settings': 'off',
  },
})
