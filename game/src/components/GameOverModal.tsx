import React from 'react';
import { PlayerStats, TankDefinition } from '../types/game';
import { TANKS } from '../data/tanks';
import { Award, RotateCcw, ShoppingBag, ShieldAlert, Target, Clock, Trophy, Home } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  stats: PlayerStats;
  tankId: string;
  onRestart: () => void;
  onOpenDepot: () => void;
  onQuitToHome?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  stats,
  tankId,
  onRestart,
  onOpenDepot,
  onQuitToHome,
}) => {
  if (!isOpen) return null;

  const def: TankDefinition = TANKS[tankId] || TANKS['ger_pz1'];
  const minutes = Math.floor(stats.timeSurvivedSeconds / 60);
  const seconds = Math.floor(stats.timeSurvivedSeconds % 60);
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none font-['Chakra_Petch',sans-serif]">
      <div className="relative w-full max-w-xl bg-[#12161e] border-2 border-red-900/60 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        
        {/* TOP ACCENT BANNER */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-black px-6 py-6 border-b border-red-800/40 text-center relative">
          <div className="inline-flex p-3 rounded-full bg-red-950/80 border border-red-500/50 text-red-500 mb-2 shadow-lg animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest uppercase text-red-400">
            Tank Destroyed in Action
          </h2>
          <p className="text-xs text-red-200/70 font-mono mt-1">
            Combat Log: {def.name} [Tier {def.tier}] neutralized by hostile fire
          </p>
        </div>

        {/* BATTLE STATS DEBRIEF */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            
            <div className="bg-[#18202b] p-3 rounded-xl border border-[#2c3d52]">
              <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest">Final Score</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {stats.score.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#18202b] p-3 rounded-xl border border-[#2c3d52]">
              <Target className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest">Tanks Destroyed</div>
              <div className="text-lg font-bold font-mono text-red-400 mt-0.5">
                {stats.tanksDestroyed}
              </div>
            </div>

            <div className="bg-[#18202b] p-3 rounded-xl border border-[#2c3d52]">
              <Award className="w-5 h-5 text-amber-300 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest">War Bonds</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                +{stats.credits.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#18202b] p-3 rounded-xl border border-[#2c3d52]">
              <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest">Time Survived</div>
              <div className="text-lg font-bold font-mono text-blue-300 mt-0.5">
                {timeFormatted}
              </div>
            </div>

          </div>

          {/* COMBAT REWARD SUMMARY */}
          <div className="p-4 bg-[#161d27] rounded-xl border border-[#253243] text-xs space-y-2">
            <div className="flex justify-between text-neutral-300">
              <span>Total Shell Damage Dealt:</span>
              <span className="font-mono font-bold text-white">{stats.damageDealt.toLocaleString()} HP</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Shots Fired / Accurate Hits:</span>
              <span className="font-mono font-bold text-white">
                {stats.shotsFired} / {stats.shotsHit} ({stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Armor Deflections & Ricochets:</span>
              <span className="font-mono font-bold text-emerald-400">{stats.ricochetsGiven} bounced</span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={onRestart}
              className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Redeploy
            </button>

            <button
              onClick={onOpenDepot}
              className="flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              Upgrade Tank
            </button>

            {onQuitToHome && (
              <button
                onClick={onQuitToHome}
                className="flex-1 py-3 px-3 bg-[#1e2733] hover:bg-[#283647] text-neutral-200 border border-[#34465b] font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Home className="w-4 h-4 text-amber-400" />
                Main Menu
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
