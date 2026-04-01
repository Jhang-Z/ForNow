# .claude/rules/workflow.md
# 工作流程规范 — 开发约定 + 并行 Agent + 上下文管理

---

## 新增 Domain 流程

```bash
./scripts/new-domain.sh [name] "[职责]"
# 例：./scripts/new-domain.sh focus "管理专注计时和心流会话"
```

然后按顺序：
1. 填 `server/domains/[name]/README.md` 边界说明
2. 在 `docs/DOMAIN_CONTRACTS.md` 添加契约
3. 填 `types.ts` → `repository.ts` → `tools.ts` → `agent.ts`
4. 在 `server/orchestrator/toolRegistry.ts` 注册

---

## 并行 Agent 模式

满足以下条件时主动提出并行：
- 可拆分为 2+ 个独立子任务
- 子任务之间无依赖
- 每个预计超过 10 分钟

模板：
```
并行任务：[总目标]

子任务 A：[描述]  相关文件：[列出]  输出：[期望]
子任务 B：[描述]  相关文件：[列出]  输出：[期望]

合并条件：A 和 B 完成后 [如何合并]
```

ForNow 典型并行场景：
```
并行任务：初始化 goals domain

子任务 A：实现 server/domains/goals/ 全部文件
子任务 B：实现 webui/pages/Goals/ 页面组件（使用 design tokens）
子任务 C：写 goals domain 的单元测试

# 三个任务无相互依赖，全部可并行
```

---

## 上下文管理

何时 /compact：
- 完成一个完整功能模块后
- 对话超过 30 轮
- 开始新的不相关任务前
- Claude 忘记了之前约定的时候

/compact 保留内容：
```
/compact 请保留：
- 当前任务状态（CLAUDE.md 里的任务块）
- 最近 3 个架构决策
- 当前修改的文件列表
- 最近的报错和解决方案
丢弃：早期探索、已关闭 bug 讨论、重复确认
```

Session 管理：
```bash
claude --continue          # 永远优先用这个，恢复上次 session
claude --fork-session [id] # 实验性改动时分叉
```

---

## 权限已预配置（.claude/settings.json）

不需要手动点允许的操作：npm/node/git status/git diff/scripts

需要手动确认的（保护性）：git push / rm -rf / git reset --hard

---

## 文件命名约定

| 类型 | 约定 | 示例 |
|---|---|---|
| Domain 文件 | kebab-case | `goal-repository.ts` |
| React 组件 | PascalCase | `GoalCard.tsx` |
| 工具函数 | camelCase | `formatDuration.ts` |
| TS 类型 | PascalCase interface | `Goal`, `FocusSession` |
| CSS 类名 | kebab-case | `.goal-card` |
| 测试文件 | 同名 + .test | `tools.test.ts` |

## Git Commit 约定

```
feat(goals): 新增目标创建功能
fix(focus): 修复计时器暂停后时间不准
refactor(tasks): 拆分 tool 函数
token: 调整主色为琥珀色系
bridge: 新增 share 原生能力
obs: 补充 goals domain 的 trace log
```
