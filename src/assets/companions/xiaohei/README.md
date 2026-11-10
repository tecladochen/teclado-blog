# 小黑和朋友们的动画库

从 2026-11-10 起，按上海日期每天切换一个动作，每 14 天按同一顺序轮换。当天刷新、跨页面、不同访客看到同一个动作。

所有动作共用一个 108 × 85.32 px 的展示区，日期位置保持一致。组件进入视口后才加载当天的封面和图集，手机端与文章页隐藏组件时不请求动画图片。

在 `src/.config/user.ts` 的 `xiaoheiConfig` 中设置：

- `mode: 'daily'`：从 `startsOn` 起按 `enabled` 的顺序轮换。页面每分钟检查是否跨日，回到前台也会检查。
- `mode: 'fixed'`：显示 `fixed` 指定的动作，默认是 L06。开始日期之前、日期无效或没有有效轮换时也用它回退。

`/dev/xiaohei` 按实际轮换顺序展示两周的动作，可以切换深色背景，也可以用 `/?xiaohei=L06` 在首页单独预览。预览页和 URL 临时指定仅在开发环境生效。

## 轮换素材

动图来自[罗小黑动图合集一](https://www.bilibili.com/opus/379032629108880324)、[合集二](https://www.bilibili.com/read/cv5694842/)和[比丢动图合集](https://www.bilibili.com/opus/383129198981654418)。角色与素材归相应权利人所有，不适用项目代码的 MIT 许可。

| 天数 | 编号 | 名称 | 原始帧数 | 每帧 | 原图 |
| --- | --- | --- | --- | --- | --- |
| 1 | L06 | 纸箱里的小黑 | 98 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/dbff4cb9b0746965c8c3c31c8888efa011add964.gif) |
| 2 | L29 | 小白 · 小口吃冰棒 | 11 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/e1cd05ef69fcb8c98b809e28bd166715d134376e.gif) |
| 3 | L10 | 侦探小黑 | 16 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/090b1325a818ecfa43f402253eae705513cbe9bb.gif) |
| 4 | L14 | 趴着摇尾巴 | 48 | 70 ms | [GIF](https://i0.hdslb.com/bfs/article/7ad998d1812f1df21ce4cb3722fcac5e4daefcbe.gif) |
| 5 | L23 | 比丢 · 趴着打盹 | 29 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/b26c4c49dfc2389e7d1d3546d4fb12d1fdefce6f.gif) |
| 6 | L20 | 星星面巾小扫帚 | 30 | 70 ms | [GIF](https://i0.hdslb.com/bfs/article/48c76fbea5f38a17fdab649ca387d7accb769108.gif) |
| 7 | L13 | 荷叶下的小黑 | 42 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/97a019e7b12bfe8065a4ce79703fe48acea92920.gif) |
| 8 | L18 | 靠着灰猫发呆 | 32 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/96e1afc77bbebc8babb04b3ecc9b71fc8434f5f8.gif) |
| 9 | L11 | 雨天撑伞 | 12 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/d2146c3998053fb630efeffa91e9129c1bb5df4f.gif) |
| 10 | L25 | 比丢 · 捂脸偷看 | 35 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/ef1cb81d197b865e6e1e264fac3e2f5a780c4f9d.gif) |
| 11 | L19 | 小勺前抬眼 | 47 | 100 ms | [GIF](https://i0.hdslb.com/bfs/article/c344021aa6a1c2889d627b3fdc603e8279147e1a.gif) |
| 12 | L16 | 盖着星星被子休息 | 61 | 100 ms | [GIF](https://i0.hdslb.com/bfs/article/80377c3fb659f74de06ed6025bf33893341f9bb0.gif) |
| 13 | L30 | 山新 · 吸一口饮料 | 22 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/dd6a955354bf3ee96138a2ee733fd7d1054ced79.gif) |
| 14 | L12 | 抱着小伙伴眨眼 | 39 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/b0609f16ece8b274360d24e418aef825c8abc4c8.gif) |

## 转换

重新生成 L06：`node scripts/prepare-xiaohei.mjs`。

导入新素材：`node scripts/prepare-xiaohei.mjs /absolute/path/source.gif L40`。它会在 `L40/` 生成原始 GIF、`rest-strip.webp`、`poster.webp` 和 `animation.json`。在 `catalog.ts` 登记后，再把编号放进 `enabled` 的相应位置。

- 保留原始绘制帧和节奏。帧时长不同时，重复同一帧来保留停顿；零延迟 GIF 使用浏览器的 100 ms 播放间隔。
- 所有帧使用相同裁切范围，通过边界连通的白底抠除保留封闭的眼白等细节。可传入 `--keep-background` 保留剧集片段的原背景。
- 图集加载期间或启用减少动态效果时显示封面。动画支持原位暂停与离屏暂停。
