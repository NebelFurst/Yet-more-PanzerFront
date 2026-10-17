import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { TankUpgradeLevels } from '../src/types/game.js';

export const playerProgress = pgTable('player_progress', {
  id: text('id').primaryKey(),
  credits: integer('credits').notNull().default(500),
  unlockedTankIds: jsonb('unlocked_tank_ids').$type<string[]>().notNull(),
  currentTankId: text('current_tank_id').notNull(),
  upgrades: jsonb('upgrades').$type<Record<string, TankUpgradeLevels>>().notNull().default({}),
  blueprintIds: jsonb('blueprint_ids').$type<string[]>().notNull().default([]),
  revision: integer('revision').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
