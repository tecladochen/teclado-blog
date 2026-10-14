# 画风参考稿

## 当前确认

2026-10-13，作者明确确认下表两张 v3 图作为本轮画风基础。正式居民需在年龄、脸型、发型、身形、衣着和活动上多样化，参考图相似人物不成为全村固定角色。
保持柔和二维动画、统一视角与比例、克制高光和清楚原生细节；推进见 [后续计划](../../docs/rural-production-plan-v3.md)。
画风确认不等同正式布局、完整水产、接续或动态通过；原始院落图和 v1/v2 保留作历史迭代对照。

## 动画画风 v3 · 清晰度修订与不同场景比较

2026-10-13，作者认为动画方向更好，但指出位置修正后的 v2 变糊，授权优化当前场景并增加一张不同地方的参考。
本轮内置 imagegen 分两次完成两个候选；保留原始 PNG，不做 WebP、Sharp、上采样或后期锐化。

| 候选 | 原始图 | 实际提示词 | 实际尺寸 |
| --- | --- | --- | --- |
| B/C 村心与园艺 v3 | [soft-village-style-study-v3.png](soft-village-style-study-v3.png) | [当前场景重绘](soft-village-style-study-v3.prompt.txt) | 1672×941，3,545,128 字节 |
| D 牛羊与草料 v3 | [livestock-style-study-v3.png](livestock-style-study-v3.png) | [不同场景](livestock-style-study-v3.prompt.txt) | 1672×941，3,935,399 字节 |

模糊核对：v2-draft 与 v2 都是 1672×941，项目只原样复制工具输出，未改变编码或尺寸。
100%查看时，第二次位置编辑输出的非目标区域也出现更软的轮廓和细节。判断是生成式编辑时其他区域一起重绘软化，
不能确定模型内部机制；文件字节减少不作为模糊原因或质量判据。此前自检重视接地，漏检全幅清晰度，已记录修正。

当前场景由较清晰的 v2-draft 一次重新绘制：保留二维动画与年轻人、儿童，恢复物件清楚边界，前景长墙变为低边界，男子在可见铺地上。
新 D 场景以 v3 村心图为画风参考，重新构图：牛舍与收奶工作面、饲草储放、牛与犊牛、坡地羊舍、鸡区及局部年轻稻田；两位年轻成年人作业。
输入仅为画风参照，不把商店、公共院和苗圃复制到畜养场景。

自检观察：两图人物、工具和主要形态比模糊 v2 更清楚；D 图动物与生产设施有使用关系，奶牛、羊和鸡的姿态不同。
两图仍有叶群和明亮局部，自检如实记录；作者后续已接受两图作为本轮风格基础。
提示词请求高原生细节和可支持的较大幅面，工具实际输出仍按文件尺寸记录；未将尺寸请求写成已实现的 2K/4K。
本轮只做两个画风候选，未拼接、接入网页或批量生产；小片稻田水面不代表完整水产画风或塘岸已经验证。

后续局部编辑同时检查目标位置和全幅非目标区的轮廓、器具、人物与植物，不以画布尺寸未变代替清晰度检查。

## 动画画风候选 v2 · 方向较好，局部修正图被指出变糊

2026-10-13，作者反馈 v1 太写实，要求保留动画风格，减少老年人物为主的安排，增加活力氛围。
本轮使用内置 imagegen 编辑 v1，保留环境关系、改绘为二维动画背景与人物；随后仅修正年轻男子的地面位置与前景遮挡。

- 当前候选：[soft-village-style-study-v2.png](soft-village-style-study-v2.png)，原始 PNG，未经重编码。
- 实际提示词：[动画重绘](soft-village-style-study-v2.prompt.txt)、[人物位置修正](soft-village-style-study-v2.repair.prompt.txt)。
- 编辑输入：v1；局部修正输入 [v2-draft](soft-village-style-study-v2-draft.png) 保留为修正来源，不作为当前选用候选。
- 风格：更清楚的手绘色块、简化瓦面和叶群、柔和轮廓与明暗，减少写实表面细纹；人物采用同一二维动画语言。
- 人物：两位年轻成年人和一位儿童，盆苗整理、携苗经过与儿童观察构成日常活力，未增加人群。
- 自检：初稿男子脚与前景墙瓦重叠，已移到无遮挡铺地；复看人物接地与墙体关系更自然，女性和儿童互动保留。
- 本图待作者评价动画感、柔和度与氛围，不记作画风已确认或正式场景/接续通过；未更换网页、批量制作或性能加工。

后续居民以青年、中年和儿童的生活互动形成主要活力，老年居民可少量自然出现，不默认公共空间里大多都是老年人物。
v1 与原始院落参考保持原文件，供对照；新候选尚未自动取代原画风基准。

## 柔和画风候选 v1 · 作者反馈偏写实

2026-10-13，作者明确授权先做一张风格参考图，要求进一步降低亮色、优化柔和感。
本轮使用内置 `image_gen`，单次生成，无 CLI、独立 API、WebP 编码或 Sharp 加工。

- 候选原始 PNG：[soft-village-style-study-v1.png](soft-village-style-study-v1.png)，实际 1672×941，3,706,933 字节。
- 实际完整提示词：[soft-village-style-study-v1.prompt.txt](soft-village-style-study-v1.prompt.txt)。
- 场景：B/C 公共村心与园艺交界，店与住家、树荫停留、盆苗整理与菜地；三位人物，无动物和河流。
- 原图参考经过查看，用于理解既有视角、比例和手绘方向；本轮生成调用仅输入文字提示词，未传入图片文件。
- 调整意图：灰绿植物、暖灰墙地、灰蓝瓦，降低黄绿高光、饱和度和明暗硬度，保留使用细节与物件可读性。
- 自检观察：整体黄绿与土色比原参考收敛，公共停留与苗圃工作有区别；仍偏细腻写实，局部叶片碎高光、瓦面边缘和院墙可继续按作者反馈调整。
- 本图仅为风格候选，不代表新布局、动物水面、正式背景或接续已验收。未替换网页，未批量制作。

原始 `courtyard-style-study.png` 保持不变，SHA-256 核对仍为
`55c5f684d5e58cd4dcbf2abe7bd2016b32e3d50ce05b4d1cdf01c682a410b1e9`。
候选图尚未自动取代原画风基准，后续按作者反馈调整。

## 原始院落参考记录

2026-10-12。工具：内置 `image_gen`，未使用 CLI 或独立 API。

`courtyard-style-study.png` 是本轮提出的画风参考，实际尺寸为 1672×941。
它保留院落—菜园—水渠的空间关系，减少碎纹理与黄绿色亮点，采用清楚的轮廓、
成组的植物色块、灰白墙面与柔和阴影。人物、鸡和风轮用于展示整体风格与比例。

作者已指定此图为项目唯一保留的原始风格参考，后续美术据此重新制作与调整。
当前页面已使用另制的村落与长卷背景；本图只保留为画风参考和分享图，
不是可直接接入的干净背景或已验收的动画成品。
制作运行素材时，须另行得到无活动主体的背景、独立主体和必要的前景遮挡。
不得从这张含主体的参考图上直接叠放同一人物或鸡。

生成时曾使用旧院落样板作为构图输入，该输入已按本轮要求移出项目。
后续制作只以当前保留原图为美术基准，不依赖旧素材。
具体制作和架构推进见 [改动方案](../../docs/art-and-animation-plan.md)。

## 完整生成提示词

```text
Use case: style-transfer.
Asset type: a single visual-direction concept painting for an explorable Chinese rural web scene. This is a style study, NOT a sprite sheet and NOT a finished animation asset.
Input image 1: composition and spatial-content reference only. Repaint its connected courtyard, garden and water-channel scene in the new style below. Preserve the two modest tile-roof homes, central shade tree, courtyard gate and path, kitchen work area, vegetable beds and climbing-bean trellises, right-side irrigation channel, small crossing, and modest wind-pump location. Keep their basic spatial relationships; improve visual hierarchy and simplify peripheral decoration.
Primary request: make this scene feel like a carefully art-directed, readable 2D hand-drawn rural-life game illustration. Natural, calm, welcoming, lived-in, with crisp coherent silhouettes and gentle painted fills. Fine warm-grey contour lines selectively define buildings, tools, vegetation groups and characters; contours are subtle, never heavy black outlines. Broad controlled gouache/watercolor color masses, minimal paper texture, soft but well-defined shadows. Much less dense and much less yellow than the input. Unify art treatment across architecture, plants, people, animals and equipment.
Composition/framing: wide 16:9 composition, fixed oblique overhead view, one consistent orthographic-like scale, no horizon and no sky. Continuous land reaches all four edges, not a floating island. Keep enough open courtyard, path, and garden margins for moving characters. The central living areas should be readable at a small webpage viewing scale.
Scene/backdrop: ordinary modest near-modern southern Chinese countryside, not a fantasy medieval village. Weathered warm-white/grey plaster homes with restrained stone footings and charcoal-grey clay roof tiles; natural earth paths, simple wood doors and bamboo trellises. Practical kitchen washing/work surface, enamel basin and woven vegetable basket. Vegetation is arranged in broad leaf clusters, with only selected detail around working areas; avoid individually sparkling yellow leaves, countless tiny flowers, gravel dots and speckled noise. Existing large tree has readable calm canopy masses. Garden beds are clearly separated by usable earth paths.
Lighting/mood: soft early-summer daylight from upper-left, neutral warm highlights and cool soft shadows. Palette: muted fresh sage and leaf green, warm grey-white walls, blue-grey roofs, pale terracotta earth, restrained teal-blue water. Avoid sepia filters, mustard yellow casts, oversaturated neon green, muddy uniform brown, plastic 3D surfaces and shallow-depth-of-field blur.
Subjects for this STYLE STUDY ONLY: include exactly one modest rural adult woman at the kitchen vegetable work area, plain blue-grey short-sleeve top, dark trousers, light work apron, hair tied back, quietly sorting vegetables with both hands interacting clearly with a basket on the work surface. Natural adult proportions, small readable figure, not a big-headed chibi mascot. Include exactly one small russet farm hen standing naturally on the courtyard ground with two clear planted feet. Both must match the environment's line weight, light, palette and simplified shading. These subjects demonstrate scale and style; do not create multiple poses or animation frames. The small wind-pump can show a simple correctly centered wooden rotor in a stationary pose for this concept only.
Constraints: no text, labels, menus, buttons, badges, logos, watermark, frame or vignette. No additional people or animals. No blank exterior border. Clear spatial continuity across the whole image. No independent-picture collage, no glow, no painterly detail overload.
```
