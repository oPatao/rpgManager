import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Flame,
  Shield,
  Target,
  Skull,
  Dices,
  Image,
  Music,
  ArrowLeft,
  Zap,
  HelpCircle
} from 'lucide-react';
import { calculateConflictDice, calculateObjectiveCost, DIE_VALUES, suggestDiceComposition } from '../../constants/balance';

export function ConflictEditor({
  conflict = null,
  locations = [],
  tracks = [],
  npcs = [],
  onSave,
  onCancel
}) {
  const [formData, setFormData] = useState(() => {
    if (conflict) return { ...conflict };
    const defaultLevel = 'iniciante';
    const defaultPlayers = 4;
    const calc = calculateConflictDice(defaultLevel, defaultPlayers);

    return {
      id: crypto.randomUUID(),
      name: '💥 Conflito — Nova Ameaça',
      description: '',
      groupLevel: defaultLevel,
      playerCount: defaultPlayers,
      conflictDicePool: calc.suggestedDice,
      totalDicePoints: calc.totalPoints,
      conditions: [
        { id: crypto.randomUUID(), name: 'Fumaça e Destroços', description: '-1 dado em testes de percepção/reação', isActive: true },
      ],
      conflictActivations: [
        { id: crypto.randomUUID(), name: 'Desorganização', description: 'Multidão empurra o grupo', costType: 'pressao', costAmount: 1, effect: '1 Dano direto ou gasta 1 Adaptação', isUsed: false },
        { id: crypto.randomUUID(), name: 'Cegueira Temporária', description: 'Névoa ou poeira nos olhos', costType: 'adaptacao', costAmount: 1, effect: '-1 dado no próximo teste de Percepção', isUsed: false }
      ],
      threats: [],
      objectives: [
        {
          id: crypto.randomUUID(),
          name: 'Fuga da Área',
          description: 'Acumular sucessos suficientes para fugir do perigo',
          type: 'principal',
          requiredSuccesses: calculateObjectiveCost(defaultLevel, defaultPlayers, false),
          currentSuccesses: 0,
          isCompleted: false,
          endsConflict: true,
          isSoloOption: true,
          soloCost: 5
        }
      ],
      backgroundId: '',
      trackId: '',
      isActive: false,
      currentRound: 1,
      currentTurn: 'players',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  // Atualizar cálculo de dados e objetivos padrão ao mudar nível ou quantidade de jogadores
  const handleLevelOrPlayersChange = (level, count) => {
    const calc = calculateConflictDice(level, count);
    const mainObjCost = calculateObjectiveCost(level, count, false);

    setFormData(prev => ({
      ...prev,
      groupLevel: level,
      playerCount: count,
      conflictDicePool: calc.suggestedDice,
      totalDicePoints: calc.totalPoints,
      objectives: prev.objectives.map(obj =>
        obj.type === 'principal' ? { ...obj, requiredSuccesses: mainObjCost } : obj
      )
    }));
  };

  // ADICIONAR / REMOVER DADOS DA RESERVA DO CONFLITO
  const addDieToConflict = (type) => {
    const newDie = { id: crypto.randomUUID(), type, pointValue: DIE_VALUES[type] };
    setFormData(prev => {
      const updatedPool = [...prev.conflictDicePool, newDie];
      return {
        ...prev,
        conflictDicePool: updatedPool,
        totalDicePoints: updatedPool.reduce((a, d) => a + d.pointValue, 0)
      };
    });
  };

  const removeDieFromConflict = (id) => {
    setFormData(prev => {
      const updatedPool = prev.conflictDicePool.filter(d => d.id !== id);
      return {
        ...prev,
        conflictDicePool: updatedPool,
        totalDicePoints: updatedPool.reduce((a, d) => a + d.pointValue, 0)
      };
    });
  };

  // CONDICIONANTES
  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { id: crypto.randomUUID(), name: 'Nova Condicionante', description: '', isActive: true }
      ]
    }));
  };

  const updateCondition = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const removeCondition = (id) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id)
    }));
  };

  // ATIVAÇÕES DO CONFLITO
  const addActivation = () => {
    setFormData(prev => ({
      ...prev,
      conflictActivations: [
        ...prev.conflictActivations,
        { id: crypto.randomUUID(), name: 'Nova Ativação', description: '', costType: 'pressao', costAmount: 1, effect: '', isUsed: false }
      ]
    }));
  };

  const updateActivation = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      conflictActivations: prev.conflictActivations.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeActivation = (id) => {
    setFormData(prev => ({
      ...prev,
      conflictActivations: prev.conflictActivations.filter(a => a.id !== id)
    }));
  };

  // OBJETIVOS
  const addObjective = () => {
    setFormData(prev => ({
      ...prev,
      objectives: [
        ...prev.objectives,
        {
          id: crypto.randomUUID(),
          name: 'Novo Objetivo Secundário',
          description: '',
          type: 'secundario',
          requiredSuccesses: 5,
          currentSuccesses: 0,
          isCompleted: false,
          reward: '',
          endsConflict: false,
          isSoloOption: false
        }
      ]
    }));
  };

  const updateObjective = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.map(o => o.id === id ? { ...o, [field]: value } : o)
    }));
  };

  const removeObjective = (id) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter(o => o.id !== id)
    }));
  };

  // AMEAÇAS
  const addThreat = () => {
    setFormData(prev => ({
      ...prev,
      threats: [
        ...prev.threats,
        {
          id: crypto.randomUUID(),
          name: 'Inimigo / Ameaça',
          npcId: '',
          description: '',
          hasOwnDicePool: true,
          dicePool: [{ id: crypto.randomUUID(), type: 'd6', pointValue: 1 }, { id: crypto.randomUUID(), type: 'd6', pointValue: 1 }],
          activations: [
            { id: crypto.randomUUID(), name: 'Investida', description: '', costType: 'pressao', costAmount: 1, effect: '1 Dano no alvo', isUsed: false },
            { id: crypto.randomUUID(), name: 'Rugido Territorial', description: '', costType: 'adaptacao', costAmount: 1, effect: 'Teste de Determinação', isUsed: false }
          ],
          isActive: true,
          isNeutralized: false
        }
      ]
    }));
  };

  const updateThreat = (threatId, field, value) => {
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.map(t => t.id === threatId ? { ...t, [field]: value } : t)
    }));
  };

  const removeThreat = (threatId) => {
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.filter(t => t.id !== threatId)
    }));
  };

  const addThreatDie = (threatId, type) => {
    const newDie = { id: crypto.randomUUID(), type, pointValue: DIE_VALUES[type] };
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.map(t => t.id === threatId ? { ...t, dicePool: [...t.dicePool, newDie] } : t)
    }));
  };

  const removeThreatDie = (threatId, dieId) => {
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.map(t =>
        t.id === threatId ? { ...t, dicePool: t.dicePool.filter(d => d.id !== dieId) } : t
      )
    }));
  };

  const addThreatActivation = (threatId) => {
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.map(t =>
        t.id === threatId
          ? {
              ...t,
              activations: [
                ...t.activations,
                { id: crypto.randomUUID(), name: 'Ação da Ameaça', description: '', costType: 'pressao', costAmount: 1, effect: '', isUsed: false }
              ]
            }
          : t
      )
    }));
  };

  const updateThreatActivation = (threatId, actId, field, value) => {
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.map(t =>
        t.id === threatId
          ? {
              ...t,
              activations: t.activations.map(a => a.id === actId ? { ...a, [field]: value } : a)
            }
          : t
      )
    }));
  };

  const removeThreatActivation = (threatId, actId) => {
    setFormData(prev => ({
      ...prev,
      threats: prev.threats.map(t =>
        t.id === threatId ? { ...t, activations: t.activations.filter(a => a.id !== actId) } : t
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Checar regra de ouro para o conflito principal
  const hasPressao = formData.conflictActivations.some(a => a.costType === 'pressao');
  const hasAdaptacao = formData.conflictActivations.some(a => a.costType === 'adaptacao');
  const satisfiesGoldRule = hasPressao && hasAdaptacao;

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 max-w-4xl mx-auto shadow-2xl custom-scrollbar">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-500" /> Editor de Cena de Conflito
            </h2>
            <p className="text-xs text-slate-400">Configure as regras, ameaças, dados e objetivos do combate narrativo.</p>
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg"
        >
          <Save className="w-5 h-5" /> Salvar Conflito
        </button>
      </div>

      {/* DADOS GERAIS DO CONFLITO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs uppercase font-bold text-slate-400">Nome do Conflito</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm font-semibold focus:border-amber-500 focus:outline-none"
            placeholder="Ex: 💥 Conflito 01 — Fuga da Fábrica"
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs uppercase font-bold text-slate-400">Descrição / Contexto</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
            placeholder="A estrutura está ruindo e os infectados cercam a saída principal..."
          />
        </div>

        {/* NÍVEL DE GRUPO E NÚMERO DE JOGADORES */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase font-bold text-slate-400">Nível do Grupo</label>
          <select
            value={formData.groupLevel}
            onChange={(e) => handleLevelOrPlayersChange(e.target.value, formData.playerCount)}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm font-medium focus:border-amber-500"
          >
            <option value="iniciante">Iniciantes (Base: 3 pts + 1/jogador)</option>
            <option value="intermediario">Intermediários (Base: 6 pts + 2/jogador)</option>
            <option value="avancado">Avançados (Base: 9 pts + 3/jogador)</option>
            <option value="epico">Épicos (Base: 12 pts + 4/jogador)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase font-bold text-slate-400">Nº de Jogadores (Infectados)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={formData.playerCount}
            onChange={(e) => handleLevelOrPlayersChange(formData.groupLevel, parseInt(e.target.value) || 1)}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm font-bold focus:border-amber-500"
          />
        </div>
      </div>

      {/* RESERVA DE DADOS DO CONFLITO */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Reserva de Dados do Conflito ({formData.totalDicePoints} Pontos)
            </h3>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => addDieToConflict('d6')}
              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-bold rounded"
            >
              + d6 (1 pt)
            </button>
            <button
              type="button"
              onClick={() => addDieToConflict('d10')}
              className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 text-xs font-bold rounded"
            >
              + d10 (2 pts)
            </button>
            <button
              type="button"
              onClick={() => addDieToConflict('d12')}
              className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-bold rounded"
            >
              + d12 (3 pts)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.conflictDicePool.map((die) => (
            <div
              key={die.id}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg"
            >
              <span className="text-xs font-black uppercase text-amber-400">{die.type}</span>
              <span className="text-[10px] text-slate-400">({die.pointValue} pt)</span>
              <button
                type="button"
                onClick={() => removeDieFromConflict(die.id)}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CONDICIONANTES AMBIENTAIS */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Condicionantes Ambientais
          </h3>
          <button
            type="button"
            onClick={addCondition}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {formData.conditions.map((cond) => (
            <div key={cond.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <input
                type="text"
                value={cond.name}
                onChange={(e) => updateCondition(cond.id, 'name', e.target.value)}
                className="md:col-span-4 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                placeholder="Nome da Condicionante"
              />
              <input
                type="text"
                value={cond.description}
                onChange={(e) => updateCondition(cond.id, 'description', e.target.value)}
                className="md:col-span-7 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300"
                placeholder="Descrição do efeito na cena..."
              />
              <button
                type="button"
                onClick={() => removeCondition(cond.id)}
                className="md:col-span-1 p-1 text-slate-500 hover:text-red-400 flex justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ATIVAÇÕES DO CONFLITO AMBIENTAL */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Ativações do Conflito (Ações Ambientais)
            </h3>
          </div>
          <button
            type="button"
            onClick={addActivation}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Ativação
          </button>
        </div>

        {!satisfiesGoldRule && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <strong>Regra de Ouro:</strong> O Conflito deve ter pelo menos 1 ativação de 🔴 Pressão E 1 de 🟡 Adaptação.
          </div>
        )}

        <div className="space-y-2">
          {formData.conflictActivations.map((act) => (
            <div key={act.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-900 p-3 rounded-lg border border-slate-800 items-center">
              <input
                type="text"
                value={act.name}
                onChange={(e) => updateActivation(act.id, 'name', e.target.value)}
                className="md:col-span-3 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                placeholder="Nome da Ação"
              />
              <select
                value={act.costType}
                onChange={(e) => updateActivation(act.id, 'costType', e.target.value)}
                className="md:col-span-2 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
              >
                <option value="pressao">🔴 Pressão</option>
                <option value="adaptacao">🟡 Adaptação</option>
              </select>
              <input
                type="number"
                min={1}
                max={5}
                value={act.costAmount}
                onChange={(e) => updateActivation(act.id, 'costAmount', parseInt(e.target.value) || 1)}
                className="md:col-span-1 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                placeholder="Custo"
              />
              <input
                type="text"
                value={act.effect}
                onChange={(e) => updateActivation(act.id, 'effect', e.target.value)}
                className="md:col-span-5 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300"
                placeholder="Efeito (Dano, consequência...)"
              />
              <button
                type="button"
                onClick={() => removeActivation(act.id)}
                className="md:col-span-1 p-1 text-slate-500 hover:text-red-400 flex justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO DE OBJETIVOS */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Objetivos da Cena
            </h3>
          </div>
          <button
            type="button"
            onClick={addObjective}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Objetivo
          </button>
        </div>

        <div className="space-y-3">
          {formData.objectives.map((obj) => (
            <div key={obj.id} className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 flex flex-col gap-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={obj.name}
                  onChange={(e) => updateObjective(obj.id, 'name', e.target.value)}
                  className="md:col-span-4 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white font-bold"
                  placeholder="Nome do Objetivo"
                />
                <select
                  value={obj.type}
                  onChange={(e) => updateObjective(obj.id, 'type', e.target.value)}
                  className="md:col-span-3 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                >
                  <option value="principal">🚨 Principal (Encerra Conflito)</option>
                  <option value="secundario">⭐ Secundário (Bônus/Recompensa)</option>
                </select>
                <div className="md:col-span-4 flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 uppercase">Sucessos:</span>
                  <input
                    type="number"
                    min={1}
                    value={obj.requiredSuccesses}
                    onChange={(e) => updateObjective(obj.id, 'requiredSuccesses', parseInt(e.target.value) || 1)}
                    className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-amber-400 font-bold w-20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeObjective(obj.id)}
                  className="md:col-span-1 p-1 text-slate-500 hover:text-red-400 flex justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={obj.description}
                onChange={(e) => updateObjective(obj.id, 'description', e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300"
                placeholder="Descrição narrativa do objetivo..."
              />

              {obj.type === 'secundario' && (
                <input
                  type="text"
                  value={obj.reward || ''}
                  onChange={(e) => updateObjective(obj.id, 'reward', e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-amber-300"
                  placeholder="🎁 Recompensa por concluir..."
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO DE AMEAÇAS (INIMIGOS) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Ameaças Individuais ({formData.threats.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={addThreat}
            className="px-3 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Ameaça
          </button>
        </div>

        <div className="space-y-4">
          {formData.threats.map((threat) => (
            <div key={threat.id} className="bg-slate-900 border border-purple-900/60 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <input
                  type="text"
                  value={threat.name}
                  onChange={(e) => updateThreat(threat.id, 'name', e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-bold text-white w-1/2"
                  placeholder="Nome da Ameaça"
                />
                <button
                  type="button"
                  onClick={() => removeThreat(threat.id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* RESERVA DA AMEAÇA */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-300 font-medium">Dados Próprios da Ameaça:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => addThreatDie(threat.id, 'd6')}
                    className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-bold rounded border border-emerald-800"
                  >
                    + d6
                  </button>
                  <button
                    type="button"
                    onClick={() => addThreatDie(threat.id, 'd10')}
                    className="px-2 py-0.5 bg-blue-950 text-blue-300 text-[10px] font-bold rounded border border-blue-800"
                  >
                    + d10
                  </button>
                  <button
                    type="button"
                    onClick={() => addThreatDie(threat.id, 'd12')}
                    className="px-2 py-0.5 bg-purple-950 text-purple-300 text-[10px] font-bold rounded border border-purple-800"
                  >
                    + d12
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {threat.dicePool.map((die) => (
                  <span
                    key={die.id}
                    className="bg-slate-950 text-purple-300 border border-purple-800 text-[10px] px-2 py-1 rounded flex items-center gap-1 font-mono font-bold"
                  >
                    {die.type}
                    <button
                      type="button"
                      onClick={() => removeThreatDie(threat.id, die.id)}
                      className="text-slate-500 hover:text-red-400 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* ATIVAÇÕES DA AMEAÇA */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Ativações da Ameaça</span>
                  <button
                    type="button"
                    onClick={() => addThreatActivation(threat.id)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded"
                  >
                    + Ativação
                  </button>
                </div>

                {threat.activations.map((act) => (
                  <div key={act.id} className="grid grid-cols-12 gap-1.5 items-center">
                    <input
                      type="text"
                      value={act.name}
                      onChange={(e) => updateThreatActivation(threat.id, act.id, 'name', e.target.value)}
                      className="col-span-4 bg-slate-950 border border-slate-800 rounded p-1 text-[11px] text-white"
                      placeholder="Nome da Ação"
                    />
                    <select
                      value={act.costType}
                      onChange={(e) => updateThreatActivation(threat.id, act.id, 'costType', e.target.value)}
                      className="col-span-3 bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-white"
                    >
                      <option value="pressao">🔴 Pressão</option>
                      <option value="adaptacao">🟡 Adaptação</option>
                    </select>
                    <input
                      type="text"
                      value={act.effect}
                      onChange={(e) => updateThreatActivation(threat.id, act.id, 'effect', e.target.value)}
                      className="col-span-4 bg-slate-950 border border-slate-800 rounded p-1 text-[11px] text-slate-300"
                      placeholder="Efeito"
                    />
                    <button
                      type="button"
                      onClick={() => removeThreatActivation(threat.id, act.id)}
                      className="col-span-1 text-slate-500 hover:text-red-400 flex justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MÍDIA PRÉ-DEFINIDA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Image className="w-4 h-4 text-blue-400" /> Cenário / Background Pré-definido
          </label>
          <select
            value={formData.backgroundId || ''}
            onChange={(e) => setFormData({ ...formData, backgroundId: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-amber-500"
          >
            <option value="">Nenhum (Manter atual)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Music className="w-4 h-4 text-purple-400" /> Trilha Sonora Pré-definida
          </label>
          <select
            value={formData.trackId || ''}
            onChange={(e) => setFormData({ ...formData, trackId: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-amber-500"
          >
            <option value="">Nenhuma (Manter atual)</option>
            {tracks.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.title || tr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RODAPÉ E BOTÃO DE SALVAR */}
      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-lg"
        >
          <Save className="w-4 h-4" /> Salvar Conflito
        </button>
      </div>
    </form>
  );
}
