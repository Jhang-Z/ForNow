import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index';
import { missions_table } from '../../db/schema';
import type { Mission, CreateMissionParams, UpdateMissionParams } from './types';

function generateId(): string {
  return `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getCurrentMission(
  userId: string,
  weekNumber: number,
  year: number
): Promise<Mission | null> {
  const rows = db
    .select()
    .from(missions_table)
    .where(
      and(
        eq(missions_table.userId, userId),
        eq(missions_table.weekNumber, weekNumber),
        eq(missions_table.year, year),
        eq(missions_table.status, 'active')
      )
    )
    .limit(1)
    .all();

  return rows[0] ?? null;
}

export async function createMission(params: CreateMissionParams): Promise<Mission> {
  const now = new Date();
  const row = {
    id: generateId(),
    userId: params.userId,
    title: params.title,
    description: params.description ?? null,
    weekNumber: params.weekNumber,
    year: params.year,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(missions_table).values(row).run();
  return row;
}

export async function updateMission(
  id: string,
  params: UpdateMissionParams
): Promise<Mission | null> {
  const now = new Date();
  db.update(missions_table)
    .set({ ...params, updatedAt: now })
    .where(eq(missions_table.id, id))
    .run();

  const rows = db
    .select()
    .from(missions_table)
    .where(eq(missions_table.id, id))
    .limit(1)
    .all();

  return rows[0] ?? null;
}
