import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const DB_PATH = process.env.DB_PATH ?? 'fornow.db';

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export function initDb(): void {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      mission_id TEXT,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      estimated_minutes INTEGER,
      "order" INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT,
      task_title TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      type TEXT NOT NULL DEFAULT 'pomodoro'
    )
  `);

  // Best-effort migration: add new columns to pre-existing focus_sessions table
  const focusCols = sqlite.prepare("PRAGMA table_info(focus_sessions)").all() as Array<{ name: string }>;
  const focusColNames = focusCols.map(c => c.name);
  if (!focusColNames.includes('task_title')) {
    sqlite.prepare('ALTER TABLE focus_sessions ADD COLUMN task_title TEXT').run();
  }
  if (!focusColNames.includes('status')) {
    sqlite.prepare("ALTER TABLE focus_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'active'").run();
  }
  if (!focusColNames.includes('type')) {
    sqlite.prepare("ALTER TABLE focus_sessions ADD COLUMN type TEXT NOT NULL DEFAULT 'pomodoro'").run();
  }


  db.run(sql`
    CREATE TABLE IF NOT EXISTS ritual_templates (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      is_optional INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS ritual_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      content TEXT,
      completed_at INTEGER
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS growth_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ability_key TEXT NOT NULL,
      exp_gained INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS ability_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      abilities_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}
