import { eq } from 'drizzle-orm';
import { db } from '../../db/index';
import { growth_records_table, ability_snapshots_table } from '../../db/schema';
import {
  type Ability,
  type AbilityKey,
  type AbilitySnapshot,
  type GrowthRecord,
  ABILITY_DEFINITIONS,
  calcLevel,
  EXP_PER_LEVEL,
  MAX_LEVEL,
} from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultAbilities(): Ability[] {
  return (Object.entries(ABILITY_DEFINITIONS) as [AbilityKey, string][]).map(([key, name]) => ({
    key,
    name,
    level: 1,
    exp: 0,
    expToNext: EXP_PER_LEVEL,
  }));
}

export function initDefaultAbilities(userId: string): void {
  const existing = db
    .select()
    .from(ability_snapshots_table)
    .where(eq(ability_snapshots_table.userId, userId))
    .limit(1)
    .all();

  if (existing.length > 0) return;

  const abilities = buildDefaultAbilities();
  db.insert(ability_snapshots_table)
    .values({
      id: generateId('snap'),
      userId,
      abilitiesJson: JSON.stringify(abilities),
      updatedAt: new Date(),
    })
    .run();
}

export function getAbilities(userId: string): Ability[] {
  initDefaultAbilities(userId);

  const rows = db
    .select()
    .from(ability_snapshots_table)
    .where(eq(ability_snapshots_table.userId, userId))
    .limit(1)
    .all();

  if (!rows[0]) return buildDefaultAbilities();
  return JSON.parse(rows[0].abilitiesJson) as Ability[];
}

export function addExp(
  userId: string,
  abilityKey: AbilityKey,
  amount: number,
  reason: string
): GrowthRecord {
  const abilities = getAbilities(userId);
  const ability = abilities.find((a) => a.key === abilityKey);

  if (ability) {
    const totalExpBefore = (ability.level - 1) * EXP_PER_LEVEL + ability.exp;
    const totalExpAfter = Math.min(totalExpBefore + amount, MAX_LEVEL * EXP_PER_LEVEL);
    const updated = calcLevel(totalExpAfter);

    ability.level = updated.level;
    ability.exp = updated.exp;
    ability.expToNext = updated.expToNext;

    db.update(ability_snapshots_table)
      .set({ abilitiesJson: JSON.stringify(abilities), updatedAt: new Date() })
      .where(eq(ability_snapshots_table.userId, userId))
      .run();
  }

  const record: GrowthRecord = {
    id: generateId('grow'),
    userId,
    abilityKey,
    expGained: amount,
    reason,
    createdAt: new Date(),
  };

  db.insert(growth_records_table)
    .values({
      id: record.id,
      userId: record.userId,
      abilityKey: record.abilityKey,
      expGained: record.expGained,
      reason: record.reason,
      createdAt: record.createdAt,
    })
    .run();

  return record;
}

export function getSnapshot(userId: string): AbilitySnapshot {
  const abilities = getAbilities(userId);
  return { userId, abilities, updatedAt: new Date() };
}
