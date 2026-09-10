import React, { useState, useEffect } from 'react';
import { X, Heart, Shield, Zap, Sword, Save, Plus, Trash2, User } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { getAssetUrl } from '../services/db';

export const CharacterSheet = () => {
  const sheetModalState = useRPGStore(state => state.sheetModalState);
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);
  const npcs = useRPGStore(state => state.npcs) || [];
  const updateNPCSheet = useRPGStore(state => state.updateNPCSheet);

  const activeNPC = npcs.find(n => n.id === sheetModalState?.npcId);

  const [sheet, setSheet] = useState({
    pvCurrent: 20,
    pvMax: 20,
    peCurrent: 10,
    peMax: 10,
    defense: 12,
    attributes: {
      for: 1,
      agi: 1,
      int: 1,
      pre: 1,
      vig: 1
    },
    skills: '',
    weapons: '',
    equipment: '',
    notes: ''
  });

  useEffect(() => {
    if (activeNPC?.sheet) {
      setSheet({
        pvCurrent: activeNPC.sheet.pvCurrent ?? 20,
        pvMax: activeNPC.sheet.pvMax ?? 20,
        peCurrent: activeNPC.sheet.peCurrent ?? 10,
        peMax: activeNPC.sheet.peMax ?? 10,
        defense: activeNPC.sheet.defense ?? 12,
        attributes: {
          for: activeNPC.sheet.attributes?.for ?? 1,
          agi: activeNPC.sheet.attributes?.agi ?? 1,
          int: activeNPC.sheet.attributes?.int ?? 1,
          pre: activeNPC.sheet.attributes?.pre ?? 1,
          vig: activeNPC.sheet.attributes?.vig ?? 1,
        },
        skills: activeNPC.sheet.skills || '',
        weapons: activeNPC.sheet.weapons || '',
        equipment: activeNPC.sheet.equipment || '',
        notes: activeNPC.sheet.notes || ''
      });
    }
  }, [activeNPC?.id, activeNPC?.sheet]);

  if (!sheetModalState?.isOpen || !activeNPC) return null;

  const handleClose = () => {
    setSheetModalState({ isOpen: false, npcId: null });
  };

  const handleSave = async () => {
    await updateNPCSheet(activeNPC.id, sheet);
    handleClose();
  };

  const handleAttrChange = (attr, val) => {
    setSheet(s => ({
      ...s,
      attributes: {
        ...s.attributes,
        [attr]: Number(val) || 0
      }
    }));
  };

  const npcImg = activeNPC.fileData ? getAssetUrl(activeNPC.fileData) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {npcImg ? (
              <img src={npcImg} alt={activeNPC.name} className="w-10 h-10 rounded-full object-cover border border-amber-500/50" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{activeNPC.name}</h3>
              <p className="text-xs text-amber-500 font-medium">{activeNPC.role || 'Personagem / NPC'}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-200">
          {/* Status Vitais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-red-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-red-400 font-bold">
                <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-red-500" /> PV</span>
                <span>{sheet.pvCurrent} / {sheet.pvMax}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sheet.pvCurrent}
                  onChange={(e) => setSheet(s => ({ ...s, pvCurrent: Number(e.target.value) }))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-center"
                />
                <input
                  type="number"
                  value={sheet.pvMax}
                  onChange={(e) => setSheet(s => ({ ...s, pvMax: Number(e.target.value) }))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-center text-slate-400"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-blue-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
                <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-blue-500" /> PE</span>
                <span>{sheet.peCurrent} / {sheet.peMax}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sheet.peCurrent}
                  onChange={(e) => setSheet(s => ({ ...s, peCurrent: Number(e.target.value) }))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-center"
                />
                <input
                  type="number"
                  value={sheet.peMax}
                  onChange={(e) => setSheet(s => ({ ...s, peMax: Number(e.target.value) }))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-center text-slate-400"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-amber-500" /> Defesa</span>
              </div>
              <input
                type="number"
                value={sheet.defense}
                onChange={(e) => setSheet(s => ({ ...s, defense: Number(e.target.value) }))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-center font-bold"
              />
            </div>
          </div>

          {/* Atributos Básicos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Atributos</h4>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { id: 'for', label: 'FOR' },
                { id: 'agi', label: 'AGI' },
                { id: 'int', label: 'INT' },
                { id: 'pre', label: 'PRE' },
                { id: 'vig', label: 'VIG' }
              ].map(attr => (
                <div key={attr.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                  <span className="text-[10px] font-extrabold text-amber-500 mb-1">{attr.label}</span>
                  <input
                    type="number"
                    value={sheet.attributes[attr.id] || 0}
                    onChange={(e) => handleAttrChange(attr.id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded py-1 text-center font-bold text-base"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Habilidades & Perícias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Ataques & Armas</label>
              <textarea
                rows={3}
                value={sheet.weapons}
                onChange={(e) => setSheet(s => ({ ...s, weapons: e.target.value }))}
                placeholder="Ex: Faca Tática (+3 d20, dano 1d6+2)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Perícias & Poderes</label>
              <textarea
                rows={3}
                value={sheet.skills}
                onChange={(e) => setSheet(s => ({ ...s, skills: e.target.value }))}
                placeholder="Ex: Luta +5, Pontaria +5, Percepção +10..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Equipamento & Anotações */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Anotações do Mestre</label>
            <textarea
              rows={3}
              value={sheet.notes}
              onChange={(e) => setSheet(s => ({ ...s, notes: e.target.value }))}
              placeholder="Histórico, segredos, comportamentos especiais..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow-md"
          >
            <Save className="w-4 h-4" /> Salvar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
