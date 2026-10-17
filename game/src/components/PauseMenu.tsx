import React from 'react';
import { Play, ShoppingBag, RotateCcw, Home, Volume2, VolumeX, Settings } from 'lucide-react';
import { audio } from '../utils/audio';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onOpenDepot: () => void;
  onRestart: () => void;
  onQuitToHome: () => void;
  onOpenSettings?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onOpenDepot,
  onRestart,
  onQuitToHome,
  onOpenSettings,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none font-['Chakra_Petch',sans-serif]">
      <div className="relative w-full max-w-md bg-[#12161f] border-2 border-[#3d4b5c] rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        
        {/* HEADER */}
        <div className="bg-[#18212c] px-6 py-5 border-b border-[#2b3847] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-wider uppercase text-white">
              Tactical Pause
            </h2>
            <p className="text-xs text-neutral-400">Combat operations paused</p>
          </div>

          <button
            onClick={() => {
              audio.playRadioBeep();
              onToggleMute();
            }}
            className="p-2 rounded-lg bg-[#222d3b] hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>

        {/* MENU OPTIONS */}
        <div className="p-6 space-y-3">
          
          {/* Resume */}
          <button
            onClick={() => {
              audio.playRadioBeep();
              onResume();
            }}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <Play className="w-5 h-5 fill-white" />
            Resume Battle [P / ESC]
          </button>

          {/* Open Depot */}
          <button
            onClick={() => {
              audio.playRadioBeep();
              onOpenDepot();
            }}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/40 transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <ShoppingBag className="w-5 h-5" />
            Arsenal & Tech Tree Depot
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              audio.playRadioBeep();
              onRestart();
            }}
            className="w-full py-3 px-4 bg-[#1b2533] hover:bg-[#233142] text-neutral-200 border border-[#2e3e52] font-bold text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
            Restart Battle
          </button>

          {/* Operations Settings */}
          {onOpenSettings && (
            <button
              onClick={() => {
                audio.playRadioBeep();
                onOpenSettings();
              }}
              className="w-full py-3 px-4 bg-[#1b2533] hover:bg-[#233142] text-amber-300 border border-[#3b4b5e] font-bold text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2.5"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              Settings & Difficulty
            </button>
          )}

          {/* Quit to Home Screen */}
          <button
            onClick={() => {
              audio.playRadioBeep();
              onQuitToHome();
            }}
            className="w-full py-3 px-4 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 font-bold text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <Home className="w-4 h-4 text-red-400" />
            Quit to Main Menu / Home Screen
          </button>

        </div>

      </div>
    </div>
  );
};
