import React from 'react';
import { Minimize2, Maximize2, X, Eye } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { SceneRenderer } from './SceneRenderer';

export const PictureInPicture = () => {
  const role = useRPGStore(state => state.role);
  const pipState = useRPGStore(state => state.pipState);
  const setPipState = useRPGStore(state => state.setPipState);
  const activeScene = useRPGStore(state => state.activeScene);

  if (role !== 'master' || !pipState?.isVisible) {
    return null;
  }

  const isMinimized = pipState.isMinimized;
  const size = pipState.size || 'medium';

  const sizeClasses = {
    small: 'w-64 h-36',
    medium: 'w-80 h-48',
    large: 'w-96 h-56'
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
      {/* Barra de título do PiP */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 select-none cursor-move">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Visão dos Jogadores</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPipState(s => ({ ...s, isMinimized: !s.isMinimized }))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={isMinimized ? "Expandir" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setPipState(s => ({ ...s, isVisible: false }))}
            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
            title="Fechar PiP"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Conteúdo da janela PiP */}
      {!isMinimized && (
        <div className={`relative overflow-hidden bg-black ${sizeClasses[size] || sizeClasses.medium}`}>
          <div className="absolute inset-0 pointer-events-none scale-100 origin-center">
            <SceneRenderer activeScene={activeScene} />
          </div>
        </div>
      )}
    </div>
  );
};
