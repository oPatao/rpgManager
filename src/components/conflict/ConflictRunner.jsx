import React from 'react';
import {
  Flame,
  RotateCw,
  Power,
  Dices,
  ShieldAlert,
  Users,
  Swords,
  Skull,
  CheckCircle2,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { DicePoolVisualizer } from './DicePoolVisualizer';
import { ObjectiveTracker } from './ObjectiveTracker';
import { ActivationPanel } from './ActivationPanel';
import { ThreatManager } from './ThreatManager';

export function ConflictRunner({
  conflict,
  onUpdateConflict,
  onEndConflict,
  onRollConflictDice,
  onRollThreatDice
}) {
  if (!conflict) return null;

  // Rolar dados do conflito principal
  const handleRollConflict = () => {
    const rolled = (conflict.conflictDicePool || []).map(die => {
      const max = die.type === 'd12' ? 12 : die.type === 'd10' ? 10 : 6;
      return Math.floor(Math.random() * max) + 1;
    });
    onUpdateConflict({ ...conflict, rolledValues: rolled });
  };

  // Rolar dados de uma ameaça
  const handleRollThreat = (threatId) => {
    const updatedThreats = (conflict.threats || []).map(t => {
      if (t.id === threatId) {
        const rolled = (t.dicePool || []).map(die => {
          const max = die.type === 'd12' ? 12 : die.type === 'd10' ? 10 : 6;
          return Math.floor(Math.random() * max) + 1;
        });
        return { ...t, rolledValues: rolled };
      }
      return t;
    });
    onUpdateConflict({ ...conflict, threats: updatedThreats });
  };

  // Adicionar ou remover sucessos em um objetivo
  const handleAddSuccess = (objId, amount) => {
    let mainObjectiveCompleted = false;

    const updatedObjectives = (conflict.objectives || []).map(obj => {
      if (obj.id === objId) {
        const newSuccesses = Math.max(0, (obj.currentSuccesses || 0) + amount);
        const isCompleted = newSuccesses >= obj.requiredSuccesses;

        if (isCompleted && obj.type === 'principal') {
          mainObjectiveCompleted = true;
        }

        return {
          ...obj,
          currentSuccesses: newSuccesses,
          isCompleted
        };
      }
      return obj;
    });

    onUpdateConflict({ ...conflict, objectives: updatedObjectives });

    if (mainObjectiveCompleted) {
      setTimeout(() => {
        alert("🎉 Objetivo Principal Concluído! O Conflito foi encerrado com sucesso.");
        onEndConflict();
      }, 300);
    }
  };

  const handleCompleteObjective = (objId) => {
    let isMain = false;
    const updatedObjectives = (conflict.objectives || []).map(obj => {
      if (obj.id === objId) {
        if (obj.type === 'principal') isMain = true;
        return { ...obj, currentSuccesses: obj.requiredSuccesses, isCompleted: true };
      }
      return obj;
    });

    onUpdateConflict({ ...conflict, objectives: updatedObjectives });

    if (isMain) {
      setTimeout(() => {
        alert("🎉 Objetivo Principal Concluído! O Conflito foi encerrado com sucesso.");
        onEndConflict();
      }, 300);
    }
  };

  // Usar Ativação do Conflito
  const handleUseConflictActivation = (actId) => {
    const updatedActivations = (conflict.conflictActivations || []).map(act =>
      act.id === actId ? { ...act, isUsed: true } : act
    );
    onUpdateConflict({ ...conflict, conflictActivations: updatedActivations });
  };

  // Usar Ativação da Ameaça
  const handleUseThreatActivation = (threatId, actId) => {
    const updatedThreats = (conflict.threats || []).map(t => {
      if (t.id === threatId) {
        const updatedActs = (t.activations || []).map(act =>
          act.id === actId ? { ...act, isUsed: true } : act
        );
        return { ...t, activations: updatedActs };
      }
      return t;
    });
    onUpdateConflict({ ...conflict, threats: updatedThreats });
  };

  // Neutralizar Ameaça
  const handleNeutralizeThreat = (threatId) => {
    const updatedThreats = (conflict.threats || []).map(t =>
      t.id === threatId ? { ...t, isNeutralized: true } : t
    );
    onUpdateConflict({ ...conflict, threats: updatedThreats });
  };

  // Toggle Condicionante
  const handleToggleCondition = (condId) => {
    const updatedConditions = (conflict.conditions || []).map(c =>
      c.id === condId ? { ...c, isActive: !c.isActive } : c
    );
    onUpdateConflict({ ...conflict, conditions: updatedConditions });
  };

  // AVANÇAR TURNO
  const handleAdvanceTurn = () => {
    const turnOrder = ['players', 'conflict', 'threats'];
    const currentIndex = turnOrder.indexOf(conflict.currentTurn || 'players');
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    const nextTurn = turnOrder[nextIndex];
    const isNewRound = nextIndex === 0;

    // Se começou nova rodada, reseta ativações usadas
    const updatedConflictActivations = isNewRound
      ? (conflict.conflictActivations || []).map(a => ({ ...a, isUsed: false }))
      : conflict.conflictActivations;

    const updatedThreats = isNewRound
      ? (conflict.threats || []).map(t => ({
          ...t,
          activations: (t.activations || []).map(a => ({ ...a, isUsed: false }))
        }))
      : conflict.threats;

    onUpdateConflict({
      ...conflict,
      currentTurn: nextTurn,
      currentRound: isNewRound ? (conflict.currentRound || 1) + 1 : conflict.currentRound || 1,
      conflictActivations: updatedConflictActivations,
      threats: updatedThreats,
      rolledValues: isNewRound ? [] : conflict.rolledValues
    });
  };

  return (
    <div className="bg-slate-900 border-2 border-red-800/80 rounded-2xl p-6 flex flex-col gap-6 shadow-2xl animate-fade-in-up">
      {/* HEADER EM TEMPO REAL */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-700 flex items-center justify-center text-red-400 font-extrabold text-xl shadow-inner shrink-0">
            {conflict.currentRound || 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-extrabold uppercase tracking-widest animate-pulse">
                EM ANDAMENTO
              </span>
              <span className="text-xs text-slate-400 uppercase font-semibold">
                Nível: {conflict.groupLevel} ({conflict.playerCount} jogadores)
              </span>
            </div>
            <h2 className="text-xl font-black text-white">{conflict.name}</h2>
          </div>
        </div>

        {/* FASES DO TURNO & AVANÇAR */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="flex gap-1">
            <button
              onClick={() => onUpdateConflict({ ...conflict, currentTurn: 'players' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                conflict.currentTurn === 'players'
                  ? 'bg-amber-600 text-slate-950 shadow-md scale-105'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Jogadores
            </button>
            <button
              onClick={() => onUpdateConflict({ ...conflict, currentTurn: 'conflict' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                conflict.currentTurn === 'conflict'
                  ? 'bg-red-600 text-white shadow-md scale-105'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" /> Conflito
            </button>
            <button
              onClick={() => onUpdateConflict({ ...conflict, currentTurn: 'threats' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                conflict.currentTurn === 'threats'
                  ? 'bg-purple-600 text-white shadow-md scale-105'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Skull className="w-3.5 h-3.5" /> Ameaças
            </button>
          </div>

          <button
            onClick={handleAdvanceTurn}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1 ml-2 shadow-md"
          >
            Próximo Turno <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onEndConflict}
            className="p-1.5 bg-slate-800 hover:bg-red-700 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
            title="Encerrar Conflito"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONDICIONANTES ATIVAS */}
      {conflict.conditions && conflict.conditions.length > 0 && (
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Condicionantes:
          </span>
          {conflict.conditions.map((cond) => (
            <button
              key={cond.id}
              onClick={() => handleToggleCondition(cond.id)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                cond.isActive
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-500 line-through opacity-60'
              }`}
            >
              {cond.name}: {cond.description}
            </button>
          ))}
        </div>
      )}

      {/* PAINEL PRINCIPAL EM GRADE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA: OBJETIVOS */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <ObjectiveTracker
            objectives={conflict.objectives || []}
            onAddSuccess={handleAddSuccess}
            onComplete={handleCompleteObjective}
          />
        </div>

        {/* COLUNA DIREITA: RESERVA DE DADOS E ATIVAÇÕES DO CONFLITO AMBIENTAL */}
        <div className="flex flex-col gap-4">
          <DicePoolVisualizer
            title="Reserva de Dados do Ambiente"
            dicePool={conflict.conflictDicePool || []}
            rolledValues={conflict.rolledValues || []}
            onRoll={handleRollConflict}
          />

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <ActivationPanel
              title="Ativações do Conflito (Ambiente)"
              activations={conflict.conflictActivations || []}
              onUseActivation={handleUseConflictActivation}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: AMEAÇAS INDIVIDUAIS */}
      {conflict.threats && conflict.threats.length > 0 && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-2">
          <ThreatManager
            threats={conflict.threats || []}
            onRollThreatDice={handleRollThreat}
            onUseThreatActivation={handleUseThreatActivation}
            onNeutralizeThreat={handleNeutralizeThreat}
          />
        </div>
      )}
    </div>
  );
}
