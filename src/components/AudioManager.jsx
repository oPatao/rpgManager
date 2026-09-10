import React, { useEffect, useRef } from 'react';
import { getAssetUrl } from '../services/db';
import { useRPGStore } from '../store/useRPGStore';

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
  const fadeOutInterval = useRef(null);
  const fadeInInterval = useRef(null);

  useEffect(() => {
     tracksRef.current = tracksList;
  }, [tracksList]);

  const clearFades = () => {
    if (fadeOutInterval.current) {
      clearInterval(fadeOutInterval.current);
      fadeOutInterval.current = null;
    }
    if (fadeInInterval.current) {
      clearInterval(fadeInInterval.current);
      fadeInInterval.current = null;
    }
  };

  useEffect(() => {
    player1.current = new Audio();
    player2.current = new Audio();

    const progressInterval = setInterval(() => {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && !current.paused) {
        const dur = current.duration === Infinity ? Infinity : (isFinite(current.duration) ? current.duration : 0);
        setAudioProgress({ time: current.currentTime || 0, duration: dur });
      }
    }, 1000);

    // Monitora término de faixa para transição automática da fila ("Mudar ao final dessa música")
    const handleTrackEnded = () => {
      const queuedId = useRPGStore.getState().queuedTrackId;
      if (queuedId) {
        window.dispatchEvent(new CustomEvent('rpg-auto-next-track', { detail: { nextTrackId: queuedId } }));
      }
    };

    const p1 = player1.current;
    const p2 = player2.current;
    p1.addEventListener('ended', handleTrackEnded);
    p2.addEventListener('ended', handleTrackEnded);

    return () => {
      clearInterval(progressInterval);
      clearFades();
      p1.removeEventListener('ended', handleTrackEnded);
      p2.removeEventListener('ended', handleTrackEnded);
      p1.pause();
      p2.pause();
    };
  }, [setAudioProgress]);

  // Altera o volume da trilha ativa em tempo real se o mestre mexer no slider
  useEffect(() => {
    if (!player1.current || !player2.current) return;
    const current = activePlayer.current === 1 ? player1.current : player2.current;
    if (current && !current.paused && audioState?.volume !== undefined) {
      current.volume = audioState.volume;
    }
  }, [audioState?.volume]);

  const fadeOut = (audioElement, stepTime = 80) => {
    if (!audioElement || audioElement.paused) return;
    if (fadeOutInterval.current) clearInterval(fadeOutInterval.current);
    fadeOutInterval.current = setInterval(() => {
      let newVol = audioElement.volume - 0.1;
      if (newVol > 0.05) {
        audioElement.volume = newVol;
      } else {
        audioElement.volume = 0;
        audioElement.pause();
        audioElement.currentTime = 0;
        clearInterval(fadeOutInterval.current);
        fadeOutInterval.current = null;
      }
    }, stepTime);
  };

  const fadeIn = (audioElement, targetVolume = 1, stepTime = 80) => {
    if (!audioElement) return;
    if (fadeInInterval.current) clearInterval(fadeInInterval.current);
    audioElement.volume = 0;
    fadeInInterval.current = setInterval(() => {
      let newVol = audioElement.volume + 0.1;
      if (newVol < targetVolume - 0.05) {
        audioElement.volume = newVol;
      } else {
        audioElement.volume = targetVolume;
        clearInterval(fadeInInterval.current);
        fadeInInterval.current = null;
      }
    }, stepTime);
  };

  useEffect(() => {
    if (!player1.current || !player2.current) return;
    const current = activePlayer.current === 1 ? player1.current : player2.current;
    const next = activePlayer.current === 1 ? player2.current : player1.current;

    // Caso de parar trilha (trackId nulo)
    if (!audioState?.trackId) {
      if (audioState?.transition === 'instant') {
        clearFades();
        if (player1.current) { player1.current.pause(); player1.current.currentTime = 0; }
        if (player2.current) { player2.current.pause(); player2.current.currentTime = 0; }
      } else {
        fadeOut(player1.current);
        fadeOut(player2.current);
      }
      setAudioProgress({ time: 0, duration: 0 });
      return;
    }

    const trackInfo = tracksRef.current.find(t => t.id === audioState.trackId);
    if (trackInfo) {
      const srcUrl = getAssetUrl(trackInfo.fileData);
      next.src = srcUrl;
      next.loop = !!audioState.loop;
      const targetVolume = audioState.volume !== undefined ? audioState.volume : 1;

      // 1. MUDAR INSTANTANEAMENTE (Corte Seco)
      if (audioState?.transition === 'instant') {
        clearFades();
        if (current) {
          current.pause();
          current.currentTime = 0;
        }
        next.volume = targetVolume;
        const playPromise = next.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            activePlayer.current = activePlayer.current === 1 ? 2 : 1;
          }).catch(e => console.log("Autoplay bloqueado:", e));
        }
      } else {
        // 2. TRANSIÇÃO SUAVE NA HORA (Fade In / Fade Out - Crossfade)
        clearFades();
        next.volume = 0;
        const playPromise = next.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            fadeIn(next, targetVolume);
            fadeOut(current);
            activePlayer.current = activePlayer.current === 1 ? 2 : 1;
          }).catch(e => console.log("Autoplay bloqueado:", e));
        }
      }
    }
  }, [audioState?.trackId, audioState?.playTimestamp]);
  
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