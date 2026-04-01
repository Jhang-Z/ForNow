import express, { type Request, type Response, type NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createContext } from './observability/trace';
import { logger } from './observability/logger';
import { AppError } from './shared/errors';
import { initDb } from './db/index';
import { generatePlan } from './orchestrator/planner';
import { toolGetCurrentMission, getWeekNumber } from './domains/mission/tools';
import { toolGetTodayRitual, toolCompleteRitualItem } from './domains/ritual/tools';
import { initDefaultTemplates } from './domains/ritual/repository';
import { toolGetTodayTasks, toolCreateTask, toolCompleteTask } from './domains/tasks/tools';
import { toolStartFocus, toolEndFocus, toolGetActiveSession, toolGetTodayFocusStats } from './domains/focus/tools';

// NODE_TLS_REJECT_UNAUTHORIZED=0 causes Anthropic SDK to reject requests with 403.
// It may be set by system-level tooling; remove it from this process's env.
delete process.env['NODE_TLS_REJECT_UNAUTHORIZED'];

const PORT = process.env.PORT ?? 3000;

initDb();
initDefaultTemplates();

const app = express();
app.use(express.json());

// Allow WebUI dev server (Vite) to call the API from a different origin
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  const ctx = createContext('system');
  ctx.log('request.received', { path: '/health' });
  ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
  res.json({ status: 'ok', traceId: ctx.traceId });
});

app.get('/api/test-claude', async (_req: Request, res: Response, next: NextFunction) => {
  const ctx = createContext('system');
  ctx.log('request.received', { path: '/api/test-claude' });

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [{ role: 'user', content: '说 ok' }],
    });
    const reply = message.content[0].type === 'text' ? message.content[0].text : '';
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, reply });
  } catch (err) {
    next(err);
  }
});

app.get('/api/mission/current', async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.query['userId'] as string | undefined) ?? 'default';
  const ctx = createContext(userId);
  ctx.log('request.received', { path: '/api/mission/current' });

  try {
    const now = new Date();
    const mission = await toolGetCurrentMission(ctx, { userId });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({
      traceId: ctx.traceId,
      weekNumber: getWeekNumber(now),
      year: now.getFullYear(),
      mission,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/ritual/today', async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.query['userId'] as string | undefined) ?? 'default';
  const ctx = createContext(userId);
  ctx.log('request.received', { path: '/api/ritual/today' });

  try {
    const result = await toolGetTodayRitual(ctx, { userId });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, ...result });
  } catch (err) {
    next(err);
  }
});

app.post('/api/ritual/complete', async (req: Request, res: Response, next: NextFunction) => {
  const { userId, templateKey, content } = req.body as {
    userId?: string;
    templateKey?: string;
    content?: string;
  };

  if (!templateKey) {
    res.status(400).json({ error: 'templateKey is required', code: 'BAD_REQUEST' });
    return;
  }

  const resolvedUserId = userId ?? 'default';
  const ctx = createContext(resolvedUserId);
  ctx.log('request.received', { path: '/api/ritual/complete', templateKey });

  try {
    const entry = await toolCompleteRitualItem(ctx, { userId: resolvedUserId, templateKey, content });
    if (!entry) {
      res.status(404).json({ error: 'Ritual item not found', code: 'NOT_FOUND' });
      return;
    }
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, entry });
  } catch (err) {
    next(err);
  }
});

app.get('/api/tasks/today', async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.query['userId'] as string | undefined) ?? 'default';
  const ctx = createContext(userId);
  ctx.log('request.received', { path: '/api/tasks/today' });

  try {
    const result = await toolGetTodayTasks(ctx, { userId });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, ...result });
  } catch (err) {
    next(err);
  }
});

app.post('/api/tasks/create', async (req: Request, res: Response, next: NextFunction) => {
  const { userId, title, missionId, priority } = req.body as {
    userId?: string;
    title?: string;
    missionId?: string;
    priority?: string;
  };

  if (!title) {
    res.status(400).json({ error: 'title is required', code: 'BAD_REQUEST' });
    return;
  }

  const resolvedUserId = userId ?? 'default';
  const ctx = createContext(resolvedUserId);
  ctx.log('request.received', { path: '/api/tasks/create', title });

  try {
    const task = await toolCreateTask(ctx, {
      userId: resolvedUserId,
      title,
      missionId,
      priority: priority as 'low' | 'medium' | 'high' | undefined,
    });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, task });
  } catch (err) {
    next(err);
  }
});

app.post('/api/tasks/complete', async (req: Request, res: Response, next: NextFunction) => {
  const { userId, taskId } = req.body as { userId?: string; taskId?: string };

  if (!taskId) {
    res.status(400).json({ error: 'taskId is required', code: 'BAD_REQUEST' });
    return;
  }

  const resolvedUserId = userId ?? 'default';
  const ctx = createContext(resolvedUserId);
  ctx.log('request.received', { path: '/api/tasks/complete', taskId });

  try {
    const task = await toolCompleteTask(ctx, { taskId, userId: resolvedUserId });
    if (!task) {
      res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
      return;
    }
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, task });
  } catch (err) {
    next(err);
  }
});

app.post('/api/focus/start', async (req: Request, res: Response, next: NextFunction) => {
  const { userId, taskTitle, durationMinutes, type } = req.body as {
    userId?: string;
    taskTitle?: string;
    durationMinutes?: number;
    type?: 'pomodoro' | 'free';
  };

  const resolvedUserId = userId ?? 'default';
  const ctx = createContext(resolvedUserId);
  ctx.log('request.received', { path: '/api/focus/start' });

  try {
    const session = await toolStartFocus(ctx, { userId: resolvedUserId, taskTitle, durationMinutes, type });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, session });
  } catch (err) {
    next(err);
  }
});

app.post('/api/focus/end', async (req: Request, res: Response, next: NextFunction) => {
  const { userId, sessionId } = req.body as { userId?: string; sessionId?: string };

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required', code: 'BAD_REQUEST' });
    return;
  }

  const resolvedUserId = userId ?? 'default';
  const ctx = createContext(resolvedUserId);
  ctx.log('request.received', { path: '/api/focus/end', sessionId });

  try {
    const session = await toolEndFocus(ctx, { sessionId, userId: resolvedUserId });
    if (!session) {
      res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
      return;
    }
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, session });
  } catch (err) {
    next(err);
  }
});

app.get('/api/focus/active', async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.query['userId'] as string | undefined) ?? 'default';
  const ctx = createContext(userId);
  ctx.log('request.received', { path: '/api/focus/active' });

  try {
    const session = await toolGetActiveSession(ctx, { userId });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, session });
  } catch (err) {
    next(err);
  }
});

app.get('/api/focus/stats/today', async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.query['userId'] as string | undefined) ?? 'default';
  const ctx = createContext(userId);
  ctx.log('request.received', { path: '/api/focus/stats/today' });

  try {
    const stats = await toolGetTodayFocusStats(ctx, { userId });
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json({ traceId: ctx.traceId, ...stats });
  } catch (err) {
    next(err);
  }
});

app.post('/api/plan', async (req: Request, res: Response, next: NextFunction) => {
  const { intent, userId } = req.body as { intent?: string; userId?: string };

  if (!intent || !userId) {
    res.status(400).json({ error: 'intent and userId are required', code: 'BAD_REQUEST' });
    return;
  }

  const ctx = createContext(userId);
  ctx.log('request.received', { path: '/api/plan', intent });

  try {
    const plan = await generatePlan(ctx, intent);
    ctx.log('request.complete', { duration: Date.now() - ctx.startTime });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  logger.error({ event: 'unhandled_error', error: String(err) });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

app.listen(PORT, () => {
  logger.info({ event: 'server.started', port: PORT });
});

export default app;
