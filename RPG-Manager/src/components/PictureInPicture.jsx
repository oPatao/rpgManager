import React, { useState, useRef, useEffect } from 'react';
import { Eye, Minus, ChevronDown, ChevronUp, Monitor } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { SceneRenderer } from './SceneRenderer';

const SIZES = {
  small:  { width: 240, height: 135, scale: 240 / 1920, label: 'S' },
  medium: { width: 384, height: 216, scale: 384 / 1920, label: 'M' },
  large:  { width: 576, height: 324, scale: 576 / 1920, label: 'L' },
};

export const PictureInPicture = () => {
  const role = useRPGStore(state => state.role);
  const pipState = useRPGStore(state => state.pipState);
  const setPipState = useRPGStore(state => state.setPipState);
  const activeScene = useRPGStore(state => state.activeScene);

  // Apenas renderiza se for Mestre
  if (role !== 'master') return null;

  const currentSizeKey = SIZES[pipState?.size] ? pipState.size : 'medium';
  const { width, height, scale } = SIZES[currentSizeKey];
  const headerHeight = 36; // Altura da barra de cabeçalho

  const [position, setPosition] = useState(() => {
    const initialX = Math.max(16, window.innerWidth - width - 24);
    const initialY = Math.max(16, window.innerHeight - height - headerHeight - 24);
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Garantir que não saia da tela ao mudar tamanho ou redimensionar a janela
  useEffect(() => {
    const currentHeight = pipState?.isMinimized ? headerHeight : height;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - currentHeight);

    setPosition(prev => ({
      x: Math.min(Math.max(0, prev.x), maxX),
      y: Math.min(Math.max(0, prev.y), maxY)
    }));
  }, [width, height, pipState?.isMinimized]);

  // Listener para redimensionamento da janela do navegador
  useEffect(() => {
    const handleWindowResize = () => {
      const currentHeight = pipState?.isMinimized ? headerHeight : height;
      const maxX = Math.max(0, window.innerWidth - width);
      const maxY = Math.max(0, window.innerHeight - currentHeight);

      setPosition(prev => ({
        x: Math.min(Math.max(0, prev.x), maxX),
        y: Math.min(Math.max(0, prev.y), maxY)
      }));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [width, height, pipState?.isMinimized]);

  // Manipuladores de Arrasto (Drag)
  const handleMouseDown = (e) => {
    // Evita arrastar se o clique for em um botão dentro do header
    if (e.target.closest('button')) return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const currentHeight = pipState?.isMinimized ? headerHeight : height;
      const newX = Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - currentHeight, e.clientY - dragOffset.current.y));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, width, height, pipState?.isMinimized]);

  if (!pipState?.isVisible) return null;

  return (
    <div
      className="fixed z-50 rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-black transition-all duration-200 flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: pipState.isMinimized ? `${headerHeight}px` : `${height + headerHeight}px`,
      }}
    >
      {/* HEADER - ÁREA ARRASTÁVEL */}
      <div
        className="h-9 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between cursor-move select-none shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Eye className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="truncate max-w-[110px] sm:max-w-[150px]">Preview do Jogador</span>
        </div>

        <div className="flex items-center gap-1">
          {/* BOTÕES DE TAMANHO S/M/L */}
          <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 mr-1">
            {Object.entries(SIZES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPipState(s => ({ ...s, size: key }))}
                className={`w-4 h-4 text-[9px] font-extrabold rounded flex items-center justify-center transition-all ${
                  pipState.size === key
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Tamanho ${key.toUpperCase()} (${val.width}x${val.height})`}
              >
                {val.label}
              </button>
            ))}
          </div>

          {/* BOTÃO MINIMIZAR / EXPANDIR */}
          <button
            onClick={() => setPipState(s => ({ ...s, isMinimized: !s.isMinimized }))}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title={pipState.isMinimized ? "Expandir" : "Minimizar"}
          >
            {pipState.isMinimized ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* PAINEL DE PREVIEW COM ESCALA PROPORCIONAL VIRTUAL (1920x1080) */}
      {!pipState.isMinimized && (
        <div
          className="relative overflow-hidden bg-black flex-1"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div
            style={{
              width: '1920px',
              height: '1080px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className="pointer-events-none select-none"
          >
            <SceneRenderer isPreview={true} activeScene={activeScene} />
          </div>
        </div>
      )}
    </div>
  );
};
