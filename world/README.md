# 一方田园 · 独立世界

当前 `/world/` 展示村落三图 v3，`/world/previous/` 展示农村长卷 v1 作对照。
两者都是静态工作稿。作者指出村落竹林割裂衔接、上下用途重复，尚未修正或验收。

2026-10-13 当前任务是保留网页图片版本，清理试稿、整理需求并提交进度。
本轮暂停生图与换图；未采用的试稿、定位图和过时实现已移除。
后续设计须从唯一画风参考和需求重新开始，不沿用之前的草图。

目标是一幅可拖动、有限缩放、安静观察的横向生活长卷。首期完整农村八区，
背景为 2025 年六月上旬晴天上午、虚构江南丘陵与平原交界乡村，首期无声。
长度由内容与协调性决定，左侧自然收尾，上下有实际用途，未来向右延伸。
各区丰富、多样，动态适度，交互简洁；《清明上河图》只说明长幅形式。

## 阅读入口

| 文档 | 唯一职责 |
| --- | --- |
| [需求与边界](docs/redesign.md) | 作者确认的目标、当前任务和验收口径 |
| [当前状态](docs/design.md) | 网页实际使用版本、已完成与待完成事项 |
| [需求变更记录](docs/decisions.md) | 哪些要求被后续反馈替代，哪些只是制作建议 |
| [农村场景设计](docs/rural-scenes.md) | 八区用途、候选要素、生活与产业联系 |
| [布局与尺度](docs/panorama-layout.md) | 连续空间、上下展开、图块与观看尺度 |
| [制作与验收](docs/production.md) | 阶段流程、质量责任和交付方式 |
| [美术与动作制作](docs/art-and-animation-plan.md) | 唯一画风、分层与动作制作方法 |
| [动态设计](docs/motion-direction.md) | 动静关系、活动与停顿 |
| [架构](docs/architecture.md) | 当前运行事实与后续技术方案 |
| [清理记录](docs/cleanup.md) | 删除范围和保留原因 |

## 保留的目录

- `assets/art-direction/`：唯一画风参考及来源说明。
- [村落 v3](assets/village-tiles-v3/README.md)：当前三张源 PNG 与完整提示词。
- [长卷 v1](assets/panorama-v1/README.md)：对照入口使用的三张源 PNG 与完整提示词。
- `components/WorldPage.astro`：独立页面与静态回退。
- `viewer/`：PixiJS 浏览、相机与现有相机测试。
- `data/`：上述两个版本的运行清单。
- `scripts/`：村落与长卷发布工具、长卷接续工具。
- `docs/`：需求、设计、流程、状态与清理记录。
- `../src/pages/world.astro`、`../src/pages/world/previous.astro`：路由适配。
- `../public/world/`：两个页面实际使用的六张 WebP 发布图。

只保留当前入口所需素材和唯一参考，不保留未采用草图作日常上下文。
长卷 v1 因仍由网页对照入口加载而保留，不是新村落设计基线。

## 本地命令

在项目根目录运行：

```bash
pnpm world:dev
pnpm lint
pnpm build
```

`pnpm world:village` 重导村落 v3，`pnpm world:panorama` 重导对照长卷 v1。
两条导出命令会改发布图和运行清单，本轮不执行。
下一轮图片制作另按作者后续安排推进；当前需求和未解决问题已留档。
