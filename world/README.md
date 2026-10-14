# 一方田园 · 独立世界

最新（2026-10-14）：作者授权改试3:2两层。已从最左侧后山村居顺序生成两列×两层候选，原生1536×1024，有限边界上下文去重后2880×1888；`/world/pilot/`现显示这组原始PNG。本组自检初步可用，待作者视觉审阅，正式规格和批量生产尚未确认。见 [两层验证](docs/rural-two-layer-v3.md) 与 [素材/实际截图](assets/rural-two-layer-v3/README.md)。下方旧三行与B/C试验是前阶段记录，不作为继续旧素材的指令。

2026-10-13，作者回看夜间成果后指出后续接续不合格、制作流程过慢、道路水系与碎景占地过多，要求重设计。
本轮先审阅 [乡村生态完整内容与布局方案](docs/farm-redesign-v3.md)，确认后出风格图，风格确认后验证接续并批量制作，
完整效果确认后再优化性能。作者已确认 [村心园艺 v3](assets/art-direction/soft-village-style-study-v3.png) 与 [牛羊草料 v3](assets/art-direction/livestock-style-study-v3.png) 为本轮画风基础；正式居民须多样化，未更换页面。
最新已完成 [内容自审与修订](docs/rural-content-audit-v3.md)，并补充 [32 个具体场所](docs/rural-scene-cards-v3.md)。
已形成 [整村总平面与首个样段布局](docs/rural-masterplan-v3.md)，含32场所落位、三图分配、道路供排水与12位主要居民。
作者在检查点 `c1b2df5` 后授权开始；已制作 [2×2原始PNG接续试验](docs/rural-pilot-v3.md) 和独立开发页 `/world/pilot/`。加载与交互正常，源画面接续未通过；没有补第三排或进入批量生产。
布局亦保存为 [独立查看版](docs/rural-layout-v3.html)，便于本地打开审阅。
后续见 [画风确认后的推进计划](docs/rural-production-plan-v3.md)：接续样段和原始 PNG 预览，再逐批扩展；完整水产、正式画面与接续仍待验证。
`/world/` 暂保留农村 v2（三列6048×1872）供问题对照，该版本未通过作者视觉审核；
`/world/previous/` 保留长卷 v1。旧自动续做核对为暂停，见 [进度交接](docs/overnight-progress.md)。

本期仅支持 PC。手机入口隐藏，直接访问只显示返回说明，在判断设备后才导入渲染模块和设置图片地址。
新设计以两张已确认 v3 图约束画风，以新总平面和相邻选用图约束空间接续；原院落图作为历史资料保留。

目标是可拖动、有限缩放、安静观察的横向生活长卷。首期重新设计包含多种典型产业与公共生活的乡村地区，
按生态、产业、生活与地势组织，背景为 2025 年六月上旬晴天上午的虚构江南乡村，首期无声。
长度由内容与疏密决定，左侧自然收尾，上下有实际用途，未来向右延伸。
长度和篇幅不设硬上限，公共生活加入后不缩减产业；具体公共内容由用途自主论证，作者举例不是固定清单。
当前提案为生活村落、公共村心、园艺田作、畜养草料、果茶坡、水产塘岸和农务村口七片相互衔接的空间。

## 阅读入口

| 文档 | 职责 |
| --- | --- |
| [3:2两层验证](docs/rural-two-layer-v3.md) | 最新原生尺寸、两层内容、逐张接续和实际页面检查；待作者审阅 |
| [本轮完整方案](docs/farm-redesign-v3.md) | 多产业与人文生活、整体布局、三图容量、道路水系与快速预览 |
| [后续推进计划](docs/rural-production-plan-v3.md) | 已确认画风、居民多样化、总平面、接续样段、分批生产与最终优化 |
| [总平面与样段布局](docs/rural-masterplan-v3.md) | 32场所实际落位、三图纵深、道路水系、产业周转、首个样段与居民设定 |
| [样段实测](docs/rural-pilot-v3.md) | 原生幅面、接续未通过的证据、原始PNG页面及工程检查 |
| [内容审核](docs/rural-content-audit-v3.md) | 初审缺口、修订、复审结论与首张风格图范围 |
| [具体场所卡](docs/rural-scene-cards-v3.md) | 32 个场所、具体物件/状态、入口、道路端点与供排来去 |
| [需求与边界](docs/redesign.md) | 作者确认的目标、当前任务和验收口径 |
| [当前状态](docs/design.md) | 实际使用版本、完成范围、自检与待完成事项 |
| [需求变更](docs/decisions.md) | 被后续反馈替代的条件 |
| [农村二维规划](docs/rural-scenes.md) | 旧 v2 空间对照；本轮设计入口见方案初稿 |
| [布局与尺度](docs/panorama-layout.md) | 旧布局对照与保留的观看目标 |
| [制作与验收](docs/production.md) | 阶段流程和质量责任 |
| [图片与动作制作](docs/art-and-animation-plan.md) | 旧图片规格对照与主体制作方向 |
| [动态设计](docs/motion-direction.md) | 动静关系与生活节奏 |
| [架构](docs/architecture.md) | 发布、加载、缓存与生命周期 |
| [PC 性能与体验](docs/performance.md) | 实际小样成本、估算与设备验收 |
| [清理记录](docs/cleanup.md) | 历史删除范围和保留原因 |

## 本轮制作路线

优先试无冗余重叠的有效图，先用相邻小样验证接续，不承诺独立生图靠提示词保证边界一致。
开发预览直接显示选用原始 PNG，只维护尺寸、路径和位置；完整效果确认后再做编码、切块与加载优化。
纵向三图容量保留，具体新尺寸和世界坐标待样片验证。确认顺序与内容草案见本轮方案。

## 历史 v2 制作路线（不约束本轮）

工作原图 2160×720；纵向三张，上下重叠 144、左右重叠 216，有效高度 1872。
横向按内容增加标准图块。离线确定唯一背景像素，发布有效内容最大 1024×1024、
每边 2 像素采样边缘的 WebP。网页按视野加载与字节预算缓存，不下载原始重叠 PNG。
已实现旧发布链路，但作者指出接续与设计不合格；此路线仅描述保留页面。

## 模块与素材

- [当前农村v2](assets/rural-v2/README.md)：选用基础图、共享模板、实际提示词与局部修接。
- [被否决小样](assets/rural-proof-v1/README.md)：历史返工对照，不再主入口加载。
- `data/rural-layout-v2.json`：旧 v2 制作分工与地势规划，仅作历史对照。
- `data/rural-v2.json`：当前运行清单；`public/world/rural-v2/` 是发布资源。
- `components/TiledWorldPage.astro`、`viewer/tiled.ts`：新页面与按块浏览。
- `viewer/platform.ts`：博客入口与两个世界页共用的 PC 判断。
- [长卷 v1](assets/panorama-v1/README.md)：对照入口使用的原图、提示词与发布图。
- [村落 v3](assets/village-tiles-v3/README.md)：新小样验收前保留的旧进度；不再作为主入口或新布局输入。
- `assets/art-direction/`：两张当前画风基础、历史参考、实际提示词与迭代观察，原文件保留。
- [接续试验v3](assets/rural-pilot-v3/README.md)：四张独立候选、未选母稿、实际提示词、元数据和浏览器截图；`data/rural-pilot-v3.json`登记失败试验，`viewer/pilot.ts`直接显示原图。
- `src/pages/world.astro` 与 `src/pages/world/previous.astro`：博客侧薄路由。

## 本地命令

在项目根目录运行：

```bash
pnpm world:dev
pnpm world:rural
node --import tsx --test world/viewer/*.test.ts
pnpm lint
pnpm build
```

`world:rural` 恢复旧 v2 发布资源，读取其 recipe；新 PNG 开发预览不以此导出为前置条件。
旧 `world:village` 和 `world:panorama` 仅用于恢复保留版本，不用于新规格。
当前画风已确认，总平面已保存；首个接续试验未通过，先调整尺度/生成单元再复测，完整样段通过且获作者确认后逐批生产；完整效果确认后验证 PC 性能。
当前不主动 Git 提交、推送或外部发布，不恢复旧自动续做。
