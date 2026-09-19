import type { UserConfig } from '~/types'

export const userConfig: Partial<UserConfig> = {
  site: {
    title: 'Teclado',
    subtitle: 'Digital Garden',
    author: 'Teclado',
    description: '写文字、记生活，在网络的角落里留下成长与经历的痕迹——不再只是孤独，而是与自己对话。',
    website: 'https://blog.teclado.cn',
    pageSize: 5,
    socialLinks: [
      { name: 'rss', href: '/atom.xml' },
      { name: 'email', href: 'mailto:tecladochen@qq.com' },
      { name: 'bilibili', href: 'https://space.bilibili.com/297265384' },
      { name: 'github', href: 'https://github.com/tecladochen' },
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
      primary: '#241e18',
      background: '#f5f0e6',
    },
    colorsDark: {
      primary: '#ede4d8',
      background: '#181614',
    },
    fonts: {
      header:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      ui: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    },
  },
  latex: {
    katex: true,
  },
  seo: {
    twitter: '',
  },
  analytics: {
    umamiAnalyticsId: 'cdea5eb4-dd22-42aa-926a-b3b97c891417',
  },
}
