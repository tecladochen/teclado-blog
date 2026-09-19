import type { FriendLink, MyBlogInfo } from '~/types'

/**
 * 友链交换信息 / 本站基础信息
 */
export const myBlogInfo: MyBlogInfo = {
  name: 'Teclado',
  url: 'https://blog.teclado.cn',
  desc: '写字，记生活，也记录一路成长。',
  author: 'Teclado',
  avatar: 'https://blog.teclado.cn/favicon.svg',
  feed: 'https://blog.teclado.cn/atom.xml',
}

/**
 * 精选独立博客储备 / 友链列表
 */
export const friendLinks: FriendLink[] = [
  // 思考与生活
  {
    name: '木遥的窗子',
    url: 'https://farmostwood.net',
    author: '木遥',
    avatar: 'https://farmostwood.net/favicon.ico',
    desc: '理性思考、随笔长文与思想漫步',
    category: '思考与生活',
    tags: ['随笔', '数学', '读书', '生活'],
    feed: 'https://farmostwood.net/feed',
    notes: '经典长文排版范例，文字密度与思想深度极佳，适合借鉴随笔与读书排版的呼吸感。',
  },
  {
    name: '拾月的博客',
    url: 'https://skyue.com',
    author: '拾月 (SKYue)',
    avatar: 'https://www.skyue.com/favicon.ico',
    desc: '记录生活与数字工具，折腾自托管与个人成长',
    category: '思考与生活',
    tags: ['生活', '数字花园', '自托管', '随笔'],
    feed: 'https://www.skyue.com/feed/',
    notes: '坚持十余年的独立博客，文风温润真诚，Warmpaper 质感与生活随笔非常契合。',
  },
  {
    name: '椒盐豆豉',
    url: 'https://blog.douchi.space',
    author: '椒盐豆豉',
    avatar: 'https://blog.douchi.space/favicon.ico',
    desc: '真实生活记录、海外工作与独立见解',
    category: '思考与生活',
    tags: ['生活', '思考', '独立博客', '播客'],
    feed: 'https://blog.douchi.space/feed.xml',
    notes: '20 年资深博主，真实鲜活，独立博客互联生态代表，表达真诚无造作。',
  },

  // 独立开发与产品
  {
    name: 'Randy\'s Blog',
    url: 'https://lutaonan.com',
    author: '卢涛南 (Randy Lu)',
    avatar: 'https://lutaonan.com/favicon.ico',
    desc: '独立开发者，专注于产品创造、技术探索与生活复盘',
    category: '独立开发与产品',
    tags: ['独立开发', '产品', '前端', '复盘'],
    feed: 'https://lutaonan.com/rss.xml',
    notes: '现代高级灰设计，作品展台与文章排版结合自然，信息层级与留白值得参考。',
  },
  {
    name: 'Tw93 的个人主页',
    url: 'https://tw93.fun',
    author: 'Tw93',
    avatar: 'https://tw93.fun/favicon.ico',
    desc: '探索产品工程、AI Coding、Weekly 周刊与原生设计',
    category: '独立开发与产品',
    tags: ['设计', 'Weekly', 'macOS', '前端'],
    feed: 'https://tw93.fun/feed.xml',
    notes: 'Apple 原生美学典范，字体渲染、间距微调与对比度极高，适合学习排印细节。',
  },

  // 视觉与微交互
  {
    name: 'Innei\'s Space',
    url: 'https://innei.in',
    author: 'Innei',
    avatar: 'https://innei.in/favicon.ico',
    desc: '软件工程师，Mix Space / Shiro 核心创作者',
    category: '视觉与微交互',
    tags: ['全栈', '动效', '设计', 'Shiro'],
    feed: 'https://innei.in/feed',
    notes: '中文独立博客交互动效天花板，物理弹性动效、纸质拟态与时光轴设计极富质感。',
  },
  {
    name: 'Anthony Fu',
    url: 'https://antfu.me',
    author: 'Anthony Fu',
    avatar: 'https://antfu.me/favicon.svg',
    desc: 'Vue / Vite 核心团队，UnoCSS / Vitest 创作者',
    category: '视觉与微交互',
    tags: ['开源', 'UnoCSS', 'Vue', '工具集'],
    feed: 'https://antfu.me/feed.xml',
    notes: 'UnoCSS 原作者，极简无界设计，当前博客所用 UnoCSS 的最佳实践参考。',
  },

  // 数字游民与周记
  {
    name: 'pseudoyu',
    url: 'https://www.pseudoyu.com',
    author: 'pseudoyu (Yu)',
    avatar: 'https://www.pseudoyu.com/favicon.ico',
    desc: '数字游民生活、开源周记与个人知识管理体系',
    category: '数字游民与周记',
    tags: ['周记', '数字游民', 'RSS', '效率'],
    feed: 'https://www.pseudoyu.com/feed.xml',
    notes: '轨迹记录与体系化周记流，适合与当前博客的 Journey（轨迹）板块联动学习。',
  },

  // 硬核技术与工程
  {
    name: '卡瓦邦噶！',
    url: 'https://www.kawabangga.com',
    author: 'laixintao',
    avatar: 'https://www.kawabangga.com/favicon.ico',
    desc: '资深 SRE 工程师，专注于 Linux、网络协议与系统运维',
    category: '硬核技术与工程',
    tags: ['Linux', '网络', 'Python', 'SRE'],
    feed: 'https://www.kawabangga.com/feed/',
    notes: '老派硬核技术博客，抓包破案录深度长文，其友链区本身就是一张优质技术图谱。',
  },
  {
    name: '阮一峰的网络日志',
    url: 'https://ruanyifeng.com/blog/',
    author: '阮一峰',
    avatar: 'https://ruanyifeng.com/favicon.ico',
    desc: '科技爱好者周刊，长期专注前沿通识与开发者教育',
    category: '硬核技术与工程',
    tags: ['周刊', '通识', '前端', '科技'],
    feed: 'https://ruanyifeng.com/blog/atom.xml',
    notes: '中文博客二十年常青树，《中文排版指南》践行者，适合学习规范排版与通识写作。',
  },
]
