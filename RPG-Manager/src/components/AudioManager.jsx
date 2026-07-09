import React, { useEffect, useRef } from 'react';
import { getAssetUrl } from '../services/db';

export const formatTime = (timeInSeconds) => {
  if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";
  const m = Math.floor(timeInSeconds / 60);
  const s = Math.floor(timeInSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const AudioManager = ({ audioState, setAudioProgress, tracksList }) => {
  const player1 = useRef(null);
  const player2 = useRef(null);
  const activePlayer = useRef(1);
  const tracksRef = useRef([]);

  useEffect(() => {
     tracksRef.current = tracksList;
  }, [tracksList]);

  useEffect(() => {
    player1.current = new Audio();
    player2.current = new Audio();

    const progressInterval = setInterval(() => {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && !current.paused && current.duration) {
        setAudioProgress({ time: current.currentTime, duration: current.duration });
      }
    }, 1000);

    return () => clearInterval(progressInterval);
  }, [setAudioProgress]);

  // Altera o volume da trilha ativa em tempo real se o mestre mexer no slider
  useEffect(() => {
    if (!player1.current || !player2.current) return;
    const current = activePlayer.current === 1 ? player1.current : player2.current;
    if (current && !current.paused && audioState?.volume !== undefined) {
      current.volume = audioState.volume;
    }
  }, [audioState?.volume]);

  const fadeOut = (audioElement) => {
    if (!audioElement || audioElement.paused) return;
    const interval = setInterval(() => {
      let newVol = audioElement.volume - 0.1;
      if (newVol > 0.05) {
        audioElement.volume = newVol;
      } else {
        audioElement.volume = 0;
        audioElement.pause();
        audioElement.currentTime = 0;
        clearInterval(interval);
      }
    }, 100);
  };

  const fadeIn = (audioElement, targetVolume = 1) => {
    if (!audioElement) return;
    audioElement.volume = 0;
    const interval = setInterval(() => {
      let newVol = audioElement.volume + 0.1;
      if (newVol < targetVolume - 0.05) {
        audioElement.volume = newVol;
      } else {
        audioElement.volume = targetVolume;
        clearInterval(interval);
      }
    }, 100);
  };

  useEffect(() => {
    if (!player1.current || !player2.current) return;
    const current = activePlayer.current === 1 ? player1.current : player2.current;
    const next = activePlayer.current === 1 ? player2.current : player1.current;

    if (!audioState?.trackId) {
      fadeOut(player1.current);
      fadeOut(player2.current);
      setAudioProgress({ time: 0, duration: 0 });
      return;
    }

    const trackInfo = tracksRef.current.find(t => t.id === audioState.trackId);
    if (trackInfo) {
      next.src = getAssetUrl(trackInfo.fileData);
      next.loop = audioState.loop;
      next.volume = 0;
      
      const playPromise = next.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          fadeIn(next, audioState.volume !== undefined ? audioState.volume : 1);
          fadeOut(current);
          activePlayer.current = activePlayer.current === 1 ? 2 : 1;
        }).catch(e => console.log("Autoplay bloqueado.", e));
      }
    }
  }, [audioState?.trackId]);
  
  useEffect(() => {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && audioState) current.loop = audioState.loop;
  }, [audioState?.loop]);

  useEffect(() => {
    if (audioState?.seekEvent) {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && Math.abs(current.currentTime - audioState.seekEvent.time) > 2) {
          current.currentTime = audioState.seekEvent.time;
      }
    }
  }, [audioState?.seekEvent]);

  return null;
};