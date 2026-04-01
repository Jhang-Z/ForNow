import type { RequestContext } from '../../shared/types';
import type { Task, TaskPriority, TodayTasksResponse } from './types';
import { getTodayTasks, createTask, completeTask, reorderTasks } from './repository';
import { registerTool } from '../../orchestrator/toolRegistry';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function toolGetTodayTasks(
  ctx: RequestContext,
  params: { userId: string; date?: string }
): Promise<TodayTasksResponse> {
  ctx.log('tool.getTodayTasks', { params });
  const date = params.date ?? todayDateString();
  const tasks = getTodayTasks(params.userId, date);
  const completedCount = tasks.filter((t) => t.completed).length;
  ctx.log('tool.getTodayTasks.complete', { count: tasks.length, completedCount });
  return { tasks, date, completedCount, totalCount: tasks.length };
}

export async function toolCreateTask(
  ctx: RequestContext,
  params: { userId: string; title: string; missionId?: string; priority?: TaskPriority; date?: string }
): Promise<Task> {
  ctx.log('tool.createTask', { params });
  const date = params.date ?? todayDateString();
  const task = createTask(params.userId, params.title, date, params.missionId, params.priority);
  ctx.log('tool.createTask.complete', { taskId: task.id });
  return task;
}

export async function toolCompleteTask(
  ctx: RequestContext,
  params: { taskId: string; userId: string }
): Promise<Task | null> {
  ctx.log('tool.completeTask', { params });
  const task = completeTask(params.taskId);
  if (!task) {
    ctx.logWarn('tool.completeTask.notFound', { taskId: params.taskId });
    return null;
  }
  ctx.log('tool.completeTask.complete', { taskId: task.id });
  return task;
}

export async function toolReorderTasks(
  ctx: RequestContext,
  params: { taskIds: string[] }
): Promise<void> {
  ctx.log('tool.reorderTasks', { count: params.taskIds.length });
  reorderTasks(params.taskIds);
  ctx.log('tool.reorderTasks.complete');
}

registerTool('tasks.getTodayTasks', {
  domain: 'tasks',
  description: '获取今日任务列表，包含完成状态和优先级',
  fn: (ctx, params) => toolGetTodayTasks(ctx, params as { userId: string; date?: string }),
});

registerTool('tasks.createTask', {
  domain: 'tasks',
  description: '创建新任务，可关联使命，可设置优先级',
  fn: (ctx, params) =>
    toolCreateTask(
      ctx,
      params as { userId: string; title: string; missionId?: string; priority?: TaskPriority; date?: string }
    ),
});

registerTool('tasks.completeTask', {
  domain: 'tasks',
  description: '标记任务为已完成',
  fn: (ctx, params) => toolCompleteTask(ctx, params as { taskId: string; userId: string }),
});

registerTool('tasks.reorderTasks', {
  domain: 'tasks',
  description: '按新顺序重新排列今日任务',
  fn: (ctx, params) => toolReorderTasks(ctx, params as { taskIds: string[] }),
});
