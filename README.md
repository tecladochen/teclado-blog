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

## 文章排版约定

所有文章共用同一套排版，不在单篇 Markdown 中添加字号、行高或宽度样式。

| 项目 | 桌面（768px 起） | 窄屏（767px 及以下） |
| --- | --- | --- |
| 正文字号 | 17px | 16px |
| 正文行高 | 2.05（34.85px） | 2（32px） |
| 正文宽度 | 最大 39rem（默认 624px） | 随容器适配 |
| 段落间距 | 1.35rem | 1.35rem |

颜色与字体变量放在 `src/styles/reading-design.css`；文章的字号、行高、标题、图片、
代码和表格规则统一放在 `src/layouts/LayoutPost.astro`。UnoCSS 的 `prose` 提供基础
排版，文章组件通过明确的作用域优先覆盖，不能依赖样式文件的加载顺序。

写作时使用普通 Markdown：标题填在元数据中，正文用 `##` 分章节，必要时用 `###`
细分。专有名词正常书写，反引号用于代码、命令和路径，加粗用于少量关键判断，
引用块用于引文。图片使用相对路径和清楚的替代文本，不用连续空行或手工换行调版。

调整文章样式后，除 lint 和 build 外，还需检查桌面与窄屏、明暗主题、直接打开文章、
从首页进入及返回再进入，并在正式构建预览中核对正文的实际字号和行高。

## License

博客文章内容版权归作者所有。主题代码遵循 [MIT License](LICENSE)。
