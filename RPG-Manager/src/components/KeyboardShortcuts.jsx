import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';

export const useKeyboardShortcuts = () => {
  const role = useRPGStore(state => state.role);
  const activeScene = useRPGStore(state => state.activeScene);
  const publishScene = useRPGStore(state => state.publishScene);
  const tracks = useRPGStore(state => state.tracks);
  const setModalState = useRPGStore(state => state.setModalState);
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);
  const setUiState = useRPGStore(state => state.setUiState);

  useEffect(() => {
    if (role !== 'master') return;

    const clearNPCsFromScene = async () => {
      const isRefuge = !!activeScene.refuge;
      const currentNpcs = isRefuge 
        ? (activeScene.refugeNpcs || [])
        : (Array.isArray(activeScene.npcs) && activeScene.npcs.length > 0 ? activeScene.npcs : (activeScene.npc ? [activeScene.npc] : []));

      if (currentNpcs.length === 0) return;

      const fading = currentNpcs.map(n => ({ ...n, isFadingOut: true }));

      if (isRefuge) {
        await publishScene({ ...activeScene, refugeNpcs: fading });
        setTimeout(async () => {
          const current = useRPGStore.getState().activeScene;
          await publishScene({ ...current, refugeNpcs: [] });
        }, 500);
      } else {
        await publishScene({ ...activeScene, npcs: fading, npc: null });
        setTimeout(async () => {
          const current = useRPGStore.getState().activeScene;
          await publishScene({ ...current, npcs: [], npc: null });
        }, 500);
      }
    };

    const transitionTrack = () => {
      if (!tracks || tracks.length === 0) return;
      if (!activeScene.audio?.trackId) {
        publishScene({ ...activeScene, audio: { ...activeScene.audio, trackId: tracks[0].id } });
        return;
      }
      const currentIndex = tracks.findIndex(t => t.id === activeScene.audio.trackId);
      const nextIndex = (currentIndex + 1) % tracks.length;
      publishScene({
        ...activeScene,
        audio: { ...activeScene.audio, trackId: tracks[nextIndex].id }
      });
    };

    const transitionAmbient = () => {
      const currentAmbientId = activeScene.ambient?.trackId;
      if (currentAmbientId) {
        publishScene({ ...activeScene, ambient: { ...activeScene.ambient, trackId: null } });
      } else {
        if (tracks.length > 0) {
          const ambientTracks = tracks.filter(t => 
            t.tags?.some(tag => tag.toLowerCase().includes('ambient') || tag.toLowerCase().includes('ambiente'))
          );
          const trackToUse = ambientTracks.length > 0 ? ambientTracks[0] : tracks[0];
          publishScene({ ...activeScene, ambient: { ...activeScene.ambient, trackId: trackToUse.id } });
        }
      }
    };

    const handleKeyDown = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch(e.key.toLowerCase()) {
        case 'c':
          e.preventDefault();
          clearNPCsFromScene();
          break;
        case 'i':
          e.preventDefault();
          if (activeScene.handout) {
            publishScene({ ...activeScene, handout: null });
          }
          break;
        case 'm':
          e.preventDefault();
          transitionTrack();
          break;
        case 'a':
          e.preventDefault();
          transitionAmbient();
          break;
        case '1':
          e.preventDefault();
          setUiState(s => ({ ...s, activeTab: 'npcs' }));
          break;
        case '2':
          e.preventDefault();
          setUiState(s => ({ ...s, activeTab: 'maps' }));
          break;
        case '3':
          e.preventDefault();
          setUiState(s => ({ ...s, activeTab: 'items' }));
          break;
        case '4':
          e.preventDefault();
          setUiState(s => ({ ...s, activeTab: 'audio' }));
          break;
        case '5':
          e.preventDefault();
          setUiState(s => ({ ...s, activeTab: 'cutscenes' }));
          break;
        case 'escape':
          setModalState({ isOpen: false, type: null, data: null });
          setSheetModalState({ isOpen: false, npcId: null });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, activeScene, tracks, publishScene, setModalState, setSheetModalState, setUiState]);
};

export const KeyboardShortcutsHelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const shortcuts = [
    { key: '1 - 5', desc: 'Navegar entre as Abas do Menu' },
    { key: 'C', desc: 'Limpar NPCs da cena (com fade out)' },
    { key: 'I', desc: 'Esconder Item / Documento em tela' },
    { key: 'M', desc: 'Próxima música / Trilha sonora' },
    { key: 'A', desc: 'Ligar / Desligar Som Ambiente' },
    { key: 'Esc', desc: 'Fechar Modais e Fichas' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-4 text-amber-500 font-bold text-lg">
          <Keyboard className="w-6 h-6" />
          <span>Atalhos de Teclado (Mestre)</span>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-md">
                {s.key}
              </span>
              <span className="text-xs text-slate-300 font-medium">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const KeyboardShortcuts = () => {
  useKeyboardShortcuts();
  return null;
};
