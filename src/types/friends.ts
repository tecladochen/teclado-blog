export interface FriendLink {
  /** 博客名称 / 站点名 */
  name: string
  /** 站点链接 */
  url: string
  /** 站点简介 / 一句话描述 */
  desc: string
  /** 博主昵称 / 姓名 */
  author?: string
  /** 头像 / 站点图标 URL */
  avatar?: string
  /** 分类 / 分组（例如：'思考与生活' | '独立开发' | '视觉与微交互' | '硬核技术'） */
  category?: string
  /** 标签列表 */
  tags?: string[]
  /** RSS / Atom 订阅链接 */
  feed?: string
  /** 学习心得 / 风格亮点 / 推荐理由 */
  notes?: string
}

export interface MyBlogInfo {
  name: string
  url: string
  desc: string
  author: string
  avatar?: string
  feed?: string
}
