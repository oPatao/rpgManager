import React, { memo } from 'react';
import { Heart, Backpack, Shield, FileText, UserMinus, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { getAssetUrl } from '../services/db';

const APTITUDE_LAYOUT = {
  instintos: {
    label: 'INSTINTOS',
    color: 'amber',
    skills: [
      { key: 'influencia', label: 'Inf' },
      { key: 'percepcao', label: 'Perc' },
      { key: 'potencia', label: 'Pot' },
      { key: 'reacao', label: 'Reac' },
      { key: 'resolucao', label: 'Res' },
      { key: 'sagacidade', label: 'Sag' }
    ]
  },
  conhecimentos: {
    label: 'CONHECIMENTOS',
    color: 'blue',
    skills: [
      { key: 'biologia', label: 'Bio' },
      { key: 'erudicao', label: 'Eru' },
      { key: 'engenharia', label: 'Eng' },
      { key: 'geografia', label: 'Geo' },
      { key: 'medicina', label: 'Med' },
      { key: 'seguranca', label: 'Seg' }
    ]
  },
  praticas: {
    label: 'PRÁTICAS',
    color: 'emerald',
    skills: [
      { key: 'armas', label: 'Arm' },
      { key: 'atletismo', label: 'Atl' },
      { key: 'expressao', label: 'Exp' },
      { key: 'furtividade', label: 'Fur' },
      { key: 'manufaturas', label: 'Man' },
      { key: 'sobrevivencia', label: 'Sob' }
    ]
  }
};

const getNPCSheetDefaults = () => ({
  aptitudes: {
    instintos: { influencia: 1, percepcao: 1, potencia: 1, reacao: 1, resolucao: 1, sagacidade: 1 },
    conhecimentos: { biologia: 0, erudicao: 0, engenharia: 0, geografia: 0, medicina: 0, seguranca: 0 },
    praticas: { armas: 0, atletismo: 0, expressao: 0, furtividade: 0, manufaturas: 0, sobrevivencia: 0 }
  },
  caboGuerra: { determinacao: 9, assimilacao: 1 },
  saude: { nivel: 6, pontosAtuais: null, pontosMaximos: null },
  inventarioSlots: { atual: 0, maximo: 5 },
  caracteristicas: [],
  pontosCaracteristicas: 7,
  equipamentos: ""
});

export const PartyMemberCard = memo(({ npc }) => {
  const updateNPCStats = useRPGStore(state => state.updateNPCStats);
  const toggleNPCParty = useRPGStore(state => state.toggleNPCParty);
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);

  const rawSheet = npc.sheet || getNPCSheetDefaults();
  const sheet = {
    ...getNPCSheetDefaults(),
    ...rawSheet,
    aptitudes: {
      instintos: { ...getNPCSheetDefaults().aptitudes.instintos, ...(rawSheet.aptitudes?.instintos || {}) },
      conhecimentos: { ...getNPCSheetDefaults().aptitudes.conhecimentos, ...(rawSheet.aptitudes?.conhecimentos || {}) },
      praticas: { ...getNPCSheetDefaults().aptitudes.praticas, ...(rawSheet.aptitudes?.praticas || {}) },
    },
    caboGuerra: { ...getNPCSheetDefaults().caboGuerra, ...(rawSheet.caboGuerra || {}) },
    saude: { ...getNPCSheetDefaults().saude, ...(rawSheet.saude || {}) },
    inventarioSlots: { ...getNPCSheetDefaults().inventarioSlots, ...(rawSheet.inventarioSlots || {}) }
  };

  // Cálculo de saúde
  const potencia = sheet.aptitudes.instintos.potencia || 1;
  const resolucao = sheet.aptitudes.instintos.resolucao || 1;
  const calculatedMaxHP = 1 + potencia + resolucao;
  const maxHP = sheet.saude.pontosMaximos !== null && sheet.saude.pontosMaximos !== undefined 
    ? sheet.saude.pontosMaximos 
    : calculatedMaxHP;
  const currentHP = sheet.saude.pontosAtuais !== null && sheet.saude.pontosAtuais !== undefined 
    ? sheet.saude.pontosAtuais 
    : maxHP;
  const nivelSaude = sheet.saude.nivel ?? 6;

  // Ajuste inline de saúde
  const handleAdjustHealth = (delta) => {
    let newPts = currentHP + delta;
    let newNivel = nivelSaude;

    if (delta > 0) {
      if (newPts > maxHP) {
        if (newNivel < 6) {
          newNivel = newNivel + 1;
          newPts = calculatedMaxHP;
        } else {
          newPts = maxHP;
        }
      }
    } else {
      if (newPts <= 0) {
        if (newNivel > 1) {
          newNivel = newNivel - 1;
          newPts = calculatedMaxHP;
        } else {
          newPts = 0;
        }
      }
    }

    updateNPCStats(npc.id, {
      saude: { nivel: newNivel, pontosAtuais: newPts, pontosMaximos: maxHP }
    });
  };

  // Ajuste inline de slots
  const currentSlots = sheet.inventarioSlots?.atual ?? 0;
  const maxSlots = sheet.inventarioSlots?.maximo ?? 5;

  const handleAdjustSlots = (delta) => {
    const newSlots = Math.max(0, Math.min(maxSlots, currentSlots + delta));
    updateNPCStats(npc.id, {
      inventarioSlots: { atual: newSlots, maximo: maxSlots }
    });
  };

  // Determinação
  const determinacao = sheet.caboGuerra?.determinacao ?? 9;

  // Foto do NPC
  const avatarUrl = getAssetUrl(npc.fileData) || (npc.variants && npc.variants.length > 0 ? getAssetUrl(npc.variants[0]) : null);

  // Conhecimentos e Práticas ativas (>= 1)
  const activeConhecimentos = APTITUDE_LAYOUT.conhecimentos.skills.filter(
    s => (sheet.aptitudes.conhecimentos[s.key] || 0) >= 1
  );
  const activePraticas = APTITUDE_LAYOUT.praticas.skills.filter(
    s => (sheet.aptitudes.praticas[s.key] || 0) >= 1
  );

  const isIncapacitated = nivelSaude === 1 && currentHP === 0;

  return (
    <div className={`bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-2.5 transition-all shadow-md ${
      isIncapacitated ? 'bg-red-950/20 border-red-900/60 opacity-80' : ''
    }`}>
      {/* CABEÇALHO DO MEMBRO */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt={npc.name} className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-500 shrink-0">
            {npc.name.substring(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-slate-200 truncate leading-snug">{npc.name}</h4>
          <p className="text-[10px] text-slate-400 truncate">{npc.role || 'NPC Party'}</p>
        </div>
      </div>

      {/* LINHAS DE STATS COM CONTROLES INLINE */}
      <div className="flex flex-col gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 text-[11px]">
        {/* LINHA 1: SAÚDE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Heart className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-slate-300 font-medium truncate">
              Saúde: <strong className="text-red-400 font-mono">{nivelSaude}</strong> <span className="text-slate-500 font-mono">({currentHP}/{maxHP})</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              onClick={() => handleAdjustHealth(-1)}
              className="w-4 h-4 rounded bg-slate-800 hover:bg-red-900/40 text-red-400 border border-slate-700 flex items-center justify-center transition-colors"
              title="Dano (-1 HP)"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => handleAdjustHealth(1)}
              className="w-4 h-4 rounded bg-slate-800 hover:bg-emerald-900/40 text-emerald-400 border border-slate-700 flex items-center justify-center transition-colors"
              title="Cura (+1 HP)"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* LINHA 2: SLOTS / INVENTÁRIO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Backpack className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-slate-300 font-medium truncate">
              Slots: <strong className="text-amber-400 font-mono">{currentSlots}</strong><span className="text-slate-500 font-mono">/{maxSlots}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              onClick={() => handleAdjustSlots(-1)}
              className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors"
              title="Remover item (-1 slot)"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => handleAdjustSlots(1)}
              className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors"
              title="Adicionar item (+1 slot)"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* LINHA 3: DETERMINAÇÃO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="text-slate-300 font-medium truncate">
              Determinação: <strong className={`font-mono ${determinacao === 0 ? 'text-red-500 animate-pulse font-black' : 'text-purple-300'}`}>{determinacao}/10</strong>
            </span>
          </div>
          {determinacao === 0 && (
            <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse shrink-0" title="Mutação Iminente" />
          )}
        </div>
      </div>

      {/* APTIDÕES: INSTINTOS */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase font-black tracking-wider text-amber-500/80">INSTINTOS</span>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {APTITUDE_LAYOUT.instintos.skills.map(s => {
            const val = sheet.aptitudes.instintos[s.key] || 0;
            return (
              <div key={s.key} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium truncate mr-1">{s.label}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-[1px] border ${
                        val >= idx + 1
                          ? 'bg-amber-600 border-amber-400'
                          : 'border-amber-900/60 bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* APTIDÕES: CONHECIMENTOS (Apenas >= 1) */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase font-black tracking-wider text-blue-400/80">CONHECIMENTOS</span>
        {activeConhecimentos.length === 0 ? (
          <span className="text-[9px] text-slate-600 italic">— NENHUM</span>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {activeConhecimentos.map(s => {
              const val = sheet.aptitudes.conhecimentos[s.key] || 0;
              return (
                <div key={s.key} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium truncate mr-1">{s.label}</span>
                  <div className="flex items-center gap-1 shrink-0 py-0.5">
                    {[0, 1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rotate-45 border ${
                          val >= idx + 1
                            ? 'bg-blue-600 border-blue-400'
                            : 'border-blue-900/60 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APTIDÕES: PRÁTICAS (Apenas >= 1) */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase font-black tracking-wider text-emerald-400/80">PRÁTICAS</span>
        {activePraticas.length === 0 ? (
          <span className="text-[9px] text-slate-600 italic">— NENHUM</span>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {activePraticas.map(s => {
              const val = sheet.aptitudes.praticas[s.key] || 0;
              return (
                <div key={s.key} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium truncate mr-1">{s.label}</span>
                  <div className="flex items-center gap-1 shrink-0 py-0.5">
                    {[0, 1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rotate-45 border ${
                          val >= idx + 1
                            ? 'bg-emerald-600 border-emerald-400'
                            : 'border-emerald-900/60 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RODAPÉ DO CARTÃO: AÇÕES */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
        <button
          onClick={() => setSheetModalState({ isOpen: true, npcId: npc.id })}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg py-1 px-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
          title="Abrir Ficha Completa"
        >
          <FileText className="w-3 h-3 text-red-400" /> Ficha
        </button>
        <button
          onClick={() => toggleNPCParty(npc.id)}
          className="bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-900/60 rounded-lg py-1 px-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
          title="Remover do Party"
        >
          <UserMinus className="w-3 h-3" /> Sair
        </button>
      </div>
    </div>
  );
});
