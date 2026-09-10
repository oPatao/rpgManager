import React, { useEffect, useRef } from 'react';
import { getAssetUrl } from '../services/db';

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null || seconds === undefined || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const AudioManager = ({ audioState, setAudioProgress, tracksList = [] }) => {
  const audioRef = useRef(null);

  const activeTrack = tracksList.find(t => t.id === audioState?.trackId);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeTrack?.fileData) {
      const src = getAssetUrl(activeTrack.fileData);
      if (audio.src !== src) {
        audio.src = src;
        audio.currentTime = 0;
      }
      audio.loop = audioState?.loop ?? true;
      audio.volume = typeof audioState?.volume === 'number' ? audioState.volume : 1;
      audio.play().catch(err => console.warn('Autoplay prevented:', err));
    } else {
      audio.pause();
      audio.src = '';
      if (setAudioProgress) setAudioProgress({ time: 0, duration: 0 });
    }
  }, [activeTrack?.id, activeTrack?.fileData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof audioState?.volume === 'number') {
      audio.volume = Math.max(0, Math.min(1, audioState.volume));
    }
  }, [audioState?.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof audioState?.seekEvent === 'number') {
      audio.currentTime = audioState.seekEvent;
    }
  }, [audioState?.seekEvent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (setAudioProgress) {
        setAudioProgress({
          time: audio.currentTime || 0,
          duration: audio.duration || 0
        });
      }
    };

    const handleLoadedMetadata = () => {
      if (setAudioProgress) {
        setAudioProgress(prev => ({
          ...prev,
          duration: audio.duration || 0
        }));
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [setAudioProgress]);

  return <audio ref={audioRef} className="hidden" preload="auto" />;
};
