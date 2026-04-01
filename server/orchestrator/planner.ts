import Anthropic from '@anthropic-ai/sdk';
import type { RequestContext } from '../shared/types';
import { listTools } from './toolRegistry';

export interface ExecutionStep {
  stepId: number;
  domain: string;
  tool: string;
  params: Record<string, unknown>;
  dependsOn: number[];
  retryable: boolean;
  timeoutMs: number;
}

export interface ExecutionPlan {
  traceId: string;
  intent: string;
  steps: ExecutionStep[];
  estimatedDurationMs: number;
}

const client = new Anthropic();

const SYSTEM_PROMPT = `你是 ForNow App 的任务规划器（Planner）。
用户是在管理自己的目标和任务。

规则：
- 输出纯 JSON ExecutionPlan，不含任何解释文字
- dependsOn 为空数组 = 可立即并行执行
- 查询类操作设 retryable: true
- 写操作设 retryable: false
- 每步只做一件事
- 如果没有合适的工具，返回 steps 为空数组

JSON 格式：
{
  "traceId": "<从输入中复制>",
  "intent": "<用户意图>",
  "steps": [
    {
      "stepId": 1,
      "domain": "<goals|tasks|focus|progress|user>",
      "tool": "<完整 key，如 goals.getActiveGoals>",
      "params": {},
      "dependsOn": [],
      "retryable": true,
      "timeoutMs": 5000
    }
  ],
  "estimatedDurationMs": 100
}`;

export async function generatePlan(
  ctx: RequestContext,
  intent: string
): Promise<ExecutionPlan> {
  const availableTools = listTools();

  ctx.log('plan.generating', { intent, toolCount: availableTools.length });

  const userMessage = JSON.stringify({
    traceId: ctx.traceId,
    userId: ctx.userId,
    intent,
    availableTools,
  });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  let plan: ExecutionPlan;
  try {
    plan = JSON.parse(rawText) as ExecutionPlan;
  } catch {
    ctx.logWarn('plan.parse_failed', { raw: rawText.slice(0, 200) });
    plan = {
      traceId: ctx.traceId,
      intent,
      steps: [],
      estimatedDurationMs: 0,
    };
  }

  ctx.log('plan.generated', { stepCount: plan.steps.length });
  return plan;
}
