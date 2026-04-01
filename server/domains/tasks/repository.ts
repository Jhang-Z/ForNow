import { and, eq, asc } from 'drizzle-orm';
import { db } from '../../db/index';
import { tasks_table } from '../../db/schema';
import type { Task, TaskPriority } from './types';

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getTodayTasks(userId: string, date: string): Task[] {
  return db
    .select()
    .from(tasks_table)
    .where(and(eq(tasks_table.userId, userId), eq(tasks_table.date, date)))
    .orderBy(asc(tasks_table.order), asc(tasks_table.createdAt))
    .all() as Task[];
}

export function createTask(
  userId: string,
  title: string,
  date: string,
  missionId?: string,
  priority?: TaskPriority
): Task {
  const existing = getTodayTasks(userId, date);
  const maxOrder = existing.reduce((max, t) => Math.max(max, t.order), -1);

  const now = new Date();
  const task = {
    id: generateId(),
    userId,
    title,
    missionId: missionId ?? null,
    date,
    completed: false,
    priority: priority ?? 'medium',
    estimatedMinutes: null,
    order: maxOrder + 1,
    completedAt: null,
    createdAt: now,
  };

  db.insert(tasks_table).values(task).run();
  return task;
}

export function completeTask(taskId: string): Task | null {
  const now = new Date();
  db.update(tasks_table)
    .set({ completed: true, completedAt: now })
    .where(eq(tasks_table.id, taskId))
    .run();

  const rows = db
    .select()
    .from(tasks_table)
    .where(eq(tasks_table.id, taskId))
    .limit(1)
    .all();

  return (rows[0] as Task) ?? null;
}

export function reorderTasks(taskIds: string[]): void {
  taskIds.forEach((id, index) => {
    db.update(tasks_table)
      .set({ order: index })
      .where(eq(tasks_table.id, id))
      .run();
  });
}
