import { BattlefieldObstacle } from '../types/game';
import { CampaignDefinition } from '../data/campaigns';

// Chunk size for infinite map generation
export const CHUNK_SIZE = 900;

// Simple deterministic hash based on chunk coordinates
function hashChunk(cx: number, cy: number, seed: number = 42): number {
  let h = (cx * 73856093) ^ (cy * 19349663) ^ (seed * 83492791);
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = (h ^ (h >>> 16));
  return Math.abs(h);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export class WorldManager {
  private chunks: Map<string, BattlefieldObstacle[]> = new Map();
  private destroyedObstacleIds: Set<string> = new Set();

  constructor(public campaign?: CampaignDefinition) {}

  public constrainPosition(x: number, y: number, margin: number = 90): { x: number; y: number } {
    if (!this.campaign) return { x, y };
    const limit = this.campaign.mapSize / 2 - margin;
    return { x: Math.max(-limit, Math.min(limit, x)), y: Math.max(-limit, Math.min(limit, y)) };
  }

  public getObstaclesInArea(minX: number, minY: number, maxX: number, maxY: number): BattlefieldObstacle[] {
    const minChunkX = Math.floor(minX / CHUNK_SIZE);
    const maxChunkX = Math.floor(maxX / CHUNK_SIZE);
    const minChunkY = Math.floor(minY / CHUNK_SIZE);
    const maxChunkY = Math.floor(maxY / CHUNK_SIZE);

    const result: BattlefieldObstacle[] = [];

    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      for (let cy = minChunkY; cy <= maxChunkY; cy++) {
        const key = `${cx},${cy}`;
        let obstacles = this.chunks.get(key);
        if (!obstacles) {
          obstacles = this.generateChunk(cx, cy);
          this.chunks.set(key, obstacles);
        }

        for (const obs of obstacles) {
          if (!this.destroyedObstacleIds.has(obs.id)) {
            if (obs.x >= minX - obs.radius && obs.x <= maxX + obs.radius &&
                obs.y >= minY - obs.radius && obs.y <= maxY + obs.radius) {
              result.push(obs);
            }
          }
        }
      }
    }

    // Prune chunks if cache gets too massive (> 120 chunks)
    if (this.chunks.size > 140) {
      for (const [key] of this.chunks) {
        const [kcx, kcy] = key.split(',').map(Number);
        if (Math.abs(kcx - minChunkX) > 4 || Math.abs(kcy - minChunkY) > 4) {
          this.chunks.delete(key);
        }
      }
    }

    return result;
  }

  public damageObstacle(id: string, damage: number): { destroyed: boolean; obstacle?: BattlefieldObstacle } {
    for (const obstacles of this.chunks.values()) {
      const obs = obstacles.find(o => o.id === id);
      if (obs && !this.destroyedObstacleIds.has(id)) {
        obs.health -= damage;
        if (obs.health <= 0) {
          this.destroyedObstacleIds.add(id);
          return { destroyed: true, obstacle: obs };
        }
        return { destroyed: false, obstacle: obs };
      }
    }
    return { destroyed: false };
  }

  private generateChunk(cx: number, cy: number): BattlefieldObstacle[] {
    const obstacles: BattlefieldObstacle[] = [];
    const seed = hashChunk(cx, cy);
    let randIdx = seed;

    // Do not put obstacles directly at the starting spawn zone (0, 0)
    const isSpawnChunk = cx === 0 && cy === 0;

    // Dense tactical cover: 16 to 26 obstacles per chunk (and 7 in spawn chunk away from 0,0)
    const terrain = this.campaign?.terrain;
    const count = terrain === 'city' ? 45 : terrain === 'forest' ? 38 : terrain === 'open' ? 9 : isSpawnChunk ? 7 : 16 + Math.floor(pseudoRandom(randIdx++) * 11);

    for (let i = 0; i < count; i++) {
      const rx = pseudoRandom(randIdx++);
      const ry = pseudoRandom(randIdx++);
      const ox = cx * CHUNK_SIZE + (terrain === 'city' ? (i % 7) * 125 + 60 : rx * (CHUNK_SIZE - 100) + 50);
      const oy = cy * CHUNK_SIZE + (terrain === 'city' ? Math.floor(i / 7) * 125 + 60 : ry * (CHUNK_SIZE - 100) + 50);

      // Avoid blocking immediate spawn point (radius 240px around 0,0)
      if (Math.hypot(ox, oy) < 240) continue;
      if (this.campaign && (Math.abs(ox) > this.campaign.mapSize / 2 - 80 || Math.abs(oy) > this.campaign.mapSize / 2 - 80)) continue;
      if (this.campaign?.mission.objectives.some(location => Math.hypot(ox - location.x, oy - location.y) < location.radius + 75)) continue;

      const typeRoll = pseudoRandom(randIdx++);
      let type: BattlefieldObstacle['type'] = 'tree';
      let radius = 22;
      let maxHealth = 100;

      if (typeRoll < 0.22) {
        type = 'tree'; // Forest cover & tree copses
        radius = 18 + pseudoRandom(randIdx++) * 14;
        maxHealth = 90;
      } else if (typeRoll < 0.36) {
        type = 'ruins'; // Destroyed village walls / brick houses
        radius = 26 + pseudoRandom(randIdx++) * 10;
        maxHealth = 700;
      } else if (typeRoll < 0.48) {
        type = 'pillbox'; // Concrete bunker / fortification
        radius = 28;
        maxHealth = 850;
      } else if (typeRoll < 0.58) {
        type = 'dragon_teeth'; // Concrete anti-tank pyramidal teeth
        radius = 18;
        maxHealth = 750;
      } else if (typeRoll < 0.68) {
        type = 'hedgehog'; // Anti-tank steel hedgehog
        radius = 16;
        maxHealth = 550;
      } else if (typeRoll < 0.78) {
        type = 'bunker'; // Sandbag fortified dugout / revetment
        radius = 24;
        maxHealth = 650;
      } else if (typeRoll < 0.86) {
        type = 'rock'; // Granite boulder outcrop
        radius = 22 + pseudoRandom(randIdx++) * 8;
        maxHealth = 900;
      } else if (typeRoll < 0.94) {
        type = 'crater'; // Artillery shell mud crater
        radius = 26 + pseudoRandom(randIdx++) * 18;
        maxHealth = 99999;
      } else {
        type = 'wreck'; // Burned out tank carcass
        radius = 28;
        maxHealth = 650;
      }

      if (terrain === 'city') {
        type = typeRoll < 0.8 ? 'ruins' : 'hedgehog';
        radius = type === 'ruins' ? 34 : 16;
        maxHealth = type === 'ruins' ? 700 : 550;
      } else if (terrain === 'forest' && typeRoll < 0.8) {
        type = 'tree';
        radius = 24;
        maxHealth = 90;
      }

      obstacles.push({
        id: `obs_${cx}_${cy}_${i}`,
        x: ox,
        y: oy,
        type,
        radius,
        health: maxHealth,
        maxHealth,
        angle: pseudoRandom(randIdx++) * Math.PI * 2,
        variant: Math.floor(pseudoRandom(randIdx++) * 4),
      });
    }

    return obstacles;
  }
}
