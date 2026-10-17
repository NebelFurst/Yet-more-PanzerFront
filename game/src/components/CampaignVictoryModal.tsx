import React from 'react';
import { CampaignMission } from '../types/game';
import { audio } from '../utils/audio';
import { Trophy, Award, CheckCircle2, ArrowRight, Play, ShoppingBag, Sparkles } from 'lucide-react';

interface CampaignVictoryModalProps {
  isOpen: boolean;
  mission: CampaignMission | null;
  onNextMission: () => void;
  onContinueSkirmish: () => void;
  onOpenDepot: () => void;
  isFinalMission?: boolean;
}

export const CampaignVictoryModal: React.FC<CampaignVictoryModalProps> = ({
  isOpen,
  mission,
  onNextMission,
  onContinueSkirmish,
  onOpenDepot,
  isFinalMission = false,
}) => {
  if (!isOpen || !mission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-['Chakra_Petch',sans-serif] animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#111722] border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        
        {/* TOP GLOWING HEADER */}
        <div className="bg-gradient-to-r from-amber-950 via-[#1e293b] to-amber-950 px-6 py-6 border-b border-amber-500/40 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="inline-flex p-3 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-400 mb-3 shadow-lg shadow-amber-500/20">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-widest text-white drop-shadow-md">
            Victory Achieved!
          </h2>
          <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mt-1">
            Sector Liberated • Frontline Secured
          </p>
        </div>

        {/* MISSION DEBRIEF */}
        <div className="p-6 space-y-4">
          <div className="bg-[#17202d] border border-[#2c3d52] rounded-xl p-4 space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Completed Directive
            </div>
            <div className="text-base font-bold text-white uppercase">
              {mission.title}
            </div>
            <p className="text-xs text-neutral-300">
              {mission.description}
            </p>
          </div>

          {/* REWARD CALLOUT */}
          <div className="bg-gradient-to-r from-amber-950/80 to-[#192330] border border-amber-500/50 rounded-xl p-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/40">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-amber-300 font-bold">
                  Campaign Combat Bounty
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  +{mission.rewardCredits.toLocaleString()} War Bonds
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono font-bold">
                TRANSFERRED
              </span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 text-center font-mono">
            War bonds can be used in the Tech Tree to unlock branching vehicles and 100,000 War Bond experimental tanks!
          </div>

          {/* ACTION BUTTONS */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                audio.playRadioBeep();
                onNextMission();
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{isFinalMission ? 'Campaign Complete · Choose Operation' : 'Deploy to Next Mission'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  audio.playRadioBeep();
                  onOpenDepot();
                }}
                className="py-2.5 px-3 bg-[#1e2837] hover:bg-[#28374a] text-neutral-200 border border-[#374960] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Tech Tree Depot</span>
              </button>

              <button
                onClick={() => {
                  audio.playRadioBeep();
                  onContinueSkirmish();
                }}
                className="py-2.5 px-3 bg-[#17202d] hover:bg-[#1f2c3d] text-neutral-300 hover:text-white border border-[#2b3a4d] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Continue Skirmish</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
