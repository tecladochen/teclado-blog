# 画风参考稿

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
