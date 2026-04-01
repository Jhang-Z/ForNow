import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../../db/index';
import { tasks_table, ritual_entries_table, focus_sessions_table } from '../../db/schema';
import type { DailyStats, WeeklyReport } from './types';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(weekNumber: number, year: number): Date {
  // ISO week: week 1 = week containing Jan 4
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getDailyStats(userId: string, date: string): DailyStats {
  const tasks = db
    .select()
    .from(tasks_table)
    .where(and(eq(tasks_table.userId, userId), eq(tasks_table.date, date)))
    .all();

  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.completed).length;

  const ritualEntries = db
    .select()
    .from(ritual_entries_table)
    .where(and(eq(ritual_entries_table.userId, userId), eq(ritual_entries_table.date, date)))
    .all();

  const ritualCompleted = ritualEntries.filter((r) => r.completed).length;

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const focusSessions = db
    .select()
    .from(focus_sessions_table)
    .where(
      and(
        eq(focus_sessions_table.userId, userId),
        eq(focus_sessions_table.status, 'completed'),
        gte(focus_sessions_table.startTime, dayStart),
        lte(focus_sessions_table.startTime, dayEnd)
      )
    )
    .all();

  const focusSeconds = focusSessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const focusMinutes = Math.round(focusSeconds / 60);

  const completionRate =
    tasksTotal === 0 ? 0 : Math.round((tasksCompleted / tasksTotal) * 100);

  return { date, tasksTotal, tasksCompleted, ritualCompleted, focusMinutes, completionRate };
}

export function getWeeklyReport(userId: string, weekNumber: number, year: number): WeeklyReport {
  const monday = startOfWeek(weekNumber, year);
  const stats: DailyStats[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    stats.push(getDailyStats(userId, isoDate(day)));
  }

  const totalFocusMinutes = stats.reduce((s, d) => s + d.focusMinutes, 0);
  const avgCompletionRate =
    stats.length === 0
      ? 0
      : Math.round(stats.reduce((s, d) => s + d.completionRate, 0) / stats.length);
  const streakDays = getStreakDays(userId);

  return { weekNumber, year, stats, totalFocusMinutes, avgCompletionRate, streakDays };
}

export function getStreakDays(userId: string): number {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const day = addDays(today, -i);
    const date = isoDate(day);

    const tasks = db
      .select()
      .from(tasks_table)
      .where(and(eq(tasks_table.userId, userId), eq(tasks_table.date, date)))
      .all();

    const hasActivity = tasks.some((t) => t.completed);

    if (i === 0 && !hasActivity) {
      // today hasn't started yet — check yesterday started the streak
      continue;
    }
    if (!hasActivity) break;
    streak++;
  }

  return streak;
}
