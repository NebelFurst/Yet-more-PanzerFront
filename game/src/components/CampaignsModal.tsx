import React, { useState } from 'react';
import { Shield, Target, Trees, ArrowRight, X, Check, Crosshair } from 'lucide-react';
import { CAMPAIGNS } from '../data/campaigns';

interface CampaignsModalProps {
  selectedId: string;
  onClose: () => void;
  onDeploy: (id: string) => void;
}

export function CampaignsModal({ selectedId, onClose, onDeploy }: CampaignsModalProps) {
  const [inspectedId, setInspectedId] = useState(selectedId);
  const campaign = CAMPAIGNS.find(operation => operation.id === inspectedId) || CAMPAIGNS[0];
  const icons = [Shield, Target, Trees, Crosshair];
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-3 md:p-6 flex items-center justify-center font-['Chakra_Petch',sans-serif]">
      <section role="dialog" aria-modal="true" aria-labelledby="campaign-heading" className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#12171e] border border-[#3d4b5c] rounded-2xl text-neutral-200 shadow-2xl">
        <header className="p-5 border-b border-[#2d3947] flex justify-between items-center">
          <div><p className="text-xs font-mono text-amber-400 tracking-[.2em] uppercase">Operations Command</p><h2 id="campaign-heading" className="text-2xl font-bold uppercase">Campaigns</h2></div>
          <button onClick={onClose} aria-label="Close campaigns" className="p-2 hover:bg-neutral-800 rounded-lg"><X /></button>
        </header>
        <div className="grid md:grid-cols-[.85fr_1.15fr]">
          <div className="p-4 space-y-2 border-b md:border-b-0 md:border-r border-[#2d3947]" aria-label="Campaign operations">
            {CAMPAIGNS.map((operation, index) => {
              const Icon = icons[index];
              return <button key={operation.id} aria-pressed={campaign.id === operation.id} onClick={() => setInspectedId(operation.id)} className={`w-full text-left p-4 rounded-xl border flex gap-3 transition-colors ${campaign.id === operation.id ? 'border-amber-500 bg-amber-500/10' : 'border-[#293647] bg-[#17202c] hover:border-neutral-500'}`}>
                <Icon className="w-5 h-5 text-amber-400 mt-1 shrink-0" /><div><h3 className="font-bold uppercase tracking-wide">{operation.name}</h3><p className="text-xs text-neutral-400 mt-1">{operation.mapSize.toLocaleString()} × {operation.mapSize.toLocaleString()} · {operation.terrain} terrain</p></div>
              </button>;
            })}
          </div>
          <div className="p-6 space-y-5">
            <div className="relative h-44 overflow-hidden bg-[#0d151c] border border-[#2d3947] rounded-xl" aria-hidden="true">
              <svg viewBox="0 0 400 180" className="w-full h-full">
                <defs><pattern id="campaign-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#253544" strokeWidth="1" /></pattern></defs>
                <rect width="400" height="180" fill="url(#campaign-grid)" />
                {Array.from({ length: campaign.terrain === 'open' ? 8 : 32 }, (_, index) => campaign.terrain === 'forest'
                  ? <circle key={index} cx={28 + (index * 71) % 340} cy={20 + (index * 47) % 140} r="12" fill="#344a38" />
                  : <rect key={index} x={20 + (index % 8) * 46} y={16 + Math.floor(index / 8) * 40} width="25" height="22" fill="#38424c" />)}
                <path d="M200 162 L200 92 L270 40" fill="none" stroke="#d8ab58" strokeWidth="2" strokeDasharray="5 5" /><circle cx="200" cy="92" r="22" fill="#d8ab5820" stroke="#d8ab58" /><path d="M193 158 L200 145 L207 158 Z" fill="#9bbb99" />
              </svg>
              <span className="absolute bottom-2 right-3 text-[10px] font-mono text-neutral-400 uppercase">Tactical overview · not to scale</span>
            </div>
            <div><h3 className="text-2xl font-bold text-white uppercase">{campaign.name}</h3><p className="text-sm text-neutral-400 mt-2 leading-relaxed">{campaign.briefing}</p></div>
            <ul className="space-y-2 text-xs">{campaign.features.map(feature => <li key={feature} className="flex gap-2 items-center"><Check className="w-4 h-4 text-amber-400" />{feature}</li>)}</ul>
            <div className="border-t border-[#2d3947] pt-4 flex flex-wrap justify-between gap-2 text-xs font-mono"><span>3 increasingly difficult phases</span><span className="text-amber-400">From {campaign.mission.rewardCredits.toLocaleString()} CR / phase</span></div>
            <button onClick={() => onDeploy(campaign.id)} className="w-full p-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold uppercase flex justify-center gap-2 items-center">Deploy Campaign <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
