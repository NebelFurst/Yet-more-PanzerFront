import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TankEntity,
  TankDefinition,
  Shell,
  Particle,
  TreadMark,
  FloatingText,
  PlayerStats,
  RadioMessage,
  TankUpgradeLevels,
  Team,
  BattlefieldObstacle,
  GameSettings,
  Difficulty,
  CampaignMission,
  CampaignObjective,
} from './types/game';
import { TANKS, TECH_TREE_ORDER, canUnlockTank } from './data/tanks';
import { CAMPAIGNS, createCampaignMission } from './data/campaigns';
import { CampaignsModal } from './components/CampaignsModal';
import { STARTER_TANK_IDS } from './types/progress';
import { useProgression } from './utils/progression';
import { WorldManager } from './utils/world';
import { renderTank } from './utils/renderTanks';
import { updateTankAI } from './utils/ai';
import { audio } from './utils/audio';
import { HUD } from './components/HUD';
import { TechTreeModal } from './components/TechTreeModal';
import { GameOverModal } from './components/GameOverModal';
import { HomeScreen } from './components/HomeScreen';
import { PauseMenu } from './components/PauseMenu';
import { SettingsModal } from './components/SettingsModal';
import { CampaignVictoryModal } from './components/CampaignVictoryModal';

// Starting setup
const DEFAULT_STARTING_TANK = 'ger_pz1';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Screen State: 'home' | 'battle'
  const [screen, setScreen] = useState<'home' | 'battle'>('home');

  // Operations Settings: Difficulty, Experimental Behemoths & Campaign Mode
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('ww2_tank_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          experimentalVehicles: !!parsed.experimentalVehicles,
          difficulty: parsed.difficulty || 'medium',
          campaignMode: !!parsed.campaignMode,
        };
      } catch {
        // fallback
      }
    }
    return {
      experimentalVehicles: false,
      difficulty: 'medium',
      campaignMode: false,
    };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Campaign State
  const campaignStageRef = useRef(0);
  const selectedCampaignRef = useRef(CAMPAIGNS[0].id);
  const [selectedCampaignId, setSelectedCampaignId] = useState(CAMPAIGNS[0].id);
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
  const [campaignMission, setCampaignMission] = useState<CampaignMission | null>(null);
  const [isCampaignVictoryOpen, setIsCampaignVictoryOpen] = useState<boolean>(false);
  const campaignMissionRef = useRef<CampaignMission | null>(null);
  const isCampaignVictoryOpenRef = useRef(false);
  useEffect(() => { isCampaignVictoryOpenRef.current = isCampaignVictoryOpen; }, [isCampaignVictoryOpen]);

  // Persistence: Player Progression
  const [credits, setCredits] = useState<number>(500);
  const [unlockedTankIds, setUnlockedTankIds] = useState<string[]>(STARTER_TANK_IDS);
  const [currentTankId, setCurrentTankId] = useState<string>(DEFAULT_STARTING_TANK);
  const [upgrades, setUpgrades] = useState<Record<string, TankUpgradeLevels>>({});
  const [blueprintIds, setBlueprintIds] = useState<string[]>([]);
  const economyRef = useRef({ credits, unlockedTankIds, blueprintIds });
  economyRef.current = { credits, unlockedTankIds, blueprintIds };
  const progression = useProgression({ credits, unlockedTankIds, currentTankId, upgrades, blueprintIds }, saved => {
    setCredits(saved.credits);
    setUnlockedTankIds(saved.unlockedTankIds);
    setCurrentTankId(saved.currentTankId);
    setUpgrades(saved.upgrades);
    setBlueprintIds(saved.blueprintIds);
  });

  // UI States
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState<boolean>(false);
  const [isDepotOpen, setIsDepotOpen] = useState<boolean>(false);
  const [depotReturnTo, setDepotReturnTo] = useState<'home' | 'battle'>('home');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Player Stats
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    credits: 500,
    tanksDestroyed: 0,
    damageDealt: 0,
    timeSurvivedSeconds: 0,
    shotsFired: 0,
    shotsHit: 0,
    ricochetsGiven: 0,
    ricochetsReceived: 0,
    highestTierDestroyed: 1,
  });

  // Radio Messages
  const [radioMessages, setRadioMessages] = useState<RadioMessage[]>([
    {
      id: 'init_1',
      sender: 'HQ Command',
      text: 'Frontline active! Advance with your armored unit, eliminate enemy tanks.',
      time: Date.now(),
    },
  ]);

  // Consumable cooldowns
  const [repairKitCooldown, setRepairKitCooldown] = useState<number>(0);
  const [smokeCooldown, setSmokeCooldown] = useState<number>(0);

  // Game Engine Mutable State Refs (for smooth 60 FPS Canvas execution)
  const worldRef = useRef<WorldManager>(new WorldManager());
  const playerRef = useRef<TankEntity | null>(null);
  const tanksRef = useRef<TankEntity[]>([]);
  const shellsRef = useRef<Shell[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const treadMarksRef = useRef<TreadMark[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerRecoilRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const spawnTimerRef = useRef<number>(0);

  // Screen & Modal State Refs (prevents stale closure freeze in 60fps loop)
  const screenRef = useRef<'home' | 'battle'>('home');
  const isPauseMenuOpenRef = useRef<boolean>(false);
  const isDepotOpenRef = useRef<boolean>(false);
  const isSettingsOpenRef = useRef<boolean>(false);
  const settingsRef = useRef<GameSettings>(settings);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    isPauseMenuOpenRef.current = isPauseMenuOpen;
  }, [isPauseMenuOpen]);

  useEffect(() => {
    isDepotOpenRef.current = isDepotOpen;
  }, [isDepotOpen]);

  useEffect(() => {
    isSettingsOpenRef.current = isSettingsOpen;
  }, [isSettingsOpen]);

  useEffect(() => {
    settingsRef.current = settings;
    localStorage.setItem('ww2_tank_settings', JSON.stringify(settings));
  }, [settings]);

  // Sync credits with stats
  useEffect(() => {
    setStats(prev => ({ ...prev, credits }));
  }, [credits]);

  // Push new radio message
  const addRadioMessage = useCallback((sender: string, text: string) => {
    audio.playRadioBeep();
    setRadioMessages(prev => [
      ...prev.slice(-6),
      { id: `msg_${Date.now()}_${Math.random()}`, sender, text, time: Date.now() },
    ]);
  }, []);

  // Spawn tank entity helper
  const createTankEntity = useCallback(
    (
      defId: string,
      team: Team,
      isPlayer: boolean,
      x: number,
      y: number,
      angle: number = 0
    ): TankEntity => {
      const def = TANKS[defId] || TANKS['ger_pz1'];
      const tankUpgrades = upgrades[defId] || { gun: 0, armor: 0, engine: 0, turret: 0 };

      // Apply upgrade bonuses to player
      const hpMultiplier = isPlayer ? 1 + tankUpgrades.armor * 0.2 : 1;
      const calculatedMaxHp = Math.round(def.maxHp * hpMultiplier);

      return {
        id: isPlayer ? 'player' : `tank_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        defId,
        nation: def.nation,
        team,
        isPlayer,
        x,
        y,
        vx: 0,
        vy: 0,
        hullAngle: angle,
        turretAngle: angle,
        targetTurretAngle: angle,
        hp: calculatedMaxHp,
        maxHp: calculatedMaxHp,
        effectiveArmor: def.frontArmor,
        isDestroyed: false,
        isBurning: false,
        fireTimer: 0,
        reloadProgress: 1.0,
        mgCooldown: 0,
        throttle: 0,
        steer: 0,
        aiTargetId: null,
        aiPatrolTimer: 0,
        aiLastShotTime: 0,
        leftTrackDistance: 0,
        rightTrackDistance: 0,
        trackHealth: 100,
        isTrackDamaged: false,
        upgrades: tankUpgrades,
        kills: 0,
        damageDealt: 0,
      };
    },
    [upgrades]
  );

  // Initialize or Reset Game World
  const initGame = useCallback(
    (tankId: string, startAudio: boolean = false) => {
      const campaign = settingsRef.current.campaignMode
        ? CAMPAIGNS.find(operation => operation.id === selectedCampaignRef.current) || CAMPAIGNS[0]
        : undefined;
      worldRef.current = new WorldManager(campaign);
      spawnTimerRef.current = 0;
      isCampaignVictoryOpenRef.current = false;
      shellsRef.current = [];
      particlesRef.current = [];
      treadMarksRef.current = [];
      floatingTextsRef.current = [];

      // Create Player
      const player = createTankEntity(tankId, 'player_faction', true, 0, 0, 0);
      playerRef.current = player;
      cameraRef.current = { x: 0, y: 0 };

      const playerDef = TANKS[tankId] || TANKS['ger_pz1'];
      const isPlayerAxis = playerDef.nation === 'germany';

      // Spawn initial Allied fleet (spread out in defensive skirmish line)
      const initialTanks: TankEntity[] = [player];

      const alliedPool = isPlayerAxis
        ? ['ger_pz2', 'ger_pz3', 'ger_pz4', 'ger_pz1']
        : ['usa_m3_stuart', 'usa_m4_sherman', 'ussr_t34_76', 'uk_crusader'];

      // Generous spacing: 320px to 540px radius with separated angles
      for (let i = 0; i < (campaign ? campaign.allies - 1 : 5); i++) {
        const allyDef = alliedPool[i % alliedPool.length];
        const offsetDist = 320 + i * 50 + Math.random() * 60;
        const offsetAngle = (i / 5) * Math.PI * 1.6 + 0.3; // wide arc behind/beside player
        const ax = Math.cos(offsetAngle) * offsetDist;
        const ay = Math.sin(offsetAngle) * offsetDist;
        initialTanks.push(createTankEntity(allyDef, 'player_faction', false, ax, ay, offsetAngle));
      }

      // Spawn initial Enemy divisions (spread across distant flanking sectors)
      const enemyPool = isPlayerAxis
        ? ['usa_m4_sherman', 'ussr_t34_76', 'uk_matilda2', 'usa_m3_stuart', 'ussr_bt7']
        : ['ger_pz2', 'ger_pz3', 'ger_pz4', 'ger_panther', 'ger_pz1'];

      // Spread out enemy ring at 950px to 1450px distance
      for (let i = 0; i < (campaign?.enemies || 8); i++) {
        const enemyDef = enemyPool[i % enemyPool.length];
        const dist = 950 + (i % 3) * 160 + Math.random() * 120;
        const ang = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const position = worldRef.current.constrainPosition(Math.cos(ang) * dist, campaign?.holdSeconds ? -dist : Math.sin(ang) * dist);
        const ex = position.x;
        const ey = position.y;
        const defendedObjective = campaign && !campaign.holdSeconds ? campaign.mission.objectives[i % campaign.mission.objectives.length] : undefined;
        initialTanks.push(createTankEntity(enemyDef, 'enemy_faction', false,
          defendedObjective && i < campaign!.mission.objectives.length * 2 ? defendedObjective.x + (i % 2 ? 140 : -140) : ex,
          defendedObjective && i < campaign!.mission.objectives.length * 2 ? defendedObjective.y + 100 : ey, ang + Math.PI));
      }

      tanksRef.current = initialTanks;
      setIsGameOver(false);

      // Initialize Campaign Mission if Campaign Mode is active
      if (settingsRef.current.campaignMode) {
        const newMission = createCampaignMission(campaign!, campaignStageRef.current);
        setCampaignMission(newMission);
        campaignMissionRef.current = newMission;
        setIsCampaignVictoryOpen(false);
      } else {
        setCampaignMission(null);
        campaignMissionRef.current = null;
        setIsCampaignVictoryOpen(false);
      }

      if (startAudio) {
        audio.startEngine();
      }
    },
    [createTankEntity]
  );

  // Spawn ongoing reinforcements as the endless battle continues (well-separated)
  const maintainBattlefieldReinforcements = useCallback(() => {
    const player = playerRef.current;
    if (!player || player.isDestroyed) return;

    const tanks = tanksRef.current;
    const activeAllies = tanks.filter(t => !t.isDestroyed && t.team === 'player_faction');
    const activeEnemies = tanks.filter(t => !t.isDestroyed && t.team === 'enemy_faction');

    const playerDef = TANKS[player.defId];
    const isPlayerAxis = playerDef.nation === 'germany';
    const isExperimentalOn = settingsRef.current.experimentalVehicles;

    // Target balance: ~7-9 allies, ~10-14 enemies
    const campaign = worldRef.current.campaign;
    const maxAllies = campaign?.allies || 8;
    const maxEnemies = (campaign?.enemies || 12) + (campaign ? campaignStageRef.current * 2 : 0);

    // Allied candidate pool based on player tier and experimental setting
    const alliedPool = isPlayerAxis
      ? playerDef.tier >= 6
        ? isExperimentalOn && Math.random() < 0.2
          ? ['ger_ratte', 'ger_tiger2', 'ger_maus']
          : ['ger_tiger1', 'ger_panther', 'ger_pz4', 'ger_tiger2', 'ger_jagdtiger']
        : ['ger_pz3', 'ger_pz4', 'ger_pz2', 'ger_stug3', 'ger_pz3_flammenwerfer']
      : playerDef.tier >= 6
      ? isExperimentalOn && Math.random() < 0.2
        ? ['ussr_kv6', 'usa_t58', 'uk_fv4005']
        : ['usa_m26_pershing', 'ussr_is2', 'uk_churchill', 'usa_m4a3e8', 'ussr_is3', 'uk_crocodile']
      : ['usa_m4_sherman', 'ussr_t34_76', 'uk_crusader', 'ussr_ot34', 'usa_m4_zippo'];

    // Enemy candidate pool based on player tier and experimental setting
    const enemyPool = isPlayerAxis
      ? playerDef.tier >= 6
        ? isExperimentalOn && Math.random() < 0.25
          ? ['ussr_kv6', 'usa_t58', 'uk_fv4005', 'usa_t30', 'ussr_obj279']
          : ['usa_m26_pershing', 'ussr_is2', 'ussr_is3', 'uk_comet', 'usa_t29', 'ussr_isu152']
        : ['usa_m4_sherman', 'ussr_t34_76', 'uk_matilda2', 'ussr_t34_85', 'usa_m3_lee', 'ussr_ot34']
      : playerDef.tier >= 6
      ? isExperimentalOn && Math.random() < 0.25
        ? ['ger_ratte', 'ger_maus', 'ger_jagdtiger', 'ger_tiger2']
        : ['ger_tiger1', 'ger_tiger2', 'ger_panther', 'ger_jagdtiger', 'ger_jagdpanzer4']
      : ['ger_pz3', 'ger_pz4', 'ger_pz2', 'ger_stug3', 'ger_panther', 'ger_pz3_flammenwerfer'];

    // Helper to find a spawn location not crowded by other tanks (minimum 280px clearance)
    const findClearSpawnPos = (baseDist: number): { x: number; y: number; ang: number } => {
      let attempts = 0;
      while (attempts < 6) {
        attempts++;
        const ang = Math.random() * Math.PI * 2;
        const dist = baseDist + Math.random() * 350;
        const position = worldRef.current.constrainPosition(
          player.x + Math.cos(ang) * dist,
          campaign?.holdSeconds ? -campaign.mapSize / 2 + 180 + Math.random() * 180 : player.y + Math.sin(ang) * dist,
          160
        );
        const sx = position.x;
        const sy = position.y;
        const tooClose = tanks.some(t => !t.isDestroyed && Math.hypot(t.x - sx, t.y - sy) < 280);
        const blocked = worldRef.current.getObstaclesInArea(sx - 60, sy - 60, sx + 60, sy + 60).some(obstacle => obstacle.type !== 'crater' && Math.hypot(obstacle.x - sx, obstacle.y - sy) < obstacle.radius + 50);
        if ((!tooClose && !blocked) || attempts === 6) {
          return { x: sx, y: sy, ang };
        }
      }
      const fallbackAng = Math.random() * Math.PI * 2;
      return {
        x: player.x + Math.cos(fallbackAng) * baseDist,
        y: player.y + Math.sin(fallbackAng) * baseDist,
        ang: fallbackAng,
      };
    };

    // Spawn Allied reinforcements
    if (activeAllies.length < maxAllies) {
      const defId = alliedPool[Math.floor(Math.random() * alliedPool.length)];
      const { x: rx, y: ry, ang } = findClearSpawnPos(1000);
      tanks.push(createTankEntity(defId, 'player_faction', false, rx, ry, ang));
    }

    // Spawn Enemy reinforcements
    if (activeEnemies.length < maxEnemies) {
      const defId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const { x: rx, y: ry, ang } = findClearSpawnPos(1200);
      tanks.push(createTankEntity(defId, 'enemy_faction', false, rx, ry, ang + Math.PI));
    }

    // Clean up distant destroyed tanks (> 2500px from player)
    tanksRef.current = tanks.filter(t => {
      if (!t.isDestroyed) return true;
      const d = Math.hypot(t.x - player.x, t.y - player.y);
      return d < 2200;
    });
  }, [createTankEntity]);

  // Initial Game Launch
  useEffect(() => {
    initGame(currentTankId);
  }, [initGame, currentTankId]);

  // Input Listeners: Keyboard & Mouse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on Space or Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      keysRef.current[e.code] = true;

      // Toggle Pause / Tech Tree Depot / Settings
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isDepotOpen) {
          setIsDepotOpen(false);
        } else if (isCampaignsOpen) {
          setIsCampaignsOpen(false);
        } else if (screen === 'battle' && !isGameOver && !isCampaignVictoryOpenRef.current) {
          setIsPauseMenuOpen(prev => !prev);
        }
      }

      if (screen === 'battle' && !isPauseMenuOpen && !isDepotOpen && !isSettingsOpen && !isGameOver) {
        // Quick Repair Kit (Q)
        if (e.code === 'KeyQ') {
          handleUseRepairKit();
        }

        // Quick Smoke Screen (E)
        if (e.code === 'KeyE') {
          handleUseSmokeScreen();
        }

        // Spacebar Fire Main Gun
        if (e.code === 'Space') {
          firePlayerCannon();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (screen !== 'battle' || isPauseMenuOpen || isDepotOpen || isSettingsOpen || isGameOver) return;
      if (e.button === 0) {
        // LMB: Fire cannon
        firePlayerCannon();
      } else if (e.button === 2) {
        // RMB: Machine gun
        firePlayerMachineGun();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click browser menu
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [screen, isPauseMenuOpen, isDepotOpen, isSettingsOpen, isGameOver, isCampaignsOpen]);

  // Cannon firing helper
  const spawnCannonShot = (tank: TankEntity) => {
    const def = TANKS[tank.defId];
    if (!def) return;

    // Calculate barrel tip position
    const isPlayer = tank.isPlayer;
    const recoil = isPlayer ? 6 : 4;
    if (isPlayer) {
      playerRecoilRef.current = recoil;
    }

    // Gun angle
    let angle = tank.turretAngle;
    if (def.isCasemate) {
      let diff = tank.turretAngle - tank.hullAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      angle = tank.hullAngle + Math.max(-0.24, Math.min(0.24, diff));
    }

    // Tip of barrel
    const barrelLength = def.barrelLength;
    const tipX = tank.x + Math.sin(angle) * barrelLength;
    const tipY = tank.y - Math.cos(angle) * barrelLength;

    // Multipliers for player upgrades & high-impact combat
    const dmgMultiplier = isPlayer ? 1 + tank.upgrades.gun * 0.2 : 1;
    const penMultiplier = isPlayer ? 1 + tank.upgrades.gun * 0.25 : 1;
    const baseDamageMultiplier = 1.75; // Tanks take fewer hits to destroy!

    // --- FLAMETHROWER FIRING LOGIC ---
    if (def.isFlamethrower) {
      audio.playFlamethrower();
      for (let f = 0; f < 5; f++) {
        const flameSpread = (Math.random() - 0.5) * 0.14;
        const fAngle = angle + flameSpread;
        const flameSpeed = def.shellSpeed * (0.85 + Math.random() * 0.3);
        shellsRef.current.push({
          id: `flame_${Date.now()}_${Math.random()}`,
          ownerId: tank.id,
          team: tank.team,
          x: tipX,
          y: tipY,
          vx: Math.sin(fAngle) * flameSpeed,
          vy: -Math.cos(fAngle) * flameSpeed,
          angle: fAngle,
          speed: flameSpeed,
          distanceTraveled: 0,
          maxDistance: def.shellRange * (0.88 + Math.random() * 0.24),
          damage: Math.round(def.damage * (0.75 + Math.random() * 0.5) * dmgMultiplier),
          penetration: Math.round(def.penetration * penMultiplier),
          caliber: 16,
          isMgBullet: false,
          isFlameStream: true,
          tracerColor: '#f97316',
        });

        // Flame blast particles
        particlesRef.current.push({
          id: `flame_p_${Date.now()}_${f}`,
          x: tipX + (Math.random() - 0.5) * 6,
          y: tipY + (Math.random() - 0.5) * 6,
          vx: Math.sin(fAngle) * (flameSpeed * 0.55) + (Math.random() - 0.5) * 35,
          vy: -Math.cos(fAngle) * (flameSpeed * 0.55) + (Math.random() - 0.5) * 35,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          size: 14 + Math.random() * 12,
          color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
          type: 'fire',
          alpha: 0.9,
        });
      }
      tank.reloadProgress = 0;
      return;
    }

    // Shell speed and spread
    const spread = (Math.random() - 0.5) * def.accuracySpread;
    const finalAngle = angle + spread;
    const speed = def.shellSpeed;

    const barrelOffsets = def.hasDualBarrels ? [-def.barrelWidth * 1.5, def.barrelWidth * 1.5] : [0];
    for (const barrelOffset of barrelOffsets) {
      shellsRef.current.push({
        id: `shell_${Date.now()}_${Math.random()}`,
        ownerId: tank.id,
        team: tank.team,
        x: tipX + Math.cos(angle) * barrelOffset,
        y: tipY + Math.sin(angle) * barrelOffset,
        vx: Math.sin(finalAngle) * speed,
        vy: -Math.cos(finalAngle) * speed,
        angle: finalAngle,
        speed,
        distanceTraveled: 0,
        maxDistance: def.shellRange,
        damage: Math.round(def.damage * baseDamageMultiplier * dmgMultiplier),
        penetration: Math.round(def.penetration * 1.35 * penMultiplier),
        caliber: def.gunCaliber,
        isMgBullet: false,
        tracerColor: tank.team === 'player_faction' ? '#fde047' : '#f87171',
      });
    }

    // Muzzle blast flash & smoke particles
    const flashSize = Math.max(10, def.gunCaliber * 0.25);
    particlesRef.current.push({
      id: `flash_${Date.now()}_${Math.random()}`,
      x: tipX,
      y: tipY,
      vx: Math.sin(finalAngle) * 50,
      vy: -Math.cos(finalAngle) * 50,
      life: 0.08,
      maxLife: 0.08,
      size: flashSize,
      color: '#fef08a',
      type: 'fire',
      alpha: 1,
    });

    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        id: `smoke_${Date.now()}_${Math.random()}`,
        x: tipX + (Math.random() - 0.5) * 8,
        y: tipY + (Math.random() - 0.5) * 8,
        vx: Math.sin(finalAngle) * (60 + Math.random() * 40) + (Math.random() - 0.5) * 30,
        vy: -Math.cos(finalAngle) * (60 + Math.random() * 40) + (Math.random() - 0.5) * 30,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 8 + Math.random() * 10,
        color: '#94a3b8',
        type: 'smoke',
        alpha: 0.7,
      });
    }

    // Audio boom
    const player = playerRef.current;
    const distFactor = player ? Math.hypot(tank.x - player.x, tank.y - player.y) / 700 + 1 : 1;
    audio.playCannonShot(def.gunCaliber, distFactor);

    // Reset tank reload progress
    tank.reloadProgress = 0;
  };

  // Machine Gun firing helper
  const spawnMachineGunShot = (tank: TankEntity) => {
    const def = TANKS[tank.defId];
    if (!def || !def.hasMachineGun) return;

    let angle = tank.turretAngle;
    const spread = (Math.random() - 0.5) * 0.08;
    const finalAngle = angle + spread;
    const tipX = tank.x + Math.sin(angle) * (def.turretRadius + 8);
    const tipY = tank.y - Math.cos(angle) * (def.turretRadius + 8);

    shellsRef.current.push({
      id: `mg_${Date.now()}_${Math.random()}`,
      ownerId: tank.id,
      team: tank.team,
      x: tipX,
      y: tipY,
      vx: Math.sin(finalAngle) * 950,
      vy: -Math.cos(finalAngle) * 950,
      angle: finalAngle,
      speed: 950,
      distanceTraveled: 0,
      maxDistance: 450,
      damage: def.mgDamage || 10,
      penetration: 18,
      caliber: 12.7,
      isMgBullet: true,
      tracerColor: '#fdba74',
    });

    const player = playerRef.current;
    const distFactor = player ? Math.hypot(tank.x - player.x, tank.y - player.y) / 600 + 1 : 1;
    audio.playMachineGun(distFactor);

    tank.mgCooldown = def.mgReload || 0.16;
  };

  const firePlayerCannon = () => {
    const player = playerRef.current;
    if (!player || player.isDestroyed || player.reloadProgress < 1.0) return;
    spawnCannonShot(player);
    setStats(prev => ({ ...prev, shotsFired: prev.shotsFired + (TANKS[player.defId].hasDualBarrels ? 2 : 1) }));
  };

  const firePlayerMachineGun = () => {
    const player = playerRef.current;
    if (!player || player.isDestroyed || player.mgCooldown > 0) return;
    spawnMachineGunShot(player);
  };

  // Quick consumables
  const handleUseRepairKit = () => {
    const player = playerRef.current;
    if (!player || player.isDestroyed || repairKitCooldown > 0 || player.hp >= player.maxHp) return;
    const healAmount = Math.round(player.maxHp * 0.45);
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    setRepairKitCooldown(18);
    audio.playCashEarned();

    floatingTextsRef.current.push({
      id: `heal_${Date.now()}`,
      x: player.x,
      y: player.y - 30,
      text: `+${healAmount} HP REPAIRED`,
      color: '#4ade80',
      life: 1.2,
      maxLife: 1.2,
      vy: -35,
    });
  };

  const handleUseSmokeScreen = () => {
    const player = playerRef.current;
    if (!player || player.isDestroyed || smokeCooldown > 0) return;
    setSmokeCooldown(22);
    audio.playExplosion(2.0);

    // Spawn massive smoke shroud around player
    for (let i = 0; i < 28; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 90;
      particlesRef.current.push({
        id: `smoke_${Date.now()}_${i}`,
        x: player.x + Math.cos(ang) * dist,
        y: player.y + Math.sin(ang) * dist,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 4.5 + Math.random() * 2.5,
        maxLife: 7.0,
        size: 45 + Math.random() * 30,
        color: '#e2e8f0',
        type: 'smoke',
        alpha: 0.85,
      });
    }

    addRadioMessage('Commander', 'Smoke deployed! Enemy target locks severed.');
  };

  // MAIN 60 FPS GAME LOOP
  useEffect(() => {
    let animId: number;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        // Handle screen resizing
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        const width = canvas.width;
        const height = canvas.height;

        // Only update combat physics when in active battle and not paused or in menus
        if (screenRef.current === 'battle' && !isDepotOpenRef.current && !isPauseMenuOpenRef.current && !isSettingsOpenRef.current && !isCampaignVictoryOpenRef.current) {
          // Cooldown updates
          setRepairKitCooldown(prev => Math.max(0, prev - dt));
          setSmokeCooldown(prev => Math.max(0, prev - dt));
          setStats(prev => ({
            ...prev,
            timeSurvivedSeconds: isGameOver ? prev.timeSurvivedSeconds : prev.timeSurvivedSeconds + dt,
          }));

          // Recoil decay
          if (playerRecoilRef.current > 0) {
            playerRecoilRef.current = Math.max(0, playerRecoilRef.current - dt * 25);
          }

          // Reinforcement timer
          spawnTimerRef.current += dt;
          if (spawnTimerRef.current > 3.0) {
            spawnTimerRef.current = 0;
            maintainBattlefieldReinforcements();
          }

          // --- 1. PLAYER INPUT & PHYSICS ---
          const player = playerRef.current;
          if (player && !player.isDestroyed) {
            const playerDef = TANKS[player.defId];

            // Speed & acceleration modifiers from upgrades
            const engineMod = 1 + player.upgrades.engine * 0.15;
            const topSpeed = playerDef.topSpeed * engineMod;
            const accel = playerDef.acceleration * engineMod;
            const turnRate = playerDef.turnSpeed * (1 + player.upgrades.engine * 0.1);
            const turretTurnRate = playerDef.turretTurnSpeed * (1 + player.upgrades.turret * 0.25);
            const reloadRate = 1 / (playerDef.reloadTime * (1 - player.upgrades.turret * 0.08));

            // Throttle & Steer inputs (WASD)
            const keys = keysRef.current;
            let throttle = 0;
            let steer = 0;

            if (keys['KeyW'] || keys['ArrowUp']) throttle += 1;
            if (keys['KeyS'] || keys['ArrowDown']) throttle -= 0.65;
            if (keys['KeyA'] || keys['ArrowLeft']) steer -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) steer += 1;

            player.throttle = throttle;
            player.steer = steer;

            // Turn Hull
            player.hullAngle += steer * turnRate * dt;

            // Target velocity along hull vector
            const targetSpeed = throttle * (throttle > 0 ? topSpeed : playerDef.reverseSpeed);
            const targetVx = Math.sin(player.hullAngle) * targetSpeed;
            const targetVy = -Math.cos(player.hullAngle) * targetSpeed;

            // Accelerate / Friction
            player.vx += (targetVx - player.vx) * Math.min(1, accel * dt * 0.05);
            player.vy += (targetVy - player.vy) * Math.min(1, accel * dt * 0.05);

            const speed = Math.hypot(player.vx, player.vy);

            // Update Engine Sound
            audio.updateEnginePitch(speed / topSpeed, throttle);

            // Move position
            const nextX = player.x + player.vx * dt;
            const nextY = player.y + player.vy * dt;

            // Obstacle collision check for Player
            const obstacles = worldRef.current.getObstaclesInArea(
              nextX - 100,
              nextY - 100,
              nextX + 100,
              nextY + 100
            );

            let collided = false;
            for (const obs of obstacles) {
              if (obs.type === 'crater') {
                // Driving through craters slows down tank
                const d = Math.hypot(nextX - obs.x, nextY - obs.y);
                if (d < obs.radius + playerDef.width * 0.5) {
                  player.vx *= 0.7;
                  player.vy *= 0.7;
                }
                continue;
              }

              const minDist = obs.radius + playerDef.width * 0.45;
              const d = Math.hypot(nextX - obs.x, nextY - obs.y);
              if (d < minDist) {
                collided = true;
                // Push back
                const overlap = minDist - d;
                const pushAngle = Math.atan2(nextY - obs.y, nextX - obs.x);
                player.x = obs.x + Math.cos(pushAngle) * minDist;
                player.y = obs.y + Math.sin(pushAngle) * minDist;
                player.vx *= 0.2;
                player.vy *= 0.2;
                break;
              }
            }

            if (!collided) {
              player.x = nextX;
              player.y = nextY;
            }

            // Track animation & Tread marks
            const trackDistDelta = speed * dt;
            player.leftTrackDistance += trackDistDelta + steer * 12 * dt;
            player.rightTrackDistance += trackDistDelta - steer * 12 * dt;

            if (speed > 8 && Math.random() < 0.4) {
              const trackW = playerDef.width * 0.38;
              const perpX = Math.cos(player.hullAngle);
              const perpY = Math.sin(player.hullAngle);
              // Left track
              treadMarksRef.current.push({
                x1: player.x - perpX * trackW,
                y1: player.y - perpY * trackW,
                x2: player.x - perpX * trackW - Math.sin(player.hullAngle) * 5,
                y2: player.y - perpY * trackW + Math.cos(player.hullAngle) * 5,
                alpha: 0.35,
                width: 4,
                color: '#26221c',
              });
              // Right track
              treadMarksRef.current.push({
                x1: player.x + perpX * trackW,
                y1: player.y + perpY * trackW,
                x2: player.x + perpX * trackW - Math.sin(player.hullAngle) * 5,
                y2: player.y + perpY * trackW + Math.cos(player.hullAngle) * 5,
                alpha: 0.35,
                width: 4,
                color: '#26221c',
              });
            }

            // Turret aiming towards mouse cursor
            const screenCenterX = width / 2;
            const screenCenterY = height / 2;
            const mouseWorldX = player.x + (mousePosRef.current.x - screenCenterX);
            const mouseWorldY = player.y + (mousePosRef.current.y - screenCenterY);

            const desiredTurretAngle = Math.atan2(mouseWorldX - player.x, -(mouseWorldY - player.y));
            let turretDiff = desiredTurretAngle - player.turretAngle;
            while (turretDiff > Math.PI) turretDiff -= Math.PI * 2;
            while (turretDiff < -Math.PI) turretDiff += Math.PI * 2;

            const maxTurretStep = turretTurnRate * dt;
            if (Math.abs(turretDiff) < maxTurretStep) {
              player.turretAngle = desiredTurretAngle;
            } else {
              player.turretAngle += Math.sign(turretDiff) * maxTurretStep;
            }

            // Reloading
            player.reloadProgress = Math.min(1.0, player.reloadProgress + dt * reloadRate);
            player.mgCooldown = Math.max(0, player.mgCooldown - dt);

            // Machine Gun auto-fire if RMB or Shift is held
            if ((keys['ShiftLeft'] || keys['ShiftRight']) && player.mgCooldown <= 0) {
              firePlayerMachineGun();
            }

            // Camera smoothly lerps to player
            cameraRef.current.x += (player.x - cameraRef.current.x) * 0.15;
            cameraRef.current.y += (player.y - cameraRef.current.y) * 0.15;
          }

          // --- 2. UPDATE AI TANKS ---
          const allTanks = tanksRef.current;
          for (const tank of allTanks) {
            if (tank.isPlayer || tank.isDestroyed) continue;
            const def = TANKS[tank.defId];
            if (!def) continue;

            // AI Decision Making & Tactical Combat with selected difficulty
            updateTankAI(tank, allTanks, dt, spawnCannonShot, spawnMachineGunShot, settingsRef.current.difficulty);
            const defenceZone = campaignMissionRef.current?.type === 'defend_city' ? campaignMissionRef.current.objectives[0] : undefined;
            if (defenceZone && tank.team === 'enemy_faction') {
              const formationAngle = allTanks.indexOf(tank) * 2.4;
              const destinationX = defenceZone.x + Math.cos(formationAngle) * 100;
              const destinationY = defenceZone.y + Math.sin(formationAngle) * 100;
              const moveAngle = Math.atan2(destinationX - tank.x, -(destinationY - tank.y));
              const difference = Math.atan2(Math.sin(moveAngle - tank.hullAngle), Math.cos(moveAngle - tank.hullAngle));
              tank.steer = Math.abs(difference) > 0.12 ? Math.sign(difference) : 0;
              tank.throttle = Math.hypot(destinationX - tank.x, destinationY - tank.y) > 50 ? 0.75 : 0;
            }

            // AI Physics
            tank.hullAngle += tank.steer * def.turnSpeed * dt;
            const targetSpeed = tank.throttle * (tank.throttle > 0 ? def.topSpeed : def.reverseSpeed);
            const targetVx = Math.sin(tank.hullAngle) * targetSpeed;
            const targetVy = -Math.cos(tank.hullAngle) * targetSpeed;

            tank.vx += (targetVx - tank.vx) * Math.min(1, def.acceleration * dt * 0.05);
            tank.vy += (targetVy - tank.vy) * Math.min(1, def.acceleration * dt * 0.05);

            tank.x += tank.vx * dt;
            tank.y += tank.vy * dt;

            // Physical tank-to-tank separation (prevent overlap and preserve spacing)
            for (let j = 0; j < allTanks.length; j++) {
              const other = allTanks[j];
              if (other.id === tank.id || other.isDestroyed) continue;
              const tdx = tank.x - other.x;
              const tdy = tank.y - other.y;
              const td = Math.hypot(tdx, tdy);
              const otherDef = TANKS[other.defId] || def;
              const minTDist = (def.width + otherDef.width) * 0.52;
              if (td < minTDist && td > 0) {
                const push = (minTDist - td) * 0.5;
                tank.x += (tdx / td) * push;
                tank.y += (tdy / td) * push;
              }
            }

            // Turret traverse towards target angle
            let tDiff = tank.targetTurretAngle - tank.turretAngle;
            while (tDiff > Math.PI) tDiff -= Math.PI * 2;
            while (tDiff < -Math.PI) tDiff += Math.PI * 2;
            const tStep = def.turretTurnSpeed * dt;
            if (Math.abs(tDiff) < tStep) {
              tank.turretAngle = tank.targetTurretAngle;
            } else {
              tank.turretAngle += Math.sign(tDiff) * tStep;
            }

            // Track animation
            const aiSpeed = Math.hypot(tank.vx, tank.vy);
            tank.leftTrackDistance += aiSpeed * dt;
            tank.rightTrackDistance += aiSpeed * dt;

            // Reload progress
            tank.reloadProgress = Math.min(1.0, tank.reloadProgress + dt / def.reloadTime);
            tank.mgCooldown = Math.max(0, tank.mgCooldown - dt);
          }

          // --- 2.5 UPDATE CAMPAIGN OBJECTIVE CAPTURES ---
          for (const tank of allTanks) {
            const position = worldRef.current.constrainPosition(tank.x, tank.y, Math.max(TANKS[tank.defId]?.length || 90, 90));
            if (position.x !== tank.x) tank.vx = 0;
            if (position.y !== tank.y) tank.vy = 0;
            tank.x = position.x;
            tank.y = position.y;
          }
          if (settingsRef.current.campaignMode && campaignMissionRef.current) {
            const mission = campaignMissionRef.current;
            if (!mission.isCompleted && mission.objectives.length > 0) {
              const p = playerRef.current;
              if (p && !p.isDestroyed) {
                let stateUpdated = false;
                for (const obj of mission.objectives) {
                  if (obj.isCaptured) continue;
                  const dist = Math.hypot(p.x - obj.x, p.y - obj.y);
                  const isPlayerInside = dist < obj.radius;
                  const isContested = allTanks.some(
                    t => !t.isDestroyed && t.team === 'enemy_faction' && Math.hypot(t.x - obj.x, t.y - obj.y) < obj.radius
                  );

                  if (isPlayerInside && !isContested) {
                    const holdSeconds = mission.type === 'defend_city' ? (worldRef.current.campaign?.holdSeconds || 75) + campaignStageRef.current * 15 : 10;
                    obj.captureProgress = Math.min(100, obj.captureProgress + dt * 100 / holdSeconds);
                    stateUpdated = true;
                    if (obj.captureProgress >= 100) {
                      obj.isCaptured = true;
                      audio.playVictoryFanfare();
                      floatingTextsRef.current.push({
                        id: `cap_${Date.now()}`,
                        x: obj.x,
                        y: obj.y - 35,
                        text: `${obj.name.toUpperCase()} SECURED!`,
                        color: '#22c55e',
                        life: 2.2,
                        maxLife: 2.2,
                        vy: -35,
                      });
                      setRadioMessages(prev => [
                        ...prev.slice(-4),
                        {
                          id: `cap_radio_${Date.now()}`,
                          sender: 'Field HQ',
                          text: `Strategic outpost ${obj.name} secured! Outstanding defense, Commander!`,
                          time: Date.now(),
                        },
                      ]);
                    }
                  }
                }

                if (stateUpdated) {
                  setCampaignMission({ ...mission });
                }

                const allObjectivesCaptured = mission.objectives.every(o => o.isCaptured);
                const killTargetMet = mission.targetKills === 0 || mission.currentKills >= mission.targetKills;

                if (allObjectivesCaptured && killTargetMet && !mission.isCompleted) {
                  mission.isCompleted = true;
                  setCampaignMission({ ...mission });
                  audio.playVictoryFanfare();
                  setCredits(c => c + mission.rewardCredits);
                  isCampaignVictoryOpenRef.current = true;
                  setIsCampaignVictoryOpen(true);
                  setRadioMessages(prev => [
                    ...prev.slice(-4),
                    {
                      id: `vic_radio_${Date.now()}`,
                      sender: 'HQ High Command',
                      text: `VICTORY! Sector fully liberated! +${mission.rewardCredits.toLocaleString()} War Bonds awarded!`,
                      time: Date.now(),
                    },
                  ]);
                }
              }
            }
          }

          // --- 3. UPDATE SHELLS & BALLISTICS ---
          const shells = shellsRef.current;
          for (let i = shells.length - 1; i >= 0; i--) {
            const shell = shells[i];
            const prevX = shell.x;
            const prevY = shell.y;

            shell.x += shell.vx * dt;
            shell.y += shell.vy * dt;
            const stepDist = Math.hypot(shell.vx * dt, shell.vy * dt);
            shell.distanceTraveled += stepDist;

            // Despawn if exceeded range
            if (shell.distanceTraveled >= shell.maxDistance) {
              shells.splice(i, 1);
              continue;
            }

            // Shell tracer smoke
            if (!shell.isMgBullet && Math.random() < 0.5) {
              particlesRef.current.push({
                id: `trace_${Date.now()}_${Math.random()}`,
                x: shell.x,
                y: shell.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 0.15,
                maxLife: 0.2,
                size: 3,
                color: '#cbd5e1',
                type: 'smoke',
                alpha: 0.5,
              });
            }

            // Check Obstacle Collisions
            const obstacles = worldRef.current.getObstaclesInArea(
              shell.x - 40,
              shell.y - 40,
              shell.x + 40,
              shell.y + 40
            );

            let hitObstacle = false;
            for (const obs of obstacles) {
              if (obs.type === 'crater') continue; // Fly over craters
              const d = Math.hypot(shell.x - obs.x, shell.y - obs.y);
              if (d < obs.radius) {
                hitObstacle = true;
                const { destroyed } = worldRef.current.damageObstacle(obs.id, shell.damage);
                if (destroyed) {
                  // Obstacle exploded / splintered
                  audio.playExplosion(1.5);
                  for (let p = 0; p < 8; p++) {
                    particlesRef.current.push({
                      id: `obs_p_${Date.now()}_${p}`,
                      x: obs.x,
                      y: obs.y,
                      vx: (Math.random() - 0.5) * 120,
                      vy: (Math.random() - 0.5) * 120,
                      life: 0.5,
                      maxLife: 0.5,
                      size: 6,
                      color: obs.type === 'tree' ? '#4b5320' : '#78716c',
                      type: 'debris',
                      alpha: 0.8,
                    });
                  }
                }
                break;
              }
            }

            if (hitObstacle) {
              shells.splice(i, 1);
              continue;
            }

            // Check Tank Collisions
            let hitTank = false;
            for (const targetTank of allTanks) {
              if (targetTank.isDestroyed || targetTank.team === shell.team) continue;

              const def = TANKS[targetTank.defId];
              if (!def) continue;

              const hitDist = Math.hypot(shell.x - targetTank.x, shell.y - targetTank.y);
              const targetRadius = Math.max(def.width, def.length) * 0.48;

              if (hitDist <= targetRadius) {
                hitTank = true;

                // --- REALISTIC ARMOR ANGLING & RICOCHET CALCULATION ---
                // Angle between shell travel heading and target tank hull
                const impactAngle = Math.abs(shell.angle - targetTank.hullAngle) % (Math.PI / 2);
                const angleDeg = (impactAngle * 180) / Math.PI;

                const isPlayerShell = shell.ownerId === 'player' || shell.team === 'player_faction';

                // Flame streams bypass ricochets and ignite target armor
                const isGlancingBlow = !shell.isFlameStream && angleDeg > 78;
                const effectiveArmor = Math.round(def.frontArmor / Math.max(0.4, Math.cos(impactAngle)));

                if (isGlancingBlow && shell.penetration < effectiveArmor * 0.6) {
                  // --- RICOCHET / ARMOR DEFLECTION ---
                  audio.playRicochet();

                  if (isPlayerShell) {
                    setStats(prev => ({ ...prev, ricochetsGiven: prev.ricochetsGiven + 1 }));
                  } else if (targetTank.isPlayer) {
                    setStats(prev => ({ ...prev, ricochetsReceived: prev.ricochetsReceived + 1 }));
                  }

                  // Rich metallic spark shower
                  for (let s = 0; s < 10; s++) {
                    const sparkAngle = shell.angle + Math.PI + (Math.random() - 0.5) * 1.5;
                    particlesRef.current.push({
                      id: `spark_${Date.now()}_${s}`,
                      x: shell.x,
                      y: shell.y,
                      vx: Math.sin(sparkAngle) * (140 + Math.random() * 120),
                      vy: -Math.cos(sparkAngle) * (140 + Math.random() * 120),
                      life: 0.25,
                      maxLife: 0.25,
                      size: 2.5,
                      color: '#fef08a',
                      type: 'spark',
                      alpha: 1,
                    });
                  }

                  floatingTextsRef.current.push({
                    id: `txt_${Date.now()}_${Math.random()}`,
                    x: shell.x,
                    y: shell.y - 15,
                    text: 'RICOCHET!',
                    color: '#facc15',
                    life: 0.8,
                    maxLife: 0.8,
                    vy: -25,
                  });
                } else {
                  // --- PENETRATION HIT ---
                  if (shell.isFlameStream) {
                    targetTank.isBurning = true;
                    targetTank.fireTimer = Math.max(targetTank.fireTimer, 4.0);
                  } else {
                    audio.playArmorHit();
                  }

                  // Critical hit on side or rear flanks (+45% damage bonus)
                  const isFlankOrRear = Math.abs(Math.sin(shell.angle - targetTank.hullAngle)) > 0.52;
                  const critMultiplier = isFlankOrRear ? 1.45 : 1.0;
                  const rawDamage = shell.isMgBullet
                    ? Math.max(3, Math.round(shell.damage * 0.45))
                    : shell.damage;
                  const finalDamage = Math.round(rawDamage * critMultiplier);

                  targetTank.hp -= finalDamage;

                  if (isPlayerShell) {
                    setStats(prev => ({
                      ...prev,
                      damageDealt: prev.damageDealt + finalDamage,
                      shotsHit: prev.shotsHit + 1,
                    }));
                  }

                  // Spawn hit debris & flame
                  for (let d = 0; d < 6; d++) {
                    particlesRef.current.push({
                      id: `deb_${Date.now()}_${d}`,
                      x: shell.x,
                      y: shell.y,
                      vx: (Math.random() - 0.5) * 90,
                      vy: (Math.random() - 0.5) * 90,
                      life: 0.4,
                      maxLife: 0.4,
                      size: shell.isFlameStream ? 9 : 4,
                      color: shell.isFlameStream ? '#f97316' : '#ef4444',
                      type: shell.isFlameStream ? 'fire' : 'debris',
                      alpha: 0.9,
                    });
                  }

                  floatingTextsRef.current.push({
                    id: `dmg_${Date.now()}_${Math.random()}`,
                    x: shell.x,
                    y: shell.y - 15,
                    text: shell.isFlameStream
                      ? `🔥 -${finalDamage}`
                      : isFlankOrRear && !shell.isMgBullet
                      ? `CRITICAL! -${finalDamage}`
                      : `-${finalDamage}`,
                    color: shell.isFlameStream ? '#f97316' : isFlankOrRear ? '#f59e0b' : isPlayerShell ? '#ef4444' : '#f87171',
                    life: 0.85,
                    maxLife: 0.85,
                    vy: -32,
                  });

                  // --- TANK DESTROYED CHECK ---
                  if (targetTank.hp <= 0 && !targetTank.isDestroyed) {
                    targetTank.isDestroyed = true;
                    audio.playExplosion();

                    // Track Campaign Kills if active
                    if (settingsRef.current.campaignMode && campaignMissionRef.current && targetTank.team === 'enemy_faction') {
                      campaignMissionRef.current.currentKills++;
                      setCampaignMission({ ...campaignMissionRef.current });

                      const mission = campaignMissionRef.current;
                      const allObjsSecured = mission.objectives.length === 0 || mission.objectives.every(o => o.isCaptured);
                      if (
                        (mission.type === 'kill_tanks' || mission.type === 'combined_offensive') &&
                        mission.currentKills >= mission.targetKills &&
                        allObjsSecured &&
                        !mission.isCompleted
                      ) {
                        mission.isCompleted = true;
                        setCampaignMission({ ...mission });
                        audio.playVictoryFanfare();
                        setCredits(c => c + mission.rewardCredits);
                        isCampaignVictoryOpenRef.current = true;
                        setIsCampaignVictoryOpen(true);
                        setRadioMessages(prev => [
                          ...prev.slice(-4),
                          {
                            id: `vic_radio_kill_${Date.now()}`,
                            sender: 'HQ High Command',
                            text: `VICTORY! Enemy armored force destroyed! +${mission.rewardCredits.toLocaleString()} War Bonds awarded!`,
                            time: Date.now(),
                          },
                        ]);
                      }
                    }

                    // Massive explosion effects & shockwave
                    particlesRef.current.push({
                      id: `shock_${Date.now()}`,
                      x: targetTank.x,
                      y: targetTank.y,
                      vx: 0,
                      vy: 0,
                      life: 0.35,
                      maxLife: 0.35,
                      size: 55,
                      color: '#ffffff',
                      type: 'shockwave',
                      alpha: 0.8,
                    });

                    for (let f = 0; f < 18; f++) {
                      particlesRef.current.push({
                        id: `exp_fire_${Date.now()}_${f}`,
                        x: targetTank.x + (Math.random() - 0.5) * 20,
                        y: targetTank.y + (Math.random() - 0.5) * 20,
                        vx: (Math.random() - 0.5) * 160,
                        vy: (Math.random() - 0.5) * 160,
                        life: 0.7 + Math.random() * 0.5,
                        maxLife: 1.2,
                        size: 14 + Math.random() * 16,
                        color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
                        type: 'fire',
                        alpha: 0.9,
                      });
                    }

                    // Score & Currency Rewards: STRONGER TANKS GIVE MASSIVELY MORE CURRENCY!
                    const TIER_REWARDS: Record<number, number> = {
                      1: 250,
                      2: 550,
                      3: 1100,
                      4: 2000,
                      5: 3500,
                      6: 5800,  // e.g. Tiger I, IS-2, Pershing, Churchill
                      7: 9200,  // e.g. King Tiger, T29, IS-3, Comet
                      8: 14500, // e.g. Jagdtiger, T95, IS-7, Centurion
                      9: 25000, // e.g. Maus, Object 279, T30, Tortoise
                      10: 50000, // Wonder-weapons yield huge bounties!
                    };

                    const earnedCredits = TIER_REWARDS[def.tier] || Math.round(def.tier * 2200);
                    const earnedScore = Math.round(def.tier * def.tier * 260 + 200);

                    if (isPlayerShell) {
                      setCredits(c => c + earnedCredits);
                      setStats(prev => ({
                        ...prev,
                        score: prev.score + earnedScore,
                        tanksDestroyed: prev.tanksDestroyed + 1,
                        highestTierDestroyed: Math.max(prev.highestTierDestroyed, def.tier),
                      }));

                      audio.playCashEarned();

                      floatingTextsRef.current.push({
                        id: `reward_${Date.now()}`,
                        x: targetTank.x,
                        y: targetTank.y - 35,
                        text: `+${earnedCredits.toLocaleString()} CR! (${def.name})`,
                        color: '#fbbf24',
                        life: 1.6,
                        maxLife: 1.6,
                        vy: -42,
                      });

                      addRadioMessage('Observer', `Hostile ${def.name} eliminated! +${earnedCredits.toLocaleString()} War Bonds.`);
                    } else if (targetTank.team === 'enemy_faction') {
                      // Allied kill assist
                      const assistCredits = Math.round(earnedCredits * 0.4);
                      setCredits(c => c + assistCredits);
                      floatingTextsRef.current.push({
                        id: `assist_${Date.now()}`,
                        x: targetTank.x,
                        y: targetTank.y - 30,
                        text: `+${assistCredits.toLocaleString()} CR (ASSIST: ${def.name})`,
                        color: '#38bdf8',
                        life: 1.3,
                        maxLife: 1.3,
                        vy: -35,
                      });
                    }

                    // Player Death Check
                    if (targetTank.isPlayer) {
                      audio.stopEngine();
                      setTimeout(() => {
                        setIsGameOver(true);
                      }, 1200);
                    }
                  }
                }

                break;
              }
            }

            if (hitTank) {
              shells.splice(i, 1);
            }
          }

          // --- 4. UPDATE PARTICLES ---
          const particles = particlesRef.current;
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
              particles.splice(i, 1);
            }
          }

          // --- 5. UPDATE TREAD MARKS & FLOATING TEXTS ---
          if (treadMarksRef.current.length > 350) {
            treadMarksRef.current.splice(0, 50);
          }

          const texts = floatingTextsRef.current;
          for (let i = texts.length - 1; i >= 0; i--) {
            const t = texts[i];
            t.y += t.vy * dt;
            t.life -= dt;
            if (t.life <= 0) {
              texts.splice(i, 1);
            }
          }
        } // End of !isDepotOpen

        // ==========================================
        // CANVAS RENDERING PASS
        // ==========================================
        ctx.clearRect(0, 0, width, height);

        const camX = cameraRef.current.x;
        const camY = cameraRef.current.y;
        const offsetX = width / 2 - camX;
        const offsetY = height / 2 - camY;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        // 1. Terrain Base (Endless mud / warzone dirt)
        const terrain = worldRef.current.campaign?.terrain;
        ctx.fillStyle = terrain === 'city' ? '#252a2d' : terrain === 'forest' ? '#1b291d' : '#1c1f19';
        ctx.fillRect(camX - width / 2 - 50, camY - height / 2 - 50, width + 100, height + 100);

        // Subtle infinite ground grid / dirt patches
        const gridStep = 80;
        const startGridX = Math.floor((camX - width / 2) / gridStep) * gridStep;
        const endGridX = Math.ceil((camX + width / 2) / gridStep) * gridStep;
        const startGridY = Math.floor((camY - height / 2) / gridStep) * gridStep;
        const endGridY = Math.ceil((camY + height / 2) / gridStep) * gridStep;

        ctx.strokeStyle = 'rgba(45, 52, 40, 0.4)';
        ctx.lineWidth = 1;
        for (let gx = startGridX; gx <= endGridX; gx += gridStep) {
          ctx.beginPath();
          ctx.moveTo(gx, camY - height / 2);
          ctx.lineTo(gx, camY + height / 2);
          ctx.stroke();
        }
        for (let gy = startGridY; gy <= endGridY; gy += gridStep) {
          ctx.beginPath();
          ctx.moveTo(camX - width / 2, gy);
          ctx.lineTo(camX + width / 2, gy);
          ctx.stroke();
        }

        // 2. Persistent Tread Marks
        const campaign = worldRef.current.campaign;
        if (campaign) {
          const halfSize = campaign.mapSize / 2;
          if (campaign.terrain === 'city') {
            ctx.strokeStyle = '#343a3e';
            ctx.lineWidth = 26;
            for (let street = -halfSize; street <= halfSize; street += 125) {
              ctx.beginPath();
              ctx.moveTo(street, -halfSize);
              ctx.lineTo(street, halfSize);
              ctx.moveTo(-halfSize, street);
              ctx.lineTo(halfSize, street);
              ctx.stroke();
            }
          }
          ctx.strokeStyle = '#b8995b';
          ctx.lineWidth = 5;
          ctx.setLineDash([24, 12]);
          ctx.strokeRect(-halfSize, -halfSize, campaign.mapSize, campaign.mapSize);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(9, 14, 18, 0.8)';
          ctx.fillRect(-halfSize - width * 2, -halfSize - height * 2, campaign.mapSize + width * 4, height * 2);
          ctx.fillRect(-halfSize - width * 2, halfSize, campaign.mapSize + width * 4, height * 2);
          ctx.fillRect(-halfSize - width * 2, -halfSize, width * 2, campaign.mapSize);
          ctx.fillRect(halfSize, -halfSize, width * 2, campaign.mapSize);
        }
        for (const tm of treadMarksRef.current) {
          ctx.strokeStyle = `rgba(30, 27, 22, ${tm.alpha})`;
          ctx.lineWidth = tm.width;
          ctx.beginPath();
          ctx.moveTo(tm.x1, tm.y1);
          ctx.lineTo(tm.x2, tm.y2);
          ctx.stroke();
        }

        // 2.5 Active Campaign Objectives (Strategic Capture Zones & Flagpoles)
        if (settingsRef.current.campaignMode && campaignMissionRef.current) {
          for (const obj of campaignMissionRef.current.objectives) {
            const isCaptured = obj.isCaptured;
            const zoneColor = isCaptured ? 'rgba(34, 197, 94, ' : 'rgba(56, 189, 248, ';

            // Outer perimeter boundary
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fillStyle = zoneColor + '0.12)';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = zoneColor + '0.6)';
            ctx.setLineDash([12, 8]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Circular capture progress gauge
            if (!isCaptured && obj.captureProgress > 0) {
              ctx.beginPath();
              const startAng = -Math.PI / 2;
              const endAng = startAng + (obj.captureProgress / 100) * (Math.PI * 2);
              ctx.arc(obj.x, obj.y, obj.radius - 8, startAng, endAng);
              ctx.lineWidth = 6;
              ctx.strokeStyle = '#22c55e';
              ctx.stroke();
            }

            // Sandbag fortification ring around objective
            for (let b = 0; b < 10; b++) {
              const bAng = (b / 10) * Math.PI * 2;
              const bx = obj.x + Math.cos(bAng) * (obj.radius - 12);
              const by = obj.y + Math.sin(bAng) * (obj.radius - 12);
              ctx.fillStyle = '#6b5d43';
              ctx.beginPath();
              ctx.arc(bx, by, 7, 0, Math.PI * 2);
              ctx.fill();
            }

            // Central Concrete Bunker & Flagpole
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Flagpole
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(obj.x, obj.y - 42);
            ctx.stroke();

            // Flag banner
            ctx.fillStyle = isCaptured ? '#22c55e' : '#ef4444';
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y - 42);
            ctx.lineTo(obj.x + 26, obj.y - 34);
            ctx.lineTo(obj.x, obj.y - 26);
            ctx.closePath();
            ctx.fill();

            // Text Label
            ctx.font = 'bold 13px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(obj.name, obj.x, obj.y + 40);

            // Progress text
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = isCaptured ? '#4ade80' : '#38bdf8';
            ctx.fillText(
              isCaptured ? 'SECURED [100%]' : `${campaignMissionRef.current.type === 'defend_city' ? 'HOLDING' : 'CAPTURING'} [${Math.round(obj.captureProgress)}%]`,
              obj.x,
              obj.y + 54
            );
          }
        }

        // 3. Battlefield Obstacles (Craters, Hedgehogs, Trees, Bunkers, Wrecks)
        const visibleObstacles = worldRef.current.getObstaclesInArea(
          camX - width / 2 - 100,
          camY - height / 2 - 100,
          camX + width / 2 + 100,
          camY + height / 2 + 100
        );

        for (const obs of visibleObstacles) {
          if (obs.type === 'crater') {
            // Mud shell crater
            ctx.fillStyle = '#14120e';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#27231c';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (obs.type === 'tree') {
            // Pine tree (green canopy with trunk shadow)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.arc(obs.x + 4, obs.y + 4, obs.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2d4023';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a532d';
            ctx.beginPath();
            ctx.arc(obs.x - 2, obs.y - 2, obs.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
          } else if (obs.type === 'hedgehog') {
            // Czech steel anti-tank hedgehog
            ctx.strokeStyle = '#383838';
            ctx.lineWidth = 4;
            const r = obs.radius;
            ctx.beginPath();
            ctx.moveTo(obs.x - r, obs.y - r);
            ctx.lineTo(obs.x + r, obs.y + r);
            ctx.moveTo(obs.x + r, obs.y - r);
            ctx.lineTo(obs.x - r, obs.y + r);
            ctx.moveTo(obs.x, obs.y - r * 1.1);
            ctx.lineTo(obs.x, obs.y + r * 1.1);
            ctx.stroke();
          } else if (obs.type === 'bunker') {
            // Sandbag defensive bunker
            ctx.fillStyle = '#5c5443';
            ctx.strokeStyle = '#3b3528';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(obs.x - obs.radius, obs.y - obs.radius * 0.7, obs.radius * 2, obs.radius * 1.4, 6);
            ctx.fill();
            ctx.stroke();
            // Machine gun slit
            ctx.fillStyle = '#111111';
            ctx.fillRect(obs.x - 10, obs.y - 4, 20, 4);
          } else if (obs.type === 'ruins') {
            // Brick & stone village ruins
            const r = obs.radius;
            ctx.fillStyle = '#4a3f35';
            ctx.strokeStyle = '#2d251e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.rect(obs.x - r, obs.y - r * 0.75, r * 2, r * 1.5);
            ctx.fill();
            ctx.stroke();
            // Broken brickwork rubble chunks
            ctx.fillStyle = '#6b4f3b';
            ctx.fillRect(obs.x - r * 0.8, obs.y - r * 0.5, r * 0.6, 5);
            ctx.fillRect(obs.x + r * 0.1, obs.y + r * 0.2, r * 0.7, 5);
            ctx.fillStyle = '#261e17';
            ctx.fillRect(obs.x - r * 0.2, obs.y - r * 0.75, r * 0.4, 4);
          } else if (obs.type === 'pillbox') {
            // Hexagonal reinforced concrete bunker
            const r = obs.radius;
            ctx.fillStyle = '#4d5259';
            ctx.strokeStyle = '#272b30';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
              const angle = (a / 6) * Math.PI * 2;
              const px = obs.x + Math.cos(angle) * r;
              const py = obs.y + Math.sin(angle) * r;
              if (a === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Concrete roof ring & gun slits
            ctx.fillStyle = '#3a3f45';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111315';
            ctx.fillRect(obs.x - r * 0.5, obs.y - 3, r, 6);
          } else if (obs.type === 'dragon_teeth') {
            // Anti-tank pyramidal concrete teeth
            const r = obs.radius;
            // Draw cluster of 3 teeth
            const offsets = [
              { dx: -r * 0.4, dy: -r * 0.3 },
              { dx: r * 0.4, dy: -r * 0.3 },
              { dx: 0, dy: r * 0.35 },
            ];
            for (const off of offsets) {
              const tx = obs.x + off.dx;
              const ty = obs.y + off.dy;
              const tr = r * 0.5;
              ctx.fillStyle = '#61666d';
              ctx.strokeStyle = '#32363b';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(tx, ty - tr);
              ctx.lineTo(tx + tr, ty + tr);
              ctx.lineTo(tx - tr, ty + tr);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              // Highlight facet
              ctx.fillStyle = '#838a94';
              ctx.beginPath();
              ctx.moveTo(tx, ty - tr);
              ctx.lineTo(tx - tr, ty + tr);
              ctx.lineTo(tx, ty + tr * 0.4);
              ctx.closePath();
              ctx.fill();
            }
          } else if (obs.type === 'rock') {
            // Granite boulder cover
            const r = obs.radius;
            ctx.fillStyle = '#3f4247';
            ctx.strokeStyle = '#222426';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y, r * 1.1, r * 0.85, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#555960';
            ctx.beginPath();
            ctx.ellipse(obs.x - 3, obs.y - 3, r * 0.6, r * 0.45, 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (obs.type === 'wreck') {
            // Burned out tank carcass
            ctx.fillStyle = '#1c1c1c';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.fillRect(obs.x - 18, obs.y - 25, 36, 50);
            ctx.strokeRect(obs.x - 18, obs.y - 25, 36, 50);
            // Smoke puff from wreck
            ctx.fillStyle = 'rgba(70, 70, 70, 0.4)';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y - 10, 12, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 4. Draw All Tanks
        const allTanks = tanksRef.current;
        for (const tank of allTanks) {
          renderTank(ctx, tank, {
            showHealthBar: !tank.isPlayer,
            showName: !tank.isPlayer,
            recoilOffset: tank.isPlayer ? playerRecoilRef.current : 0,
          });
        }

        // 5. Draw Shells & Tracers
        for (const shell of shellsRef.current) {
          ctx.save();
          ctx.translate(shell.x, shell.y);
          ctx.rotate(shell.angle);

          if (shell.isFlameStream) {
            // Incendiary flame projectile
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.beginPath();
            ctx.arc(0, 4, 12, 0, Math.PI * 2);
            ctx.fill();
          } else if (shell.isMgBullet) {
            ctx.fillStyle = shell.tracerColor;
            ctx.fillRect(-1.5, -6, 3, 12);
          } else {
            // Main AP Shell with glowing tracer head
            ctx.fillStyle = shell.tracerColor;
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.max(2, shell.caliber * 0.04), 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tracer trail glow
            ctx.fillStyle = 'rgba(253, 224, 71, 0.6)';
            ctx.fillRect(-2, 3, 4, 14);
          }
          ctx.restore();
        }

        // 6. Draw Particles (Smoke, Sparks, Fire, Explosions)
        for (const p of particlesRef.current) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;

          if (p.type === 'shockwave') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.alpha), 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // 7. Draw Floating Combat Text
        for (const ft of floatingTextsRef.current) {
          ctx.save();
          ctx.font = '700 13px "Chakra Petch", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = ft.color;
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }

        // 8. Player Aiming Reticle (in World Space)
        const player = playerRef.current;
        if (player && !player.isDestroyed) {
          const mouseWorldX = player.x + (mousePosRef.current.x - width / 2);
          const mouseWorldY = player.y + (mousePosRef.current.y - height / 2);

          // Aiming Crosshairs
          ctx.strokeStyle = player.reloadProgress >= 1.0 ? '#38bdf8' : '#f59e0b';
          ctx.lineWidth = 1.5;
          const reticleSize = 14;

          ctx.beginPath();
          ctx.arc(mouseWorldX, mouseWorldY, reticleSize, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mouseWorldX - reticleSize - 5, mouseWorldY);
          ctx.lineTo(mouseWorldX - 4, mouseWorldY);
          ctx.moveTo(mouseWorldX + 4, mouseWorldY);
          ctx.lineTo(mouseWorldX + reticleSize + 5, mouseWorldY);

          ctx.moveTo(mouseWorldX, mouseWorldY - reticleSize - 5);
          ctx.lineTo(mouseWorldX, mouseWorldY - 4);
          ctx.moveTo(mouseWorldX, mouseWorldY + 4);
          ctx.lineTo(mouseWorldX, mouseWorldY + reticleSize + 5);
          ctx.stroke();

          // Gun trajectory guide line
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(mouseWorldX, mouseWorldY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore(); // Restore world offset
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    isDepotOpen,
    isGameOver,
    maintainBattlefieldReinforcements,
    addRadioMessage,
  ]);

  // Unlock Tank in Tech Tree
  const handleUnlockTank = (tankId: string, cost: number) => {
    const economy = economyRef.current;
    if (progression.ready && cost === TANKS[tankId]?.cost && economy.credits >= cost && !economy.unlockedTankIds.includes(tankId) && canUnlockTank(tankId, economy.unlockedTankIds, economy.blueprintIds)) {
      economy.credits -= cost;
      economy.unlockedTankIds = [...economy.unlockedTankIds, tankId];
      setCredits(c => c - cost);
      setUnlockedTankIds(prev => [...prev, tankId]);
    }
  };

  const handleBuyBlueprint = (tankId: string) => {
    const cost = TANKS[tankId]?.blueprintCost;
    const economy = economyRef.current;
    if (!progression.ready || !cost || economy.blueprintIds.includes(tankId) || economy.credits < cost) return;
    economy.credits -= cost;
    economy.blueprintIds = [...economy.blueprintIds, tankId];
    setCredits(previous => previous - cost);
    setBlueprintIds(previous => [...previous, tankId]);
    audio.playCashEarned();
  };

  // Equip Tank (Permitted ONLY from Home Menu, locked mid-game)
  const handleEquipTank = (tankId: string) => {
    if (depotReturnTo !== 'home' || !unlockedTankIds.includes(tankId)) return;
    setCurrentTankId(tankId);
    if (playerRef.current) {
      const p = playerRef.current;
      const newDef = TANKS[tankId];
      if (newDef) {
        p.defId = tankId;
        p.nation = newDef.nation;
        const tankUpgrades = upgrades[tankId] || { gun: 0, armor: 0, engine: 0, turret: 0 };
        p.upgrades = tankUpgrades;
        p.maxHp = Math.round(newDef.maxHp * (1 + tankUpgrades.armor * 0.2));
        p.hp = p.maxHp;
        p.reloadProgress = 1.0;
        addRadioMessage('HQ Command', `Tank equipped: ${newDef.name}`);
      }
    }
  };

  // Purchase Component Upgrade
  const handlePurchaseUpgrade = (
    tankId: string,
    upgradeType: keyof TankUpgradeLevels,
    cost: number
  ) => {
    if (credits >= cost) {
      setCredits(c => c - cost);
      setUpgrades(prev => {
        const currentLvl = prev[tankId]?.[upgradeType] || 0;
        return {
          ...prev,
          [tankId]: {
            ...(prev[tankId] || { gun: 0, armor: 0, engine: 0, turret: 0 }),
            [upgradeType]: currentLvl + 1,
          },
        };
      });

      // Update active player entity if upgrading currently equipped tank
      if (playerRef.current && playerRef.current.defId === tankId) {
        const p = playerRef.current;
        p.upgrades[upgradeType] += 1;
        if (upgradeType === 'armor') {
          const newDef = TANKS[tankId];
          p.maxHp = Math.round(newDef.maxHp * (1 + p.upgrades.armor * 0.2));
          p.hp = p.maxHp;
        }
      }
    }
  };

  // Start Battle from Home Screen
  const handleDeployToBattle = () => {
    setIsPauseMenuOpen(false);
    setIsDepotOpen(false);
    setIsGameOver(false);
    setIsSettingsOpen(false);
    setIsCampaignVictoryOpen(false);
    isPauseMenuOpenRef.current = false;
    isDepotOpenRef.current = false;
    isSettingsOpenRef.current = false;
    keysRef.current = {};
    initGame(currentTankId, true);
    lastTimeRef.current = performance.now();
    screenRef.current = 'battle';
    setScreen('battle');
  };

  // Quit to Home Screen
  const handleQuitToHome = () => {
    audio.stopEngine();
    setIsPauseMenuOpen(false);
    setIsDepotOpen(false);
    setIsGameOver(false);
    setIsSettingsOpen(false);
    setIsCampaignVictoryOpen(false);
    isPauseMenuOpenRef.current = false;
    isDepotOpenRef.current = false;
    isSettingsOpenRef.current = false;
    keysRef.current = {};
    screenRef.current = 'home';
    setScreen('home');
  };

  // Restart / Redeploy in Battle
  const handleRestart = () => {
    setIsGameOver(false);
    setIsPauseMenuOpen(false);
    setIsSettingsOpen(false);
    setIsCampaignVictoryOpen(false);
    isPauseMenuOpenRef.current = false;
    isDepotOpenRef.current = false;
    isSettingsOpenRef.current = false;
    keysRef.current = {};
    lastTimeRef.current = performance.now();
    screenRef.current = 'battle';
    initGame(currentTankId, true);
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      settingsRef.current = updated;
      localStorage.setItem('ww2_tank_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const player = playerRef.current;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      
      {/* 60 FPS HTML5 Canvas — Persistent in DOM so canvasRef & context are ready immediately */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full block ${screen === 'battle' ? 'cursor-crosshair' : 'pointer-events-none'}`}
        style={{ display: screen === 'battle' ? 'block' : 'none' }}
      />

      {/* 1. HOME SCREEN */}
      {!progression.ready && <div className="fixed inset-0 z-[70] bg-[#101720]/95 flex items-center justify-center p-6 text-neutral-200 font-mono"><div className="max-w-md space-y-4"><h2 className="text-xl font-bold text-amber-400">DEPOT CONNECTION</h2><p role="status">{progression.error || progression.status}</p>{progression.error && <button onClick={() => void progression.retry()} className="px-4 py-2 bg-amber-500 rounded text-neutral-950 font-bold">Retry Connection</button>}</div></div>}
      {progression.ready && <div className={`fixed bottom-2 right-3 z-[60] text-[10px] font-mono px-3 py-1.5 rounded border max-w-sm ${progression.error ? 'bg-red-950 border-red-800 text-red-200' : 'bg-[#111720]/90 border-[#2d3947] text-neutral-400'}`} role="status">{progression.error || progression.status}{progression.error && <button onClick={() => void progression.retry()} className="ml-3 underline text-amber-300">Retry Save</button>}</div>}
      {screen === 'home' && (
        <HomeScreen
          currentTankId={currentTankId}
          credits={credits}
          stats={stats}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onStartGame={() => {
            settingsRef.current = { ...settingsRef.current, campaignMode: false };
            setSettings(settingsRef.current);
            campaignStageRef.current = 0;
            handleDeployToBattle();
          }}
          onOpenDepot={() => {
            setDepotReturnTo('home');
            setIsDepotOpen(true);
          }}
          onSelectTank={tankId => {
            if (unlockedTankIds.includes(tankId)) setCurrentTankId(tankId);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCampaigns={() => setIsCampaignsOpen(true)}
        />
      )}

      {/* 2. BATTLE SCREEN OVERLAYS */}
      {screen === 'battle' && (
        <>
          {/* Military Combat HUD */}
          {player && (
            <HUD
              player={player}
              stats={stats}
              allTanks={tanksRef.current}
              radioMessages={radioMessages}
              campaignMission={campaignMission}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onOpenDepot={() => {
                setDepotReturnTo('battle');
                setIsDepotOpen(true);
              }}
              onRepairKit={handleUseRepairKit}
              onSmokeScreen={handleUseSmokeScreen}
              repairKitCooldown={repairKitCooldown}
              smokeCooldown={smokeCooldown}
            />
          )}

          {/* Tactical Pause Menu */}
          <PauseMenu
            isOpen={isPauseMenuOpen}
            onResume={() => setIsPauseMenuOpen(false)}
            onOpenDepot={() => {
              setIsPauseMenuOpen(false);
              setDepotReturnTo('battle');
              setIsDepotOpen(true);
            }}
            onRestart={handleRestart}
            onQuitToHome={handleQuitToHome}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* Game Over / Debriefing Modal */}
          <GameOverModal
            isOpen={isGameOver}
            stats={stats}
            tankId={currentTankId}
            onRestart={handleRestart}
            onOpenDepot={() => {
              setIsGameOver(false);
              setDepotReturnTo('battle');
              setIsDepotOpen(true);
            }}
            onQuitToHome={handleQuitToHome}
          />
        </>
      )}

      {/* 3. TECH TREE & ARMORY DEPOT MODAL (Accessible from both Home and Battle) */}
      <TechTreeModal
        isOpen={isDepotOpen}
        onClose={() => setIsDepotOpen(false)}
        credits={credits}
        currentTankId={currentTankId}
        unlockedTankIds={unlockedTankIds}
        upgrades={upgrades}
        blueprintIds={blueprintIds}
        onBuyBlueprint={handleBuyBlueprint}
        onUnlockTank={handleUnlockTank}
        onEquipTank={handleEquipTank}
        onPurchaseUpgrade={handlePurchaseUpgrade}
        returnTo={depotReturnTo}
        experimentalEnabled={settings.experimentalVehicles}
      />

      {/* 4. SETTINGS & DIFFICULTY MODAL */}
      {isCampaignsOpen && <CampaignsModal selectedId={selectedCampaignId} onClose={() => setIsCampaignsOpen(false)} onDeploy={id => {
        selectedCampaignRef.current = id;
        setSelectedCampaignId(id);
        campaignStageRef.current = 0;
        settingsRef.current = { ...settingsRef.current, campaignMode: true };
        setSettings(settingsRef.current);
        setIsCampaignsOpen(false);
        handleDeployToBattle();
      }} />}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* 5. CAMPAIGN VICTORY & REWARD MODAL */}
      <CampaignVictoryModal
        isOpen={isCampaignVictoryOpen}
        mission={campaignMission}
        isFinalMission={campaignStageRef.current >= 2}
        onNextMission={() => {
          setIsCampaignVictoryOpen(false);
          if (campaignStageRef.current >= 2) {
            handleQuitToHome();
            setIsCampaignsOpen(true);
          } else {
            campaignStageRef.current += 1;
            handleRestart();
          }
        }}
        onContinueSkirmish={() => {
          setIsCampaignVictoryOpen(false);
        }}
        onOpenDepot={() => {
          setIsCampaignVictoryOpen(false);
          setDepotReturnTo('battle');
          setIsDepotOpen(true);
        }}
      />

    </div>
  );
}
