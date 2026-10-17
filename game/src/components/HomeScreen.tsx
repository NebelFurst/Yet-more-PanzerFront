import React, { useRef, useEffect } from 'react';
import { TankDefinition, PlayerStats, NationId } from '../types/game';
import { TANKS, NATIONS, TECH_TREE_ORDER } from '../data/tanks';
import { renderTank } from '../utils/renderTanks';
import { audio } from '../utils/audio';
import {
  Play,
  ShoppingBag,
  Award,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Shield,
  Crosshair,
  Gauge,
  HelpCircle,
  Settings,
} from 'lucide-react';

interface HomeScreenProps {
  currentTankId: string;
  credits: number;
  stats: PlayerStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onStartGame: () => void;
  onOpenDepot: () => void;
  onSelectTank: (tankId: string) => void;
  onOpenSettings: () => void;
  onOpenCampaigns: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentTankId,
  credits,
  stats,
  isMuted,
  onToggleMute,
  onStartGame,
  onOpenDepot,
  onSelectTank,
  onOpenSettings,
  onOpenCampaigns,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const def: TankDefinition = TANKS[currentTankId] || TANKS['ger_pz1'];
  const nationInfo = NATIONS.find(n => n.id === def.nation)!;
  const [showControls, setShowControls] = React.useState<boolean>(false);

  // Live Canvas 360 Turret Inspection on Home Screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let rotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Blueprint tactical grid
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Smooth idle turret rotation
      rotation += 0.01;
      const turretAngle = Math.sin(rotation) * 0.45;

      const mockTank = {
        id: 'home_preview',
        defId: currentTankId,
        nation: def.nation,
        team: 'player_faction' as const,
        isPlayer: true,
        x: canvas.width / 2,
        y: canvas.height / 2 + 10,
        vx: 0,
        vy: 0,
        hullAngle: 0,
        turretAngle,
        targetTurretAngle: turretAngle,
        hp: 100,
        maxHp: 100,
        effectiveArmor: 100,
        isDestroyed: false,
        isBurning: false,
        fireTimer: 0,
        reloadProgress: 1,
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
        upgrades: { gun: 0, armor: 0, engine: 0, turret: 0 },
        kills: 0,
        damageDealt: 0,
      };

      renderTank(ctx, mockTank, { showHealthBar: false, showName: false });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [currentTankId, def]);

  return (
    <div className="relative w-screen h-screen overflow-y-auto bg-[#090c10] text-[#e2e8f0] font-['Chakra_Petch',sans-serif] flex flex-col justify-between gap-5 p-4 md:p-8 select-none">
      
      {/* BACKGROUND ATMOSPHERIC ELEMENTS */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/40 via-neutral-900/60 to-black" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

      {/* TOP HEADER BAR */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center font-bold font-mono text-amber-400 text-lg shadow-lg shadow-amber-950/40">
            ⚔
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white flex items-center gap-2 drop-shadow-md">
              PANZERFRONT
              <span className="text-xs px-2 py-0.5 rounded bg-red-950/80 text-red-400 font-mono border border-red-800/60">
                ENDLESS WAR
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              WWII Top-Down Realistic Armored Combat Simulation
            </p>
          </div>
        </div>

        {/* Currency & Audio Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#141b24] border border-amber-500/40 rounded-xl shadow-lg">
            <Award className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <div className="text-[9px] uppercase tracking-widest text-amber-300 font-bold">War Bonds / Credits</div>
              <div className="text-lg font-bold font-mono text-amber-400">{credits.toLocaleString()} CR</div>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playRadioBeep();
              onOpenSettings();
            }}
            className="p-2.5 bg-[#141b24] border border-[#2d3a4c] hover:bg-neutral-800 text-amber-400 hover:text-amber-300 rounded-xl shadow-md transition-colors flex items-center gap-1.5 font-bold text-xs"
            title="Difficulty & Experimental Super-Weapons"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={() => {
              audio.playRadioBeep();
              onToggleMute();
            }}
            className="p-2.5 bg-[#141b24] border border-[#2d3a4c] hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl shadow-md transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setShowControls(prev => !prev)}
            className="p-2.5 bg-[#141b24] border border-[#2d3a4c] hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl shadow-md transition-colors"
            title="Controls & Instructions"
          >
            <HelpCircle className="w-5 h-5 text-sky-400" />
          </button>
        </div>
      </div>

      {/* CENTER MAIN SECTION: TANK SHOWCASE & PLAY BUTTON */}
      <nav className="relative z-10 flex gap-2 border-b border-[#2d3947] pb-2" aria-label="Command center">
        <span className="px-4 py-2 text-sm uppercase font-bold text-amber-400 border-b-2 border-amber-500">Hangar</span>
        <button onClick={onOpenCampaigns} className="px-4 py-2 text-sm uppercase font-bold text-neutral-300 hover:text-amber-400 flex items-center gap-2"><Target className="w-4 h-4" /> Campaigns</button>
        <button onClick={onOpenDepot} className="px-4 py-2 text-sm uppercase font-bold text-neutral-300 hover:text-amber-400">Depot</button>
      </nav>
      <div className="relative z-10 my-auto flex flex-col lg:flex-row items-center justify-center gap-8 max-w-6xl mx-auto w-full">
        
        {/* LEFT: INSPECTED TANK SHOWCASE CARD */}
        <div className="w-full lg:w-7/12 bg-[#121720]/95 border-2 border-[#2c3d52] rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{nationInfo.flag}</span>
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400">
                  {nationInfo.armyName} • TIER {def.tier}
                </div>
                <h2 className="text-2xl font-bold uppercase text-white tracking-wide">
                  {def.name}
                </h2>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-md bg-[#1f2937] text-neutral-300 font-mono border border-neutral-700">
              {def.historicalName} ({def.yearIntroduced})
            </span>
          </div>

          {/* Interactive Live Canvas Simulation */}
          <div className="relative h-56 rounded-xl overflow-hidden border border-[#263547] bg-[#0b0e14] flex items-center justify-center shadow-inner">
            <canvas
              ref={canvasRef}
              width={420}
              height={220}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-2 left-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              Live Turret Simulation Preview
            </div>
            <div className="absolute top-2 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-amber-400 border border-amber-500/20">
              Role: {def.role.toUpperCase()}
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#2b3a4c]">
              <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-red-400" /> CANNON / DMG
              </div>
              <div className="text-white font-bold text-sm mt-0.5">
                {def.gunCaliber}mm ({def.damage} DMG)
              </div>
              <div className="text-[10px] text-neutral-400">Penetration: {def.penetration}mm</div>
            </div>

            <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#2b3a4c]">
              <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> ARMOR & HP
              </div>
              <div className="text-white font-bold text-sm mt-0.5">
                {def.frontArmor}mm Front
              </div>
              <div className="text-[10px] text-neutral-400">Integrity: {def.maxHp} HP</div>
            </div>

            <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#2b3a4c]">
              <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" /> TOP SPEED
              </div>
              <div className="text-white font-bold text-sm mt-0.5">
                {Math.round(def.topSpeed * 0.22)} km/h
              </div>
              <div className="text-[10px] text-neutral-400">Turn: {(def.turnSpeed * (180 / Math.PI)).toFixed(0)}°/s</div>
            </div>
          </div>

          <p className="text-xs text-neutral-400 italic">
            "{def.description}"
          </p>
        </div>

        {/* RIGHT: ACTION COMMAND CENTER (PLAY & DEPOT) */}
        <div className="w-full lg:w-5/12 flex flex-col space-y-4">
          
          {/* HUGE DEPLOY BUTTON */}
          <button
            onClick={() => {
              audio.playRadioBeep();
              onStartGame();
            }}
            className="w-full py-5 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xl md:text-2xl uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-950/60 border-2 border-emerald-400/50 transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <Play className="w-7 h-7 fill-white group-hover:scale-110 transition-transform" />
            <span>Deploy Skirmish</span>
          </button>

          {/* ARSENAL & TECH TREE DEPOT BUTTON */}
          <button
            onClick={() => {
              audio.playRadioBeep();
              onOpenDepot();
            }}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-extrabold text-base md:text-lg uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-950/60 border-2 border-amber-400/50 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <ShoppingBag className="w-6 h-6" />
            <span>Tech Tree & Armory Depot</span>
          </button>

          {/* SERVICE RECORD STATS CARD */}
          <div className="bg-[#121720]/95 border border-[#2b3a4c] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Career Service Record
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#283647]">
                <div className="text-neutral-400 text-[10px]">TOTAL SCORE</div>
                <div className="text-base font-bold text-white mt-0.5">{stats.score.toLocaleString()}</div>
              </div>

              <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#283647]">
                <div className="text-neutral-400 text-[10px]">TANKS DESTROYED</div>
                <div className="text-base font-bold text-red-400 mt-0.5">{stats.tanksDestroyed} Kills</div>
              </div>

              <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#283647]">
                <div className="text-neutral-400 text-[10px]">TIME SURVIVED</div>
                <div className="text-base font-bold text-blue-300 mt-0.5">
                  {Math.floor(stats.timeSurvivedSeconds / 60)}m {Math.floor(stats.timeSurvivedSeconds % 60)}s
                </div>
              </div>

              <div className="bg-[#18202c] p-2.5 rounded-lg border border-[#283647]">
                <div className="text-neutral-400 text-[10px]">HIGHEST TIER KILLED</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">Tier {stats.highestTierDestroyed}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM FOOTER: QUICK NATION PREVIEWS */}
      <div className="relative z-10 flex flex-wrap items-center justify-between border-t border-[#232f3e] pt-3 text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-wider text-neutral-300">Available Branches:</span>
          {NATIONS.map(n => (
            <button
              key={n.id}
              onClick={() => {
                audio.playRadioBeep();
                const firstTank = TECH_TREE_ORDER[n.id][0];
                onSelectTank(firstTank);
              }}
              className={`px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                def.nation === n.id
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                  : 'bg-[#141b24] border-[#2a3746] hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              <span>{n.flag}</span>
              <span>{n.name}</span>
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-neutral-500">
          Infinite Map Warfare • Rotating Turret Ballistics • 36 WW2 Tanks
        </div>
      </div>

      {/* CONTROLS POPUP MODAL */}
      {showControls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#12161f] border-2 border-[#3d4b5c] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
              <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" /> Controls & Combat Manual
              </h3>
              <button
                onClick={() => setShowControls(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono text-neutral-300">
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>W / S</span>
                <span className="font-bold text-white">Drive Forward / Reverse</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>A / D</span>
                <span className="font-bold text-white">Steer Hull Left / Right</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>MOUSE CURSOR</span>
                <span className="font-bold text-white">Traverse / Aim Turret</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>SPACE / LEFT CLICK</span>
                <span className="font-bold text-amber-400">Fire Main Cannon</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>SHIFT / RIGHT CLICK</span>
                <span className="font-bold text-amber-400">Machine Gun Fire</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>Q</span>
                <span className="font-bold text-emerald-400">Emergency Repair Kit</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>E</span>
                <span className="font-bold text-neutral-300">Smoke Screen Canister</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#1a232e]">
                <span>P / ESC</span>
                <span className="font-bold text-sky-400">Pause / Depot / Main Menu</span>
              </div>
            </div>

            <button
              onClick={() => setShowControls(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase rounded-lg text-xs"
            >
              Understood, Commander
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
