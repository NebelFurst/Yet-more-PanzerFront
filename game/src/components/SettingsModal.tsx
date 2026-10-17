import React from 'react';
import { GameSettings, Difficulty } from '../types/game';
import { audio } from '../utils/audio';
import {
  Settings,
  X,
  Sparkles,
  Shield,
  Zap,
  Skull,
  Volume2,
  VolumeX,
  Check,
  Flame,
  Target,
  Flag,
  Trophy,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  const handleDifficultySelect = (diff: Difficulty) => {
    audio.playRadioBeep();
    onUpdateSettings({ difficulty: diff });
  };

  const handleToggleExperimental = () => {
    audio.playRadioBeep();
    onUpdateSettings({ experimentalVehicles: !settings.experimentalVehicles });
  };

  const handleToggleCampaign = () => {
    audio.playRadioBeep();
    onUpdateSettings({ campaignMode: !settings.campaignMode });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-['Chakra_Petch',sans-serif]">
      <div className="relative w-full max-w-2xl bg-[#12161f] border-2 border-[#3d4b5c] rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        
        {/* HEADER */}
        <div className="bg-[#18212c] px-6 py-4 border-b border-[#2b3847] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/40 rounded-lg text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
                Operations Settings
                <span className="text-xs px-2 py-0.5 rounded bg-[#273544] text-[#93c5fd] font-mono">
                  CONFIG
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Adjust combat difficulty parameters and experimental weapon divisions
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playRadioBeep();
              onClose();
            }}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* 1. DIFFICULTY SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" /> Combat Difficulty Mode
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                Current: <span className="text-amber-400 font-bold uppercase">{settings.difficulty}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* EASY */}
              <button
                onClick={() => handleDifficultySelect('easy')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.difficulty === 'easy'
                    ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-[#161e27] border-[#293747] hover:bg-[#1b2531]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-400 uppercase flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> Easy
                    </span>
                    {settings.difficulty === 'easy' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Relaxed combat. Hostile tanks deal 35% less damage, reload slower, and miss more often.
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-emerald-300 font-bold">
                  +25% War Bonds Bonus
                </div>
              </button>

              {/* MEDIUM */}
              <button
                onClick={() => handleDifficultySelect('medium')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.difficulty === 'medium'
                    ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500/50 shadow-md'
                    : 'bg-[#161e27] border-[#293747] hover:bg-[#1b2531]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-amber-400 uppercase flex items-center gap-1.5">
                      <Shield className="w-4 h-4" /> Medium
                    </span>
                    {settings.difficulty === 'medium' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Standard authentic battle balance. Realistic armor penetration and balanced combat lines.
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-amber-300 font-bold">
                  Standard Rewards
                </div>
              </button>

              {/* HARD */}
              <button
                onClick={() => handleDifficultySelect('hard')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.difficulty === 'hard'
                    ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500/50 shadow-md'
                    : 'bg-[#161e27] border-[#293747] hover:bg-[#1b2531]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-red-400 uppercase flex items-center gap-1.5">
                      <Skull className="w-4 h-4" /> Hard
                    </span>
                    {settings.difficulty === 'hard' && <Check className="w-4 h-4 text-red-400" />}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Punishing warfare. Hostile armor reloads 20% faster, aims with deadly precision, and maneuvers aggressively.
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-amber-400 font-bold">
                  +60% War Bonds Bounty!
                </div>
              </button>
            </div>
          </div>

          {/* 2. CAMPAIGN OPERATIONS MODE */}
          <div className="p-4 bg-[#161e27] border border-[#2b3a4a] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border transition-colors ${
                  settings.campaignMode
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-md'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}>
                  <Target className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase flex items-center gap-2">
                    Campaign Operations Mode
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      settings.campaignMode
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    }`}>
                      {settings.campaignMode ? 'OBJECTIVES ACTIVE' : 'SKIRMISH ONLY'}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Replace endless combat with tactical missions: Capture strategic outposts or eliminate 5 hostile tanks to win!
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggleCampaign}
                className={`relative w-14 h-7 rounded-full transition-colors p-1 ${
                  settings.campaignMode ? 'bg-amber-500' : 'bg-neutral-700'
                }`}
                title="Toggle Campaign Mode"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.campaignMode ? 'translate-x-7 shadow-md' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Campaign Mode Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded bg-[#10151d] border border-neutral-800/80">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px]">
                  <Skull className="w-3.5 h-3.5" /> Choose an Operation
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Use the Campaigns tab in the hangar to choose city defence, city assault, forest ambush, or open breakthrough.
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#10151d] border border-neutral-800/80">
                <div className="font-bold text-sky-400 flex items-center gap-1.5 text-[11px]">
                  <Flag className="w-3.5 h-3.5" /> Capture Outposts
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Follow tactical compass arrows to strategic zones and hold the perimeter until 100%.
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#10151d] border border-neutral-800/80">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                  <Trophy className="w-3.5 h-3.5" /> Campaign War Bonds
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Complete three escalating phases for War Bonds to fund blueprints, vehicles, and upgrades.
                </div>
              </div>
            </div>
          </div>

          {/* 3. EXPERIMENTAL SUPER-WEAPONS TOGGLE */}
          <div className="p-4 bg-[#161e27] border border-[#2b3a4a] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase flex items-center gap-2">
                    Experimental Wonder-Weapons (Tier 10)
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                      100,000 WAR BONDS
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Colossal super-heavy tanks with supreme scale, multi-turrets, and devastating firepower. Cost: 100,000 War Bonds.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggleExperimental}
                className={`relative w-14 h-7 rounded-full transition-colors p-1 ${
                  settings.experimentalVehicles ? 'bg-purple-600' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.experimentalVehicles ? 'translate-x-7 shadow-md' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Included Super-Weapons Roster */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 rounded bg-[#10151d] border border-neutral-800">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  🇩🇪 P.1000 Ratte
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  1,000-ton behemoth with twin 280mm naval guns and 6 tracks.
                </div>
              </div>

              <div className="p-2 rounded bg-[#10151d] border border-neutral-800">
                <div className="font-bold text-red-400 flex items-center gap-1.5">
                  ☭ KV-6 "Behemoth"
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Multi-turreted land dreadnought with 152mm + 122mm guns.
                </div>
              </div>

              <div className="p-2 rounded bg-[#10151d] border border-neutral-800">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  🇺🇸 T58 Behemoth
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  155mm revolver autoloader oscillating heavy breakthrough tank.
                </div>
              </div>

              <div className="p-2 rounded bg-[#10151d] border border-neutral-800">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  🇬🇧 FV4005 "Doom Barn"
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Colossal 183mm anti-tank cannon with devastating high-explosive power.
                </div>
              </div>
            </div>
          </div>

          {/* 3. AUDIO PREFERENCES */}
          <div className="p-4 bg-[#161e27] border border-[#2b3a4a] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40">
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white uppercase">Combat Audio Engine</h4>
                <p className="text-xs text-neutral-400">
                  Web Audio procedural engine rumble, cannon blasts, ricochet pings, and radio.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playRadioBeep();
                onToggleMute();
              }}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border ${
                isMuted
                  ? 'bg-red-950/60 border-red-500/60 text-red-300'
                  : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
              }`}
            >
              {isMuted ? 'Muted' : 'Audio Active'}
            </button>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-[#141b24] border-t border-[#253243] flex items-center justify-end">
          <button
            onClick={() => {
              audio.playRadioBeep();
              onClose();
            }}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Close</span>
          </button>
        </div>

      </div>
    </div>
  );
};
