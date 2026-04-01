import type { RequestContext } from '../shared/types';
import type { ExecutionPlan, ExecutionStep } from './planner';
import { getTool } from './toolRegistry';

const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

async function executeStep(
  ctx: RequestContext,
  step: ExecutionStep
): Promise<unknown> {
  const toolKey = `${step.domain}.${step.tool}`;
  const tool = getTool(toolKey);

  if (!tool) {
    throw new Error(`Tool not found: ${toolKey}`);
  }

  ctx.log('step.start', { stepId: step.stepId, tool: toolKey });

  let lastError: Error | undefined;
  const attempts = step.retryable ? MAX_RETRY_ATTEMPTS : 1;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await withTimeout(
        tool.fn(ctx, step.params),
        step.timeoutMs
      );
      ctx.log('step.success', { stepId: step.stepId, tool: toolKey, attempt });
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < attempts) {
        ctx.logWarn('step.retry', {
          stepId: step.stepId,
          tool: toolKey,
          attempt,
          error: lastError.message,
        });
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }

  ctx.logError('step.failed', lastError!, {
    stepId: step.stepId,
    tool: toolKey,
  });
  throw lastError;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Step timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ExecutionResult {
  traceId: string;
  results: Record<number, unknown>;
  errors: Record<number, string>;
  durationMs: number;
}

export async function executePlan(
  ctx: RequestContext,
  plan: ExecutionPlan
): Promise<ExecutionResult> {
  const results: Record<number, unknown> = {};
  const errors: Record<number, string> = {};
  const completed = new Set<number>();

  const stepMap = new Map(plan.steps.map((s) => [s.stepId, s]));

  async function runStep(step: ExecutionStep): Promise<void> {
    // Wait for all dependencies to complete
    for (const depId of step.dependsOn) {
      if (!completed.has(depId)) {
        const dep = stepMap.get(depId);
        if (dep) await runStep(dep);
      }
    }

    if (completed.has(step.stepId)) return;

    try {
      results[step.stepId] = await executeStep(ctx, step);
    } catch (err) {
      errors[step.stepId] =
        err instanceof Error ? err.message : String(err);
    } finally {
      completed.add(step.stepId);
    }
  }

  // Launch all steps; dependency resolution happens inside runStep
  await Promise.all(plan.steps.map((step) => runStep(step)));

  return {
    traceId: ctx.traceId,
    results,
    errors,
    durationMs: Date.now() - ctx.startTime,
  };
}
