import React, { useState } from 'react';
import { Users, Map, Package, Music, Film, Keyboard } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { KeyboardShortcutsHelpModal } from './KeyboardShortcuts';

export const TABS_CONFIG = [
  { id: 'npcs', label: 'NPCs', shortcut: '1', icon: Users },
  { id: 'maps', label: 'Mapas & Refúgios', shortcut: '2', icon: Map },
  { id: 'items', label: 'Itens & Lojas', shortcut: '3', icon: Package },
  { id: 'audio', label: 'Áudio', shortcut: '4', icon: Music },
  { id: 'cutscenes', label: 'Cutscenes', shortcut: '5', icon: Film }
];

export const TopNav = () => {
  const role = useRPGStore(state => state.role);
  const uiState = useRPGStore(state => state.uiState);
  const setUiState = useRPGStore(state => state.setUiState);
  const [showHelpModal, setShowHelpModal] = useState(false);

  if (role !== 'master') return null;

  const activeTab = uiState?.activeTab || 'npcs';

  return (
    <>
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
          {TABS_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setUiState(s => ({ ...s, activeTab: tab.id }))}
                className={`whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isActive 
                    ? 'bg-amber-700/60 text-amber-100' 
                    : 'bg-slate-900/80 text-slate-500 border border-slate-800'
                }`}>
                  [{tab.shortcut}]
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowHelpModal(true)}
          title="Ver Atalhos de Teclado"
          className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-700/50 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 text-xs"
        >
          <Keyboard className="w-4 h-4 text-amber-500" />
          <span className="hidden md:inline font-medium">Atalhos</span>
        </button>
      </div>

      <KeyboardShortcutsHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </>
  );
};
