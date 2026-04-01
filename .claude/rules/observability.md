# .claude/rules/observability.md
# 可观测性规范 — TraceId + 结构化日志 + Debug 流程

---

## TraceId 格式

```
tr_{YYYYMMDD}_{6位随机}
例：tr_20240401_a3f9k2
```

## RequestContext（所有服务端函数第一个参数）

```typescript
interface RequestContext {
  traceId: string;
  userId: string;
  startTime: number;
  log(event: string, data?: Record<string, unknown>): void;
  logWarn(event: string, data?: Record<string, unknown>): void;
  logError(event: string, error: Error, data?: Record<string, unknown>): void;
}

function createContext(userId: string): RequestContext {
  const traceId = `tr_${new Date().toISOString().slice(0,10).replace(/-/g,'')}_${Math.random().toString(36).slice(2,8)}`;
  return {
    traceId, userId, startTime: Date.now(),
    log: (event, data) => logger.info({ traceId, userId, event, ...data }),
    logWarn: (event, data) => logger.warn({ traceId, userId, event, ...data }),
    logError: (event, error, data) => logger.error({ traceId, userId, event, error: error.message, ...data }),
  };
}
```

---

## 标准日志格式

```json
{
  "traceId": "tr_20240401_a3f9k2",
  "timestamp": "2024-04-01T10:30:00.123Z",
  "level": "info",
  "event": "tool.getActiveGoals",
  "userId": "user_abc",
  "domain": "goals",
  "stepId": 1,
  "duration": 18,
  "status": "success"
}
```

## 标准事件名称

| 事件 | 时机 |
|---|---|
| `request.received` | API handler 入口 |
| `plan.generated` | Planner 完成 |
| `plan.skipped` | 走简单快速路径 |
| `step.start` | Executor 开始某步 |
| `step.success` | 步骤成功 |
| `step.retry` | 步骤重试 |
| `step.failed` | 步骤最终失败 |
| `tool.{name}` | Tool 被调用 |
| `tool.{name}.complete` | Tool 返回 |
| `render.sent` | Payload 发给 iOS |
| `request.complete` | 整个请求完成 |

---

## Bug 排查流程

给 Claude 的标准格式：

```
排查 tr_20240401_a3f9k2

日志：
{"traceId":"tr_20240401_a3f9k2","event":"step.failed","stepId":2,"error":"Goal not found"}

现象：点击目标详情页崩溃
```

查日志命令：
```bash
./scripts/trace-lookup.sh tr_20240401_a3f9k2
cat logs/app.log | grep "tr_20240401_a3f9k2" | jq '.'
```

前端错误码展示（traceId 后 6 位）：
```javascript
showToast({ message: `操作失败（${traceId.slice(-6)}）`, style: 'error' });
```
