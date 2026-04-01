import type { RequestContext } from '../../shared/types';
import type { TodayRitualResponse, RitualEntry } from './types';
import {
  ensureTodayEntries,
  getAllTemplates,
  getEntryByTemplateKey,
  completeEntry,
  countCompletedDaysBeforeDate,
} from './repository';
import { registerTool } from '../../orchestrator/toolRegistry';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function toolGetTodayRitual(
  ctx: RequestContext,
  params: { userId: string }
): Promise<TodayRitualResponse> {
  ctx.log('tool.getTodayRitual', { params });
  const date = todayDateString();
  const templates = getAllTemplates();
  const entries = ensureTodayEntries(params.userId, date);
  ctx.log('tool.getTodayRitual.complete', { count: entries.length });
  return { templates, entries, date };
}

export async function toolCompleteRitualItem(
  ctx: RequestContext,
  params: { userId: string; templateKey: string; content?: string }
): Promise<RitualEntry | null> {
  ctx.log('tool.completeRitualItem', { params });
  const date = todayDateString();
  const entry = getEntryByTemplateKey(params.userId, date, params.templateKey);
  if (!entry) {
    ctx.logWarn('tool.completeRitualItem.notFound', { templateKey: params.templateKey });
    return null;
  }
  const result = completeEntry(entry.id, params.content);
  ctx.log('tool.completeRitualItem.complete', { entryId: entry.id });
  return result;
}

export async function toolGetRitualStreak(
  ctx: RequestContext,
  params: { userId: string }
): Promise<number> {
  ctx.log('tool.getRitualStreak', { params });
  const date = todayDateString();
  const streak = countCompletedDaysBeforeDate(params.userId, date);
  ctx.log('tool.getRitualStreak.complete', { streak });
  return streak;
}

registerTool('ritual.getTodayRitual', {
  domain: 'ritual',
  description: '获取今日5个仪式项和完成状态',
  fn: (ctx, params) => toolGetTodayRitual(ctx, params as { userId: string }),
});

registerTool('ritual.completeRitualItem', {
  domain: 'ritual',
  description: '标记某个仪式项为已完成，可附带内容',
  fn: (ctx, params) =>
    toolCompleteRitualItem(
      ctx,
      params as { userId: string; templateKey: string; content?: string }
    ),
});

registerTool('ritual.getRitualStreak', {
  domain: 'ritual',
  description: '获取用户连续完成每日仪式的天数',
  fn: (ctx, params) => toolGetRitualStreak(ctx, params as { userId: string }),
});
