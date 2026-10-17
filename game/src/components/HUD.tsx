import React from 'react';
import { TankEntity, TankDefinition, PlayerStats, RadioMessage, CampaignMission } from '../types/game';
import { TANKS } from '../data/tanks';
import { Shield, Crosshair, Award, Volume2, VolumeX, Pause, ShoppingBag, Radio, Target, Flag, Compass, CheckCircle2 } from 'lucide-react';

interface HUDProps {
  player: TankEntity;
  stats: PlayerStats;
  allTanks: TankEntity[];
  radioMessages: RadioMessage[];
  campaignMission?: CampaignMission | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenDepot: () => void;
  onRepairKit: () => void;
  onSmokeScreen: () => void;
  repairKitCooldown: number; // 0 if ready
  smokeCooldown: number;      // 0 if ready
}

export const HUD: React.FC<HUDProps> = ({
  player,
  stats,
  allTanks,
  radioMessages,
  campaignMission,
  isMuted,
  onToggleMute,
  onOpenDepot,
  onRepairKit,
  onSmokeScreen,
  repairKitCooldown,
  smokeCooldown,
}) => {
  const def: TankDefinition = TANKS[player.defId] || TANKS['ger_pz1'];
  const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
  const reloadPct = Math.round(player.reloadProgress * 100);

  // Minimap radar dimensions
  const RADAR_RADIUS = 70;
  const RADAR_RANGE = 1800; // world units covered by radar

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 md:p-5 select-none font-['Chakra_Petch',sans-serif]">
      
      {/* TOP BAR: SCORE, CREDITS, ALLIES/ENEMIES, DEPOT BUTTON */}
      <div className="flex items-start justify-between">
        
        {/* Left: Player Profile & Tank Tier */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#11161f]/90 border border-[#2b3a4c] backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
                TIER {def.tier}
              </span>
              <span className="font-extrabold text-white tracking-wide text-sm md:text-base uppercase">
                {def.name}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              Caliber: {def.gunCaliber}mm | Front Armor: {def.frontArmor}mm
            </span>
          </div>

          <button
            onClick={onOpenDepot}
            className="ml-2 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            title="Open Tech Tree & Armory Depot (P)"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Depot [P]</span>
          </button>
        </div>

        {/* Center: Live Battle War Bonds, Score & Campaign Mission HUD */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 bg-[#11161f]/90 border border-[#2b3a4c] backdrop-blur-md px-5 py-2 rounded-xl shadow-xl">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[9px] uppercase tracking-widest text-neutral-400">War Bonds</div>
                <div className="text-base font-bold font-mono text-amber-400">
                  {stats.credits.toLocaleString()} CR
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-neutral-700" />

            <div>
              <div className="text-[9px] uppercase tracking-widest text-neutral-400">Score</div>
              <div className="text-base font-bold font-mono text-white">
                {stats.score.toLocaleString()}
              </div>
            </div>

            <div className="h-6 w-px bg-neutral-700" />

            <div>
              <div className="text-[9px] uppercase tracking-widest text-neutral-400">Kills</div>
              <div className="text-base font-bold font-mono text-red-400">
                {stats.tanksDestroyed}
              </div>
            </div>
          </div>

          {/* CAMPAIGN DIRECTIVE BANNER */}
          {campaignMission && (
            <div className="bg-[#0f141d]/95 border-2 border-amber-500/70 backdrop-blur-md px-4 py-2 rounded-xl shadow-2xl flex flex-col gap-1.5 min-w-[320px] max-w-md animate-fade-in pointer-events-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 animate-pulse" />
                  Mission {campaignMission.missionNumber}: {campaignMission.title}
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  +{campaignMission.rewardCredits.toLocaleString()} WB
                </span>
              </div>

              {/* Progress Bar & Objective State */}
              {campaignMission.type === 'kill_tanks' && (
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-neutral-300">Eliminate Hostile Tanks</span>
                    <span className="text-amber-400 font-bold">
                      {campaignMission.currentKills} / {campaignMission.targetKills}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (campaignMission.currentKills / campaignMission.targetKills) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {campaignMission.type === 'capture_objective' && campaignMission.objectives.length > 0 && (
                <div>
                  {campaignMission.objectives.map(obj => {
                    const distToObj = Math.round(Math.hypot(obj.x - player.x, obj.y - player.y));
                    const angleRad = Math.atan2(obj.y - player.y, obj.x - player.x);
                    const angleDeg = Math.round((angleRad * 180) / Math.PI);

                    return (
                      <div key={obj.id} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-neutral-200 font-bold flex items-center gap-1">
                            <Flag className="w-3 h-3 text-sky-400" /> {obj.name}
                          </span>
                          <span className={`font-bold ${obj.isCaptured ? 'text-emerald-400' : 'text-sky-400'}`}>
                            {obj.isCaptured ? 'CAPTURED (100%)' : `${Math.round(obj.captureProgress)}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                          <div
                            className={`h-full transition-all duration-300 ${
                              obj.isCaptured
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-sky-600 to-sky-400'
                            }`}
                            style={{ width: `${obj.captureProgress}%` }}
                          />
                        </div>
                        {!obj.isCaptured && (
                          <div className="text-[10px] text-sky-300/90 font-mono flex items-center gap-1 pt-0.5">
                            <Compass className="w-3 h-3" />
                            <span>Navigate: {distToObj}m away (heading {angleDeg}°)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {(campaignMission.type === 'combined_offensive' || campaignMission.type === 'defend_city') && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-neutral-300">Tanks Eliminated:</span>
                    <span className="text-amber-400 font-bold">
                      {campaignMission.currentKills} / {campaignMission.targetKills}
                    </span>
                  </div>
                  {campaignMission.objectives.map(obj => {
                    const distToObj = Math.round(Math.hypot(obj.x - player.x, obj.y - player.y));
                    return (
                      <div key={obj.id} className="flex justify-between text-[10px] font-mono">
                        <span className="text-sky-300 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {obj.name} ({distToObj}m):
                        </span>
                        <span className={obj.isCaptured ? 'text-emerald-400 font-bold' : 'text-sky-400'}>
                          {obj.isCaptured ? 'SECURED' : `${Math.round(obj.captureProgress)}%${campaignMission.type === 'defend_city' ? ' HELD' : ''}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sound Toggle & Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-2.5 bg-[#11161f]/90 border border-[#2b3a4c] text-neutral-300 hover:text-white rounded-lg shadow-lg hover:bg-neutral-800 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          <button
            onClick={onOpenDepot}
            className="p-2.5 bg-[#11161f]/90 border border-[#2b3a4c] text-neutral-300 hover:text-white rounded-lg shadow-lg hover:bg-neutral-800 transition-colors"
            title="Pause / Depot"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* MIDDLE: COMBAT RADIO FEED */}
      <div className="w-72 max-w-full space-y-1 my-auto pointer-events-none">
        {radioMessages.slice(-3).map(msg => (
          <div
            key={msg.id}
            className="bg-[#0b0e14]/85 border-l-2 border-amber-500 px-2.5 py-1 rounded text-xs backdrop-blur-sm shadow-md animate-fade-in flex items-start gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 text-[10px] uppercase">{msg.sender}: </span>
              <span className="text-neutral-200 text-[11px]">{msg.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM BAR: VITAL STATUS, AMMO RELOAD, RADAR MINIMAP */}
      <div className="flex items-end justify-between">
        
        {/* Left: Hull Health & Protection Status */}
        <div className="w-72 md:w-80 bg-[#11161f]/95 border border-[#2b3a4c] backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-2 pointer-events-auto">
          {/* Health Bar */}
          <div>
            <div className="flex justify-between text-xs font-bold font-mono mb-1">
              <span className="text-neutral-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> HULL INTEGRITY
              </span>
              <span className={hpRatio < 0.3 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
                {Math.max(0, Math.ceil(player.hp))} / {player.maxHp} HP
              </span>
            </div>
            <div className="h-3 w-full bg-neutral-900 rounded overflow-hidden border border-neutral-700">
              <div
                className={`h-full transition-all duration-150 ${
                  hpRatio > 0.5 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                  hpRatio > 0.25 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                  'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                }`}
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>
          </div>

          {/* Cannon Reload Progress */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-neutral-400 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-blue-400" /> MAIN BREECH ({def.gunCaliber}mm)
              </span>
              <span className={reloadPct >= 100 ? 'text-blue-400 font-bold' : 'text-amber-400 font-mono'}>
                {reloadPct >= 100 ? 'READY [SPACE / LMB]' : `RELOADING ${reloadPct}%`}
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-900 rounded overflow-hidden border border-neutral-700">
              <div
                className={`h-full transition-all duration-75 ${
                  reloadPct >= 100 ? 'bg-blue-400 shadow-sm shadow-blue-400' : 'bg-amber-500'
                }`}
                style={{ width: `${reloadPct}%` }}
              />
            </div>
          </div>

          {/* Quick Consumable Abilities */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onRepairKit}
              disabled={repairKitCooldown > 0 || player.hp >= player.maxHp}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1 border ${
                repairKitCooldown <= 0 && player.hp < player.maxHp
                  ? 'bg-emerald-900/60 border-emerald-500/80 text-emerald-300 hover:bg-emerald-800 active:scale-95'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Repair Kit [Q]
              {repairKitCooldown > 0 && ` (${Math.ceil(repairKitCooldown)}s)`}
            </button>

            <button
              onClick={onSmokeScreen}
              disabled={smokeCooldown > 0}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1 border ${
                smokeCooldown <= 0
                  ? 'bg-neutral-800 border-neutral-500 text-neutral-200 hover:bg-neutral-700 active:scale-95'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Smoke [E]
              {smokeCooldown > 0 && ` (${Math.ceil(smokeCooldown)}s)`}
            </button>
          </div>
        </div>

        {/* Center: Controls Hint Bar */}
        <div className="hidden lg:flex items-center gap-4 bg-[#0e131a]/80 border border-[#232f3e] px-4 py-1.5 rounded-lg text-[11px] font-mono text-neutral-400 backdrop-blur-sm">
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200">W/A/S/D</kbd> Drive Hull</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200">MOUSE</kbd> Aim Turret</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200">SPACE / LMB</kbd> Cannon</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200">SHIFT / RMB</kbd> MG</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200">P</kbd> Armory Depot</span>
        </div>

        {/* Right: Tactical Radar Minimap */}
        <div className="relative w-36 h-36 md:w-40 md:h-40 bg-[#0c1017]/95 border-2 border-[#2c3d52] rounded-full overflow-hidden shadow-2xl flex items-center justify-center pointer-events-auto">
          {/* Radar Sweep Background Rings */}
          <div className="absolute inset-2 border border-emerald-500/20 rounded-full" />
          <div className="absolute inset-8 border border-emerald-500/20 rounded-full" />
          <div className="absolute w-full h-px bg-emerald-500/20" />
          <div className="absolute h-full w-px bg-emerald-500/20" />

          {/* Compass labels */}
          <span className="absolute top-1 text-[9px] font-mono text-neutral-500">N</span>
          <span className="absolute bottom-1 text-[9px] font-mono text-neutral-500">S</span>
          <span className="absolute left-1.5 text-[9px] font-mono text-neutral-500">W</span>
          <span className="absolute right-1.5 text-[9px] font-mono text-neutral-500">E</span>

          {/* Radar blips */}
          {allTanks.map(tank => {
            if (tank.isDestroyed) return null;
            const dx = tank.x - player.x;
            const dy = tank.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist > RADAR_RANGE) return null;

            const scale = (RADAR_RADIUS - 6) / RADAR_RANGE;
            const rx = dx * scale;
            const ry = dy * scale;

            if (tank.isPlayer) {
              return (
                <div
                  key={tank.id}
                  className="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-emerald-400/50 shadow-sm"
                  style={{ transform: `translate(${rx}px, ${ry}px)` }}
                />
              );
            }

            const isAllied = tank.team === player.team;
            return (
              <div
                key={tank.id}
                className={`absolute w-2 h-2 rounded-full ${
                  isAllied ? 'bg-sky-400 ring-1 ring-sky-300' : 'bg-red-500 ring-1 ring-red-400 animate-pulse'
                }`}
                style={{ transform: `translate(${rx}px, ${ry}px)` }}
              />
            );
          })}
        </div>

      </div>

    </div>
  );
};
