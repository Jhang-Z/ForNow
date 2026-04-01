import { and, eq, lt } from 'drizzle-orm';
import { db } from '../../db/index';
import { ritual_templates_table, ritual_entries_table } from '../../db/schema';
import type { RitualTemplate, RitualEntry } from './types';

const DEFAULT_TEMPLATES: Omit<RitualTemplate, 'id'>[] = [
  { key: 'weekly_review', title: '每周行动汇报', description: null, isOptional: false, order: 1 },
  { key: 'small_win', title: '最小胜利', description: null, isOptional: false, order: 2 },
  { key: 'biggest_block', title: '最大阻碍', description: null, isOptional: false, order: 3 },
  { key: 'reflection', title: '2分钟冥想', description: null, isOptional: true, order: 4 },
  { key: 'tomorrow_plan', title: '明日计划', description: null, isOptional: true, order: 5 },
];

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function initDefaultTemplates(): void {
  const existing = db.select().from(ritual_templates_table).all();
  if (existing.length > 0) return;

  for (const tpl of DEFAULT_TEMPLATES) {
    db.insert(ritual_templates_table)
      .values({ id: generateId('tpl'), ...tpl })
      .run();
  }
}

export function getAllTemplates(): RitualTemplate[] {
  return db
    .select()
    .from(ritual_templates_table)
    .orderBy(ritual_templates_table.order)
    .all();
}

export function getTodayEntries(userId: string, date: string): RitualEntry[] {
  return db
    .select()
    .from(ritual_entries_table)
    .where(
      and(
        eq(ritual_entries_table.userId, userId),
        eq(ritual_entries_table.date, date)
      )
    )
    .all();
}

export function ensureTodayEntries(userId: string, date: string): RitualEntry[] {
  const templates = getAllTemplates();
  const existing = getTodayEntries(userId, date);
  const existingTemplateIds = new Set(existing.map((e) => e.templateId));

  for (const tpl of templates) {
    if (!existingTemplateIds.has(tpl.id)) {
      db.insert(ritual_entries_table)
        .values({
          id: generateId('entry'),
          userId,
          templateId: tpl.id,
          date,
          completed: false,
          content: null,
          completedAt: null,
        })
        .run();
    }
  }

  return getTodayEntries(userId, date);
}

export function completeEntry(entryId: string, content?: string): RitualEntry | null {
  const now = new Date();
  db.update(ritual_entries_table)
    .set({ completed: true, content: content ?? null, completedAt: now })
    .where(eq(ritual_entries_table.id, entryId))
    .run();

  const rows = db
    .select()
    .from(ritual_entries_table)
    .where(eq(ritual_entries_table.id, entryId))
    .limit(1)
    .all();

  return rows[0] ?? null;
}

export function getEntryByTemplateKey(
  userId: string,
  date: string,
  templateKey: string
): RitualEntry | null {
  const tplRows = db
    .select()
    .from(ritual_templates_table)
    .where(eq(ritual_templates_table.key, templateKey))
    .limit(1)
    .all();

  if (!tplRows[0]) return null;

  const rows = db
    .select()
    .from(ritual_entries_table)
    .where(
      and(
        eq(ritual_entries_table.userId, userId),
        eq(ritual_entries_table.date, date),
        eq(ritual_entries_table.templateId, tplRows[0].id)
      )
    )
    .limit(1)
    .all();

  return rows[0] ?? null;
}

export function countCompletedDaysBeforeDate(userId: string, beforeDate: string): number {
  // Count distinct dates where all required (non-optional) templates were completed
  const templates = getAllTemplates();
  const requiredTemplateIds = templates
    .filter((t) => !t.isOptional)
    .map((t) => t.id);

  const entries = db
    .select()
    .from(ritual_entries_table)
    .where(
      and(
        eq(ritual_entries_table.userId, userId),
        eq(ritual_entries_table.completed, true),
        lt(ritual_entries_table.date, beforeDate)
      )
    )
    .all();

  const dateMap = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!dateMap.has(entry.date)) dateMap.set(entry.date, new Set());
    dateMap.get(entry.date)!.add(entry.templateId);
  }

  const sortedDates = Array.from(dateMap.keys()).sort().reverse();
  let streak = 0;
  let expectedDate = new Date(beforeDate);
  expectedDate.setDate(expectedDate.getDate() - 1);

  for (const date of sortedDates) {
    const expected = expectedDate.toISOString().slice(0, 10);
    if (date !== expected) break;

    const completedIds = dateMap.get(date)!;
    const allRequired = requiredTemplateIds.every((id) => completedIds.has(id));
    if (!allRequired) break;

    streak++;
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  return streak;
}
