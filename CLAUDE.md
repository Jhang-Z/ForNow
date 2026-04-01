# CLAUDE.md — ForNow 项目智能文件
# 每一轮对话都会重新加载此文件
# 原则：此文件只做索引和黄金法则，细节全部在 .claude/rules/ 里

---

## 项目快照

```
名称：ForNow
定位：把"目标感"做成能看见、能推进、能沉浸的 iOS TODO App
架构：SwiftUI 壳 + WKWebView + Node.js 后端（monorepo）
阶段：MVP 开发期
iOS：SwiftUI（只做 WKWebView 容器 + 原生桥接）
后端：Node.js + TypeScript（待初始化）
UI：Web（React，运行在 WebView 里）
```

---

## ⚡ 黄金法则（每轮重读，违反即拒绝）

1. **iOS 零逻辑** — SwiftUI 代码只做三件事：装载 WKWebView、注册桥接、路由跳转。禁止出现业务判断
2. **域内自治** — Domain A 不得直接 import Domain B 的内部模块，跨域必须经过 Orchestrator
3. **Tool 必须是哑的** — Tool 函数：无业务判断、无副作用链、单一职责、第一参数必须是 ctx
4. **traceId 贯穿全链** — 所有服务端函数第一个参数必须是 `ctx: RequestContext`
5. **Token 优先** — 禁止在组件代码里硬编码颜色/字号/间距，全部引用 CSS 变量

---

## 规则模块索引

| 模块 | 文件 | 内容 |
|---|---|---|
| 架构约束 | `.claude/rules/architecture.md` | 薄客户端、DDD、桥接协议、目录规范 |
| Agent 规范 | `.claude/rules/agent.md` | Plan/Execute 流水线、Tool 写法 |
| 可观测性 | `.claude/rules/observability.md` | TraceId、日志格式、debug 流程 |
| 设计体系 | `.claude/rules/design.md` | Token 使用、ForNow 视觉风格 |
| 工作流程 | `.claude/rules/workflow.md` | 关键词约定、并行 Agent、上下文管理 |

---

## 快捷关键词

| 我说 | 你做 |
|---|---|
| `新增领域 [name]` | 读 workflow.md → 生成完整 domain 脚手架 |
| `排查 tr_XXXXXX` | 读 observability.md → 分析 log 定位 step |
| `加桥接 [能力]` | 同步更新 BridgeHandler.swift + architecture.md 清单 |
| `更新 token [属性]` | 只改 webui/tokens/tokens.json，不动任何组件 |
| `新增 Tool [name]` | 在对应 domain/tools.ts 添加，同步更新 docs/DOMAIN_CONTRACTS.md |
| `并行任务` | fork subagent 并行执行，说明各子任务和合并条件 |
| `压缩上下文` | /compact，保留：黄金法则+当前任务+最近错误 |

---

## ForNow 领域划分

```
mission/    ← 本周使命：本周目标设定、周/月/年视图
ritual/     ← 每日仪式：固定模板任务（最小胜利/最大阻碍/明日计划）
tasks/      ← 自由任务：用户自建，可关联使命
focus/      ← 专注计时：番茄钟、专注会话记录
growth/     ← 能力成长：6维雷达图、等级、经验值
progress/   ← 进度统计：周回顾、完成率、连续天数
voice/      ← 语音 AI：录音转文字、Claude 意图解析
user/      ← 用户偏好：主题、提醒设置
```

---

## 当前任务状态
```
当前任务：iPhone 模拟器联调
已完成：
  - [x] Xcode SwiftUI 壳子 + WKWebView 容器
  - [x] WebUI React + Vite + Token 系统（米白色）
  - [x] Node.js 后端 + TraceId + /health 接口
  - [x] Orchestrator（planner + executor + toolRegistry）
  - [x] SQLite + Drizzle ORM 数据库
  - [x] Claude API 端到端打通
  - [x] mission domain + MissionPage.tsx
  - [x] ritual domain + RitualPage.tsx（checkbox 完成动画）
  - [x] tasks domain + TasksPage.tsx（快速添加/完成/优先级标签）
  - [x] GitHub 同步
  - [x] focus domain + FocusPage.tsx（番茄钟 + 黑色全屏 + 会话记录）
  - [x] growth domain + GrowthPage.tsx（6维SVG雷达图 + 等级 + exp进度条）
  - [x] progress domain + ProgressPage.tsx（3数据卡片 + 7天条形图）
  - [x] Tab Bar 底部导航（5标签：使命/仪式/专注/成长/回顾）
  - [x] MissionPage 改造（黑色大卡片 + 设定使命输入框 + POST /api/mission 接口）
进行中：
  - [ ] iPhone 模拟器联调
阻塞：
  - 无
下一步：
  - [ ] voice domain（录音转文字 + Claude 意图解析）
  - [ ] iOS 真机测试
```

## 最近架构决策

- ADR-001：monorepo 结构，iOS / server / webui 在同一 repo
- ADR-002：SwiftUI 只做壳子，WKWebView 承载所有 UI
- ADR-003：Plan + Execute Agent 流水线
- ADR-004：UI 风格改为米白色极简（原黑底琥珀废弃）
- ADR-005：7个域：mission / ritual / tasks / focus / growth / progress / voice

---
