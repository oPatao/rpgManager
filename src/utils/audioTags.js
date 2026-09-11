import React from 'react';

// Paleta de cores semânticas predefinidas para tags comuns de áudio
export const PRESET_AUDIO_TAGS = [
  { name: 'Combate', color: 'red', bg: 'bg-red-950/70', border: 'border-red-700/60', text: 'text-red-300', dot: 'bg-red-500' },
  { name: 'Boss', color: 'rose', bg: 'bg-rose-950/70', border: 'border-rose-700/60', text: 'text-rose-300', dot: 'bg-rose-500' },
  { name: 'Tensão', color: 'orange', bg: 'bg-orange-950/70', border: 'border-orange-700/60', text: 'text-orange-300', dot: 'bg-orange-500' },
  { name: 'Suspense', color: 'amber', bg: 'bg-amber-950/70', border: 'border-amber-700/60', text: 'text-amber-300', dot: 'bg-amber-500' },
  { name: 'Tranquila', color: 'emerald', bg: 'bg-emerald-950/70', border: 'border-emerald-700/60', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  { name: 'Cidade', color: 'teal', bg: 'bg-teal-950/70', border: 'border-teal-700/60', text: 'text-teal-300', dot: 'bg-teal-500' },
  { name: 'Taverna', color: 'yellow', bg: 'bg-yellow-950/70', border: 'border-yellow-700/60', text: 'text-yellow-300', dot: 'bg-yellow-500' },
  { name: 'Ambiente', color: 'cyan', bg: 'bg-cyan-950/70', border: 'border-cyan-700/60', text: 'text-cyan-300', dot: 'bg-cyan-500' },
  { name: 'Chuva', color: 'blue', bg: 'bg-blue-950/70', border: 'border-blue-700/60', text: 'text-blue-300', dot: 'bg-blue-500' },
  { name: 'Caverna', color: 'slate', bg: 'bg-slate-800/80', border: 'border-slate-600', text: 'text-slate-300', dot: 'bg-slate-400' },
  { name: 'Misterio', color: 'purple', bg: 'bg-purple-950/70', border: 'border-purple-700/60', text: 'text-purple-300', dot: 'bg-purple-500' },
  { name: 'Epica', color: 'indigo', bg: 'bg-indigo-950/70', border: 'border-indigo-700/60', text: 'text-indigo-300', dot: 'bg-indigo-500' },
  { name: 'Tristeza', color: 'violet', bg: 'bg-violet-950/70', border: 'border-violet-700/60', text: 'text-violet-300', dot: 'bg-violet-500' },
  { name: 'Terror', color: 'pink', bg: 'bg-pink-950/70', border: 'border-pink-700/60', text: 'text-pink-300', dot: 'bg-pink-500' }
];

// Gera estilo estável e agradável baseado no nome da tag
export function getAudioTagStyle(tagName = '') {
  const normalized = tagName.trim().toLowerCase();
  
  const found = PRESET_AUDIO_TAGS.find(p => p.name.toLowerCase() === normalized);
  if (found) return found;

  // Se não for preset, gera cor consistente via hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: 'bg-purple-950/60', border: 'border-purple-700/50', text: 'text-purple-300', dot: 'bg-purple-400' },
    { bg: 'bg-blue-950/60', border: 'border-blue-700/50', text: 'text-blue-300', dot: 'bg-blue-400' },
    { bg: 'bg-emerald-950/60', border: 'border-emerald-700/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-950/60', border: 'border-amber-700/50', text: 'text-amber-300', dot: 'bg-amber-400' },
    { bg: 'bg-rose-950/60', border: 'border-rose-700/50', text: 'text-rose-300', dot: 'bg-rose-400' },
    { bg: 'bg-cyan-950/60', border: 'border-cyan-700/50', text: 'text-cyan-300', dot: 'bg-cyan-400' },
    { bg: 'bg-indigo-950/60', border: 'border-indigo-700/50', text: 'text-indigo-300', dot: 'bg-indigo-400' },
    { bg: 'bg-teal-950/60', border: 'border-teal-700/50', text: 'text-teal-300', dot: 'bg-teal-400' },
    { bg: 'bg-orange-950/60', border: 'border-orange-700/50', text: 'text-orange-300', dot: 'bg-orange-400' }
  ];
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}

// Retorna uma borda sutil / glow temático para o card com base nas tags da faixa
export function getTrackMoodBorder(tags = []) {
  if (!tags || tags.length === 0) return 'border-slate-800 bg-slate-900/50 hover:border-slate-700';
  
  const lower = tags.map(t => t.toLowerCase());
  if (lower.some(t => ['combate', 'batalha', 'boss', 'luta'].includes(t))) {
    return 'border-red-900/40 bg-gradient-to-b from-red-950/20 to-slate-900/60 hover:border-red-600/70';
  }
  if (lower.some(t => ['tranquila', 'calma', 'descanso', 'cidade', 'taverna'].includes(t))) {
    return 'border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 hover:border-emerald-600/70';
  }
  if (lower.some(t => ['suspense', 'terror', 'misterio', 'tenso', 'caverna'].includes(t))) {
    return 'border-purple-900/40 bg-gradient-to-b from-purple-950/20 to-slate-900/60 hover:border-purple-600/70';
  }
  if (lower.some(t => ['ambiente', 'chuva', 'vento', 'natureza'].includes(t))) {
    return 'border-cyan-900/40 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 hover:border-cyan-600/70';
  }
  if (lower.some(t => ['epica', 'vitoria', 'gloria', 'herois'].includes(t))) {
    return 'border-amber-900/40 bg-gradient-to-b from-amber-950/20 to-slate-900/60 hover:border-amber-600/70';
  }
  return 'border-slate-800 bg-slate-900/50 hover:border-slate-700';
}
