import { TankEntity, TankDefinition, Difficulty } from '../types/game';
import { TANKS } from '../data/tanks';

/**
 * Intelligent WWII armored warfare AI for Allied and Enemy tank divisions.
 * Supports configurable difficulty (easy, medium, hard) and tactical unit spacing.
 */

export function updateTankAI(
  tank: TankEntity,
  allTanks: TankEntity[],
  dt: number,
  onShoot: (tank: TankEntity) => void,
  onMgShoot: (tank: TankEntity) => void,
  difficulty: Difficulty = 'medium'
) {
  if (tank.isPlayer || tank.isDestroyed) return;

  const def: TankDefinition = TANKS[tank.defId];
  if (!def) return;

  // Difficulty modifiers
  const isEnemy = tank.team === 'enemy_faction';
  const leadAccuracy = isEnemy
    ? (difficulty === 'easy' ? 0.35 : difficulty === 'hard' ? 0.95 : 0.70)
    : 0.75;
  const aimTolerance = isEnemy
    ? (difficulty === 'easy' ? 0.26 : difficulty === 'hard' ? 0.10 : 0.16)
    : 0.16;
  const reloadMod = isEnemy
    ? (difficulty === 'easy' ? 1.35 : difficulty === 'hard' ? 0.80 : 1.0)
    : 1.0;

  // 1. Find or validate target
  let target: TankEntity | null = null;
  if (tank.aiTargetId) {
    target = allTanks.find(t => t.id === tank.aiTargetId && !t.isDestroyed) || null;
  }

  // If no target or target destroyed, find nearest opposing tank
  if (!target) {
    let nearestDist = 1200; // expanded battlefield engagement radius
    for (const other of allTanks) {
      if (other.isDestroyed || other.team === tank.team) continue;
      const d = Math.hypot(other.x - tank.x, other.y - tank.y);
      if (d < nearestDist) {
        nearestDist = d;
        target = other;
      }
    }
    tank.aiTargetId = target ? target.id : null;
  }

  // 2. Separation repulsion: prevent tanks from bunching up (generous spacing)
  let sepX = 0;
  let sepY = 0;
  for (const other of allTanks) {
    if (other.id === tank.id || other.isDestroyed) continue;
    const odx = tank.x - other.x;
    const ody = tank.y - other.y;
    const odist = Math.hypot(odx, ody);
    const minSpacing = (tank.team === other.team) ? 300 : 200;
    if (odist < minSpacing && odist > 0) {
      const repulse = (minSpacing - odist) / minSpacing;
      sepX += (odx / odist) * repulse;
      sepY += (ody / odist) * repulse;
    }
  }

  // 3. Maneuver & Aiming logic
  if (target) {
    const dx = target.x - tank.x;
    const dy = target.y - tank.y;
    const dist = Math.hypot(dx, dy);

    // Ballistic lead prediction: where target will be
    const timeToHit = Math.max(0.1, dist / def.shellSpeed);
    const leadX = target.x + target.vx * timeToHit * leadAccuracy;
    const leadY = target.y + target.vy * timeToHit * leadAccuracy;

    // Angle to lead position (turret aim angle)
    const aimAngle = Math.atan2(leadX - tank.x, -(leadY - tank.y));
    tank.targetTurretAngle = aimAngle;

    // Desired combat range: spread out across wide battlefront
    const idealRange =
      def.role === 'heavy' || def.role === 'td' || def.role === 'experimental' || def.role === 'superheavy'
        ? 520
        : def.role === 'medium'
        ? 420
        : 320;

    // Blend target direction with strong separation vector to maintain formation
    const desiredX = dx + sepX * 280;
    const desiredY = dy + sepY * 280;

    // Hull orientation: turn hull toward target or evasive flank
    const moveAngle = Math.atan2(desiredX, -desiredY);
    let hullDiff = moveAngle - tank.hullAngle;
    while (hullDiff > Math.PI) hullDiff -= Math.PI * 2;
    while (hullDiff < -Math.PI) hullDiff += Math.PI * 2;

    if (Math.abs(hullDiff) > 0.15) {
      tank.steer = Math.sign(hullDiff);
    } else {
      tank.steer = 0;
    }

    if (dist > idealRange + 100) {
      // Advance toward target
      tank.throttle = 0.85;
    } else if (dist < idealRange - 100) {
      // Reverse to maintain tactical separation
      tank.throttle = -0.65;
    } else {
      // Flanking or holding ground spread out
      tank.throttle = Math.hypot(sepX, sepY) > 0.2 ? 0.35 : 0.1;
    }

    // Check turret alignment with target
    let turretDiff = aimAngle - tank.turretAngle;
    while (turretDiff > Math.PI) turretDiff -= Math.PI * 2;
    while (turretDiff < -Math.PI) turretDiff += Math.PI * 2;

    const isAimed = Math.abs(turretDiff) < aimTolerance;

    // Friendly fire check: ensure friendly tank is not directly in line of fire
    let friendlyInWay = false;
    for (const friend of allTanks) {
      if (friend.id === tank.id || friend.team !== tank.team || friend.isDestroyed) continue;
      const fDx = friend.x - tank.x;
      const fDy = friend.y - tank.y;
      const fDist = Math.hypot(fDx, fDy);
      if (fDist < dist) {
        const fAngle = Math.atan2(fDx, -fDy);
        let fDiff = fAngle - tank.turretAngle;
        while (fDiff > Math.PI) fDiff -= Math.PI * 2;
        while (fDiff < -Math.PI) fDiff += Math.PI * 2;
        if (Math.abs(fDiff) < 0.22) {
          friendlyInWay = true;
          break;
        }
      }
    }

    // Fire cannon if ready, aimed, in range, and clear of allies
    const canFire = isAimed && !friendlyInWay && tank.reloadProgress >= reloadMod && dist <= def.shellRange;
    if (canFire) {
      onShoot(tank);
    }

    // Machine gun fire for close targets
    if (isAimed && !friendlyInWay && def.hasMachineGun && dist < 340 && tank.mgCooldown <= 0) {
      onMgShoot(tank);
    }
  } else {
    // Patrol / wander randomly if no target, while respecting separation
    tank.aiPatrolTimer = (tank.aiPatrolTimer || 0) - dt;
    if (tank.aiPatrolTimer <= 0) {
      tank.aiPatrolTimer = 2.5 + Math.random() * 3.0;
      tank.throttle = 0.4 + Math.random() * 0.35;
      tank.steer = (Math.random() - 0.5) * 1.5;
      tank.targetTurretAngle = tank.hullAngle + (Math.random() - 0.5) * 0.5;
    }
    if (Math.hypot(sepX, sepY) > 0.2) {
      const sepAngle = Math.atan2(sepX, -sepY);
      tank.targetTurretAngle = sepAngle;
      tank.hullAngle += Math.sign(sepAngle - tank.hullAngle) * 0.8 * dt;
    }
  }
}
