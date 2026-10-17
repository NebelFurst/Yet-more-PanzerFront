import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { playerProgress } from '../../db/schema.js';
import { TANKS, BLUEPRINT_TANK_IDS } from '../../src/data/tanks.js';
import { defaultProgress, STARTER_TANK_IDS, isTankUpgradeLevels } from '../../src/types/progress.js';
import type { PlayerProgress } from '../../src/types/progress.js';

function validateProgress(value: unknown): PlayerProgress | null {
  if (!value || typeof value !== 'object') return null;
  const progress = value as PlayerProgress;
  if (!Number.isSafeInteger(progress.credits) || progress.credits < 0 || progress.credits > 2000000000) return null;
  if (!Array.isArray(progress.unlockedTankIds) || progress.unlockedTankIds.length > 100 || !progress.unlockedTankIds.every(id => typeof id === 'string' && Object.hasOwn(TANKS, id))) return null;
  if (!Array.isArray(progress.blueprintIds) || progress.blueprintIds.length > BLUEPRINT_TANK_IDS.length || !progress.blueprintIds.every(id => BLUEPRINT_TANK_IDS.includes(id))) return null;
  if (progress.unlockedTankIds.some(id => TANKS[id].blueprintCost && !progress.blueprintIds.includes(id))) return null;
  const unlockedTankIds = [...new Set([...STARTER_TANK_IDS, ...progress.unlockedTankIds])];
  if (typeof progress.currentTankId !== 'string' || !Object.hasOwn(TANKS, progress.currentTankId) || !unlockedTankIds.includes(progress.currentTankId)) return null;
  if (!progress.upgrades || typeof progress.upgrades !== 'object' || Array.isArray(progress.upgrades)) return null;
  const upgrades: PlayerProgress['upgrades'] = {};
  for (const [tankId, levels] of Object.entries(progress.upgrades)) {
    if (!unlockedTankIds.includes(tankId) || !isTankUpgradeLevels(levels)) return null;
    upgrades[tankId] = { gun: levels.gun, armor: levels.armor, engine: levels.engine, turret: levels.turret };
  }
  return { credits: progress.credits, unlockedTankIds, currentTankId: progress.currentTankId, upgrades, blueprintIds: [...new Set(progress.blueprintIds)] };
}

export default async (request: Request) => {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (!['POST', 'PUT'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST, PUT' } });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'JSON required.' }, { status: 415, headers });
  try {
    const bodyText = await request.text();
    if (bodyText.length > 24000) return Response.json({ error: 'Save too large.' }, { status: 413, headers });
    const body = JSON.parse(bodyText);
    const savedId = request.headers.get('cookie')?.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith('panzerfront_save='))?.slice('panzerfront_save='.length);
    const hasSaveId = !!savedId && /^[a-f0-9-]{36}$/.test(savedId);
    const id = hasSaveId ? savedId : randomUUID();
    if (request.method === 'POST') {
      const legacy = validateProgress(body.progress) || defaultProgress();
      await db.insert(playerProgress).values({ id, ...legacy }).onConflictDoNothing();
      const [saved] = await db.select().from(playerProgress).where(eq(playerProgress.id, id));
      if (!hasSaveId) headers.set('Set-Cookie', `panzerfront_save=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
      const { id: privateId, updatedAt, ...progress } = saved;
      return Response.json(progress, { headers });
    }
    if (!hasSaveId) return Response.json({ error: 'Load your depot before saving.' }, { status: 401, headers });
    const progress = validateProgress(body.progress);
    if (!progress || !Number.isSafeInteger(body.revision) || body.revision < 0) return Response.json({ error: 'Invalid progression data.' }, { status: 400, headers });
    const updated = await db.update(playerProgress).set({ ...progress, revision: body.revision + 1, updatedAt: new Date() }).where(and(eq(playerProgress.id, id), eq(playerProgress.revision, body.revision))).returning({ revision: playerProgress.revision });
    if (!updated.length) return Response.json({ error: 'This save changed in another tab. Reload before continuing.' }, { status: 409, headers });
    return Response.json(updated[0], { headers });
  } catch {
    return Response.json({ error: 'Depot saving is unavailable. Retry without closing this tab.' }, { status: 503, headers });
  }
};
