import type { UserConfig } from '~/types'

export const userConfig: Partial<UserConfig> = {
  site: {
    title: '孤独终洁',
    subtitle: 'No More Solitude',
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
      { name: '创业', path: 'startup' },
    ],
  },
  latex: {
    katex: true,
  },
  analytics: {
    umamiAnalyticsId: 'cdea5eb4-dd22-42aa-926a-b3b97c891417',
  },
}
