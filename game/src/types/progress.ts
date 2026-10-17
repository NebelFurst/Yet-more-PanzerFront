import { TankUpgradeLevels } from './game';

export interface PlayerProgress {
  credits: number;
  unlockedTankIds: string[];
  currentTankId: string;
  upgrades: Record<string, TankUpgradeLevels>;
  blueprintIds: string[];
}

export const STARTER_TANK_IDS = ['ger_pz1', 'usa_m2', 'ussr_t26', 'uk_tetrarch'];

export function isTankUpgradeLevels(value: unknown): value is TankUpgradeLevels {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const levels = value as Record<string, unknown>;
  return ['gun', 'armor', 'engine', 'turret'].every(key => typeof levels[key] === 'number' && Number.isInteger(levels[key]) && levels[key] >= 0 && levels[key] <= 3);
}

export function defaultProgress(): PlayerProgress {
  return { credits: 500, unlockedTankIds: [...STARTER_TANK_IDS], currentTankId: 'ger_pz1', upgrades: {}, blueprintIds: [] };
}
