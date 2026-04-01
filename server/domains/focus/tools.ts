import type { RequestContext } from '../../orchestrator/context';
import { startSession, endSession, getActiveSession, getTodaySessions } from './repository';
import type { FocusSession, TodayFocusStats, FocusSessionType } from './types';

export async function toolStartFocus(
  ctx: RequestContext,
  params: { userId: string; taskTitle?: string; durationMinutes?: number; type?: FocusSessionType }
): Promise<FocusSession> {
  ctx.log('tool.startFocus', { params });

  const session = startSession(params.userId, params.taskTitle, params.type ?? 'pomodoro');

  ctx.log('tool.startFocus.complete', { sessionId: session.id });
  return session;
}

export async function toolEndFocus(
  ctx: RequestContext,
  params: { sessionId: string; userId: string }
): Promise<FocusSession | null> {
  ctx.log('tool.endFocus', { params });

  const session = endSession(params.sessionId, new Date());

  ctx.log('tool.endFocus.complete', { sessionId: params.sessionId, found: !!session });
  return session;
}

export async function toolGetActiveSession(
  ctx: RequestContext,
  params: { userId: string }
): Promise<FocusSession | null> {
  ctx.log('tool.getActiveSession', { params });

  const session = getActiveSession(params.userId);

  ctx.log('tool.getActiveSession.complete', { found: !!session });
  return session;
}

export async function toolGetTodayFocusStats(
  ctx: RequestContext,
  params: { userId: string }
): Promise<TodayFocusStats> {
  ctx.log('tool.getTodayFocusStats', { params });

  const sessions = getTodaySessions(params.userId);
  const completed = sessions.filter(s => s.status === 'completed');
  const totalSeconds = completed.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const stats: TodayFocusStats = {
    totalMinutes: Math.floor(totalSeconds / 60),
    sessionCount: sessions.length,
    completedCount: completed.length,
  };

  ctx.log('tool.getTodayFocusStats.complete', { stats });
  return stats;
}
