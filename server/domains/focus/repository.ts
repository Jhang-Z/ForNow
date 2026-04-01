import { and, eq, gte } from 'drizzle-orm';
import { db } from '../../db/index';
import { focus_sessions_table } from '../../db/schema';
import type { FocusSession, FocusSessionType } from './types';

function generateId(): string {
  return `focus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startSession(
  userId: string,
  taskTitle?: string,
  type: FocusSessionType = 'pomodoro',
  taskId?: string
): FocusSession {
  const now = new Date();
  const session = {
    id: generateId(),
    userId,
    taskId: taskId ?? null,
    taskTitle: taskTitle ?? null,
    startTime: now,
    endTime: null,
    duration: null,
    status: 'active' as const,
    type,
  };

  db.insert(focus_sessions_table).values(session).run();
  return session;
}

export function endSession(sessionId: string, endTime: Date): FocusSession | null {
  const rows = db
    .select()
    .from(focus_sessions_table)
    .where(eq(focus_sessions_table.id, sessionId))
    .limit(1)
    .all();

  const row = rows[0];
  if (!row) return null;

  const startMs = row.startTime instanceof Date ? row.startTime.getTime() : (row.startTime as number);
  const endMs = endTime.getTime();
  const durationSeconds = Math.floor((endMs - startMs) / 1000);

  db.update(focus_sessions_table)
    .set({ endTime, duration: durationSeconds, status: 'completed' })
    .where(eq(focus_sessions_table.id, sessionId))
    .run();

  return {
    ...row,
    endTime,
    duration: durationSeconds,
    status: 'completed',
  } as FocusSession;
}

export function getActiveSession(userId: string): FocusSession | null {
  const rows = db
    .select()
    .from(focus_sessions_table)
    .where(
      and(
        eq(focus_sessions_table.userId, userId),
        eq(focus_sessions_table.status, 'active')
      )
    )
    .limit(1)
    .all();

  return (rows[0] as FocusSession) ?? null;
}

export function getTodaySessions(userId: string): FocusSession[] {
  const startOfDay = toStartOfDay(new Date());
  return db
    .select()
    .from(focus_sessions_table)
    .where(
      and(
        eq(focus_sessions_table.userId, userId),
        gte(focus_sessions_table.startTime, startOfDay)
      )
    )
    .all() as FocusSession[];
}
