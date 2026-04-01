import type { RequestContext } from '../../shared/types';
import type { Mission } from './types';
import { getCurrentMission, createMission, updateMission } from './repository';
import { registerTool } from '../../orchestrator/toolRegistry';

// Returns ISO week number (1-53) for a given date.
// Uses ISO 8601: week starts Monday, week 1 contains the first Thursday.
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function toolGetCurrentMission(
  ctx: RequestContext,
  params: { userId: string }
): Promise<Mission | null> {
  ctx.log('tool.getCurrentMission', { params });
  const now = new Date();
  const result = await getCurrentMission(params.userId, getWeekNumber(now), now.getFullYear());
  ctx.log('tool.getCurrentMission.complete', { found: result !== null });
  return result;
}

export async function toolCreateMission(
  ctx: RequestContext,
  params: { userId: string; title: string; description?: string; weekNumber: number; year: number }
): Promise<Mission> {
  ctx.log('tool.createMission', { params });
  const result = await createMission(params);
  ctx.log('tool.createMission.complete', { id: result.id });
  return result;
}

export async function toolUpdateMission(
  ctx: RequestContext,
  params: { id: string; title?: string; description?: string; status?: 'active' | 'completed' | 'archived' }
): Promise<Mission | null> {
  ctx.log('tool.updateMission', { params });
  const { id, ...updates } = params;
  const result = await updateMission(id, updates);
  ctx.log('tool.updateMission.complete', { found: result !== null });
  return result;
}

// Register all mission tools into the global registry
registerTool('mission.getCurrentMission', {
  domain: 'mission',
  description: '获取指定用户当前周的使命',
  fn: (ctx, params) => toolGetCurrentMission(ctx, params as { userId: string }),
});

registerTool('mission.createMission', {
  domain: 'mission',
  description: '为指定用户创建本周使命',
  fn: (ctx, params) =>
    toolCreateMission(ctx, params as { userId: string; title: string; description?: string; weekNumber: number; year: number }),
});

registerTool('mission.updateMission', {
  domain: 'mission',
  description: '更新使命标题、描述或状态',
  fn: (ctx, params) =>
    toolUpdateMission(ctx, params as { id: string; title?: string; description?: string; status?: 'active' | 'completed' | 'archived' }),
});
