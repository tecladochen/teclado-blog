# AGENTS.md

个人博客「Teclado」，使用 Astro、UnoCSS、TypeScript 和 pnpm。具体版本以 `package.json`
为准。

## 基本约定

- 开始前检查工作区，保留用户已有的未提交修改，不改任务外文件。
- 文章正文由作者手写。除非用户明确要求，不创建、改写或扩写 `src/content/` 中的内容。
- 路径别名 `~/` 指向 `src/`。
- 站点配置修改 `src/.config/user.ts`，不要修改 `src/.config/default.ts`。
- 内容字段以 `src/content.config.ts` 为准。
- 样式沿用现有设计，优先使用 UnoCSS；组件样式留在组件中，全局规则才放入
  `src/styles/global.css`。

## 目录

- 页面：`src/pages/`
- 组件：`src/components/`
- 样式：`src/styles/`
- 配置：`src/.config/`
- 内容：`src/content/`

## 常用命令

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

代码改动至少运行 `pnpm lint` 和 `pnpm build`。明显的布局或交互动效改动还要检查实际页面。
未经用户要求，不主动提交或推送。
