# Teclado

> 记录日常生活、阅读感受和偶尔的技术折腾，也分享一路上的经历与想法。

Teclado 的个人博客，使用 Astro、UnoCSS 和 TypeScript 构建，主题源自
[astro-theme-typography](https://github.com/moeyua/astro-theme-typography)。

线上地址：<https://blog.teclado.cn>

## 本地开发

需要 Node.js LTS 和 pnpm。Node 版本约束见 `.nvmrc`。

```bash
pnpm install
pnpm dev
```

提交前检查：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

站点配置位于 [src/.config/user.ts](src/.config/user.ts)，内容字段定义位于
[src/content.config.ts](src/content.config.ts)。

## License

博客文章内容版权归作者所有。主题代码遵循 [MIT License](LICENSE)。
