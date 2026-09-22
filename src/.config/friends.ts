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
 * 友链列表
 */
export const friendLinks: FriendLink[] = [
  {
    name: '拾月的博客',
    url: 'https://www.skyue.com/',
    author: '拾月 (SKYue)',
    avatar: 'https://www.skyue.com/favicon.ico',
    desc: '记录日常生活，分享数字工具、自托管实践与个人思考',
    category: '生活与数字工具',
    tags: ['生活', '数字工具', '自托管'],
    feed: 'https://www.skyue.com/feed/',
    notes: '持续更新十余年的独立博客，内容以生活记录、软件应用和个人技术实践为主。',
  },
]
