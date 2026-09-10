import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';

const SHORTCUTS_LIST = [
  { key: '1', desc: 'Aba: NPCs' },
  { key: '2', desc: 'Aba: Mapas & Refúgios' },
  { key: '3', desc: 'Aba: Itens & Lojas' },
  { key: '4', desc: 'Aba: Áudio' },
  { key: '5', desc: 'Aba: Cutscenes' },
  { key: 'G', desc: 'Abrir Gerador de NPCs' },
  { key: 'P', desc: 'Alternar Picture-in-Picture' },
  { key: 'T', desc: 'Recolher/Expandir Rastreador do Grupo' },
  { key: 'Esc', desc: 'Fechar Modais Abertos' },
];

export const KeyboardShortcutsHelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-white text-sm">Atalhos de Teclado</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {SHORTCUTS_LIST.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800"
            >
              <span className="text-xs text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 text-amber-400 rounded-lg text-xs font-mono font-bold shadow">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const KeyboardShortcuts = () => {
  const role = useRPGStore(state => state.role);
  const setUiState = useRPGStore(state => state.setUiState);
  const setNpcGeneratorState = useRPGStore(state => state.setNpcGeneratorState);
  const setPipState = useRPGStore(state => state.setPipState);
  const setPartyTrackerState = useRPGStore(state => state.setPartyTrackerState);
  const setModalState = useRPGStore(state => state.setModalState);
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);

  useEffect(() => {
    if (role !== 'master') return;

    const handleKeyDown = (e) => {
      // Ignora se o usuário estiver digitando em campos de texto
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) ||
        e.target?.isContentEditable
      ) {
        return;
      }

      if (e.key === '1') {
        setUiState(s => ({ ...s, activeTab: 'npcs' }));
      } else if (e.key === '2') {
        setUiState(s => ({ ...s, activeTab: 'maps' }));
      } else if (e.key === '3') {
        setUiState(s => ({ ...s, activeTab: 'items' }));
      } else if (e.key === '4') {
        setUiState(s => ({ ...s, activeTab: 'audio' }));
      } else if (e.key === '5') {
        setUiState(s => ({ ...s, activeTab: 'cutscenes' }));
      } else if (e.key.toLowerCase() === 'g') {
        setNpcGeneratorState({ isOpen: true });
      } else if (e.key.toLowerCase() === 'p') {
        setPipState(s => ({ ...s, isVisible: !s.isVisible }));
      } else if (e.key.toLowerCase() === 't') {
        setPartyTrackerState(s => ({ ...s, isCollapsed: !s.isCollapsed }));
      } else if (e.key === 'Escape') {
        setModalState({ isOpen: false, type: null, data: null });
        setSheetModalState({ isOpen: false, npcId: null });
        setNpcGeneratorState({ isOpen: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, setUiState, setNpcGeneratorState, setPipState, setPartyTrackerState, setModalState, setSheetModalState]);

  return null;
};
