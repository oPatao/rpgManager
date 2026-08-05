import React, { useState } from 'react';
import { Dices } from 'lucide-react';

export function DicePoolVisualizer({ dicePool = [], rolledValues = [], onRoll, title = "Reserva de Dados" }) {
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    setIsRolling(true);
    setTimeout(() => {
      if (onRoll) onRoll();
      setIsRolling(false);
    }, 400);
  };

  const totalPoints = dicePool.reduce((acc, d) => acc + (d.pointValue || 1), 0);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {totalPoints} pts ({dicePool.length} dados)
          </span>
        </div>
        {onRoll && (
          <button
            onClick={handleRoll}
            disabled={isRolling || dicePool.length === 0}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Dices className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
            {rolledValues.length > 0 ? 'Rolar Novamente' : 'Rolar Dados'}
          </button>
        )}
      </div>

      {/* Exibição dos dados na reserva */}
      <div className="flex flex-wrap gap-2 items-center">
        {dicePool.length === 0 ? (
          <span className="text-xs text-slate-500 italic">Nenhum dado na reserva.</span>
        ) : (
          dicePool.map((die, idx) => {
            const val = rolledValues[idx];
            return (
              <div
                key={die.id || idx}
                className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                  die.type === 'd12'
                    ? 'bg-purple-950/40 border-purple-700/60 text-purple-300'
                    : die.type === 'd10'
                    ? 'bg-blue-950/40 border-blue-700/60 text-blue-300'
                    : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                } ${isRolling ? 'animate-bounce' : ''}`}
                style={{ width: '52px', height: '52px' }}
              >
                <span className="text-[9px] font-extrabold uppercase opacity-75">{die.type}</span>
                {val !== undefined ? (
                  <span className="text-base font-black text-white">{val}</span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">{die.pointValue} pt</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {rolledValues.length > 0 && (
        <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800/60 flex justify-between items-center">
          <span>Soma dos resultados:</span>
          <span className="text-amber-400 font-extrabold text-sm">
            {rolledValues.reduce((a, b) => a + b, 0)}
          </span>
        </div>
      )}
    </div>
  );
}
