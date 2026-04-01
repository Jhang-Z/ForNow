// bridge/db.ts
// 数据库 Bridge 客户端 — 封装所有 db.* 操作
// 在非原生环境自动降级到 HTTP API（兼容当前 Node.js 后端）

import { callNative, isNativeEnv } from './native';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Mission {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  weekNumber: number;
  year: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentMissionResult {
  weekNumber: number;
  year: number;
  mission: Mission | null;
}

export interface RitualItem {
  id: string;
  templateId: string;
  title: string;
  type: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  completedAt: string | null;
  missionId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string | null;
  plannedDuration: number;
  actualDuration: number | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
}

export interface DailyStats {
  date: string;
  tasksTotal: number;
  tasksCompleted: number;
  ritualCompleted: number;
  focusMinutes: number;
  completionRate: number;
}

export interface WeeklyReport {
  weekNumber: number;
  year: number;
  stats: DailyStats[];
  totalFocusMinutes: number;
  avgCompletionRate: number;
  streakDays: number;
}

export interface GrowthProfile {
  id: string;
  userId: string;
  level: number;
  exp: number;
  focus: number;
  execution: number;
  consistency: number;
  clarity: number;
  energy: number;
  reflection: number;
  updatedAt: string;
}

// ─── Bridge calls (native env) ────────────────────────────────────────────────

function dbCall<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  return callNative<T>('db', { action, params });
}

// ─── HTTP fallback (dev / web env) ───────────────────────────────────────────

async function httpGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function httpPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function httpPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

const DEFAULT_USER = 'default';

export const db = {
  mission: {
    getCurrent(): Promise<CurrentMissionResult> {
      if (isNativeEnv()) {
        return dbCall<CurrentMissionResult>('db.mission.getCurrent', { userId: DEFAULT_USER });
      }
      return httpGet<CurrentMissionResult>(`/api/mission/current?userId=${DEFAULT_USER}`);
    },

    create(title: string, description?: string): Promise<Mission> {
      if (isNativeEnv()) {
        return dbCall<Mission>('db.mission.create', { userId: DEFAULT_USER, title, description });
      }
      return httpPost<Mission>('/api/mission', { userId: DEFAULT_USER, title, description });
    },

    update(id: string, title: string, description?: string): Promise<Mission> {
      if (isNativeEnv()) {
        return dbCall<Mission>('db.mission.update', { userId: DEFAULT_USER, id, title, description });
      }
      return httpPut<Mission>(`/api/mission/${id}`, { userId: DEFAULT_USER, title, description });
    },
  },

  ritual: {
    getToday(): Promise<RitualItem[]> {
      if (isNativeEnv()) {
        return dbCall<RitualItem[]>('db.ritual.getToday', { userId: DEFAULT_USER });
      }
      return httpGet<RitualItem[]>(`/api/ritual/today?userId=${DEFAULT_USER}`);
    },

    complete(templateId: string): Promise<RitualItem> {
      if (isNativeEnv()) {
        return dbCall<RitualItem>('db.ritual.complete', { userId: DEFAULT_USER, templateId });
      }
      return httpPost<RitualItem>('/api/ritual/complete', { userId: DEFAULT_USER, templateId });
    },
  },

  tasks: {
    getToday(): Promise<Task[]> {
      if (isNativeEnv()) {
        return dbCall<Task[]>('db.tasks.getToday', { userId: DEFAULT_USER });
      }
      return httpGet<Task[]>(`/api/tasks/today?userId=${DEFAULT_USER}`);
    },

    create(title: string, priority = 'medium', missionId?: string): Promise<Task> {
      if (isNativeEnv()) {
        return dbCall<Task>('db.tasks.create', { userId: DEFAULT_USER, title, priority, missionId });
      }
      return httpPost<Task>('/api/tasks', { userId: DEFAULT_USER, title, priority, missionId });
    },

    complete(taskId: string): Promise<Task | null> {
      if (isNativeEnv()) {
        return dbCall<Task | null>('db.tasks.complete', { userId: DEFAULT_USER, taskId });
      }
      return httpPost<Task | null>(`/api/tasks/${taskId}/complete`, { userId: DEFAULT_USER });
    },
  },

  focus: {
    start(plannedDuration: number, taskId?: string): Promise<FocusSession> {
      if (isNativeEnv()) {
        return dbCall<FocusSession>('db.focus.start', { userId: DEFAULT_USER, plannedDuration, taskId });
      }
      return httpPost<FocusSession>('/api/focus/start', { userId: DEFAULT_USER, plannedDuration, taskId });
    },

    end(sessionId: string, actualDuration: number): Promise<FocusSession | null> {
      if (isNativeEnv()) {
        return dbCall<FocusSession | null>('db.focus.end', { userId: DEFAULT_USER, sessionId, actualDuration });
      }
      return httpPost<FocusSession | null>('/api/focus/end', { userId: DEFAULT_USER, sessionId, actualDuration });
    },

    async getActive(): Promise<FocusSession | null> {
      if (isNativeEnv()) {
        return dbCall<FocusSession | null>('db.focus.getActive', { userId: DEFAULT_USER });
      }
      const r = await httpGet<{ session: FocusSession | null }>(`/api/focus/active?userId=${DEFAULT_USER}`);
      return r.session;
    },
  },

  growth: {
    getProfile(): Promise<GrowthProfile> {
      if (isNativeEnv()) {
        return dbCall<GrowthProfile>('db.growth.getProfile', { userId: DEFAULT_USER });
      }
      return httpGet<GrowthProfile>(`/api/growth/profile?userId=${DEFAULT_USER}`);
    },
  },

  progress: {
    getDaily(): Promise<DailyStats> {
      if (isNativeEnv()) {
        return dbCall<DailyStats>('db.progress.getDaily', { userId: DEFAULT_USER });
      }
      return httpGet<DailyStats>(`/api/progress/daily?userId=${DEFAULT_USER}`);
    },

    getWeekly(): Promise<WeeklyReport> {
      if (isNativeEnv()) {
        return dbCall<WeeklyReport>('db.progress.getWeekly', { userId: DEFAULT_USER });
      }
      return httpGet<WeeklyReport>(`/api/progress/weekly?userId=${DEFAULT_USER}`);
    },
  },
};
