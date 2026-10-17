export type NationId = 'germany' | 'usa' | 'ussr' | 'britain';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  experimentalVehicles: boolean;
  difficulty: Difficulty;
  campaignMode: boolean;
}

export interface TankUpgradeLevels {
  gun: number;      // 0 to 3
  armor: number;    // 0 to 3
  engine: number;   // 0 to 3
  turret: number;   // 0 to 3
}

export interface TankDefinition {
  id: string;
  name: string;
  nation: NationId;
  tier: number; // 1 to 10
  role: 'light' | 'medium' | 'heavy' | 'td' | 'superheavy' | 'experimental';
  historicalName: string;
  yearIntroduced: number;
  description: string;
  cost: number;
  isExperimental?: boolean;
  prerequisites?: string[]; // IDs of preceding tanks required to unlock this vehicle
  isFlamethrower?: boolean; // Spews incendiary liquid napalm stream
  branch?: 'light' | 'medium' | 'heavy' | 'td' | 'flamethrower' | 'superheavy' | 'experimental';
  
  // Base combat attributes
  maxHp: number;
  frontArmor: number; // mm
  sideArmor: number;  // mm
  rearArmor: number;  // mm
  
  topSpeed: number;        // pixels/sec
  reverseSpeed: number;    // pixels/sec
  acceleration: number;
  turnSpeed: number;       // radians/sec
  turretTurnSpeed: number; // radians/sec
  
  gunCaliber: number;      // mm (e.g. 20, 50, 75, 88, 128, 155, 183, 280)
  damage: number;
  penetration: number;     // mm
  reloadTime: number;      // seconds
  shellSpeed: number;      // pixels/sec
  shellRange: number;      // pixels
  accuracySpread: number;  // radians
  
  hasMachineGun: boolean;
  mgDamage?: number;
  mgReload?: number;
  
  // Dimensions for collision & drawing
  length: number; // px
  width: number;  // px
  turretRadius: number;
  barrelLength: number;
  barrelWidth: number;
  hasMuzzleBrake?: boolean;
  hasSideSkirts?: boolean;
  hasExternalTanks?: boolean;
  hasLog?: boolean;
  hasQuadTracks?: boolean;
  hasSixTracks?: boolean;
  hasDualBarrels?: boolean;
  blueprintCost?: number;
  isMultiTurreted?: boolean;
  isCasemate?: boolean; // fixed superstructure like Jagdtiger, Tortoise, T95
  turretOffset?: number; // Y offset from hull center (positive = forward, negative = rear)
  
  // Colors & Aesthetic
  hullColor: string;
  camoPattern?: 'camo-stripes' | 'olive-drab' | 'soviet-green' | 'desert-sand' | 'grey' | 'quad-camo';
  accentColor?: string;
}

export type Team = 'player_faction' | 'enemy_faction';

export interface TankEntity {
  id: string;
  defId: string;
  nation: NationId;
  team: Team;
  isPlayer: boolean;
  
  // Physics & Transform
  x: number;
  y: number;
  vx: number;
  vy: number;
  hullAngle: number;    // radians
  turretAngle: number;  // radians
  targetTurretAngle: number;
  
  // State
  hp: number;
  maxHp: number;
  effectiveArmor: number;
  isDestroyed: boolean;
  isBurning: boolean;
  fireTimer: number;
  
  // Reload timers
  reloadProgress: number; // 0 to 1 (1 = ready)
  mgCooldown: number;     // seconds
  
  // Controls / AI
  throttle: number; // -1 to 1
  steer: number;    // -1 to 1
  aiTargetId: string | null;
  aiPatrolTimer: number;
  aiLastShotTime: number;
  
  // Track animation
  leftTrackDistance: number;
  rightTrackDistance: number;
  trackHealth: number; // 0 to 100
  isTrackDamaged: boolean;
  
  // Custom upgrades (for player)
  upgrades: TankUpgradeLevels;
  
  // Score / Stats tracking
  kills: number;
  damageDealt: number;
}

export interface Shell {
  id: string;
  ownerId: string;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  distanceTraveled: number;
  maxDistance: number;
  damage: number;
  penetration: number;
  caliber: number;
  isMgBullet?: boolean;
  isFlameStream?: boolean;
  tracerColor: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'smoke' | 'fire' | 'spark' | 'dirt' | 'debris' | 'shockwave' | 'ricochet';
  alpha: number;
  rotation?: number;
  vRot?: number;
}

export interface TreadMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
  color: string;
}

export interface BattlefieldObstacle {
  id: string;
  x: number;
  y: number;
  type: 'tree' | 'crater' | 'hedgehog' | 'bunker' | 'wreck' | 'trench' | 'rock' | 'ruins' | 'pillbox' | 'dragon_teeth';
  radius: number;
  health: number;
  maxHealth: number;
  angle?: number;
  variant?: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface PlayerStats {
  score: number;
  credits: number;
  tanksDestroyed: number;
  damageDealt: number;
  timeSurvivedSeconds: number;
  shotsFired: number;
  shotsHit: number;
  ricochetsGiven: number;
  ricochetsReceived: number;
  highestTierDestroyed: number;
}

export interface RadioMessage {
  id: string;
  sender: string;
  text: string;
  time: number;
  isUrgent?: boolean;
}

export type MissionType = 'kill_tanks' | 'capture_objective' | 'combined_offensive' | 'defend_city';

export interface CampaignObjective {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  captureProgress: number; // 0 to 100
  isCaptured: boolean;
}

export interface CampaignMission {
  id: string;
  missionNumber: number;
  title: string;
  type: MissionType;
  description: string;
  targetKills: number;
  currentKills: number;
  objectives: CampaignObjective[];
  isCompleted: boolean;
  rewardCredits: number;
}
