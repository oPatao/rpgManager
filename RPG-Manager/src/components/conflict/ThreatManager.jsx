import React from 'react';
import { Skull, ShieldAlert, CheckCircle2, Trash2, Power } from 'lucide-react';
import { DicePoolVisualizer } from './DicePoolVisualizer';
import { ActivationPanel } from './ActivationPanel';

export function ThreatManager({
  threats = [],
  onRollThreatDice,
  onUseThreatActivation,
  onNeutralizeThreat,
  onDeleteThreat
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Skull className="w-4 h-4 text-purple-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Ameaças Presentes ({threats.filter(t => !t.isNeutralized).length} ativas)
        </h3>
      </div>

      {threats.length === 0 ? (
        <div className="text-xs text-slate-500 italic p-3 bg-slate-950 border border-slate-800 rounded-lg">
          Nenhuma ameaça cadastrada para este conflito.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {threats.map((threat) => {
            return (
              <div
                key={threat.id}
                className={`p-4 rounded-xl border transition-all ${
                  threat.isNeutralized
                    ? 'bg-slate-950/40 border-slate-800 opacity-50'
                    : 'bg-purple-950/20 border-purple-800/80 shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-purple-900/40 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Skull className={`w-5 h-5 ${threat.isNeutralized ? 'text-slate-500' : 'text-purple-400'}`} />
                    <div>
                      <h4 className={`text-base font-bold ${threat.isNeutralized ? 'line-through text-slate-400' : 'text-white'}`}>
                        {threat.name}
                      </h4>
                      {threat.description && (
                        <p className="text-xs text-slate-400">{threat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {threat.isNeutralized ? (
                      <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                        Neutralizada
                      </span>
                    ) : (
                      <button
                        onClick={() => onNeutralizeThreat && onNeutralizeThreat(threat.id)}
                        className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Power className="w-3.5 h-3.5" /> Neutralizar
                      </button>
                    )}

                    {onDeleteThreat && (
                      <button
                        onClick={() => onDeleteThreat(threat.id)}
                        className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="Remover Ameaça"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {!threat.isNeutralized && (
                  <div className="space-y-4">
                    {/* RESERVA DE DADOS DA AMEAÇA */}
                    {threat.hasOwnDicePool ? (
                      <DicePoolVisualizer
                        title={`Reserva de ${threat.name}`}
                        dicePool={threat.dicePool || []}
                        rolledValues={threat.rolledValues || []}
                        onRoll={() => onRollThreatDice && onRollThreatDice(threat.id)}
                      />
                    ) : (
                      <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 italic">
                        Usa a reserva de dados do Conflito principal.
                      </div>
                    )}

                    {/* ATIVAÇÕES DA AMEAÇA */}
                    <ActivationPanel
                      title={`Ativações de ${threat.name}`}
                      activations={threat.activations || []}
                      onUseActivation={(actId) =>
                        onUseThreatActivation && onUseThreatActivation(threat.id, actId)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
