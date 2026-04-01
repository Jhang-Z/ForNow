import type { RequestContext } from '../../orchestrator/context';
import { getSnapshot, addExp } from './repository';
import type { AbilitySnapshot, GrowthRecord, AbilityKey } from './types';

export async function toolGetGrowthProfile(
  ctx: RequestContext,
  params: { userId: string }
): Promise<AbilitySnapshot> {
  ctx.log('tool.getGrowthProfile', { params });
  const snapshot = getSnapshot(params.userId);
  ctx.log('tool.getGrowthProfile.complete', { abilityCount: snapshot.abilities.length });
  return snapshot;
}

export async function toolAddAbilityExp(
  ctx: RequestContext,
  params: { userId: string; abilityKey: AbilityKey; amount: number; reason: string }
): Promise<GrowthRecord> {
  ctx.log('tool.addAbilityExp', { params });
  const record = addExp(params.userId, params.abilityKey, params.amount, params.reason);
  ctx.log('tool.addAbilityExp.complete', { recordId: record.id });
  return record;
}
