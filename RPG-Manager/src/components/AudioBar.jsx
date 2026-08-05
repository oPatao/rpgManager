import React from 'react';
import { Music, Play, Pause, SkipForward, Repeat, Volume2, FastForward, CloudRain } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { getAssetUrl } from '../services/db';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AudioBar = () => {
  const role = useRPGStore(state => state.role);
  const activeScene = useRPGStore(state => state.activeScene);
  const publishScene = useRPGStore(state => state.publishScene);
  const tracks = useRPGStore(state => state.tracks);
  const queuedTrackId = useRPGStore(state => state.queuedTrackId);
  const setQueuedTrackId = useRPGStore(state => state.setQueuedTrackId);
  const audioProgress = useRPGStore(state => state.audioProgress);
  const setUiState = useRPGStore(state => state.setUiState);

  if (role !== 'master') return null;

  const currentAudio = activeScene?.audio || {};
  const currentAmbient = activeScene?.ambient || {};

  const currentTrack = tracks?.find(t => t.id === currentAudio.trackId);
  const queuedTrack = tracks?.find(t => t.id === queuedTrackId);
  const ambientTrack = tracks?.find(t => t.id === currentAmbient.trackId);

  const isPlaying = !!currentAudio.trackId;
  const isAmbientPlaying = !!currentAmbient.trackId;

  // Next track handler
  const handleNextTrack = () => {
    if (!tracks || tracks.length === 0) return;
    if (queuedTrack) {
      publishScene({
        ...activeScene,
        audio: { ...currentAudio, trackId: queuedTrack.id }
      });
      setQueuedTrackId(null);
      return;
    }
    if (!currentAudio.trackId) {
      publishScene({ ...activeScene, audio: { ...currentAudio, trackId: tracks[0].id } });
      return;
    }
    const currentIndex = tracks.findIndex(t => t.id === currentAudio.trackId);
    const nextIndex = (currentIndex + 1) % tracks.length;
    publishScene({
      ...activeScene,
      audio: { ...currentAudio, trackId: tracks[nextIndex].id }
    });
  };

  // Play / Pause toggle
  const handlePlayPause = () => {
    if (isPlaying) {
      // Temporarily store current track as queued or pause by setting trackId to null
      publishScene({
        ...activeScene,
        audio: { ...currentAudio, lastTrackId: currentAudio.trackId, trackId: null }
      });
    } else {
      const trackToPlay = currentAudio.lastTrackId || (tracks && tracks.length > 0 ? tracks[0].id : null);
      if (trackToPlay) {
        publishScene({
          ...activeScene,
          audio: { ...currentAudio, trackId: trackToPlay }
        });
      }
    }
  };

  // Toggle Loop
  const handleToggleLoop = () => {
    publishScene({
      ...activeScene,
      audio: { ...currentAudio, loop: !currentAudio.loop }
    });
  };

  // Volume slider
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    publishScene({
      ...activeScene,
      audio: { ...currentAudio, volume: vol }
    });
  };

  // Ambient Volume slider
  const handleAmbientVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    publishScene({
      ...activeScene,
      ambient: { ...currentAmbient, volume: vol }
    });
  };

  // Toggle Ambient
  const handleToggleAmbient = () => {
    if (isAmbientPlaying) {
      publishScene({
        ...activeScene,
        ambient: { ...currentAmbient, trackId: null }
      });
    } else {
      const ambientTracks = tracks?.filter(t => 
        t.tags?.some(tag => tag.toLowerCase().includes('ambient') || tag.toLowerCase().includes('ambiente'))
      );
      const trackToUse = (ambientTracks && ambientTracks.length > 0) ? ambientTracks[0] : (tracks && tracks.length > 0 ? tracks[0] : null);
      if (trackToUse) {
        publishScene({
          ...activeScene,
          ambient: { ...currentAmbient, trackId: trackToUse.id }
        });
      }
    }
  };

  // Seek on click
  const handleSeek = (e) => {
    if (!audioProgress.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * audioProgress.duration;
    publishScene({
      ...activeScene,
      audio: { ...currentAudio, seekEvent: targetTime }
    });
  };

  const currentPercent = audioProgress.duration 
    ? Math.min(100, Math.max(0, (audioProgress.time / audioProgress.duration) * 100))
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90 px-4 py-2 text-slate-300 shadow-2xl flex items-center justify-between gap-3 sm:gap-6">
      
      {/* 1. TRILHA ATUAL (Esquerda) */}
      <div className="flex items-center gap-3 min-w-0 max-w-[220px] sm:max-w-[280px]">
        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center relative group">
          {currentTrack?.fileData ? (
            <img src={getAssetUrl(currentTrack.fileData)} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className={`w-5 h-5 ${isPlaying ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-100 truncate">
            {currentTrack ? currentTrack.name : 'Nenhuma Trilha Tocando'}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400 font-mono">
              {formatTime(audioProgress.time)} / {formatTime(audioProgress.duration)}
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-500 px-1 rounded">
              [M]
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTROLES DE PLAYBACK E BARRA DE PROGRESSO (Centro) */}
      <div className="flex-1 max-w-md flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleLoop}
            title={currentAudio.loop ? 'Loop Ativado' : 'Loop Desativado'}
            className={`p-1.5 rounded-lg transition-colors ${
              currentAudio.loop 
                ? 'text-amber-500 bg-amber-500/10' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePlayPause}
            title={isPlaying ? 'Pausar (Atalho M)' : 'Tocar'}
            className={`p-2 rounded-full transition-transform active:scale-95 ${
              isPlaying 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={handleNextTrack}
            title="Próxima Faixa [M]"
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentAudio.volume ?? 1}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* Barra de Progresso Interativa */}
        <div 
          onClick={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer relative overflow-hidden group/seek hover:h-2 transition-all"
        >
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${currentPercent}%` }}
          />
        </div>
      </div>

      {/* 3. PRÓXIMA TRILHA NA FILA (Centro-Direita, Visível em Desktop) */}
      <div className="hidden lg:flex items-center gap-2 max-w-[200px] border-l border-slate-800 pl-4">
        <FastForward className="w-4 h-4 text-amber-500/70 shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Próxima</div>
          {queuedTrack ? (
            <button
              onClick={() => {
                publishScene({
                  ...activeScene,
                  audio: { ...currentAudio, trackId: queuedTrack.id }
                });
                setQueuedTrackId(null);
              }}
              className="text-xs text-slate-300 hover:text-amber-400 truncate block text-left font-medium"
              title="Clique para tocar agora"
            >
              {queuedTrack.name}
            </button>
          ) : (
            <span className="text-xs text-slate-600 italic">Fila vazia</span>
          )}
        </div>
      </div>

      {/* 4. SOM AMBIENTE (Direita, Visível em telas sm+) */}
      <div className="hidden sm:flex items-center gap-3 border-l border-slate-800 pl-4">
        <button
          onClick={() => setUiState(s => ({ ...s, activeTab: 'audio' }))}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
          title="Abrir Gerenciador de Áudio [Tab 3]"
        >
          <CloudRain className={`w-4 h-4 ${isAmbientPlaying ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
          <div className="min-w-0 hidden md:block max-w-[110px]">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center">
              Ambiente <span className="text-[9px] text-slate-600 ml-1">[A]</span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
              {ambientTrack ? ambientTrack.name : 'Desativado'}
            </div>
          </div>
        </button>

        <button
          onClick={handleToggleAmbient}
          className={`p-1.5 rounded-lg border transition-colors ${
            isAmbientPlaying 
              ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-500 hover:text-slate-300'
          }`}
          title="Ligar / Desligar Som Ambiente [Atalhos A]"
        >
          {isAmbientPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={currentAmbient.volume ?? 0.5}
          onChange={handleAmbientVolumeChange}
          className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden md:block"
          title="Volume Ambiente"
        />
      </div>

    </div>
  );
};
