import React, { useState } from 'react';
import { Swords, Play, Square, Plus, Trash2, Shield, Flame, RotateCcw, Save } from 'lucide-react';
import { generateId } from '../../services/db';

export const ConflictTracker = ({
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
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingConflict, setEditingConflict] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assimilationLevel: 5,
    maxAssimilation: 10,
    backgroundId: '',
    trackId: ''
  });

  const handleStartCreate = () => {
    setFormData({
      name: '',
      description: '',
      assimilationLevel: 5,
      maxAssimilation: 10,
      backgroundId: locations[0]?.id || '',
      trackId: tracks[0]?.id || ''
    });
    setEditingConflict(null);
    setIsCreating(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const dataToSave = {
      id: editingConflict?.id || generateId(),
      name: formData.name,
      description: formData.description,
      assimilationLevel: Number(formData.assimilationLevel) || 5,
      maxAssimilation: Number(formData.maxAssimilation) || 10,
      backgroundId: formData.backgroundId || null,
      trackId: formData.trackId || null,
      isActive: editingConflict?.isActive || false,
      currentRound: editingConflict?.currentRound || 1,
      currentTurn: editingConflict?.currentTurn || 'players',
      createdAt: editingConflict?.createdAt || Date.now()
    };

    onSaveConflict(dataToSave);
    setIsCreating(false);
    setEditingConflict(null);
  };

  const adjustAssimilation = (delta) => {
    if (!activeConflict) return;
    const newLevel = Math.max(0, Math.min(activeConflict.maxAssimilation || 10, (activeConflict.assimilationLevel || 0) + delta));
    onUpdateActiveConflict({
      ...activeConflict,
      assimilationLevel: newLevel
    });
  };

  const nextRound = () => {
    if (!activeConflict) return;
    onUpdateActiveConflict({
      ...activeConflict,
      currentRound: (activeConflict.currentRound || 1) + 1,
      currentTurn: activeConflict.currentTurn === 'players' ? 'assimilation' : 'players'
    });
  };

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-white text-base">Sistema de Conflito de Assimilação</h3>
        </div>
        {!activeConflict && !isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Conflito
          </button>
        )}
      </div>

      {/* PAINEL DE CONFLITO ATIVO */}
      {activeConflict && (
        <div className="bg-red-950/20 border border-red-800/60 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-400">Conflito Ativo</span>
              <h4 className="text-lg font-extrabold text-white">{activeConflict.name}</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-900 border border-slate-700 px-3 py-1 rounded-lg text-slate-300">
                Rodada <strong className="text-amber-400">{activeConflict.currentRound || 1}</strong>
              </span>
              <span className={`text-xs px-3 py-1 rounded-lg font-bold border ${
                activeConflict.currentTurn === 'players'
                  ? 'bg-blue-950/60 border-blue-700 text-blue-300'
                  : 'bg-red-950/60 border-red-700 text-red-300'
              }`}>
                Turno: {activeConflict.currentTurn === 'players' ? 'Jogadores' : 'Assimilação'}
              </span>
              <button
                onClick={onEndConflict}
                className="flex items-center gap-1 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" /> Encerrar
              </button>
            </div>
          </div>

          {/* BARRA DE CABO DE GUERRA / ASSIMILAÇÃO */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1 text-blue-400 font-bold">
                <Shield className="w-3.5 h-3.5" /> Determinação / Sobrevivência
              </span>
              <span className="flex items-center gap-1 text-red-400 font-bold">
                Assimilação / Corrupção <Flame className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="w-full bg-slate-900 h-6 rounded-full overflow-hidden border border-slate-700 relative flex items-center">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 transition-all duration-300"
                style={{
                  width: `${((activeConflict.assimilationLevel || 0) / (activeConflict.maxAssimilation || 10)) * 100}%`
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white drop-shadow">
                {activeConflict.assimilationLevel || 0} / {activeConflict.maxAssimilation || 10}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex gap-1.5">
                <button
                  onClick={() => adjustAssimilation(-1)}
                  className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/50 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  -1 Corrupção
                </button>
                <button
                  onClick={() => adjustAssimilation(-2)}
                  className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 border border-blue-800/40 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  -2
                </button>
              </div>

              <button
                onClick={nextRound}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-1 rounded-lg text-xs transition-colors cursor-pointer shadow"
              >
                Próximo Turno / Rodada
              </button>

              <div className="flex gap-1.5">
                <button
                  onClick={() => adjustAssimilation(1)}
                  className="bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/50 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  +1 Corrupção
                </button>
                <button
                  onClick={() => adjustAssimilation(2)}
                  className="bg-red-900/30 hover:bg-red-800/50 text-red-400 border border-red-800/40 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  +2
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */}
      {isCreating && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white text-sm">
              {editingConflict ? 'Editar Conflito' : 'Novo Conflito de Assimilação'}
            </h4>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingConflict(null); }}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Nome do Conflito *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cerco no Posto Avançado"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Cenário Associado</label>
              <select
                value={formData.backgroundId}
                onChange={(e) => setFormData({ ...formData, backgroundId: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="">Nenhum cenário automático</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Trilha Sonora Associada</label>
              <select
                value={formData.trackId}
                onChange={(e) => setFormData({ ...formData, trackId: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="">Nenhuma música automática</option>
                {tracks.map(trk => (
                  <option key={trk.id} value={trk.id}>{trk.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Nível Inicial</label>
                <input
                  type="number"
                  min="0"
                  max={formData.maxAssimilation}
                  value={formData.assimilationLevel}
                  onChange={(e) => setFormData({ ...formData, assimilationLevel: e.target.value })}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">Máximo</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxAssimilation}
                  onChange={(e) => setFormData({ ...formData, maxAssimilation: e.target.value })}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Salvar Conflito
          </button>
        </form>
      )}

      {/* LISTA DE CONFLITOS SALVOS */}
      {!activeConflict && (
        <div className="flex flex-col gap-2">
          {conflicts.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">Nenhum conflito cadastrado ainda.</p>
          ) : (
            conflicts.map(c => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <h5 className="font-bold text-white text-sm">{c.name}</h5>
                  <span className="text-xs text-slate-400">
                    Assimilação: {c.assimilationLevel || 5}/{c.maxAssimilation || 10}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStartConflict(c.id)}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Iniciar
                  </button>
                  <button
                    onClick={() => onDeleteConflict(c.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Excluir conflito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
