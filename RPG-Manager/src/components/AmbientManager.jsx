// src/components/AmbientManager.jsx
import React, { useEffect, useRef } from 'react';

export const AmbientManager = ({ ambientState, tracksList }) => {
  const player = useRef(null);
  const tracksRef = useRef([]);

  useEffect(() => {
    tracksRef.current = tracksList;
  }, [tracksList]);

  useEffect(() => {
    player.current = new Audio();
    return () => {
      if (player.current) player.current.pause();
    };
  }, []);

  // Altera o volume do ambiente em tempo real se o mestre mexer no slider
  useEffect(() => {
    if (player.current && !player.current.paused && ambientState?.volume !== undefined) {
      player.current.volume = ambientState.volume;
    }
  }, [ambientState?.volume]);

  useEffect(() => {
    if (!player.current) return;

    if (!ambientState?.trackId) {
      const actPlayer = player.current;
      const interval = setInterval(() => {
        if (actPlayer.volume > 0.1) {
          actPlayer.volume -= 0.1;
        } else {
          actPlayer.volume = 0;
          actPlayer.pause();
          clearInterval(interval);
        }
      }, 100);
      return;
    }

    const trackInfo = tracksRef.current.find(t => t.id === ambientState.trackId);
    if (trackInfo) {
      if (player.current.src === trackInfo.fileData && !player.current.paused) {
        player.current.loop = ambientState.loop;
        return;
      }

      player.current.src = trackInfo.fileData;
      player.current.loop = ambientState.loop;
      player.current.volume = ambientState.volume !== undefined ? ambientState.volume : 0.6; 
      player.current.play().catch(e => console.log("Autoplay ambiente bloqueado.", e));
    }
  }, [ambientState?.trackId]);

  useEffect(() => {
    if (player.current && ambientState) {
      player.current.loop = ambientState.loop;
    }
  }, [ambientState?.loop]);

  return null;
};