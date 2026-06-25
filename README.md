# 孤独终洁

> No More Solitude
>
> 写文字、记生活，在网络的角落里留下成长与经历的痕迹——不再只是孤独，而是与自己对话。

这是我（Teclado）的个人博客，使用 [Astro](https://astro.build/) 构建，主题基于 [astro-theme-typography](https://github.com/moeyua/astro-theme-typography)。

线上地址：<https://blog.teclado.cn>

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 本地预览构建产物
pnpm preview
```

## 写作

在 `src/content/posts` 下新建 Markdown 文件即可，frontmatter 示例：

```md
---
title: 标题
pubDate: 2026-06-24
categories: ["essay"]
description: "描述"
---
```

也可以使用命令快速创建文章：

```bash
pnpm theme:create
```

## 配置

站点配置位于 [src/.config/user.ts](src/.config/user.ts)，可在此覆盖默认配置（标题、社交链接、分类、页脚等）。

## License

博客文章内容版权归本人所有。

主题代码基于 [astro-theme-typography](https://github.com/moeyua/astro-theme-typography)，遵循 MIT 协议，详见 [LICENSE](LICENSE)。
