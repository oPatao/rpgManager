import React from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { PartyMemberCard } from './PartyMemberCard';

export const PartyTracker = () => {
  const role = useRPGStore(state => state.role);
  const partyState = useRPGStore(state => state.partyTrackerState);
  const setPartyState = useRPGStore(state => state.setPartyTrackerState);
  const npcs = useRPGStore(state => state.npcs);

  if (role !== 'master') return null;

  const partyNPCs = npcs.filter(n => n.inParty);
  const isCollapsed = partyState?.isCollapsed ?? false;

  if (isCollapsed) {
    return (
      <button
        onClick={() => setPartyState(s => ({ ...s, isCollapsed: false }))}
        className="fixed left-0 top-0 bottom-0 w-12 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center justify-start pt-4 z-40 transition-all duration-300 hover:bg-slate-900 group shadow-xl"
        title="Expandir Party Tracker"
      >
        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
          <Users className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-3 flex flex-col items-center gap-1">
          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full font-mono">
            {partyNPCs.length}
          </span>
        </div>
        <div className="mt-auto mb-4 text-slate-600 group-hover:text-slate-300">
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
    );
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-slate-950 border-r border-slate-800/80 flex flex-col z-40 transition-all duration-300 shadow-2xl">
      {/* HEADER DA SIDEBAR */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800/80 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider truncate">Party Tracker</h3>
            <span className="text-[10px] font-extrabold text-amber-400 font-mono">({partyNPCs.length})</span>
          </div>
        </div>
        <button
          onClick={() => setPartyState(s => ({ ...s, isCollapsed: true }))}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          title="Recolher Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* LISTA ROLÁVEL DE NPCS DO PARTY */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
        {partyNPCs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Users className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-500 font-medium">Nenhum NPC no party.</p>
            <p className="text-[10px] text-slate-600 mt-1">Marque a opção "Adicionar ao Party" na edição de qualquer NPC para acompanhá-lo aqui.</p>
          </div>
        ) : (
          partyNPCs.map(npc => (
            <PartyMemberCard key={npc.id} npc={npc} />
          ))
        )}
      </div>
    </aside>
  );
};
