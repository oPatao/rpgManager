import React from 'react';
import { Zap, AlertTriangle, Shield, Check, Flame } from 'lucide-react';

export function ActivationPanel({
  activations = [],
  onUseActivation,
  title = "Ativações Disponíveis",
  rolledTotal = null
}) {
  const hasPressao = activations.some(a => a.costType === 'pressao');
  const hasAdaptacao = activations.some(a => a.costType === 'adaptacao');
  const satisfiesGoldRule = hasPressao && hasAdaptacao;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
        </div>

        {/* ALERTA DA REGRA DE OURO */}
        {!satisfiesGoldRule && (
          <span className="flex items-center gap-1 text-[10px] bg-red-950/80 border border-red-700/80 text-red-300 px-2 py-0.5 rounded font-semibold animate-pulse">
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            Aviso: Requer ao menos 1 Pressão (🔴) e 1 Adaptação (🟡)
          </span>
        )}
      </div>

      {activations.length === 0 ? (
        <div className="text-xs text-slate-500 italic p-3 bg-slate-950 border border-slate-800 rounded-lg">
          Nenhuma ativação cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {activations.map((act) => {
            const isPressao = act.costType === 'pressao';
            const costLabel = isPressao ? 'Pressão' : 'Adaptação';

            return (
              <div
                key={act.id}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  act.isUsed
                    ? 'bg-slate-950/60 border-slate-800 opacity-50'
                    : isPressao
                    ? 'bg-red-950/20 border-red-800/60 hover:border-red-600/80'
                    : 'bg-amber-950/20 border-amber-800/60 hover:border-amber-600/80'
                }`}
              >
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {isPressao ? '🔴' : '🟡'}
                    </span>
                    <h4 className={`text-sm font-bold ${act.isUsed ? 'line-through text-slate-400' : 'text-white'}`}>
                      {act.name}
                    </h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                        isPressao
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {act.costAmount}x {costLabel}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{act.description}</p>
                  )}

                  {act.effect && (
                    <div className="text-xs text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 mt-1">
                      <strong className="text-amber-400">Efeito:</strong> {act.effect}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onUseActivation && onUseActivation(act.id)}
                  disabled={act.isUsed}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors flex items-center gap-1 ${
                    act.isUsed
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : isPressao
                      ? 'bg-red-700 hover:bg-red-600 text-white shadow-md'
                      : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md'
                  }`}
                >
                  {act.isUsed ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Usada
                    </>
                  ) : (
                    <>
                      <Flame className="w-3.5 h-3.5" /> Ativar
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
