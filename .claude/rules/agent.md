# .claude/rules/agent.md
# Agent 架构规范 — Plan/Execute 流水线 + Smart Agent / Dumb Tool

---

## ForNow 的 Agent 场景

ForNow 是 TODO App，Agent 主要处理这类意图：
- "帮我把这个目标拆成今天能做的任务"
- "我今天完成了多少，跟上周比怎么样"
- "给我推荐一个专注时长"
- "整理我未完成的目标，按优先级排列"

---

## Plan + Execute 流水线

```
用户意图输入
    ↓
[PLAN] Planner LLM
    → 分析意图，查看 toolRegistry
    → 输出 ExecutionPlan JSON
    → 不执行任何操作
    ↓
[EXEC] Executor
    → 检查 dependsOn，并行执行无依赖步骤
    → 每步调用对应 Domain Tool
    → 记录 trace log
    ↓
[RENDER] Result Aggregator
    → 生成 InstructionPayload
    → 返回给 iOS 渲染
```

### ExecutionPlan 格式

```typescript
interface ExecutionPlan {
  traceId: string;
  intent: string;
  steps: Array<{
    stepId: number;
    domain: string;           // goals | tasks | focus | progress | user
    tool: string;
    params: Record<string, unknown>;
    dependsOn: number[];      // 空 = 可立即并行
    retryable: boolean;
    timeoutMs: number;
  }>;
  estimatedDurationMs: number;
}
```

### 简单意图快速路径（skip planner）

```
满足全部条件时直接执行：
  ✓ 只涉及 1 个 domain
  ✓ 只需 1 个 tool
  ✓ 无前置依赖

例：「标记任务完成」→ 直接调 tasks.completeTask，不走 Planner
```

---

## Tool 函数写法规范

### ✅ 标准 Dumb Tool

```typescript
// server/domains/goals/tools.ts

export async function getActiveGoals(
  ctx: RequestContext,
  params: { userId: string; limit?: number }
): Promise<Goal[]> {
  ctx.log('tool.getActiveGoals', { params });

  const goals = await db
    .select()
    .from(goals_table)
    .where(
      and(
        eq(goals_table.userId, params.userId),
        eq(goals_table.status, 'active')
      )
    )
    .limit(params.limit ?? 20);

  ctx.log('tool.getActiveGoals.complete', { count: goals.length });
  return goals;
}
```

### ❌ 禁止写法

```typescript
// ❌ 工具里含业务判断
export async function getGoals(ctx, params) {
  if (user.isPremium) { return premiumGoals; }  // 判断在 Agent 里做
}

// ❌ 工具调用其他工具
export async function createGoalWithDefaultTasks(ctx, params) {
  const goal = await createGoal(ctx, params);     // ← 不允许工具调工具
  await createDefaultTasks(ctx, { goalId: goal.id });
}

// ❌ 缺少 ctx 参数
export async function getGoals(params) { ... }
```

---

## ForNow 各 Domain Agent System Prompt

### goals domain

```
你是目标管理专家。
负责：创建目标、编辑目标、归档目标、查询目标列表、设置截止日期和优先级。

不负责：任务拆解（tasks domain）、专注计时（focus domain）、进度统计（progress domain）。

可用工具：getActiveGoals / createGoal / updateGoal / archiveGoal / getGoalById

遇到超出范围的请求，返回：{ "needsOrchestrator": true, "reason": "..." }
```

### tasks domain

```
你是任务拆解专家。
负责：把目标拆解为具体任务、管理任务状态、排列优先级、设定今日任务。

不负责：目标本身的管理、专注计时、进度统计。

可用工具：getTasksByGoal / createTask / completeTask / updateTask / getTodayTasks / reorderTasks
```

### focus domain

```
你是专注模式专家。
负责：启动/结束专注计时、记录中断、保存专注会话数据。

不负责：任务本身的管理、统计分析（progress domain 的事）。

可用工具：startFocusSession / endFocusSession / recordInterruption / getFocusHistory
```

### progress domain

```
你是进度分析专家。
负责：计算完成率、连续天数、周/月统计、生成回顾报告。

不负责：修改任何数据（只读分析）。

可用工具：getDailyStats / getWeeklyReport / getStreakCount / getCompletionRate
```

---

## Planner System Prompt 模板

```
你是 ForNow App 的任务规划器（Planner）。
用户是在管理自己的目标和任务。

用户意图：{userIntent}
可用工具：{toolRegistry}

规则：
- 输出纯 JSON ExecutionPlan，不含任何解释文字
- dependsOn 为空 = 可立即并行执行
- 查询类操作设 retryable: true
- 写操作设 retryable: false
- 每步只做一件事
```
