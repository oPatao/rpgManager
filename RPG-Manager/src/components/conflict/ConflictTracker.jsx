import React, { useState } from 'react';
import {
  Flame,
  Plus,
  Play,
  Edit2,
  Trash2,
  Swords,
  ShieldAlert,
  Dices,
  CheckCircle2
} from 'lucide-react';
import { ConflictEditor } from './ConflictEditor';
import { ConflictRunner } from './ConflictRunner';

export function ConflictTracker({
  conflicts = [],
  activeConflict = null,
  locations = [],
  tracks = [],
  npcs = [],
  onSaveConflict,
  onDeleteConflict,
  onStartConflict,
  onEndConflict,
  onUpdateActiveConflict
}) {
  const [editingConflict, setEditingConflict] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Se já houver um conflito ativo em andamento, mostra o ConflictRunner
  if (activeConflict) {
    return (
      <ConflictRunner
        conflict={activeConflict}
        onUpdateConflict={onUpdateActiveConflict}
        onEndConflict={onEndConflict}
      />
    );
  }

  // Se o mestre estiver criando ou editando um conflito
  if (isCreating || editingConflict) {
    return (
      <ConflictEditor
        conflict={editingConflict}
        locations={locations}
        tracks={tracks}
        npcs={npcs}
        onSave={(data) => {
          onSaveConflict(data);
          setIsCreating(false);
          setEditingConflict(null);
        }}
        onCancel={() => {
          setIsCreating(false);
          setEditingConflict(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER DA LISTA DE CONFLITOS */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-red-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Sistema de Conflitos de Assimilação
            </h2>
            <p className="text-xs text-slate-400">
              Gerencie combate narrativo, reserva de dados, objetivos e ativações de perigo.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4" /> Criar Conflito
        </button>
      </div>

      {/* LISTA DE CONFLITOS SALVOS */}
      {conflicts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
          <Swords className="w-12 h-12 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-300">Nenhum conflito cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Crie um novo conflito para definir reservas de dados, objetivos e ameaças ativas.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-colors"
          >
            Criar Primeiro Conflito
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conflicts.map((conf) => {
            const mainObj = (conf.objectives || []).find((o) => o.type === 'principal');
            const totalDicePoints = conf.totalDicePoints || 0;

            return (
              <div
                key={conf.id}
                className="bg-slate-900 border border-slate-800 hover:border-red-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-lg group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded font-extrabold uppercase bg-red-950 text-red-400 border border-red-800 tracking-wider">
                      {conf.groupLevel || 'Iniciante'} ({conf.playerCount || 4} P)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingConflict(conf)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title="Editar Conflito"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteConflict && onDeleteConflict(conf.id)}
                        className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="Excluir Conflito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    {conf.name}
                  </h3>

                  {conf.description && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {conf.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs pt-2">
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-mono">
                      🎲 {totalDicePoints} pts de dados
                    </span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                      🎯 {conf.objectives?.length || 0} objetivos
                    </span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                      💀 {conf.threats?.length || 0} ameaças
                    </span>
                  </div>

                  {mainObj && (
                    <div className="text-xs text-amber-300/90 bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg mt-2">
                      <strong className="text-amber-400">Objetivo Principal:</strong> {mainObj.name} ({mainObj.requiredSuccesses} Sucessos)
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onStartConflict && onStartConflict(conf.id)}
                  className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" /> Iniciar Este Conflito na Mesa
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
