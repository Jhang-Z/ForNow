import type { RequestContext } from '../../orchestrator/context';
import { getDailyStats, getWeeklyReport, getStreakDays } from './repository';
import type { DailyStats, WeeklyReport } from './types';

function currentIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentWeekNumber(): number {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1);
  const diff = now.getTime() - monday.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export async function toolGetDailyStats(
  ctx: RequestContext,
  params: { userId: string; date?: string }
): Promise<DailyStats> {
  const date = params.date ?? currentIsoDate();
  ctx.log('tool.getDailyStats', { params: { ...params, date } });
  const stats = getDailyStats(params.userId, date);
  ctx.log('tool.getDailyStats.complete', { date, completionRate: stats.completionRate });
  return stats;
}

export async function toolGetWeeklyReport(
  ctx: RequestContext,
  params: { userId: string; weekNumber?: number; year?: number }
): Promise<WeeklyReport> {
  const weekNumber = params.weekNumber ?? currentWeekNumber();
  const year = params.year ?? new Date().getFullYear();
  ctx.log('tool.getWeeklyReport', { params: { ...params, weekNumber, year } });
  const report = getWeeklyReport(params.userId, weekNumber, year);
  ctx.log('tool.getWeeklyReport.complete', { weekNumber, year, totalFocusMinutes: report.totalFocusMinutes });
  return report;
}

export async function toolGetStreakDays(
  ctx: RequestContext,
  params: { userId: string }
): Promise<number> {
  ctx.log('tool.getStreakDays', { params });
  const streak = getStreakDays(params.userId);
  ctx.log('tool.getStreakDays.complete', { streak });
  return streak;
}
