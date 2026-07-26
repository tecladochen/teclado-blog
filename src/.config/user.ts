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
    navLinks: [
      { name: 'Posts', href: '/' },
      { name: 'Now', href: '/now' },
      { name: 'Map', href: '/map' },
      { name: 'Archive', href: '/archive' },
      { name: 'Categories', href: '/categories' },
      { name: 'Series', href: '/series' },
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
      { name: '创业', path: 'startup' },
    ],
    seriesMap: [
      {
        name: '向量检索与 RAG 基础',
        path: 'vector-search-rag',
        description: '从 embedding、索引技术到向量数据库实践，梳理构建 RAG 系统前需要理解的基础。',
        status: 'active',
        roadmap: [
          { order: 4, title: '召回策略与查询改写', description: '从查询表达出发，理解多路召回与查询改写的适用场景。' },
          { order: 5, title: '分块、元数据与索引设计', description: '讨论分块粒度、元数据组织和索引结构之间的取舍。' },
          { order: 6, title: '混合检索与重排', description: '组合关键词、向量召回和重排模型，改善最终候选质量。' },
          { order: 7, title: 'RAG 评估与完整实践', description: '建立可复现的评估方法，并串起一套完整的 RAG 流程。' },
        ],
      },
      {
        name: 'Python 工具链',
        path: 'python-toolchain',
        description: '从虚拟环境到底层原理与现代包管理，整理 Python 开发环境的常用工具。',
        status: 'active',
        roadmap: [
          { order: 3, title: 'pyproject.toml 与项目配置', description: '认识现代 Python 项目的统一配置入口及常见字段。' },
          { order: 4, title: '依赖锁定与可复现环境', description: '理解锁文件、环境同步和可复现开发之间的关系。' },
          { order: 5, title: '质量与测试工具链', description: '组合格式化、静态检查、类型检查和自动化测试。' },
          { order: 6, title: '打包、发布与 CI', description: '从本地项目走向可安装制品和持续集成流程。' },
        ],
      },
      {
        name: 'AI 编程实践',
        path: 'ai-coding-practice',
        description: '围绕 AI 编程 Agent，记录从单任务协作到多 Agent 工作流的实践方法。',
        status: 'planned',
        roadmap: [
          { order: 1, title: '从任务描述到可执行约束', description: '把模糊需求整理为可验证、可实施的工作边界。' },
          { order: 2, title: '上下文组织与代码库探索', description: '让 Agent 在动手前找到真正相关的代码和约束。' },
          { order: 3, title: '单 Agent 开发闭环', description: '建立探索、实现、验证与交付的完整协作流程。' },
          { order: 4, title: '多 Agent 分工与协作', description: '拆分独立子任务，同时避免共享上下文和文件冲突。' },
          { order: 5, title: '评审、验证与失败复盘', description: '通过证据审查结果，并把失败模式沉淀为下一次约束。' },
        ],
      },
      {
        name: 'Godot 与游戏开发笔记',
        path: 'godot-game-development',
        description: '从游戏开发的通用概念出发，逐步认识 Godot 编辑器、项目结构与核心机制。',
        status: 'planned',
        roadmap: [
          { order: 1, title: '游戏循环与场景树', description: '从运行循环理解 Godot 的场景组织方式。' },
          { order: 2, title: '节点、资源与信号', description: '掌握 Godot 中最常用的对象和通信模型。' },
          { order: 3, title: 'GDScript 与项目结构', description: '建立便于扩展和维护的脚本与目录组织。' },
          { order: 4, title: '输入、移动与物理', description: '实现基础操控、碰撞和物理反馈。' },
          { order: 5, title: 'UI、存档与小项目收尾', description: '补齐界面和持久化，并完成一个可交付的小项目。' },
        ],
      },
    ],
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
