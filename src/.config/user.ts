import type { UserConfig } from '~/types'

export const userConfig: Partial<UserConfig> = {
  site: {
    title: 'Teclado',
    subtitle: '日常随记',
    author: 'Teclado',
    description: 'Teclado 的个人博客，用来记录日常生活、阅读感受和偶尔的技术折腾，也分享一路上的经历与想法。',
    website: 'https://blog.teclado.cn',
    pageSize: 5,
    socialLinks: [
      { name: 'rss', href: '/atom.xml' },
      { name: 'github', href: 'https://github.com/tecladochen' },
      { name: 'bilibili', href: 'https://space.bilibili.com/297265384' },
    ],
    navLinks: [
      { name: 'Posts', href: '/' },
      { name: 'Journey', href: '/journey' },
      { name: 'Links', href: '/links' },
      { name: 'About', href: '/about' },
    ],
    footer: [
      '© %year <a target="_blank" href="%website">%author</a>',
      '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">浙ICP备2023044092号-3 </a>',
    ],
    categoryMap: [
      { name: '随笔', path: 'essay' },
      { name: '读书', path: 'reading' },
      { name: '英语', path: 'english' },
      { name: 'AI', path: 'ai' },
      { name: '编程', path: 'programming' },
      { name: '工程实践', path: 'engineering' },
    ],
    seriesMap: [],
  },
  appearance: {
    theme: 'system',
    colorsLight: {
      primary: '#292b28',
      background: '#f8f8f4',
    },
    colorsDark: {
      primary: '#ede4d8',
      background: '#181614',
    },
    fonts: {
      header:
        '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      ui: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    },
  },
  latex: {
    katex: true,
  },
  seo: {
    twitter: '',
  },
  comment: {
    waline: {
      serverURL: 'https://comments.teclado.cn',
    },
  },
  analytics: {
    umamiAnalyticsId: 'cdea5eb4-dd22-42aa-926a-b3b97c891417',
  },
}
