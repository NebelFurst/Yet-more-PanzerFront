import { TankDefinition, TankEntity } from '../types/game';
import { TANKS } from '../data/tanks';

/**
 * High-detail 2D top-down procedural vector renderer for authentic WWII tanks.
 */

// Helper to draw national insignia on tank hull / turret
function drawInsignia(ctx: CanvasRenderingContext2D, nation: string, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);

  if (nation === 'germany') {
    // German Balkenkreuz (black cross with white border)
    const s = size;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-s, -s / 3, s * 2, (s * 2) / 3);
    ctx.fillRect(-s / 3, -s, (s * 2) / 3, s * 2);

    ctx.fillStyle = '#111113';
    ctx.fillRect(-s * 0.8, -s * 0.22, s * 1.6, s * 0.44);
    ctx.fillRect(-s * 0.22, -s * 0.8, s * 0.44, s * 1.6);
  } else if (nation === 'usa') {
    // White Allied 5-pointed Star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.42;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  } else if (nation === 'ussr') {
    // Red Army Star
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  } else if (nation === 'britain') {
    // Royal Armoured Corps red & white recognition flash
    const w = size * 1.6;
    const h = size * 1.2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(-w / 6, -h / 2, w / 3, h);
  }

  ctx.restore();
}

/**
 * Render single tank (Hull + Tracks + Turret + Details)
 */
export function renderTank(
  ctx: CanvasRenderingContext2D,
  tank: TankEntity,
  options: {
    showHealthBar?: boolean;
    showName?: boolean;
    recoilOffset?: number; // 0 when ready, 4-8px back when just fired
  } = {}
) {
  const def: TankDefinition = TANKS[tank.defId];
  if (!def) return;

  const {
    length,
    width,
    turretRadius,
    barrelLength,
    barrelWidth,
    hullColor,
    nation,
    hasSideSkirts,
    hasExternalTanks,
    hasLog,
    hasMuzzleBrake,
    hasQuadTracks,
    isCasemate,
    turretOffset = 0,
  } = def;

  const isDead = tank.isDestroyed;
  const isBurning = tank.isBurning;

  ctx.save();
  ctx.translate(tank.x, tank.y);

  // 1. Shadow underneath tank
  ctx.save();
  ctx.rotate(tank.hullAngle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(-width / 2 - 4 + 5, -length / 2 - 2 + 6, width + 8, length + 4, 6);
  ctx.fill();
  ctx.restore();

  // 2. Draw Hull & Tracks
  ctx.save();
  ctx.rotate(tank.hullAngle);

  // Base colors
  const mainColor = isDead ? '#2b2b2b' : hullColor;
  const darkDetail = isDead ? '#1a1a1a' : '#1e2124';
  const trackColor = isDead ? '#1f1f1f' : '#282a2e';

  // --- TRACKS ---
  const { hasSixTracks } = def;
  const trackWidth = hasSixTracks
    ? Math.max(6, width * 0.12)
    : hasQuadTracks
    ? Math.max(6, width * 0.16)
    : Math.max(7, width * 0.22);
  const trackLength = length * 1.04;

  const drawTrackBelt = (x: number, y: number, w: number, h: number, dist: number) => {
    // Track rubber/steel base
    ctx.fillStyle = trackColor;
    ctx.fillRect(x, y, w, h);

    // Track outer border
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Tread ridges
    ctx.fillStyle = isDead ? '#141414' : '#181a1c';
    const treadStep = 5;
    const offset = (dist % treadStep);
    for (let py = y + offset; py < y + h; py += treadStep) {
      ctx.fillRect(x + 1, py, w - 2, 2);
    }

    // Road wheels inside track
    const numWheels = Math.max(4, Math.floor(h / 12));
    const wheelStep = (h - 8) / (numWheels - 1);
    ctx.fillStyle = isDead ? '#333333' : '#3d4047';
    for (let i = 0; i < numWheels; i++) {
      const wy = y + 4 + i * wheelStep;
      ctx.beginPath();
      ctx.arc(x + w / 2, wy, Math.min(w * 0.35, 4), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  if (hasSixTracks) {
    // 6 tracks (P.1000 Ratte - 3 tracks per side)
    const tW = trackWidth;
    for (let t = 0; t < 3; t++) {
      drawTrackBelt(-width / 2 + t * (tW + 2), -trackLength / 2, tW, trackLength, tank.leftTrackDistance);
      drawTrackBelt(width / 2 - (t + 1) * (tW + 2) + 2, -trackLength / 2, tW, trackLength, tank.rightTrackDistance);
    }
  } else if (hasQuadTracks) {
    // Quad tracks (T95 / Object 279 / KV-6 / T58)
    const tW = trackWidth;
    drawTrackBelt(-width / 2, -trackLength / 2, tW, trackLength, tank.leftTrackDistance);
    drawTrackBelt(-width / 2 + tW + 2, -trackLength / 2, tW, trackLength, tank.leftTrackDistance);
    drawTrackBelt(width / 2 - tW * 2 - 2, -trackLength / 2, tW, trackLength, tank.rightTrackDistance);
    drawTrackBelt(width / 2 - tW, -trackLength / 2, tW, trackLength, tank.rightTrackDistance);
  } else {
    // Standard dual tracks
    drawTrackBelt(-width / 2, -trackLength / 2, trackWidth, trackLength, tank.leftTrackDistance);
    drawTrackBelt(width / 2 - trackWidth, -trackLength / 2, trackWidth, trackLength, tank.rightTrackDistance);
  }

  // --- HULL BODY ---
  const hullWidth = width - (hasSixTracks ? trackWidth * 3.2 : hasQuadTracks ? trackWidth * 1.6 : trackWidth * 1.5);
  const hullLength = length * 0.94;

  ctx.fillStyle = mainColor;
  ctx.strokeStyle = darkDetail;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  if (def.id === 'ussr_obj279') {
    // Object 279 elliptical saucer hull
    ctx.ellipse(0, 0, width * 0.44, length * 0.48, 0, 0, Math.PI * 2);
  } else if (def.id === 'ussr_is3' || def.id === 'ussr_is7') {
    // Soviet Pike Nose hull (pointed front)
    ctx.moveTo(0, -hullLength / 2 - 3);
    ctx.lineTo(hullWidth / 2, -hullLength / 2 + 8);
    ctx.lineTo(hullWidth / 2, hullLength / 2);
    ctx.lineTo(-hullWidth / 2, hullLength / 2);
    ctx.lineTo(-hullWidth / 2, -hullLength / 2 + 8);
    ctx.closePath();
  } else {
    // Classic rectangular / beveled hull
    ctx.roundRect(-hullWidth / 2, -hullLength / 2, hullWidth, hullLength, 4);
  }
  ctx.fill();
  ctx.stroke();

  // Camouflage stripes / accent patterns
  if (!isDead && def.camoPattern === 'camo-stripes') {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(74, 94, 53, 0.45)'; // Olive-green stripe
    for (let i = -hullLength; i < hullLength; i += 22) {
      ctx.beginPath();
      ctx.moveTo(-hullWidth, i);
      ctx.lineTo(hullWidth, i + 14);
      ctx.lineTo(hullWidth, i + 22);
      ctx.lineTo(-hullWidth, i + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(102, 60, 36, 0.35)'; // Red-brown stripe
    for (let i = -hullLength + 10; i < hullLength; i += 28) {
      ctx.beginPath();
      ctx.moveTo(-hullWidth, i);
      ctx.lineTo(hullWidth, i + 16);
      ctx.lineTo(hullWidth, i + 22);
      ctx.lineTo(-hullWidth, i + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Side skirts (Schürzen)
  if (hasSideSkirts && !isDead) {
    ctx.fillStyle = mainColor;
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 1;
    // Left skirt
    ctx.fillRect(-width / 2 - 1, -hullLength * 0.42, 2.5, hullLength * 0.84);
    ctx.strokeRect(-width / 2 - 1, -hullLength * 0.42, 2.5, hullLength * 0.84);
    // Right skirt
    ctx.fillRect(width / 2 - 1.5, -hullLength * 0.42, 2.5, hullLength * 0.84);
    ctx.strokeRect(width / 2 - 1.5, -hullLength * 0.42, 2.5, hullLength * 0.84);
  }

  // Engine deck grills (rear)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  const grillW = hullWidth * 0.6;
  const grillH = hullLength * 0.18;
  const grillY = hullLength / 2 - grillH - 3;
  ctx.fillRect(-grillW / 2, grillY, grillW, grillH);
  // Grill slats
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let gy = grillY + 2; gy < grillY + grillH; gy += 3) {
    ctx.fillRect(-grillW / 2 + 1, gy, grillW - 2, 1);
  }

  // Soviet External Cylindrical Fuel Tanks (at rear)
  if (hasExternalTanks && !isDead) {
    ctx.fillStyle = '#2d3b25';
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 1;
    // Left fuel tank
    ctx.fillRect(-hullWidth / 2 + 1, hullLength / 2 - 2, 7, 5);
    ctx.strokeRect(-hullWidth / 2 + 1, hullLength / 2 - 2, 7, 5);
    // Right fuel tank
    ctx.fillRect(hullWidth / 2 - 8, hullLength / 2 - 2, 7, 5);
    ctx.strokeRect(hullWidth / 2 - 8, hullLength / 2 - 2, 7, 5);
  }

  // Soviet unditching log on hull side
  if (hasLog && !isDead) {
    ctx.fillStyle = '#5c4028';
    ctx.fillRect(-hullWidth / 2 - 3, -hullLength * 0.3, 3, hullLength * 0.6);
  }

  // Front hull details: Driver visor port & Bow machine gun
  ctx.fillStyle = darkDetail;
  ctx.fillRect(-hullWidth * 0.28, -hullLength / 2 + 3, 5, 2); // Driver visor slit
  ctx.beginPath();
  ctx.arc(hullWidth * 0.25, -hullLength / 2 + 4, 1.8, 0, Math.PI * 2); // Bow MG ball
  ctx.fill();

  // Special Experimental Super-Vehicle Hull Details
  if (def.isMultiTurreted) {
    // KV-6 "Behemoth" multi-turret system on prolonged hull deck
    // 1. Front auxiliary turret (76mm gun)
    const fTurretY = -hullLength * 0.36;
    ctx.fillStyle = mainColor;
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-8, fTurretY - 7, 16, 14, 3);
    ctx.fill();
    ctx.stroke();
    // Gun barrel pointing forward
    ctx.fillStyle = '#22252a';
    ctx.fillRect(-1.5, fTurretY - 18, 3, 11);

    // 2. Mid-rear secondary turret (dual 45mm guns)
    const mTurretY = hullLength * 0.16;
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.roundRect(-9, mTurretY - 8, 18, 16, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22252a';
    ctx.fillRect(-4, mTurretY - 19, 2.2, 11);
    ctx.fillRect(1.8, mTurretY - 19, 2.2, 11);

    // 3. Rear deck Katyusha BM-13 rocket launcher rail rack
    const kY = hullLength * 0.38;
    ctx.fillStyle = '#2d3b25';
    ctx.strokeStyle = '#1e241c';
    ctx.lineWidth = 1;
    // Launch rail frame
    ctx.fillRect(-12, kY - 8, 24, 16);
    ctx.strokeRect(-12, kY - 8, 24, 16);
    // 6 rocket rails
    ctx.fillStyle = '#94a3b8';
    for (let rx = -10; rx <= 10; rx += 4) {
      ctx.fillRect(rx - 0.75, kY - 10, 1.5, 20);
    }
  }

  if (def.hasSixTracks) {
    // P.1000 Ratte rear deck 20mm Flakvierling AA mounts & exhaust manifolds
    const flakY = hullLength * 0.36;
    ctx.fillStyle = '#474b52';
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 1.2;
    // Left AA mount
    ctx.beginPath();
    ctx.arc(-hullWidth * 0.32, flakY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Right AA mount
    ctx.beginPath();
    ctx.arc(hullWidth * 0.32, flakY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // National Insignia on Hull front/side
  if (!isDead) {
    drawInsignia(ctx, nation, 0, -hullLength * 0.28, Math.min(6, width * 0.15));
  }

  ctx.restore(); // Restore hull transform

  // 3. Draw Turret & Cannon (rotates independently!)
  ctx.save();

  // Turret position offset along hull axis
  const turretCenter = {
    x: -Math.sin(tank.hullAngle) * turretOffset,
    y: Math.cos(tank.hullAngle) * turretOffset,
  };
  ctx.translate(turretCenter.x, turretCenter.y);

  // Turret angle rotation
  // For casemates (Jagdtiger, T95, Tortoise), turret traverse is locked to a narrow +/- 12 degree gun arc from hull!
  let effectiveTurretAngle = tank.turretAngle;
  if (isCasemate) {
    let diff = tank.turretAngle - tank.hullAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxArc = 0.24; // ~14 degrees traverse
    const clampedDiff = Math.max(-maxArc, Math.min(maxArc, diff));
    effectiveTurretAngle = tank.hullAngle + clampedDiff;
  }

  ctx.rotate(effectiveTurretAngle);

  // Turret shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(3, 4, turretRadius + 1, 0, Math.PI * 2);
  ctx.fill();

  // Gun recoil kickback
  const recoil = options.recoilOffset ?? 0;

  // --- CANNON BARREL(S) ---
  ctx.fillStyle = darkDetail;
  const bW = barrelWidth;
  const bL = barrelLength - recoil;

  if (def.hasDualBarrels) {
    // Twin naval cannons side-by-side (P.1000 Ratte)
    const spacing = bW * 1.5;
    // Left barrel
    ctx.fillRect(-spacing - bW / 2, -bL, bW, bL);
    ctx.fillStyle = isDead ? '#222222' : '#33373d';
    ctx.fillRect(-spacing - bW / 2 + 0.8, -bL, bW - 1.6, bL);
    if (hasMuzzleBrake) {
      ctx.fillStyle = darkDetail;
      ctx.fillRect(-spacing - bW, -bL - 3, bW * 2, 6);
    }
    // Right barrel
    ctx.fillStyle = darkDetail;
    ctx.fillRect(spacing - bW / 2, -bL, bW, bL);
    ctx.fillStyle = isDead ? '#222222' : '#33373d';
    ctx.fillRect(spacing - bW / 2 + 0.8, -bL, bW - 1.6, bL);
    if (hasMuzzleBrake) {
      ctx.fillStyle = darkDetail;
      ctx.fillRect(spacing - bW, -bL - 3, bW * 2, 6);
    }
  } else {
    // Single cannon barrel
    ctx.fillRect(-bW / 2, -bL, bW, bL);
    ctx.fillStyle = isDead ? '#222222' : '#33373d';
    ctx.fillRect(-bW / 2 + 0.8, -bL, bW - 1.6, bL);

    // Muzzle brake at tip of barrel
    if (hasMuzzleBrake) {
      ctx.fillStyle = darkDetail;
      const mbW = bW * 2.2;
      const mbL = Math.max(5, bW * 1.5);
      ctx.fillRect(-mbW / 2, -bL - mbL * 0.5, mbW, mbL);
    }
  }

  // Secondary coaxial / cupola machine gun barrel
  if (def.hasMachineGun && !isDead) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(bW * 0.8, -bL * 0.45, 1.6, bL * 0.45);
  }

  // --- TURRET BODY ---
  ctx.fillStyle = mainColor;
  ctx.strokeStyle = darkDetail;
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  if (def.id === 'ger_ratte') {
    // Colossal battleship naval turret with angled front cheek plates
    const rW = turretRadius * 1.5;
    const rL = turretRadius * 1.6;
    ctx.roundRect(-rW / 2, -rL / 2, rW, rL, 8);
  } else if (def.id === 'uk_fv4005') {
    // FV4005 giant boxy "Doom Barn" rectangular turret
    const bW = turretRadius * 1.4;
    const bL = turretRadius * 1.7;
    ctx.rect(-bW / 2, -bL / 2, bW, bL);
  } else if (def.id === 'usa_t58') {
    // T58 oscillating streamlined rounded turret
    ctx.ellipse(0, 0, turretRadius * 1.15, turretRadius * 1.25, 0, 0, Math.PI * 2);
  } else if (isCasemate) {
    // Casemate superstructure (Jagdtiger, T95, Tortoise)
    const cW = turretRadius * 1.7;
    const cL = turretRadius * 1.8;
    ctx.roundRect(-cW / 2, -cL / 2, cW, cL, 4);
  } else if (def.id === 'ger_tiger1') {
    // Tiger I cylindrical turret with rear bustle
    ctx.arc(0, 0, turretRadius, -Math.PI * 0.8, Math.PI * 0.8);
    ctx.lineTo(0, turretRadius * 1.1);
    ctx.closePath();
  } else if (def.id === 'usa_m4_sherman' || def.id === 'usa_m4a3e8') {
    // Sherman rounded teardrop cast turret
    ctx.ellipse(0, turretRadius * 0.15, turretRadius * 0.9, turretRadius * 1.1, 0, 0, Math.PI * 2);
  } else if (def.id === 'ussr_is3' || def.id === 'ussr_is7' || def.id === 'ussr_obj279') {
    // Soviet domed frying-pan cast turret
    ctx.ellipse(0, 0, turretRadius * 1.05, turretRadius * 0.92, 0, 0, Math.PI * 2);
  } else {
    // Standard beveled turret
    ctx.roundRect(-turretRadius, -turretRadius, turretRadius * 2, turretRadius * 2, 5);
  }
  ctx.fill();
  ctx.stroke();

  // Gun Mantlet shield (front face of turret)
  ctx.fillStyle = darkDetail;
  const mantletW = turretRadius * 1.25;
  const mantletH = Math.max(5, turretRadius * 0.45);
  ctx.fillRect(-mantletW / 2, -turretRadius - 2, mantletW, mantletH);

  // Commander Cupola / Hatch
  ctx.fillStyle = darkDetail;
  ctx.beginPath();
  ctx.arc(-turretRadius * 0.45, turretRadius * 0.35, Math.max(3, turretRadius * 0.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isDead ? '#333333' : '#454950';
  ctx.beginPath();
  ctx.arc(-turretRadius * 0.45, turretRadius * 0.35, Math.max(2, turretRadius * 0.22), 0, Math.PI * 2);
  ctx.fill();

  // Turret insignia
  if (!isDead && !isCasemate) {
    drawInsignia(ctx, nation, turretRadius * 0.4, turretRadius * 0.3, Math.min(5, turretRadius * 0.35));
  }

  ctx.restore(); // Restore turret transform

  // 4. Fire and smoke if tank is burning / destroyed
  if (isBurning || isDead) {
    ctx.fillStyle = 'rgba(255, 90, 0, 0.7)';
    ctx.beginPath();
    ctx.arc((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 8 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Health bar & overhead indicator
  if (options.showHealthBar && !isDead) {
    const barWidth = Math.max(36, width * 1.1);
    const barHeight = 4;
    const barY = -length / 2 - 16;
    const hpRatio = Math.max(0, Math.min(1, tank.hp / tank.maxHp));

    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(-barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);

    // HP Fill
    const hpColor =
      tank.team === 'player_faction'
        ? (hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444')
        : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);

    // Reload indicator circle for non-player tanks or small dot
    if (tank.reloadProgress < 1.0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-barWidth / 2, barY + barHeight + 1, barWidth * tank.reloadProgress, 1.5);
    }

    // Name or Tier badge
    if (options.showName) {
      ctx.font = '600 9px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = tank.team === 'player_faction' ? '#86efac' : '#fca5a5';
      ctx.fillText(`${def.name} [T${def.tier}]`, 0, barY - 4);
    }
  }

  ctx.restore(); // Final restore
}
