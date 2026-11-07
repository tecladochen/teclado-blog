# 罗小黑动画库

当前默认按上海日期每日轮换用户确认的 L02、L04、L05、L06、L08、L10、L11，沿用已确认的简洁日期排版。每轮七天随机排列全部动作，每个动作出现一次，相邻两天（包括轮次交界）不重复。当天刷新、跨页面、不同访客均展示相同动作；原始 GIF 与无损透明图集一并保留。

`catalog.ts` 集中定义素材、显示尺寸和轻触回应。所有动作放入同一个 108 × 85.32 px 展示区，日期不随动作体型上下跳动。组件进入视口后才加载当天的封面和图集，隐藏组件的手机端和文章页不请求这些图片。

## 选择方式

在 `src/.config/user.ts` 的 `xiaoheiConfig` 中设置：

- `mode: 'daily'`（当前默认）：使用 `enabled` 中的动作，按站点时区（当前上海）每天选一只。每轮随机排列全部候选，相邻两天不重复。
- `mode: 'fixed'`：显示 `fixed` 指定的动作，预设为 `L02`，也作为无有效候选时的回退。
- 页面跨日不必刷新；现有的日期更新每分钟检查一次，回到前台也会检查。新图片成功解码后才替换，失败则继续显示原动作。

开发预览：`/dev/xiaohei` 可比较所有动作、查看深色背景，并跳到首页逐只预览。该页面不输出到生产构建，首页的 `?xiaohei=L04` 临时选择也仅在开发环境生效。

## 素材

全部来自 https://www.bilibili.com/opus/379032629108880324 。角色与原始素材归相应权利人所有，不适用项目代码的 MIT 许可。

| 编号 | 名称 | 原始帧数 | 每帧 | 原图 |
| --- | --- | --- | --- | --- |
| L02 | 趴卧小动作 | 23 | 100 ms（原 GIF 为 0） | [GIF](https://i0.hdslb.com/bfs/article/b9aa5a51c13315d567239e6ea453c68a8d1e8754.gif) |
| L04 | 安静趴着 | 6 | 70 ms | [GIF](https://i0.hdslb.com/bfs/article/459cb327ab3f1ede900afc10be1b63dda2a3a208.gif) |
| L05 | 睡个懒觉 | 16 | 100 ms | [GIF](https://i0.hdslb.com/bfs/article/f8dcfac9c56b7ed034912f66768aa6fef9364e23.gif) |
| L06 | 纸箱里的小黑 | 98 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/dbff4cb9b0746965c8c3c31c8888efa011add964.gif) |
| L08 | 开心小动作 | 10 | 70 ms | [GIF](https://i0.hdslb.com/bfs/article/36a5ee9c2f439e3b1566e459416e49bcb9e54c60.gif) |
| L10 | 侦探小黑 | 16 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/090b1325a818ecfa43f402253eae705513cbe9bb.gif) |
| L11 | 雨天撑伞 | 12 | 80 ms | [GIF](https://i0.hdslb.com/bfs/article/d2146c3998053fb630efeffa91e9129c1bb5df4f.gif) |

## 转换

重新生成 L02：`node scripts/prepare-xiaohei.mjs`。

导入其他已选 GIF：`node scripts/prepare-xiaohei.mjs /absolute/path/source.gif L04`。它会写入 `L04/` 子目录，生成 `L04.gif`、`rest-strip.webp`、`poster.webp` 和 `animation.json`；在 `catalog.ts` 登记后即可使用。

- 保留原始帧数和节奏。零延迟 GIF 使用浏览器的 100 ms 播放间隔。
- 新素材通过边界连通的白底抠除和轮廓去白色混色，保护封闭的眼白等内部细节。L02 保留原先确认的处理方式。
- 每个动作采用全部帧共有的裁切范围，没有补帧、重画或逐帧重新对齐。原插画的地面阴影、雨点和道具保留。
- `poster.webp` 在图集加载期间、图集加载失败或启用减少动态效果时显示。禁用 JavaScript 时仅显示日期。
- 网站以 CSS steps 播放无损透明图集，支持原位暂停、离屏暂停和减少动态效果。
