import React from 'react';
import { Users, ChevronLeft, ChevronRight, Heart, FileText, Plus, Minus, UserCheck } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { getAssetUrl } from '../services/db';

export const PartyTracker = () => {
  const role = useRPGStore(state => state.role);
  const partyTrackerState = useRPGStore(state => state.partyTrackerState);
  const setPartyTrackerState = useRPGStore(state => state.setPartyTrackerState);
  const npcs = useRPGStore(state => state.npcs) || [];
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);
  const updateNPCStats = useRPGStore(state => state.updateNPCStats);

  if (role !== 'master') return null;

  const isCollapsed = partyTrackerState?.isCollapsed || false;
  const partyMembers = npcs.filter(n => n.inParty);

  const toggleCollapse = () => {
    setPartyTrackerState(s => ({ ...s, isCollapsed: !s.isCollapsed }));
  };

  const handleAdjustPV = (npc, delta) => {
    const currentPV = npc.sheet?.pvCurrent ?? 20;
    const maxPV = npc.sheet?.pvMax ?? 20;
    const newPV = Math.max(0, Math.min(maxPV, currentPV + delta));
    updateNPCStats(npc.id, { pvCurrent: newPV });
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-12' : 'w-[280px]'
      }`}
    >
      {/* Header do Tracker */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <Users className="w-5 h-5 text-amber-500 shrink-0" />
            <h3 className="font-bold text-sm text-white truncate">Grupo ({partyMembers.length})</h3>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors mx-auto"
          title={isCollapsed ? "Expandir Rastreador" : "Recolher"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Conteúdo com os membros do grupo */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {partyMembers.length === 0 ? (
          !isCollapsed && (
            <div className="text-center py-6 text-xs text-slate-500 px-2">
              Nenhum membro no grupo. Ative a opção "No Grupo" nos NPCs da campanha.
            </div>
          )
        ) : (
          partyMembers.map(npc => {
            const avatarUrl = npc.fileData ? getAssetUrl(npc.fileData) : null;
            const pvCurrent = npc.sheet?.pvCurrent ?? 20;
            const pvMax = npc.sheet?.pvMax ?? 20;
            const pvPercent = Math.max(0, Math.min(100, (pvCurrent / pvMax) * 100));

            if (isCollapsed) {
              return (
                <button
                  key={npc.id}
                  onClick={() => setSheetModalState({ isOpen: true, npcId: npc.id })}
                  className="w-8 h-8 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden hover:border-amber-500 transition-colors"
                  title={`${npc.name} (${pvCurrent}/${pvMax} PV)`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={npc.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400">{npc.name.slice(0, 2)}</span>
                  )}
                </button>
              );
            }

            return (
              <div
                key={npc.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={npc.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-amber-500">
                          {npc.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-bold text-xs text-white truncate block">{npc.name}</span>
                      <span className="text-[10px] text-amber-500 truncate block">{npc.role || 'Membro'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSheetModalState({ isOpen: true, npcId: npc.id })}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Abrir Ficha"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Barra de PV */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 relative">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pvPercent > 50 ? 'bg-emerald-500' : pvPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pvPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap">
                    {pvCurrent}/{pvMax}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleAdjustPV(npc, -1)}
                      className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-red-900/60 rounded text-slate-300 text-xs font-bold"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleAdjustPV(npc, 1)}
                      className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-emerald-900/60 rounded text-slate-300 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
