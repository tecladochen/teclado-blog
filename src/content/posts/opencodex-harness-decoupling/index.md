---
title: 'OpenCodex：解耦 Harness 与模型'
pubDate: 2026-08-07
description: '围绕 OpenCodex 讲清 Agent Harness 与模型解耦：为何不能只改 API 地址、兼容与能力如何区分，以及多模型组合、本地模型与渐进体验路径。'
categories: ['AI']
draft: false
---

最近一段时间，OpenCodex 在 AI 编程社区里的讨论越来越多。

很多人第一次接触它，是因为看到类似这样的分享：

> “用 OpenCodex 可以让 Codex 接入 DeepSeek。”

这个说法没有错，但如果只停留在这里，其实低估了 OpenCodex。

因为它真正有意思的地方，不是“多接了一个模型”，而是它在尝试解决一个更底层的问题：

> **能不能把 Agent Harness 和大模型彻底解耦？**

也就是说，我可以继续使用我最喜欢的 Codex，但模型未必一定是 OpenAI；我也可以继续使用 Claude Code，但底层未必只能是 Claude。

这件事一旦成立，AI 编程工具的使用方式会发生很大变化。

---

## Codex 的价值不只是模型

很多人会下意识把 Codex 和 GPT 看成一个整体。

但实际上，一个 AI 编程 Agent 至少可以拆成两层：

```text
模型
+
Agent Harness
```

模型负责理解、推理和决策。

而 Harness 负责让模型真正能够“干活”。

比如：

```text
读取项目
搜索代码
执行终端命令
修改文件
应用 Patch
运行测试
操作 Git
管理上下文
调用 MCP
使用 Skills
持续执行 Agent Loop
处理权限与 Sandbox
```

所以 Codex 的价值并不只是“用了一个强模型”。

它真正有竞争力的地方，是围绕模型搭建了一整套成熟的执行环境。

这也就自然产生了一个问题：

> 如果我喜欢 Codex 的工作方式，为什么我一定要绑定某一个模型？

比如：

- DeepSeek 成本更低；
- Claude 在某些代码任务上表现更好；
- Gemini 可能更适合超长上下文；
- 本地模型可以满足隐私要求。

如果这些模型都能驱动 Codex，那么 Codex 就会从“某一个模型的产品”逐渐变成一个更独立的 Agent Harness。

OpenCodex 就是在做这件事。

---

## OpenCodex 本质上是什么？

可以把整个链路想象成这样：

```text
Codex
  ↓
OpenCodex
  ↓
DeepSeek / Claude / Gemini / GLM / Kimi / OpenRouter / Ollama
```

Codex 仍然按照自己熟悉的方式发送请求。

OpenCodex 负责把这些请求转换成不同模型 Provider 能理解的协议。

然后再把模型返回的数据转换回 Codex 能理解的格式。

所以它本质上是一个：

> **Agent 与模型之间的兼容层、代理层和路由层。**

如果只看最基础的一层，它很像一个协议转换器。

但随着能力增加，它实际上已经越来越接近一个：

> **AI Model Gateway。**

因为它不仅负责 API 转换，还开始负责：

- Provider 管理
- Model Catalog
- 模型路由
- Failover
- Sidecar
- Account Pool
- 多模型组合

这也是 OpenCodex 比单纯“改 base_url”更有价值的地方。

---

## 为什么不能直接改 API 地址？

很多模型都号称支持 OpenAI-compatible API。

因此很容易产生一个误解：

```text
改 API Key
+
改 base_url
=
Codex 使用任意模型
```

对于普通聊天，这种方式可能够用。

但对于 Agent 来说，问题复杂得多。

因为真正的 Agent 工作流不是：

```text
Prompt → Text
```

而是：

```text
用户提出需求
↓
模型分析
↓
读取文件
↓
调用 Shell
↓
获得结果
↓
修改代码
↓
运行测试
↓
发现错误
↓
继续修改
...
```

这里面涉及大量协议细节：

- Tool Calling
- Streaming
- Tool Call ID
- Structured Output
- Reasoning
- Conversation State
- Image
- Web Search
- Error Handling
- 多轮工具调用

不同厂商对这些能力的实现并不完全一致。

这也是为什么有些模型看起来“可以接入 Codex”，但真正开始执行任务以后，会出现：

> Token 已经消耗了，但 Codex 一直转圈。

或者：

> 普通对话没问题，一调用工具就失败。

OpenCodex 的价值之一，就是专门处理这些兼容问题。

---

## 现在能实际使用了吗？

这是比功能列表更重要的问题。

目前比较合理的判断是：

> **OpenCodex 已经跨过了纯实验项目阶段，核心场景已经具备实际使用价值，但仍然不能把它理解成所有第三方模型都能 100% 复刻原生 Codex。**

尤其是 Codex 最常用的能力，例如：

```text
读取文件
代码搜索
Shell
Patch
Git
测试
连续 Agent Loop
```

这类核心 Harness 能力已经比较适合日常使用。

因此像：

```text
Codex
↓
OpenCodex
↓
DeepSeek
```

这样的组合，现在已经不只是“能跑起来”，而是真正有实用价值。

特别适合一些高 Token 消耗、执行型很强的任务：

- CRUD
- 普通 Bug 修复
- UI 调整
- 补测试
- 批量重构
- Migration
- Lint 修复
- 类型错误修复
- 文档整理
- 重复性开发工作

这些任务如果全部使用最昂贵的旗舰模型，成本并不一定合理。

---

## 兼容与模型能力不是一回事

使用 OpenCodex 时最容易误判的一点是：

> 第三方模型表现不如 GPT，是不是 OpenCodex 兼容不好？

不一定。

可能有两种完全不同的问题。

第一种是真正的兼容问题。

例如：

```text
模型发出 Tool Call
↓
OpenCodex 转换错误
↓
Codex 无法正确执行
```

这种问题属于代理层。

但另一种情况是：

> 协议完全没有问题，模型本身就是没有那么擅长驾驭 Codex Harness。

因为一个模型进入 Agent 环境以后，需要自己判断：

```text
什么时候读文件？
什么时候搜索？
什么时候执行命令？
什么时候修改？
什么时候重试？
什么时候停止？
```

复杂任务可能涉及几十次连续 Tool Call。

一个模型 Benchmark 很高，并不代表它在长程 Agent Workflow 中一定同样稳定。

所以更准确的理解应该是：

> **OpenCodex 能把 Codex Harness 交给第三方模型，但不能保证第三方模型能够像 Codex 原生最佳模型一样使用这套 Harness。**

这也是为什么未来评价 Agent，不能只看模型。

更合理的关系是：

```text
Agent 最终表现
≈
模型
× Harness
× Context
× Tools
× Protocol Compatibility
```

---

## 价值在组合，不在替换

如果只是把 GPT 完全换成 DeepSeek，当然已经有价值。

但我认为更值得关注的是：

> **多模型 Codex。**

比如：

```text
GPT
负责：
架构设计
复杂 Debug
关键重构
最终 Review

DeepSeek
负责：
普通开发
测试
CRUD
批量修改
文档
重复性工作
```

这时候 OpenCodex 的价值就不再是：

> “帮我省一点模型费用。”

而是：

> **让 Codex 从单模型工具变成多模型工作台。**

开发者不需要为了使用不同模型，在 Codex、Claude Code、OpenCode 等工具之间反复切换。

Harness 保持不变。

只切模型。

这其实是一种非常自然的工作方式。

---

## 用 OpenRouter 做模型实验

另一个很有意思的搭配是：

```text
Codex
↓
OpenCodex
↓
OpenRouter
↓
大量模型
```

这对于模型研究尤其有价值。

因为你可以在同一个 Codex Harness 中真正比较：

- Claude
- Gemini
- DeepSeek
- Qwen
- Kimi
- GLM
- Llama

而不是只看排行榜。

同一个 Harness、同一个项目、同一种工具环境，直接观察不同模型在真实任务中的表现。

这种比较比单纯看 Benchmark 更接近开发者真正关心的问题：

> 哪个模型最适合实际干活？

---

## 给本地模型完整 Agent 环境

另外一个很值得探索的方向是：

```text
Codex
↓
OpenCodex
↓
Ollama / vLLM / LM Studio
↓
本地模型
```

这类场景适合：

- 私有代码
- 离线环境
- 企业内部模型
- 本地 GPU
- 开源 Coding Model 实验

过去本地模型最大的问题之一，是缺少一个成熟的 Agent Harness。

模型可能很强，但真正让它：

```text
读项目
跑命令
改文件
测试
持续工作
```

还需要额外做大量工程。

OpenCodex 的思路，就是让成熟 Harness 和本地模型能够组合。

当然，这时候真正的瓶颈经常已经不是 OpenCodex，而是本地模型自己的 Agent 能力。

---

## Sidecar：组合多模型能力

有些第三方模型并不具备 Codex 所需要的完整能力。

例如：

> 主模型很会写代码，但没有 Web Search。

或者：

> 文本推理很强，但 Vision 能力不够。

OpenCodex 提供的一种思路是：

```text
主模型：DeepSeek
负责主要推理和开发

辅助模型：GPT
负责 Web Search

辅助模型：Claude
负责 Vision
```

这意味着一个 Agent 不必再依赖某一个“全能模型”。

它可以开始变成：

> **多个模型共同提供能力。**

这其实是一个很重要的趋势。

未来最强的 Agent 系统，很可能不是：

> 一个模型什么都做。

而是：

> 一个 Harness 根据不同任务调用最合适的模型与工具。

OpenCodex 已经开始往这个方向走。

---

## Combo 与 Failover 像 Gateway

OpenCodex 还可以把多个模型组合成一个逻辑模型。

例如：

```text
my-coder
├─ DeepSeek
├─ Gemini
└─ GLM
```

Codex 只看到：

```text
my-coder
```

但背后可以：

```text
DeepSeek 不可用
↓
Gemini

Gemini 限流
↓
GLM
```

或者执行 Round Robin。

这就已经不只是 API 转换了。

它开始具备真正的：

> **路由、容灾和模型基础设施能力。**

如果这种能力继续成熟，OpenCodex 最终可能承担的角色会越来越接近开发环境里的模型中间层。

---

## 它仍然不是魔法

当然，OpenCodex 也有明显边界。

尤其是 Codex 一些最新、更加依赖 OpenAI 自有后端的高级能力，比如某些 Multi-Agent / Subagent 机制，并不一定能够被第三方模型无损复刻。

所以当前比较合理的使用思路仍然是：

```text
先稳定使用普通 Agent
↓
再做多模型切换
↓
再做 Failover / Combo
↓
最后研究异构 Subagent
```

不要一开始就追求一个极其复杂的自动模型调度系统。

对于绝大多数开发者来说，最有价值的阶段其实是前两步。

---

## 实际使用只需几个命令

OpenCodex 有不少 CLI，但实际只需要理解几个关键动作。

第一次配置：

```bash
ocx init
```

日常管理：

```bash
ocx gui
```

查看运行状态：

```bash
ocx status
```

测试 Provider：

```bash
ocx provider test deepseek
```

看 Codex 当前能看到什么模型：

```bash
ocx models live
```

刷新模型目录：

```bash
ocx sync
```

出现奇怪问题：

```bash
ocx doctor
```

想暂时恢复原生 Codex：

```bash
ocx restore
```

真正重要的不是记命令，而是理解整个链路：

```text
Provider
↓
Model
↓
OpenCodex Proxy
↓
Codex
```

一旦出问题，就沿着这条链排查。

这样比背几十个参数更有价值。

---

## 怎样开始体验 OpenCodex？

如果第一次正式使用，我不建议一开始接几十个模型。

更合理的顺序是：

```text
第一步
Codex + OpenCodex + DeepSeek

第二步
保留 GPT，再加 DeepSeek

第三步
增加 Claude 或 Gemini

第四步
体验 OpenRouter

第五步
尝试本地模型

第六步
再研究 Sidecar、Combo、Failover、Subagent
```

这样的学习过程有一个好处：

每增加一个能力，你都能明确知道：

> 它到底解决了什么问题。

而不是把 OpenCodex 配成一个几十个模型的“模型收藏夹”，最后反而不知道什么时候该用什么。

---

## 值得关注的不是 DeepSeek

如果今天只是因为：

> “DeepSeek 很便宜，所以我要把它接进 Codex。”

那么未来一旦出现另一个更便宜的模型，OpenCodex 似乎就没有那么重要了。

但如果换一个角度看，它解决的是：

> **Agent Harness 与 Model 的解耦。**

那么事情就完全不同了。

未来开发者可能会拥有一个固定的 Agent 工作环境：

```text
Codex
```

然后根据任务选择：

```text
GPT
Claude
DeepSeek
Gemini
本地模型
```

甚至由系统自动组合这些模型。

开发者真正熟悉的，不再是某一个模型，而是自己的 Harness、Tools、Skills 和 Workflow。

模型则逐渐变成可以替换、路由和组合的计算资源。

这可能也是 OpenCodex 最值得关注的地方。

它未必会成为最终形态，但它已经非常清楚地展示了一种趋势：

> **未来的 AI Agent，不一定属于某一个模型。**

而当模型与 Harness 真正解耦以后，AI 编程工具的竞争，也会从“谁绑定了更强的模型”，逐渐进入一个新的阶段：

> **谁能提供更好的 Agent Runtime、上下文、工具、工作流和模型调度能力。**
