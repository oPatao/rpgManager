import React from 'react';
import { Music, Wind, Square, Volume2, Repeat } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { formatTime } from './AudioManager';

export const AudioBar = () => {
  const role = useRPGStore(state => state.role);
  const activeScene = useRPGStore(state => state.activeScene);
  const tracks = useRPGStore(state => state.tracks) || [];
  const audioProgress = useRPGStore(state => state.audioProgress);
  const publishScene = useRPGStore(state => state.publishScene);

  const currentAudioTrack = tracks.find(t => t.id === activeScene?.audio?.trackId);
  const currentAmbientTrack = tracks.find(t => t.id === activeScene?.ambient?.trackId);

  // Se nada de áudio ou ambiente estiver ativo, não exibe a barra
  if (!currentAudioTrack && !currentAmbientTrack) {
    return null;
  }

  const handleStopAudio = () => {
    publishScene({
      ...activeScene,
      audio: { trackId: null, loop: true, seekEvent: null }
    });
  };

  const handleStopAmbient = () => {
    publishScene({
      ...activeScene,
      ambient: { trackId: null, loop: true }
    });
  };

  const handleToggleLoop = () => {
    publishScene({
      ...activeScene,
      audio: {
        ...activeScene.audio,
        loop: !activeScene.audio?.loop
      }
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 flex items-center justify-between gap-4 text-xs shadow-2xl">
      {/* Informações da Trilha Principal */}
      <div className="flex items-center gap-3 min-w-0">
        {currentAudioTrack ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-600/40 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider">Trilha Musical</span>
              <span className="font-semibold text-white truncate block max-w-[180px] sm:max-w-xs">{currentAudioTrack.name}</span>
            </div>
            <span className="font-mono text-slate-400 text-[11px] hidden sm:inline ml-1">
              {formatTime(audioProgress.time)} / {formatTime(audioProgress.duration)}
            </span>
            {role === 'master' && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={handleToggleLoop}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    activeScene.audio?.loop
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                  title={activeScene.audio?.loop ? 'Loop Ativado' : 'Loop Desativado'}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleStopAudio}
                  className="p-1.5 bg-slate-900 hover:bg-red-900/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-600/50 rounded-lg transition-colors"
                  title="Parar Música"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-500 italic text-[11px]">Nenhuma música tocando</span>
        )}
      </div>

      {/* Informações do Som Ambiente */}
      <div className="flex items-center gap-3">
        {currentAmbientTrack && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-600/40 flex items-center justify-center shrink-0">
              <Wind className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Ambiente</span>
              <span className="font-semibold text-white truncate block max-w-[140px]">{currentAmbientTrack.name}</span>
            </div>
            {role === 'master' && (
              <button
                onClick={handleStopAmbient}
                className="p-1.5 bg-slate-900 hover:bg-red-900/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-600/50 rounded-lg transition-colors"
                title="Parar Ambiente"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
