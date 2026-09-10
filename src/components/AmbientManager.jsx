import React, { useEffect, useRef } from 'react';
import { getAssetUrl } from '../services/db';

export const AmbientManager = ({ ambientState, tracksList = [] }) => {
  const audioRef = useRef(null);

  const activeTrack = tracksList.find(t => t.id === ambientState?.trackId);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeTrack?.fileData) {
      const src = getAssetUrl(activeTrack.fileData);
      if (audio.src !== src) {
        audio.src = src;
        audio.currentTime = 0;
      }
      audio.loop = ambientState?.loop ?? true;
      audio.volume = typeof ambientState?.volume === 'number' ? ambientState.volume : 0.7;
      audio.play().catch(err => console.warn('Ambient autoplay prevented:', err));
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [activeTrack?.id, activeTrack?.fileData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof ambientState?.volume === 'number') {
      audio.volume = Math.max(0, Math.min(1, ambientState.volume));
    }
  }, [ambientState?.volume]);

  return <audio ref={audioRef} className="hidden" preload="auto" />;
};
