# 文章收件箱

把写好的文章丢进这个目录，不用管命名、目录结构和 Frontmatter。

```
inbox/
  我的新文章.md          # 单文件
  某篇文章/              # 带图片时用子目录
    正文.md
    架构图.png
```

然后对 AI 工具说「处理 inbox」（Claude Code 里可以用 `/post-intake`），它会按
[docs/blog-ops/post-intake.md](../docs/blog-ops/post-intake.md) 归档到
`src/content/posts/<slug>/index.md`，补全分类、专栏、摘要，并按
[docs/blog-ops/display-rules.md](../docs/blog-ops/display-rules.md) 做窄栏适配。

归档完成后原文件会从 inbox 移走，这个目录平时应该是空的。

除 `README.md` 外，本目录内容不纳入版本管理，也不会被 Astro 构建。
