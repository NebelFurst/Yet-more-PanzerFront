import React, { useState, useEffect, useRef } from 'react';
import { NationId, TankDefinition, TankUpgradeLevels } from '../types/game';
import { NATIONS, TANKS, BLUEPRINT_TANK_IDS, getTechTreeOrder, canUnlockTank } from '../data/tanks';
import { renderTank } from '../utils/renderTanks';
import { audio } from '../utils/audio';
import {
  Shield,
  Zap,
  Crosshair,
  Gauge,
  Award,
  Lock,
  Check,
  ChevronRight,
  X,
  Wrench,
  ArrowLeft,
  Flame,
  GitBranch,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TechTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  currentTankId: string;
  unlockedTankIds: string[];
  upgrades: Record<string, TankUpgradeLevels>;
  blueprintIds: string[];
  onBuyBlueprint: (tankId: string) => void;
  onUnlockTank: (tankId: string, cost: number) => void;
  onEquipTank: (tankId: string) => void;
  onPurchaseUpgrade: (tankId: string, upgradeType: keyof TankUpgradeLevels, cost: number) => void;
  returnTo?: 'home' | 'battle' | 'pause';
  experimentalEnabled?: boolean;
}

export const TechTreeModal: React.FC<TechTreeModalProps> = ({
  isOpen,
  onClose,
  credits,
  currentTankId,
  unlockedTankIds,
  upgrades,
  blueprintIds,
  onBuyBlueprint,
  onUnlockTank,
  onEquipTank,
  onPurchaseUpgrade,
  returnTo = 'battle',
  experimentalEnabled = false,
}) => {
  const currentDef = TANKS[currentTankId] || TANKS['ger_pz1'];
  const [selectedNation, setSelectedNation] = useState<NationId>(currentDef.nation);
  const [inspectedTankId, setInspectedTankId] = useState<string>(currentTankId);
  const [branchFilter, setBranchFilter] = useState<'all' | 'medium' | 'flamethrower' | 'td' | 'heavy' | 'experimental'>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [depotTab, setDepotTab] = useState<'tree' | 'shop'>('tree');
  const requestedInspection = useRef<string | null>(null);

  // Sync inspected tank when nation changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (requestedInspection.current) {
        setInspectedTankId(requestedInspection.current);
        requestedInspection.current = null;
      } else if (TANKS[currentTankId]?.nation === selectedNation) {
        setInspectedTankId(currentTankId);
      } else {
        const nationTanks = getTechTreeOrder(selectedNation, experimentalEnabled, blueprintIds);
        setInspectedTankId(nationTanks[0] || 'ger_pz1');
      }
    }
  }, [isOpen, selectedNation, currentTankId, experimentalEnabled, blueprintIds, depotTab]);

  // Preview Canvas Rendering for inspected tank
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let rotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid / Blueprint background
      ctx.fillStyle = '#0f141c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(74, 95, 122, 0.16)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw inspected tank with gentle turret scanning
      rotation += 0.008;
      const turretScan = Math.sin(rotation * 1.5) * 0.35;

      const mockTank = {
        id: 'preview',
        defId: inspectedTankId,
        nation: TANKS[inspectedTankId]?.nation || 'germany',
        team: 'player_faction' as const,
        isPlayer: true,
        x: canvas.width / 2,
        y: canvas.height / 2 + 10,
        vx: 0,
        vy: 0,
        hullAngle: 0, // facing north
        turretAngle: turretScan,
        targetTurretAngle: turretScan,
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
        upgrades: upgrades[inspectedTankId] || { gun: 0, armor: 0, engine: 0, turret: 0 },
        kills: 0,
        damageDealt: 0,
      };

      renderTank(ctx, mockTank, { showHealthBar: false, showName: false });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, inspectedTankId, upgrades, depotTab]);

  if (!isOpen) return null;

  const inspectedDef = TANKS[inspectedTankId] || TANKS['ger_pz1'];
  const nationInfo = NATIONS.find(n => n.id === selectedNation)!;
  const rawNationTree = getTechTreeOrder(selectedNation, experimentalEnabled, blueprintIds);

  // Filter tanks if branch tab selected
  const filteredTree = rawNationTree.filter(id => {
    const tank = TANKS[id];
    if (!tank) return false;
    if (branchFilter === 'all') return true;
    if (branchFilter === 'flamethrower') return tank.isFlamethrower;
    if (branchFilter === 'experimental') return tank.isExperimental;
    if (branchFilter === 'td') return tank.role === 'td';
    if (branchFilter === 'heavy') return tank.role === 'heavy' || tank.role === 'superheavy';
    if (branchFilter === 'medium') return tank.role === 'medium' || tank.role === 'light';
    return true;
  });

  const isUnlocked = unlockedTankIds.includes(inspectedTankId);
  const isEquipped = currentTankId === inspectedTankId;
  const canUnlock = canUnlockTank(inspectedTankId, unlockedTankIds, blueprintIds);
  const canAfford = credits >= inspectedDef.cost;

  // Prerequisite tank names for display
  const prereqNames = inspectedDef.prerequisites && inspectedDef.prerequisites.length > 0
    ? inspectedDef.prerequisites.map(pid => TANKS[pid]?.name || pid).join(' or ')
    : null;

  // Upgrades for inspected tank
  const currentUpgrades = upgrades[inspectedTankId] || { gun: 0, armor: 0, engine: 0, turret: 0 };

  const getUpgradeCost = (currentLvl: number) => {
    return (currentLvl + 1) * Math.round(inspectedDef.cost * 0.25 + 300);
  };

  const handleUnlock = () => {
    if (!canAfford || isUnlocked || !canUnlock) return;
    audio.playCashEarned();
    onUnlockTank(inspectedTankId, inspectedDef.cost);
  };

  const handleEquip = () => {
    if (!isUnlocked || isEquipped) return;
    audio.playRadioBeep();
    onEquipTank(inspectedTankId);
  };

  const handleUpgrade = (type: keyof TankUpgradeLevels) => {
    const cost = getUpgradeCost(currentUpgrades[type]);
    if (credits < cost || currentUpgrades[type] >= 3 || !isUnlocked) return;
    audio.playCashEarned();
    onPurchaseUpgrade(inspectedTankId, type, cost);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-['Chakra_Petch',sans-serif]">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[920px] bg-[#12171e] border-2 border-[#3d4b5c] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        
        {/* TOP HEADER */}
        <div className="bg-[#18212c] px-6 py-3.5 border-b border-[#2d3947] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/40 rounded-lg text-amber-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
                Panzer Tech Tree & Armory
                <span className="text-xs px-2 py-0.5 rounded bg-[#273544] text-[#93c5fd] font-mono">
                  BRANCHING TECH
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Research branching armor variants, equip flamethrowers, heavy tanks, and 100,000 War Bond experimental wonder-weapons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Currency Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1a2332] border border-amber-500/40 rounded-lg shadow-inner">
              <Award className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <div className="text-[8px] text-amber-300 font-bold tracking-widest uppercase">War Bonds</div>
                <div className="text-base font-bold font-mono text-amber-400">{credits.toLocaleString()}</div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                audio.playRadioBeep();
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
              title="Close Depot"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* NATION SELECTOR TABS */}
        <nav className="flex gap-2 px-4 py-2 bg-[#11171f] border-b border-[#2d3947]" aria-label="Depot sections">
          <button aria-pressed={depotTab === 'tree'} onClick={() => setDepotTab('tree')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${depotTab === 'tree' ? 'bg-amber-500/15 text-amber-400' : 'text-neutral-400 hover:text-white'}`}>Tech Tree</button>
          <button aria-pressed={depotTab === 'shop'} onClick={() => setDepotTab('shop')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${depotTab === 'shop' ? 'bg-amber-500/15 text-amber-400' : 'text-neutral-400 hover:text-white'}`}>Blueprint Shop</button>
        </nav>
        {depotTab === 'shop' ? (
          <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-5">
            <div><p className="text-xs font-mono uppercase tracking-widest text-amber-400">Design Bureau / Special Projects</p><h3 className="text-2xl font-bold uppercase mt-1">Blueprint Requisitions</h3><p className="text-sm text-neutral-400 mt-2">Buy a blueprint to reveal its vehicle in the tech tree. The tank still requires its listed predecessor and a separate vehicle purchase. Blueprint tanks do not require experimental mode.</p></div>
            {BLUEPRINT_TANK_IDS.map(tankId => {
              const tank = TANKS[tankId];
              const owned = blueprintIds.includes(tankId);
              const blueprintCost = tank.blueprintCost || 0;
              return <article key={tankId} className="p-5 bg-[#18212c] border border-[#344457] rounded-xl grid md:grid-cols-[1fr_auto] gap-5">
                <div><p className="text-[10px] text-amber-400 uppercase font-mono">{tank.nation} · Tier {tank.tier} · {tank.hasDualBarrels ? 'Twin-gun salvo' : 'Assault tank destroyer'}</p><h4 className="text-xl font-bold mt-1">{tank.name}</h4><p className="text-xs text-neutral-400 max-w-xl mt-2 leading-relaxed">{tank.description}</p><p className="text-xs text-neutral-300 mt-3">Requires: {tank.prerequisites?.map(id => TANKS[id].name).join(' or ')} · Vehicle: {tank.cost.toLocaleString()} CR</p></div>
                <div className="flex flex-col justify-center gap-2 md:min-w-48"><span className="text-amber-400 font-mono font-bold">{blueprintCost.toLocaleString()} CR / blueprint</span>
                  <button disabled={owned || credits < blueprintCost} onClick={() => onBuyBlueprint(tankId)} className="py-2.5 px-4 rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 font-bold text-xs uppercase">{owned ? 'Blueprint Owned' : credits < blueprintCost ? `Need ${(blueprintCost - credits).toLocaleString()} CR` : 'Buy Blueprint'}</button>
                  {owned && <button onClick={() => { requestedInspection.current = tankId; setDepotTab('tree'); setSelectedNation(tank.nation); setInspectedTankId(tankId); setBranchFilter('all'); }} className="py-2 text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase">View in Tech Tree</button>}
                </div>
              </article>;
            })}
          </div>
        ) : (<>
        <div className="flex border-b border-[#2d3947] bg-[#151c24] px-4">
          {NATIONS.map(nation => {
            const isSelected = selectedNation === nation.id;
            const nationTanks = getTechTreeOrder(nation.id, experimentalEnabled, blueprintIds);
            const unlockedCount = nationTanks.filter(id => unlockedTankIds.includes(id)).length;

            return (
              <button
                key={nation.id}
                onClick={() => {
                  audio.playRadioBeep();
                  setSelectedNation(nation.id);
                }}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                  isSelected
                    ? 'border-amber-500 text-amber-400 bg-[#1c2633]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#18212c]'
                }`}
              >
                <span className="text-xl">{nation.flag}</span>
                <span>{nation.name}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 text-neutral-400">
                  {unlockedCount}/{nationTanks.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* MAIN BODY: SPLIT VIEW */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: TECH TREE BRANCHING NODES */}
          <div className="w-full md:w-7/12 border-r border-[#2d3947] flex flex-col bg-[#11151b] overflow-hidden">
            
            {/* Filter Sub-header */}
            <div className="p-3 bg-[#161d26] border-b border-[#242f3d] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">Army:</span>
                <span className="text-xs font-bold text-white">{nationInfo.armyName}</span>
              </div>
              
              {/* Branch Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                <button
                  onClick={() => setBranchFilter('all')}
                  className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                    branchFilter === 'all'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'bg-[#1e2733] text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({rawNationTree.length})
                </button>
                <button
                  onClick={() => setBranchFilter('flamethrower')}
                  className={`px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 transition-all ${
                    branchFilter === 'flamethrower'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-[#1e2733] text-orange-400 hover:text-orange-300'
                  }`}
                >
                  <Flame className="w-3 h-3" /> Flame
                </button>
                <button
                  onClick={() => setBranchFilter('td')}
                  className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                    branchFilter === 'td'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[#1e2733] text-neutral-400 hover:text-white'
                  }`}
                >
                  Tank Hunters
                </button>
                <button
                  onClick={() => setBranchFilter('heavy')}
                  className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                    branchFilter === 'heavy'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[#1e2733] text-neutral-400 hover:text-white'
                  }`}
                >
                  Heavies
                </button>
                {experimentalEnabled && (
                  <button
                    onClick={() => setBranchFilter('experimental')}
                    className={`px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 transition-all ${
                      branchFilter === 'experimental'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#1e2733] text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Tier 10 (100k)
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Node Track */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredTree.map((tankId) => {
                const tank = TANKS[tankId];
                if (!tank) return null;
                const isItemUnlocked = unlockedTankIds.includes(tankId);
                const isItemEquipped = currentTankId === tankId;
                const isSelected = inspectedTankId === tankId;
                const isItemUnlockable = canUnlockTank(tankId, unlockedTankIds, blueprintIds);

                // Predecessor tank name
                const branchParent = tank.prerequisites && tank.prerequisites.length > 0
                  ? TANKS[tank.prerequisites[0]]?.name
                  : null;

                return (
                  <div key={tankId} className="relative">
                    <div
                      onClick={() => {
                        audio.playRadioBeep();
                        setInspectedTankId(tankId);
                      }}
                      className={`cursor-pointer rounded-xl p-3 transition-all flex items-center justify-between border ${
                        isSelected
                          ? 'bg-[#223040] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : isItemEquipped
                          ? 'bg-[#182a1c] border-emerald-500/60 hover:bg-[#1d3322]'
                          : isItemUnlocked
                          ? 'bg-[#18212c] border-[#334356] hover:bg-[#1f2b3a]'
                          : isItemUnlockable
                          ? 'bg-[#182029] border-amber-500/40 hover:bg-[#1d2733]'
                          : 'bg-[#131920] border-[#222c38] opacity-70 hover:opacity-90 hover:bg-[#17202a]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Tier / Role Icon Badge */}
                        <div
                          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold font-mono text-xs border ${
                            tank.tier === 10
                              ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-sm shadow-purple-900/50'
                              : tank.isFlamethrower
                              ? 'bg-orange-950 border-orange-500 text-orange-400 shadow-sm shadow-orange-950'
                              : isItemEquipped
                              ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                              : isItemUnlocked
                              ? 'bg-amber-950 border-amber-500 text-amber-400'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                          }`}
                        >
                          {tank.isFlamethrower ? (
                            <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
                          ) : (
                            <>
                              <span className="text-[8px] uppercase leading-none font-bold">
                                {tank.tier === 10 ? 'EXP' : `T-${tank.tier}`}
                              </span>
                              <span className="text-sm font-extrabold">{tank.tier === 10 ? 'X' : tank.tier}</span>
                            </>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{tank.name}</span>
                            
                            {/* Role / Type Tag */}
                            {tank.isFlamethrower ? (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-600/50 flex items-center gap-1">
                                <Flame className="w-2.5 h-2.5" /> Flame Projector
                              </span>
                            ) : tank.isExperimental ? (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600/50">
                                ⚡ Wonder-Weapon
                              </span>
                            ) : (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/40 text-neutral-400 font-mono">
                                {tank.role.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Branch indicator */}
                          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2 mt-0.5">
                            {branchParent ? (
                              <span className="text-amber-400/90 flex items-center gap-1">
                                <GitBranch className="w-3 h-3" /> Branch from: {branchParent}
                              </span>
                            ) : (
                              <span className="text-neutral-500">Starter Core Tank</span>
                            )}
                            <span className="text-neutral-600">•</span>
                            <span>{tank.gunCaliber}mm</span>
                            <span>•</span>
                            <span>{tank.frontArmor}mm Armor</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {isItemEquipped ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Equipped
                          </span>
                        ) : isItemUnlocked ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/50">
                            Researched
                          </span>
                        ) : isItemUnlockable ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            {tank.cost.toLocaleString()} WB
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-xs font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-neutral-600" />
                            Locked
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: INSPECTED TANK CARD & UPGRADES */}
          <div className="w-full md:w-5/12 bg-[#141a22] flex flex-col overflow-y-auto">
            
            {/* Live Vector Model Preview */}
            <div className="relative h-44 bg-[#0d1117] border-b border-[#2d3947] flex items-center justify-center overflow-hidden shrink-0">
              <canvas
                ref={canvasRef}
                width={360}
                height={176}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-3 text-[10px] font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Turret Simulation
              </div>
              <div className="absolute bottom-2 right-3 px-2 py-0.5 bg-black/70 rounded text-[10px] font-mono text-amber-400 border border-amber-500/30">
                {inspectedDef.historicalName} ({inspectedDef.yearIntroduced})
              </div>
            </div>

            {/* Tank Specs Breakdown */}
            <div className="p-4 border-b border-[#242f3d] space-y-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white uppercase">{inspectedDef.name}</h3>
                  {inspectedDef.isFlamethrower && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-600 text-white flex items-center gap-1 shadow-sm">
                      <Flame className="w-3 h-3" /> FLAMETHROWER
                    </span>
                  )}
                  {inspectedDef.isExperimental && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-600 text-white shadow-sm">
                      ⚡ WONDER-WEAPON
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1">{inspectedDef.description}</p>
              </div>

              {/* Special Flamethrower Banner */}
              {inspectedDef.isFlamethrower && (
                <div className="p-2.5 rounded-lg bg-orange-950/60 border border-orange-500/50 text-xs text-orange-200">
                  <div className="font-bold flex items-center gap-1.5 text-orange-400 uppercase text-[11px]">
                    <Flame className="w-4 h-4" /> Incendiary Liquid Napalm Projector
                  </div>
                  <div className="text-[11px] text-orange-300/90 mt-0.5">
                    Fires continuous pressurized fiery streams that bypass armor bounce angles, setting enemy tanks on fire and melting defensive obstacles.
                  </div>
                </div>
              )}

              {/* Special Experimental Banner */}
              {inspectedDef.isExperimental && (
                <div className="p-2.5 rounded-lg bg-purple-950/60 border border-purple-500/50 text-xs text-purple-200">
                  <div className="font-bold flex items-center gap-1.5 text-purple-400 uppercase text-[11px]">
                    <Sparkles className="w-4 h-4" /> Tier 10 Wonder-Weapon (100,000 War Bonds)
                  </div>
                  <div className="text-[11px] text-purple-300/90 mt-0.5">
                    Colossal dimensions, multi-turrets or autoloaders, massive hit points, and catastrophic damage capable of crushing entire armored divisions.
                  </div>
                </div>
              )}

              {/* Combat Spec Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#1a232e] p-2 rounded border border-[#2d3c4e]">
                  <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-red-400" /> CANNON / DAMAGE
                  </div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    {inspectedDef.gunCaliber}mm ({inspectedDef.damage} DMG)
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Pen: {inspectedDef.penetration}mm | Rld: {inspectedDef.reloadTime}s
                  </div>
                </div>

                <div className="bg-[#1a232e] p-2 rounded border border-[#2d3c4e]">
                  <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" /> ARMOR PROTECTION
                  </div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    {inspectedDef.frontArmor}mm Front
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Sides: {inspectedDef.sideArmor}mm | HP: {inspectedDef.maxHp}
                  </div>
                </div>

                <div className="bg-[#1a232e] p-2 rounded border border-[#2d3c4e]">
                  <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-amber-400" /> MOBILITY
                  </div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    {Math.round(inspectedDef.topSpeed * 0.22)} km/h
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Turn: {(inspectedDef.turnSpeed * (180 / Math.PI)).toFixed(0)}°/s
                  </div>
                </div>

                <div className="bg-[#1a232e] p-2 rounded border border-[#2d3c4e]">
                  <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" /> TURRET TRAVERSE
                  </div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    {(inspectedDef.turretTurnSpeed * (180 / Math.PI)).toFixed(0)}°/s
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {inspectedDef.isCasemate ? 'Casemate Mount Arc' : 'Full 360° Ring'}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON (Equip / Unlock) */}
              <div className="pt-2">
                {isEquipped ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider bg-emerald-950 border border-emerald-500/50 text-emerald-400 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Currently Equipped
                  </button>
                ) : isUnlocked ? (
                  returnTo === 'home' ? (
                    <button
                      onClick={handleEquip}
                      className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-900/30 active:scale-95 flex items-center justify-center gap-2"
                    >
                      Equip For Battle
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-lg font-bold text-xs uppercase tracking-wider bg-neutral-900 border border-neutral-700 text-neutral-400 flex items-center justify-center gap-2 text-center">
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Cannot Switch Tank Mid-Game (Equip from Home Menu)</span>
                    </div>
                  )
                ) : !canUnlock ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-neutral-900 border border-neutral-700 text-neutral-500 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Locked: Requires {prereqNames}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleUnlock}
                    disabled={!canAfford}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                      canAfford
                        ? inspectedDef.isExperimental
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40 active:scale-95'
                          : 'bg-amber-600 hover:bg-amber-500 text-black shadow-amber-900/40 active:scale-95'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    {canAfford ? (
                      <span>Unlock {inspectedDef.name} ({inspectedDef.cost.toLocaleString()} War Bonds)</span>
                    ) : (
                      <span>Need {inspectedDef.cost.toLocaleString()} War Bonds (Short: {(inspectedDef.cost - credits).toLocaleString()})</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* UPGRADE MODULES (Available for unlocked tanks) */}
            <div className="p-4 flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" /> Tank Field Modifications
                </span>
                <span className="text-[11px] text-neutral-500">Max Tier 3</span>
              </div>

              <div className="space-y-2">
                {/* Gun Upgrade */}
                <UpgradeRow
                  title="Gun Breech & High-Velocity APCR"
                  description="+15% Damage & Penetration"
                  level={currentUpgrades.gun}
                  cost={getUpgradeCost(currentUpgrades.gun)}
                  credits={credits}
                  isUnlocked={isUnlocked}
                  onUpgrade={() => handleUpgrade('gun')}
                />

                {/* Armor Upgrade */}
                <UpgradeRow
                  title="Add-on Armor & Side Skirts"
                  description="+20% Hull Integrity & Resilience"
                  level={currentUpgrades.armor}
                  cost={getUpgradeCost(currentUpgrades.armor)}
                  credits={credits}
                  isUnlocked={isUnlocked}
                  onUpgrade={() => handleUpgrade('armor')}
                />

                {/* Engine Upgrade */}
                <UpgradeRow
                  title="High-Output Engine Tuning"
                  description="+15% Top Speed & Acceleration"
                  level={currentUpgrades.engine}
                  cost={getUpgradeCost(currentUpgrades.engine)}
                  credits={credits}
                  isUnlocked={isUnlocked}
                  onUpgrade={() => handleUpgrade('engine')}
                />

                {/* Turret Drive Upgrade */}
                <UpgradeRow
                  title="Hydraulic Turret Traverse Drive"
                  description="+25% Turret Rotation & -10% Reload"
                  level={currentUpgrades.turret}
                  cost={getUpgradeCost(currentUpgrades.turret)}
                  credits={credits}
                  isUnlocked={isUnlocked}
                  onUpgrade={() => handleUpgrade('turret')}
                />
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER BAR */}
        </>)}
        <div className="px-6 py-3 bg-[#131920] border-t border-[#242f3d] flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                audio.playRadioBeep();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1e2733] hover:bg-[#283647] text-neutral-300 hover:text-white flex items-center gap-1.5 font-bold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 font-mono">P</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 font-mono">ESC</kbd> to return</span>
          </div>
          <button
            onClick={() => {
              audio.playRadioBeep();
              onClose();
            }}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2"
          >
            {returnTo === 'home' ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Main Menu</span>
              </>
            ) : (
              <span>Deploy & Resume Battle</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

// Subcomponent for individual upgrade row
const UpgradeRow: React.FC<{
  title: string;
  description: string;
  level: number;
  cost: number;
  credits: number;
  isUnlocked: boolean;
  onUpgrade: () => void;
}> = ({ title, description, level, cost, credits, isUnlocked, onUpgrade }) => {
  const isMax = level >= 3;
  const canAfford = credits >= cost && isUnlocked && !isMax;

  return (
    <div className="p-2.5 bg-[#18212c] border border-[#2b3949] rounded-lg flex items-center justify-between text-xs">
      <div>
        <div className="font-bold text-white flex items-center gap-2">
          {title}
          <div className="flex gap-1">
            {[1, 2, 3].map(step => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  step <= level ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="text-[11px] text-neutral-400 mt-0.5">{description}</div>
      </div>

      <div>
        {isMax ? (
          <span className="text-[11px] font-bold uppercase text-amber-400 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/30">
            MAX LEVEL
          </span>
        ) : (
          <button
            onClick={onUpgrade}
            disabled={!canAfford}
            className={`px-3 py-1.5 rounded font-mono font-bold uppercase text-[11px] transition-all flex items-center gap-1 ${
              canAfford
                ? 'bg-amber-500 hover:bg-amber-400 text-black active:scale-95'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            }`}
          >
            Lvl {level + 1} ({cost} CR)
          </button>
        )}
      </div>
    </div>
  );
};
