---
name: post-intake
description: 归档并维护博客文章。把 inbox/ 里的原稿整理进 src/content/posts/（建目录、改名 index.md、搬图片、定分类与专栏、写摘要），并按本站窄栏排版规范优化标题、表格和段落。用户说「处理 inbox」「归档这篇文章」「维护/优化某篇文章的展示」时使用。
---

# 文章归档与维护

规则不写在这份技能里，全部在仓库的 `docs/blog-ops/` 下，供 Claude Code、Codex、Cursor
共用。**开始前先读这两份文档，然后按其中的流程执行**：

1. `docs/blog-ops/post-intake.md` — 八步归档与维护流程，以及授权边界
2. `docs/blog-ops/display-rules.md` — 窄栏排版规范和全部阈值

## 参数

- 给了路径：处理该文件或该目录。
- 没给参数：处理 `inbox/` 下所有待归档稿件；inbox 为空时问用户要处理什么。
- 给的是已发布文章：走 `post-intake.md` 末尾的「维护已发布文章」，注意不要擅自改 slug。

## 执行要点

- 流程授权直接改排版、标题、表格和 Frontmatter，不需要逐条确认；不授权改写作者的观点
  和语气、补充作者没写过的经历，也不授权把 `draft` 改成 `false`。
- 收尾必须跑 `pnpm theme:check`（零 error）和 `pnpm build`，然后按第 8 步交付报告。
- 检查脚本只覆盖可枚举规则，通过不等于排版好读；动过表格就用 `pnpm dev` 看一眼实际页面。
