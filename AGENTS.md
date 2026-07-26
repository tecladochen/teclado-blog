# AGENTS.md

个人博客「孤独终洁」，Astro 5 + UnoCSS + TypeScript，包管理用 pnpm。

这份文件是所有 AI 编码工具的共同入口（Codex、Cursor、Claude Code 等）。工具特定的
配置只做薄封装，规则本身一律写在 `docs/blog-ops/`，改规则改那里。

## 常用命令

```bash
pnpm dev            # 本地开发（含 astro check）
pnpm build          # 构建（含 astro check）
pnpm theme:create   # 交互式新建文章
pnpm theme:check    # 文章硬规则检查
pnpm lint           # ESLint（提交前会自动跑 lint-staged）
pnpm typecheck      # tsc --noEmit
```

## 文章相关的工作

**处理 `inbox/` 里的稿件、归档文章、维护存量文章，一律按
[docs/blog-ops/post-intake.md](docs/blog-ops/post-intake.md) 执行**，排版判断依据
[docs/blog-ops/display-rules.md](docs/blog-ops/display-rules.md)。

两条最容易踩的硬约束：

- 正文文件必须叫 `index.md` / `index.mdx`，否则文件名会并进 URL。
- `categories` 和 `series.name` 必须已登记在 `src/.config/user.ts`，否则会生成中文 URL。

改完文章跑 `pnpm theme:check`，必须零 error。

## 代码约定

- 路径别名 `~/` 指向 `src/`。
- 主题配置改 `src/.config/user.ts`，不改 `default.ts`。
- 内容集合 schema 在 `src/content.config.ts`。
- 样式优先用 UnoCSS 原子类；全局样式放 `src/styles/global.css`，改动要克制，
  不引入新的视觉风格。
- 提交信息用中文或英文均可，与近期历史保持一致。
