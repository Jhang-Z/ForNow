export type AbilityKey =
  | 'execution'
  | 'goal'
  | 'insight'
  | 'innovation'
  | 'focus'
  | 'recovery';

export interface Ability {
  key: AbilityKey;
  name: string;
  level: number;
  exp: number;
  expToNext: number;
}

export interface GrowthRecord {
  id: string;
  userId: string;
  abilityKey: AbilityKey;
  expGained: number;
  reason: string;
  createdAt: Date;
}

export interface AbilitySnapshot {
  userId: string;
  abilities: Ability[];
  updatedAt: Date;
}

export const ABILITY_DEFINITIONS: Record<AbilityKey, string> = {
  execution: '执行力',
  goal: '目标感',
  insight: '洞察力',
  innovation: '创新力',
  focus: '专注力',
  recovery: '恢复力',
};

export const EXP_PER_LEVEL = 100;
export const MAX_LEVEL = 10;

export function calcLevel(totalExp: number): { level: number; exp: number; expToNext: number } {
  const level = Math.min(Math.floor(totalExp / EXP_PER_LEVEL) + 1, MAX_LEVEL);
  const exp = totalExp % EXP_PER_LEVEL;
  const expToNext = level >= MAX_LEVEL ? EXP_PER_LEVEL : EXP_PER_LEVEL - exp;
  return { level, exp: level >= MAX_LEVEL ? EXP_PER_LEVEL : exp, expToNext };
}
