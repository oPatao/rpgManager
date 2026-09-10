import React, { useState, useEffect, useCallback } from 'react';
import {
  Dice5,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  Shield,
  Eye,
  Heart,
  Target,
  X,
  Sparkles,
  User
} from 'lucide-react';
import { GeneratedNPC, GeneratorConfig, Gender, NPCOrigin } from '../../types/npcGenerator';
import { generateNPC } from '../../services/npcGeneratorService';

interface NPCGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNPC: (npc: GeneratedNPC) => void;
}

export const NPCGenerator: React.FC<NPCGeneratorProps> = ({
  isOpen,
  onClose,
  onCreateNPC,
}) => {
  const [config, setConfig] = useState<GeneratorConfig>({
    gender: 'aleatorio',
    origin: 'aleatorio',
  });

  const [generatedNPC, setGeneratedNPC] = useState<GeneratedNPC | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = useCallback(() => {
    setIsRolling(true);
    // Subtle brief animation delay for dice rolling feel
    setTimeout(() => {
      const npc = generateNPC(config);
      setGeneratedNPC(npc);
      setIsRolling(false);
    }, 150);
  }, [config]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const originLabels: Record<NPCOrigin | 'aleatorio', string> = {
    cidadao: 'Cidadão',
    indigena: 'Indígena',
    outro: 'Outro',
    aleatorio: 'Aleatório',
  };

  const genderLabels: Record<Gender, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
    aleatorio: 'Aleatório',
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="npc-generator-title"
    >
      <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar relative flex flex-col gap-5">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Dice5 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="npc-generator-title" className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                Gerador de NPCs
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Assimilação
                </span>
              </h2>
              <p className="text-xs text-slate-400">Criação rápida com tabela de motivações 6×6</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar gerador"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Controles de Configuração */}
        <div className="flex flex-col gap-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          {/* Gênero */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Gênero
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['masculino', 'feminino', 'aleatorio'] as Gender[]).map((g) => {
                const isSelected = config.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, gender: g }))}
                    className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all text-center ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm'
                        : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {genderLabels[g]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Origem */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Origem
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['cidadao', 'indigena', 'outro', 'aleatorio'] as (NPCOrigin | 'aleatorio')[]).map((orig) => {
                const isSelected = config.origin === orig;
                return (
                  <button
                    key={orig}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, origin: orig }))}
                    className={`px-2 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all text-center truncate ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm'
                        : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {originLabels[orig]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botão Gerar NPC */}
          <button
            type="button"
            onClick={handleRoll}
            disabled={isRolling}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-black rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-75"
          >
            <Dice5 className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
            <span className="tracking-wide">
              {generatedNPC ? 'Rolar Novamente' : 'Gerar NPC'}
            </span>
          </button>
        </div>

        {/* 2. Card de Resultado (se gerado) */}
        {generatedNPC && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 animate-fade-in shadow-inner">
            {/* Cabeçalho do NPC */}
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-slate-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white truncate">
                  {generatedNPC.name} {generatedNPC.surname}
                </h3>
                <p className="text-xs text-slate-400 capitalize">
                  {genderLabels[generatedNPC.gender]} • {originLabels[generatedNPC.origin]}
                </p>
              </div>
            </div>

            {/* STATUS DE INFECÇÃO */}
            <div
              className={`rounded-lg p-3 border transition-colors ${
                generatedNPC.infectionStatus === 'nao_infectado'
                  ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-400'
                  : generatedNPC.infectionStatus === 'infectado_avancado'
                  ? 'bg-red-900/30 border-red-600/70 text-red-400'
                  : 'bg-red-950/20 border-red-700/50 text-red-400'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {generatedNPC.infectionStatus === 'nao_infectado' ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Status: Saudável
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                      Status: {generatedNPC.infectionStatus === 'infectado_avancado' ? '⚠ Infectado (Estágio Avançado)' : '⚠ Infectado'}
                    </span>
                  </>
                )}
              </div>

              {generatedNPC.infectionStatus === 'nao_infectado' ? (
                <p className="text-xs text-emerald-300">
                  Não infectado — sem traços ou mutações visíveis de assimilação.
                </p>
              ) : (
                <div className="text-xs text-slate-200 mt-0.5">
                  <span className="font-semibold text-red-300">Mutação ({generatedNPC.modifiedBodyPart}):</span>{' '}
                  <span className="text-slate-300">{generatedNPC.modificationDescription}</span>
                </div>
              )}
            </div>

            {/* APARÊNCIA */}
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 mb-1">
                <Eye className="w-3 h-3 text-blue-400" /> Aparência / Característica
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {generatedNPC.characteristic}
              </p>
            </div>

            {/* COMPORTAMENTO */}
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 mb-1">
                <Heart className="w-3 h-3 text-pink-400" /> Comportamento
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {generatedNPC.behavior}
              </p>
            </div>

            {/* OPINIÃO INICIAL */}
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 mb-1">
                <Target className="w-3 h-3 text-purple-400" /> Opinião Inicial sobre os Jogadores
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {generatedNPC.initialOpinion}
              </p>
            </div>

            {/* MOTIVAÇÃO (2d6) */}
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1 mb-1.5">
                <Dice5 className="w-3 h-3 text-amber-400" /> Motivação Primária (Matriz 6×6)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold shadow-sm" title="Dado 1 (Linha)">
                    {generatedNPC.motivationRow + 1}
                  </span>
                  <span className="text-slate-500 text-xs">×</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold shadow-sm" title="Dado 2 (Coluna)">
                    {generatedNPC.motivationCol + 1}
                  </span>
                </div>
                <span className="text-slate-400 text-xs">=</span>
                <span className="text-amber-400 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {generatedNPC.motivation}
                </span>
                <span className="text-[11px] text-slate-500 ml-auto font-mono">
                  (linha {generatedNPC.motivationRow + 1}, col {generatedNPC.motivationCol + 1})
                </span>
              </div>
            </div>

            {/* 3. Botões de Ação */}
            <div className="grid grid-cols-2 gap-2 mt-1 pt-1">
              <button
                type="button"
                onClick={() => onCreateNPC(generatedNPC)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Criar NPC
              </button>
              <button
                type="button"
                onClick={handleRoll}
                disabled={isRolling}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isRolling ? 'animate-spin' : ''}`} /> Gerar Outro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
