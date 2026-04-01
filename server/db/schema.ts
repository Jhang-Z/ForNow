import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const goals_table = sqliteTable('goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['active', 'completed', 'archived'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tasks_table = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const missions_table = sqliteTable('missions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  weekNumber: integer('week_number').notNull(),
  year: integer('year').notNull(),
  status: text('status', { enum: ['active', 'completed', 'archived'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const focus_sessions_table = sqliteTable('focus_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  taskId: text('task_id'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  duration: integer('duration'), // seconds
});

export const ritual_templates_table = sqliteTable('ritual_templates', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  isOptional: integer('is_optional', { mode: 'boolean' }).notNull().default(false),
  order: integer('order').notNull(),
});

export const ritual_entries_table = sqliteTable('ritual_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  templateId: text('template_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  content: text('content'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});
