import React from 'react';
import { Target, Flag, CheckCircle2, Plus, Minus, ShieldAlert } from 'lucide-react';

export function ObjectiveTracker({ objectives = [], onAddSuccess, onComplete }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Target className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Objetivos do Conflito</h3>
      </div>

      {objectives.length === 0 ? (
        <div className="text-xs text-slate-500 italic p-3 bg-slate-950 border border-slate-800 rounded-lg">
          Nenhum objetivo definido para este conflito.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {objectives.map((obj) => {
            const isMain = obj.type === 'principal';
            const progressPercent = Math.min(
              100,
              Math.round(((obj.currentSuccesses || 0) / (obj.requiredSuccesses || 1)) * 100)
            );

            return (
              <div
                key={obj.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  obj.isCompleted
                    ? 'bg-emerald-950/20 border-emerald-600/60 shadow-lg'
                    : isMain
                    ? 'bg-slate-900/90 border-red-800/80'
                    : 'bg-slate-900/80 border-blue-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                          isMain
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}
                      >
                        {isMain ? 'Principal' : 'Secundário'}
                      </span>
                      {obj.isSoloOption && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold uppercase">
                          Opção Solo ({obj.soloCost || 5}/pessoa)
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {obj.name}
                      </h4>
                    </div>
                    {obj.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{obj.description}</p>
                    )}
                    {obj.reward && (
                      <p className="text-[11px] text-amber-400/90 italic mt-0.5">
                        🎁 Recompensa: {obj.reward}
                      </p>
                    )}
                  </div>

                  {obj.isCompleted && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 rounded-lg shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                    </span>
                  )}
                </div>

                {/* BARRA DE PROGRESSO */}
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Progresso de Sucessos</span>
                    <span className={obj.isCompleted ? 'text-emerald-400 font-extrabold' : 'text-amber-400'}>
                      {obj.currentSuccesses || 0} / {obj.requiredSuccesses} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        obj.isCompleted
                          ? 'bg-emerald-500'
                          : isMain
                          ? 'bg-gradient-to-r from-red-600 to-amber-500'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* CONTROLES DE SUCESSO */}
                {!obj.isCompleted && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAddSuccess && onAddSuccess(obj.id, -1)}
                        disabled={obj.currentSuccesses <= 0}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg transition-colors"
                        title="-1 Sucesso"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAddSuccess && onAddSuccess(obj.id, 1)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" /> +1 Sucesso
                      </button>
                    </div>

                    <button
                      onClick={() => onComplete && onComplete(obj.id)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
                    </button>
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
