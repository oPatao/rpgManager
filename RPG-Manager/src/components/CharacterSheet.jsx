import React, { useState, useEffect } from 'react';
import { X, Heart, Shield, Zap, FileText, Plus, Trash2, AlertTriangle, Activity, Skull, Sparkles, Package } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';

const APTITUDE_CONFIG = {
  instintos: {
    categoryKey: 'instintos',
    label: 'INSTINTOS',
    die: 'd6',
    max: 4,
    defaultVal: 1,
    skills: [
      { key: 'influencia', label: 'Influência' },
      { key: 'percepcao', label: 'Percepção' },
      { key: 'potencia', label: 'Potência' },
      { key: 'reacao', label: 'Reação' },
      { key: 'resolucao', label: 'Resolução' },
      { key: 'sagacidade', label: 'Sagacidade' }
    ]
  },
  conhecimentos: {
    categoryKey: 'conhecimentos',
    label: 'CONHECIMENTOS',
    die: 'd10',
    max: 5,
    defaultVal: 0,
    skills: [
      { key: 'biologia', label: 'Biologia' },
      { key: 'erudicao', label: 'Erudição' },
      { key: 'engenharia', label: 'Engenharia' },
      { key: 'geografia', label: 'Geografia' },
      { key: 'medicina', label: 'Medicina' },
      { key: 'seguranca', label: 'Segurança' }
    ]
  },
  praticas: {
    categoryKey: 'praticas',
    label: 'PRÁTICAS',
    die: 'd10',
    max: 5,
    defaultVal: 0,
    skills: [
      { key: 'armas', label: 'Armas' },
      { key: 'atletismo', label: 'Atletismo' },
      { key: 'expressao', label: 'Expressão' },
      { key: 'furtividade', label: 'Furtividade' },
      { key: 'manufaturas', label: 'Manufaturas' },
      { key: 'sobrevivencia', label: 'Sobrevivência' }
    ]
  }
};

const DEFAULT_SHEET = {
  aptitudes: {
    instintos: { influencia: 1, percepcao: 1, potencia: 1, reacao: 1, resolucao: 1, sagacidade: 1 },
    conhecimentos: { biologia: 0, erudicao: 0, engenharia: 0, geografia: 0, medicina: 0, seguranca: 0 },
    praticas: { armas: 0, atletismo: 0, expressao: 0, furtividade: 0, manufaturas: 0, sobrevivencia: 0 }
  },
  caboGuerra: { determinacao: 9, assimilacao: 1 },
  saude: { nivel: 6, pontosAtuais: null, pontosMaximos: null },
  caracteristicas: [],
  pontosCaracteristicas: 7,
  equipamentos: ""
};

export const CharacterSheet = () => {
  const role = useRPGStore(state => state.role);
  const sheetModalState = useRPGStore(state => state.sheetModalState);
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);
  const npcs = useRPGStore(state => state.npcs);
  const updateNPCSheet = useRPGStore(state => state.updateNPCSheet);

  const [newCharName, setNewCharName] = useState('');
  const [newCharCost, setNewCharCost] = useState(1);

  if (role !== 'master' || !sheetModalState?.isOpen || !sheetModalState?.npcId) {
    return null;
  }

  const npc = npcs.find(n => n.id === sheetModalState.npcId);
  if (!npc) return null;

  // Garante folha inicial
  const sheet = npc.sheet ? {
    ...DEFAULT_SHEET,
    ...npc.sheet,
    aptitudes: {
      instintos: { ...DEFAULT_SHEET.aptitudes.instintos, ...(npc.sheet.aptitudes?.instintos || {}) },
      conhecimentos: { ...DEFAULT_SHEET.aptitudes.conhecimentos, ...(npc.sheet.aptitudes?.conhecimentos || {}) },
      praticas: { ...DEFAULT_SHEET.aptitudes.praticas, ...(npc.sheet.aptitudes?.praticas || {}) },
    },
    caboGuerra: { ...DEFAULT_SHEET.caboGuerra, ...(npc.sheet.caboGuerra || {}) },
    saude: { ...DEFAULT_SHEET.saude, ...(npc.sheet.saude || {}) }
  } : DEFAULT_SHEET;

  const handleUpdateSheet = (newSheetData) => {
    updateNPCSheet(npc.id, newSheetData);
  };

  // Clique em Aptidão (Rating system)
  const handleAptitudeClick = (category, skillKey, indexClicked) => {
    const currentVal = sheet.aptitudes[category][skillKey] || 0;
    const newVal = currentVal === indexClicked + 1 ? indexClicked : indexClicked + 1;

    const updatedSheet = {
      ...sheet,
      aptitudes: {
        ...sheet.aptitudes,
        [category]: {
          ...sheet.aptitudes[category],
          [skillKey]: newVal
        }
      }
    };

    handleUpdateSheet(updatedSheet);
  };

  // Cabo de Guerra: ajusta Determinação e Assimilação = 10 - Det
  const handleSetDeterminacao = (val) => {
    const det = Math.max(0, Math.min(10, val));
    const ass = 10 - det;
    handleUpdateSheet({
      ...sheet,
      caboGuerra: { determinacao: det, assimilacao: ass }
    });
  };

  // Cálculo de Saúde
  const potencia = sheet.aptitudes.instintos.potencia || 1;
  const resolucao = sheet.aptitudes.instintos.resolucao || 1;
  const calculatedMaxHP = 1 + potencia + resolucao;
  const maxHP = sheet.saude.pontosMaximos !== null && sheet.saude.pontosMaximos !== undefined 
    ? sheet.saude.pontosMaximos 
    : calculatedMaxHP;
  const currentHP = sheet.saude.pontosAtuais !== null && sheet.saude.pontosAtuais !== undefined 
    ? sheet.saude.pontosAtuais 
    : maxHP;

  const handleSetHP = (val) => {
    const clampedHP = Math.max(0, Math.min(maxHP, val));
    handleUpdateSheet({
      ...sheet,
      saude: { ...sheet.saude, pontosAtuais: clampedHP, pontosMaximos: maxHP }
    });
  };

  const handleSetNivelSaude = (nivel) => {
    handleUpdateSheet({
      ...sheet,
      saude: { ...sheet.saude, nivel }
    });
  };

  // Características de Infectado
  const caracteristicas = sheet.caracteristicas || [];
  const spentPoints = caracteristicas.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const remainingPoints = 7 - spentPoints;

  const handleAddCaracteristica = (e) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    const item = {
      id: Date.now().toString(),
      name: newCharName.trim(),
      cost: Number(newCharCost) || 1
    };
    handleUpdateSheet({
      ...sheet,
      caracteristicas: [...caracteristicas, item]
    });
    setNewCharName('');
    setNewCharCost(1);
  };

  const handleRemoveCaracteristica = (id) => {
    handleUpdateSheet({
      ...sheet,
      caracteristicas: caracteristicas.filter(c => c.id !== id)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-900/80 rounded-2xl w-full max-w-4xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER DA FICHA */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400 font-black text-lg shadow-inner">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-extrabold uppercase tracking-widest">
                  FICHA DE ASSIMILAÇÃO
                </span>
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  {npc.role || 'Personagem'}
                </span>
              </div>
              <h2 className="text-xl font-black text-white leading-none mt-0.5">{npc.name}</h2>
            </div>
          </div>

          <button
            onClick={() => setSheetModalState({ isOpen: false, npcId: null })}
            className="p-2 bg-slate-800 hover:bg-red-700 text-slate-400 hover:text-white rounded-xl transition-colors"
            title="Fechar Ficha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO ROLÁVEL */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* SEÇÃO APTIDÕES */}
          <div>
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-amber-500 mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Activity className="w-4 h-4 text-amber-500" /> Aptidões de Personagem
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* INSTINTOS (QUADRADOS) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-amber-900/30 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-600 rounded-sm"></span>
                    <span className="text-xs font-black text-amber-400 tracking-wider">INSTINTOS</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-600/80 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-900/40">d6</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {APTITUDE_CONFIG.instintos.skills.map(skill => {
                    const currentVal = sheet.aptitudes.instintos[skill.key] || 0;
                    return (
                      <div key={skill.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 truncate">{skill.label}</span>
                        <div className="flex items-center gap-1">
                          {[0, 1, 2, 3].map(idx => {
                            const isFilled = currentVal >= idx + 1;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleAptitudeClick('instintos', skill.key, idx)}
                                className={`w-4 h-4 rounded-sm border transition-all hover:scale-110 flex items-center justify-center ${
                                  isFilled
                                    ? 'bg-amber-600 border-amber-400 shadow-sm'
                                    : 'border-amber-800/60 bg-slate-900 hover:border-amber-500'
                                }`}
                                title={`${skill.label}: ${idx + 1}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONHECIMENTOS (LOSANGOS) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-900/40 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-blue-900/30 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-500 rotate-45"></span>
                    <span className="text-xs font-black text-blue-400 tracking-wider">CONHECIMENTOS</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-500/80 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-900/40">d10</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {APTITUDE_CONFIG.conhecimentos.skills.map(skill => {
                    const currentVal = sheet.aptitudes.conhecimentos[skill.key] || 0;
                    return (
                      <div key={skill.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 truncate">{skill.label}</span>
                        <div className="flex items-center gap-1.5 py-0.5">
                          {[0, 1, 2, 3, 4].map(idx => {
                            const isFilled = currentVal >= idx + 1;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleAptitudeClick('conhecimentos', skill.key, idx)}
                                className={`w-3.5 h-3.5 rotate-45 border transition-all hover:scale-125 my-0.5 ${
                                  isFilled
                                    ? 'bg-blue-600 border-blue-400 shadow-sm'
                                    : 'border-blue-800/60 bg-slate-900 hover:border-blue-400'
                                }`}
                                title={`${skill.label}: ${idx + 1}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PRÁTICAS (LOSANGOS) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/40 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-emerald-900/30 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rotate-45"></span>
                    <span className="text-xs font-black text-emerald-400 tracking-wider">PRÁTICAS</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-500/80 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900/40">d10</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {APTITUDE_CONFIG.praticas.skills.map(skill => {
                    const currentVal = sheet.aptitudes.praticas[skill.key] || 0;
                    return (
                      <div key={skill.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 truncate">{skill.label}</span>
                        <div className="flex items-center gap-1.5 py-0.5">
                          {[0, 1, 2, 3, 4].map(idx => {
                            const isFilled = currentVal >= idx + 1;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleAptitudeClick('praticas', skill.key, idx)}
                                className={`w-3.5 h-3.5 rotate-45 border transition-all hover:scale-125 my-0.5 ${
                                  isFilled
                                    ? 'bg-emerald-600 border-emerald-400 shadow-sm'
                                    : 'border-emerald-800/60 bg-slate-900 hover:border-emerald-400'
                                }`}
                                title={`${skill.label}: ${idx + 1}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO CABO DE GUERRA (DETERMINAÇÃO VS ASSIMILAÇÃO) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Cabo de Guerra Interior</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Determinação + Assimilação = 10
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DETERMINAÇÃO (HUMANO) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200 uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white"></span> Determinação (D)
                  </span>
                  <span className="text-white font-mono text-sm">{sheet.caboGuerra.determinacao} / 10</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(idx => {
                    const isFilled = sheet.caboGuerra.determinacao >= idx + 1;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSetDeterminacao(idx + 1)}
                        className={`flex-1 h-6 rounded border transition-all ${
                          isFilled
                            ? 'bg-white border-slate-200 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                        title={`Determinação: ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* ASSIMILAÇÃO (PARASITA) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-400 uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Assimilação (E)
                  </span>
                  <span className="text-purple-400 font-mono text-sm">{sheet.caboGuerra.assimilacao} / 10</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(idx => {
                    const isFilled = sheet.caboGuerra.assimilacao >= idx + 1;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 h-6 rounded border transition-all ${
                          isFilled
                            ? 'bg-purple-700 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                        title={`Assimilação: ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {sheet.caboGuerra.determinacao === 0 && (
              <div className="p-2 bg-red-950/80 border border-red-700 rounded-lg text-center text-xs font-extrabold text-red-400 animate-pulse flex items-center justify-center gap-2 mt-1">
                <AlertTriangle className="w-4 h-4" /> MUTAÇÃO IMINENTE: A Determinação chegou a ZERO! O parasita tomou o controle total!
              </div>
            )}
          </div>

          {/* SEÇÃO SAÚDE */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Níveis de Saúde e Vitalidade</h3>
              </div>
              <div className="text-xs font-bold text-slate-300">
                Pontos de Saúde: <span className="text-red-400 font-mono">{currentHP}</span> / <span className="text-slate-400 font-mono">{maxHP}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* NÍVEIS DE SAÚDE (1 A 6) */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Nível de Saúde Ativo</span>
                <div className="flex gap-1.5">
                  {[6, 5, 4, 3, 2, 1].map(lvl => {
                    const isActive = sheet.saude.nivel === lvl;
                    const labels = { 6: 'Saudável', 5: 'Ferido', 4: 'Avariado', 3: 'Grave', 2: 'Crítico', 1: 'Incapacitado' };
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleSetNivelSaude(lvl)}
                        className={`flex-1 py-2 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                          isActive
                            ? 'bg-red-950 border-red-600 text-red-300 font-extrabold shadow-md scale-105'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-sm font-black">{lvl}</span>
                        <span className="text-[8px] uppercase truncate w-full hidden sm:block">{labels[lvl]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PONTOS DE SAÚDE E CONTROLES */}
              <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">Ajuste de Vitalidade</span>
                  <span className="text-[10px] text-slate-500">Calculado: 1 + Potência ({potencia}) + Resolução ({resolucao})</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetHP(currentHP - 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-900 text-white font-bold flex items-center justify-center border border-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={currentHP}
                    onChange={(e) => handleSetHP(Number(e.target.value))}
                    className="w-12 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-bold font-mono text-red-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetHP(currentHP + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-900 text-white font-bold flex items-center justify-center border border-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* ALERTAS DE PENALIDADE DE SAÚDE */}
            {sheet.saude.nivel < 4 && sheet.saude.nivel >= 2 && (
              <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-lg text-xs font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Penalidade de Saúde Ativa: -1 Sucesso (S) em todos os testes.
              </div>
            )}
            {sheet.saude.nivel < 2 && (
              <div className="p-2 bg-red-950/80 border border-red-800 rounded-lg text-xs font-extrabold text-red-300 flex items-center gap-2 animate-pulse">
                <Skull className="w-4 h-4 text-red-500 shrink-0" /> Incapacitado/Crítico: Requer gastar Determinação para conseguir agir!
              </div>
            )}
          </div>

          {/* SEÇÃO CARACTERÍSTICAS DE INFECTADO */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Características de Infectado (Poderes)</h3>
              </div>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded border ${
                remainingPoints === 0
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : remainingPoints < 0
                  ? 'bg-red-950 text-red-400 border-red-800'
                  : 'bg-purple-950 text-purple-300 border-purple-800'
              }`}>
                {remainingPoints === 0
                  ? 'Completo (0 pts restantes)'
                  : remainingPoints < 0
                  ? `Excedido! (${remainingPoints} pts)`
                  : `${remainingPoints} / 7 pts restantes`}
              </span>
            </div>

            {/* FORMULÁRIO PARA ADICIONAR PODER */}
            <form onSubmit={handleAddCaracteristica} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Regeneração Tecidual, Visão Térmica..."
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600"
              />
              <select
                value={newCharCost}
                onChange={(e) => setNewCharCost(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-purple-300 font-bold focus:outline-none"
              >
                <option value={1}>1 Pt</option>
                <option value={2}>2 Pts</option>
                <option value={3}>3 Pts</option>
                <option value={4}>4 Pts</option>
                <option value={5}>5 Pts</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-md"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </form>

            {/* LISTA DE CARACTERÍSTICAS */}
            {caracteristicas.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-2">Nenhuma característica de infectado adicionada.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {caracteristicas.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{item.name}</span>
                      <span className="text-[10px] font-extrabold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/60">
                        {item.cost} {item.cost === 1 ? 'pt' : 'pts'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCaracteristica(item.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO EQUIPAMENTOS */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Equipamentos e Pertences</h3>
            </div>
            <textarea
              value={sheet.equipamentos || ''}
              onChange={(e) => handleUpdateSheet({ ...sheet, equipamentos: e.target.value })}
              rows="3"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-amber-600 resize-none leading-relaxed"
              placeholder="Liste os equipamentos, armas, suprimentos e pertences deste NPC..."
            />
          </div>

        </div>

      </div>
    </div>
  );
};
