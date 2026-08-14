---
title: 'OpenCode 是不是好用的开源 Harness'
pubDate: 2026-08-11
description: '把 OpenCode 理解成可插拔的 coding agent harness，对照 Cursor、Claude Code、Codex 看真实差距，并划出适合长期当主力的客观场景与周边项目。'
categories: ['AI']
draft: false
---

开源圈最近常提到 OpenCode。我先想搞清楚它到底是什么，为什么会出现，解决什么问题。聊着聊着，问题很快收窄到一层更硬的判断上：它干的是不是模型之外的那套智能体工作？换句话说，它是不是一副把模型解耦出去的 harness？如果是，这副 harness 做得怎么样，和 Cursor、Claude Code、Codex 这类商业成品差多大，又适合谁长期当主力。

## OpenCode 先是什么

OpenCode 是一个开源的 AI 编程 Agent，官网在 [opencode.ai](https://opencode.ai)，仓库在 [anomalyco/opencode](https://github.com/anomalyco/opencode)。它能在终端、桌面或 IDE 扩展里跑，帮你读仓库、改文件、执行命令、推进多步任务。定位更接近 Claude Code 那类「给目标就动手」的 agent，而不是只补全一行的插件。

它火起来的背景不难理解。终端编码 Agent 成了标配之后，闭源方案常带来模型锁定、黑盒难审、成本绑死订阅、合规难过关。OpenCode 的主张很直：你自带模型，它负责把 agent 跑起来。支持大量模型提供商，也可以接本地模型；官方也强调隐私优先，不把你的代码和上下文存成它的资产。

对我来说，它的价值首先不是「又多了一个会写代码的聊天框」，而是把 AI 编程 Agent 从某家 SaaS 产品，往「可掌控的开发基础设施」挪了一点。

## 关键：模型与 Harness

聊到这里，我关心的其实是架构分工。模型负责理解任务、决定下一步、生成工具调用和代码内容。Harness 负责会话、上下文组装、工具执行、权限确认、循环推进，以及终端或 IDE 这些入口。

OpenCode 自己不做推理。它大致是准备上下文，调用模型，解析返回，执行读文件、改文件、跑 shell、看 LSP 这类工具，把结果塞回上下文，再继续，直到任务结束或停下。社区那句 you bring the model, OpenCode brings the agent，说的就是这层。

所以「解耦模型」解的是提供商和模型实现，不是把智能从系统里拿掉。换模型时，理想情况是换脑子，不换手脚和流程。可插拔有代价：要服务很多 provider，很难对每一家都调到极致。这也是后面谈差距时必须盯住的点。

还有一个 nuance 很重要。说它是 harness，不等于好坏全看模型。上下文怎么裁、工具描述好不好用、失败怎么重试、plan 和 build 的权限怎么切、子任务怎么分，都会显著影响上限。竞争其实有两条线：模型能力，以及 harness 能不能把模型能力稳稳落到工程里。

## 和商业成品比，差在哪

我很在意开源 harness 在模型可插拔前提下，能力到底做成什么样。和 Cursor、Claude Code、Codex 比，差距大不大。

先别把产品总分直接互相比。OpenCode 这类没有自己的「编码分」，分数跟你接的模型走。Claude Code、Codex 测到的常常是自家模型加自家脚手架。Cursor 则是另一条主战场，IDE 原生体验很重。更准的问题是：同一模型换不同 harness，差多少；换模型后，开源 harness 能不能吃满模型能力。

公开讨论和评测里，有几件事比较扎实。Harness 真会影响结果，同一模型换脚手架，通过率和 token 消耗都能差一截。商业 harness 的优势常常是共设计，不是魔法。Claude Code 为 Claude 调过工具描述、上下文策略、停机条件和长任务节奏；Codex 也和自家 coding 模型绑得紧。把强模型塞进开源 harness，代码质量往往接近，真正差的是稳定性、绕弯路多少、烧多少 token、要你盯多少。

按维度拆开看，体感更清楚。接同一档强模型后的改码能力，差距通常是小到中等。模型特化、工具调用质量、长任务少空转，商业成品往往更稳，差距中等。成本效率、安全默认、hooks 与后台任务这类产品层，差距更明显。IDE 深度集成上，Cursor 仍强一截。可控性、可审计、换模型、本地推理，开源反而占优。

所以我给自己的结论是：核心 agent loop 上，开源 harness 已经能打，和商业成品不是代差。真正拉开的，多半是和模型的共设计深度，以及产品化可靠度。智能上限主要由模型定；开源短板更偏效率、稳健、开箱体验。总差距中等且不均匀。

## 谁适合长期当主力

短期折腾谁都能装一下。我想要的是客观场景：什么情况下值得长期当主力。

适合的情况通常带着持续存在的约束。团队模型策略必须可换，不能绑死一家。合规、数据出境、安全审批过不了商业 Agent，只能接本地或内网推理。成本要按 token 精细控，日常用便宜或本地，高峰才上强模型。工作主战场在终端、脚本、CI，而不是 IDE 里点点点。组织需要可审计、可定制、可沉淀的 Agent 层，甚至要二次开发。多人用不同编辑器，却希望共用同一套 Agent。

不太适合当唯一主力的情况也清楚。没有合规、成本、锁定压力，只想少配置、稳出活，Claude Code 或 Codex 通常更省事。日常以可视化 diff 和 inline 改代码为主，Cursor 更贴。没人维护模型、密钥、权限和本地推理，开源方案的运维税会拖垮。任务长期卡在最难的架构和深调试，预算又够，共设计更深的商业产品往往更省心。

我给自己用的判定很简单。未来十二个月是否很可能换模型供应商或多模型并存；代码进商业 Agent 会不会卡合规或采购；有没有人持续管配置、权限、成本和模型选择。两条以上为真，才值得把 OpenCode 当长期主力或组织标准 harness。都否，用商业成品更理性。只有一条为真，更常见是双轨：日常用 Cursor 或 Claude Code，敏感或成本敏感任务再走 OpenCode。

一句话收束这层：OpenCode 适合 Agent 必须可控的长期场景，不适合 Agent 必须省心的长期场景。前者是基础设施选型，后者是生产力工具选型。

## 周边值得自己去摸的项目

开源方案也适合很多开发者去试，把生态摸清楚。我后面想自己体验的，不限于 OpenCode 本体。

和它直接相关的三个很值得先看。Pi（[pi.dev](https://pi.dev)，[earendil-works/pi](https://github.com/earendil-works/pi)）是极简可扩展 harness，默认很瘦，用 extension、skills、package 自己长能力，适合对照「功能齐全」和「最小核」。Oh My OpenAgent（常被叫 OMO，[code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)）是挂在 OpenCode 上的编排增强层，也有面向 Codex 的轻量版，用来体验多 agent、hooks、模型路由。OpenChamber（[openchamber.dev](https://openchamber.dev)）是 OpenCode 的可视化壳，分支会话、并行多模型、diff 审阅，依赖 OpenCode，不替代它。

横向对照还可以看 OpenHands、Aider、Cline、Goose、Crush。它们分别偏自主长跑、Git 结对、IDE 内嵌、通用自动化、Charm 系 TUI。再外围一点，OpenClaw 更像本地个人助手，可以把 coding agent 当手脚；Roo Code 是多模式 CLI agent。有一份持续更新的地图 [awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)，后面自己扫比死记名单更高效。

体验顺序上，我倾向先用 OpenCode 建立基线，再看 OpenChamber 换壳，再装 OMO 看编排增益，再用 Pi 体会最小核，最后用 Aider、Crush、OpenHands、Cline、Goose 做横向对照。同一模型横比才公平，别把本地小模型和云端强模型混着下结论。

心智上可以这么放：OpenChamber 在产品 UI 层，OMO 在编排增强层，OpenCode、Crush、Goose 是较完整的 coding harness，Pi 是极简核，Aider 偏 Git 结对，Cline 偏 IDE，OpenHands 偏自主长任务，OpenClaw 偏个人助手加手脚。

## 现在停在哪

这轮对话没有变成「我已经把 OpenCode 用成主力」的实践复盘，而是把几个判断钉住了。OpenCode 首先是可插拔的 coding agent harness。开源 harness 的核心 loop 已经能打，和商业成品的差距主要在共设计与产品化，不在「会不会改代码」的代差。长期当不当主力，看的是约束是否持续存在，不是星数热不热。生态里还有 Pi、OMO、OpenChamber 等项目，值得按同一模型条件自己摸一遍。

这些判断够我后面选型时用。真正装上、接模型、跑自己的仓库之后，效率和翻车成本会不会改写边界，那是下一篇文章的事。
