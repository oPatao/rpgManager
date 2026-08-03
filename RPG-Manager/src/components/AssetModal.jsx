import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { localDB, generateId, fileToDataUrl, getAssetUrl } from '../services/db';

export const AssetModal = () => {
  // Puxa as variáveis globais da Store do Zustand
  const modalState = useRPGStore(state => state.modalState);
  const setModalState = useRPGStore(state => state.setModalState);
  const activeCampaignId = useRPGStore(state => state.activeCampaignId);
  const activeScene = useRPGStore(state => state.activeScene);
  const publishScene = useRPGStore(state => state.publishScene);
  const npcs = useRPGStore(state => state.npcs);
  const updateCollection = useRPGStore(state => state.updateCollection);
  
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [currentVariants, setCurrentVariants] = useState([]);

  useEffect(() => {
    if (modalState.isOpen && modalState.type === 'npc' && modalState.data?.variants) {
      setCurrentVariants(modalState.data.variants);
    } else if (modalState.isOpen) {
      setCurrentVariants([]);
    }
  }, [modalState]);

  const removeVariant = (indexToRemove) => {
    setCurrentVariants(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const saveAsset = async (e) => {
    e.preventDefault();
    setIsLoadingLocal(true);
    
    try {
      const formData = new FormData(e.target);
      const isEditing = !!modalState.data;

      const data = isEditing ? { ...modalState.data } : { id: generateId(), campaignId: activeCampaignId };
      data.name = formData.get('name');
      data.folder = formData.get('folder')?.trim() || '';
      
      const collectionName = modalState.type === 'campaign' ? 'campaigns' : 
                             modalState.type === 'location' ? 'locations' : 
                             modalState.type === 'refuge' ? 'refuges' :
                             modalState.type === 'npc' ? 'npcs' : 
                             modalState.type === 'cutscene' ? 'cutscenes' : 
                             modalState.type === 'combatant' ? 'combatants' : 
                             modalState.type === 'handout' ? 'handouts' : 
                             modalState.type === 'shop' ? 'shops' : 'tracks';

      // (Manter todas as lógicas de if (modalState.type === 'npc') etc. EXATAMENTE como estavam no seu código atual)
      if (modalState.type === 'npc') {
        data.role = formData.get('role');
        data.desc = formData.get('desc');
        data.type = formData.get('npcType') || 'npc';
      }
      if (modalState.type === 'combatant') {
        data.type = formData.get('combatantType');
        data.initiative = Number(formData.get('initiative')) || 0;
      }
      if (modalState.type === 'track') {
        const tagsInput = formData.get('tags') || '';
        data.tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
      }
      if (modalState.type === 'refuge' && !isEditing) {
        data.level = 1;
        data.population = 1;
        data.structures = 0;
        data.stats = {
          moral: 3, defesa: 1, beligerancia: 1,
          resources: {
            agua: { cur: 0, max: 100 }, plantas: { cur: 0, max: 100 },
            animais: { cur: 0, max: 100 }, madeira: { cur: 0, max: 100 },
            minerais: { cur: 0, max: 100 }, biomassa: { cur: 0, max: 100 },
            alimento: { cur: 0, max: 100 }, vestuario: { cur: 0, max: 100 },
            municao: { cur: 0, max: 100 }, combustivel: { cur: 0, max: 100 },
            medicamento: { cur: 0, max: 100 }, material: { cur: 0, max: 100 }
          }
        };
      }
      if (modalState.type === 'handout') {
        data.desc = formData.get('desc');
      }
      if (modalState.type === 'shop') {
        data.vendorId = formData.get('vendorId');
        const itemsRaw = formData.get('itemsData') || '';
        data.items = itemsRaw.split('\n').filter(line => line.trim() !== '').map(line => {
           const parts = line.split('-');
           if (parts.length > 1) {
               const price = parts.pop().trim();
               const name = parts.join('-').trim();
               return { name, price };
           }
           return { name: line.trim(), price: '' };
        });
      }

      const files = formData.getAll('fileInput').filter(f => f.size > 0);
      let keptVariants = [];
      
      if (modalState.type === 'npc' && isEditing) {
          // Lemos as imagens que sobraram direto da memória do React, sem inputs invisíveis!
          keptVariants = currentVariants; 
      }

      if (files.length > 0) {
         if (modalState.type === 'npc') {
             const combinedVariants = [...keptVariants, ...files]; // Junta os arquivos antigos com os novos
             data.variants = combinedVariants;
             data.fileData = combinedVariants[0]; // Salva o File/Blob diretamente! Sem await, sem Base64!
         } else {
             data.fileData = files[0];
         }
      } else if (isEditing) {
         data.fileData = modalState.data.fileData;
         if (modalState.type === 'npc') {
             data.variants = keptVariants;
             if (data.variants.length > 0) data.fileData = data.variants[0];
         }
      }

      if (modalState.type === 'npc' && (!data.variants || data.variants.length === 0)) {
         alert("O NPC precisa de pelo menos uma imagem! Adicione uma imagem antes de salvar.");
         setIsLoadingLocal(false);
         return;
      }

      const currentData = await localDB.getItem(collectionName) || [];
      let newDataList;
      
      if (isEditing) {
         newDataList = currentData.map(item => item.id === data.id ? data : item);
         if (modalState.type === 'shop' && activeScene.shop?.id === data.id) publishScene({ ...activeScene, shop: data });
         if (modalState.type === 'npc' && activeScene.npc?.id === data.id) publishScene({ ...activeScene, npc: data });
         if (modalState.type === 'location' && activeScene.location?.id === data.id) publishScene({ ...activeScene, location: data });
      } else {
         newDataList = [...currentData, data];
      }
      
      // Salva no DB Local e atualiza a Store do Zustand
      await localDB.setItem(collectionName, newDataList);
      updateCollection(collectionName, newDataList);
      
      if (collectionName === 'campaigns' && !isEditing) {
        useRPGStore.setState({ activeCampaignId: data.id });
      }

    } catch (err) {
      console.error("Erro ao salvar arquivo:", err);
      alert("Erro fatal ao salvar: " + err.message);
    }

    setModalState({ isOpen: false, type: null, data: null });
    setIsLoadingLocal(false);
  };

  if (!modalState.isOpen) return null;
  const titles = { campaign: 'Nova Campanha', location: 'Novo Cenário', npc: 'Novo NPC', track: 'Nova Música / Som', combatant: 'Adicionar à Iniciativa', handout: 'Novo Handout / Item', shop: 'Nova Loja / Mercador' };
  const isEditing = !!modalState.data;

  return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up custom-scrollbar max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-amber-500">{isEditing ? 'Editar Ficheiro' : titles[modalState.type]}</h3>
            <button onClick={() => setModalState({ isOpen: false, type: null, data: null })} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          
          <form onSubmit={saveAsset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 uppercase font-bold">Nome</label>
              <input name="name" defaultValue={modalState.data?.name} required className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Obrigatório..." />
            </div>
            {(modalState.type === 'location' || modalState.type === 'npc' || modalState.type === 'cutscene' || modalState.type === 'handout') && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 uppercase font-bold text-blue-400">Pasta / Categoria (Opcional)</label>
                <input name="folder" defaultValue={modalState.data?.folder} className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Ex: Floresta, Taverna, Ato 1..." />
              </div>
            )}

            {modalState.type === 'cutscene' && (
              <div className="flex flex-col gap-1 border-t border-slate-800 pt-3 mt-1">
                <label className="text-xs text-slate-400 uppercase font-bold">Upload de Vídeo (MP4/WEBM)</label>
                <input type="file" name="fileInput" accept="video/mp4,video/webm" required={!isEditing} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-900/30 file:text-pink-500 hover:file:bg-pink-900/50" />
                {isEditing && <span className="text-[10px] text-emerald-500 italic mt-1">Vídeo já guardado. Envie apenas se quiser substituir.</span>}
              </div>
            )}

            {modalState.type === 'npc' && (
              <>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-slate-400 uppercase font-bold">Categoria</label>
                    <select name="npcType" defaultValue={modalState.data?.type || 'npc'} className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white">
                      <option value="npc">NPC / Aliado</option>
                      <option value="player">Jogador</option>
                      <option value="enemy">Inimigo</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-slate-400 uppercase font-bold">Papel / Título</label>
                    <input name="role" defaultValue={modalState.data?.role} className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Ex: Guerreiro" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Descrição Oculta (Apenas Mestre)</label>
                  <textarea name="desc" defaultValue={modalState.data?.desc} rows="2" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="Opcional..." />
                </div>
              </>
            )}

            {/* Campo ÚNICO de Upload para Cenários, Combatentes, Handouts e Lojas */}
            {(modalState.type === 'location' || modalState.type === 'combatant' || modalState.type === 'handout' || modalState.type === 'shop') && (
              <div className="flex flex-col gap-1 border-t border-slate-800 pt-3 mt-1">
                <label className="text-xs text-slate-400 uppercase font-bold">Upload de Imagem (PNG/JPG)</label>
                <input type="file" name="fileInput" accept="image/*" required={!isEditing} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-900/30 file:text-amber-500 hover:file:bg-amber-900/50" />
                {isEditing && <span className="text-[10px] text-emerald-500 italic mt-1">Imagem já guardada. Envie uma nova apenas se quiser substituir.</span>}
              </div>
            )}

            {/* UPGRADE: Campo MÚLTIPLO Exclusivo para NPCs com Galeria Editável */}
            {modalState.type === 'npc' && (
              <div className="flex flex-col gap-1 border-t border-slate-800 pt-3 mt-1">
                <label className="text-xs text-slate-400 uppercase font-bold text-emerald-400">Gerir Imagens (Expressões)</label>
                
                {/* --- Galeria de Edição das Variantes --- */}
                {isEditing && currentVariants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 bg-slate-950 p-2 rounded-lg border border-slate-800 shadow-inner">
                    {currentVariants.map((vImg, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded overflow-hidden border border-slate-700 group">
                        <img src={getAssetUrl(vImg)} className="w-full h-full object-cover object-top" alt="var" />
                        <button 
                          type="button" 
                          onClick={() => removeVariant(idx)} 
                          className="absolute inset-0 bg-red-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Apagar Expressão"
                        >
                          <Trash2 className="w-5 h-5 text-white drop-shadow-md" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-0 left-0 w-full text-[8px] bg-emerald-600 text-white text-center font-bold tracking-widest">PRINCIPAL</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}


                <input type="file" name="fileInput" accept="image/*" multiple required={!isEditing || currentVariants.length === 0} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-900/30 file:text-emerald-500 hover:file:bg-emerald-900/50" />
                
                <span className="text-[10px] text-slate-400 italic mt-1">
                  Dica: Segure <kbd className="bg-slate-800 px-1 rounded">CTRL</kbd> para selecionar várias imagens de uma vez.
                </span>
                {isEditing && <span className="text-[10px] text-emerald-500 font-bold mt-1">As novas imagens selecionadas serão ADICIONADAS à lista acima.</span>}
              </div>
            )}

            {modalState.type === 'track' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Upload de Áudio (MP3/WAV)</label>
                  <input type="file" name="fileInput" accept="audio/*" required={!isEditing} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-900/30 file:text-purple-400 hover:file:bg-purple-900/50" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Tags / Categorias (Separadas por vírgula)</label>
                  <input name="tags" defaultValue={modalState.data?.tags?.join(', ')} className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500" placeholder="Ex: Combate, Tranquila, Suspense" />
                </div>
              </>
            )}

            {modalState.type === 'combatant' && (
              <div className="flex gap-4 border-t border-slate-800 pt-3 mt-1">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Tipo</label>
                  <select name="combatantType" defaultValue={modalState.data?.type || 'enemy'} className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white">
                    <option value="enemy">Inimigo</option>
                    <option value="player">Jogador</option>
                    <option value="ally">Aliado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Iniciativa</label>
                  <input type="number" name="initiative" defaultValue={modalState.data?.initiative} required className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Ex: 18" />
                </div>
              </div>
            )}

            {modalState.type === 'handout' && (
              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs text-slate-400 uppercase font-bold">Descrição / Texto (Aparece na tela)</label>
                <textarea name="desc" defaultValue={modalState.data?.desc} rows="3" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="Opcional. Ex: O texto escrito na carta, ou os atributos da arma..." />
              </div>
            )}

            {modalState.type === 'shop' && (
              <>
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs text-slate-400 uppercase font-bold">Vendedor (NPC)</label>
                  <select name="vendorId" defaultValue={modalState.data?.vendorId || ''} required className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white">
                    <option value="" disabled>Selecione o NPC vendedor...</option>
                    {npcs.filter(n => n.campaignId === activeCampaignId).map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs text-slate-400 uppercase font-bold">Lista de Itens (1 por linha)</label>
                  <textarea name="itemsData" defaultValue={modalState.data?.items?.map(i => `${i.name} - ${i.price}`).join('\n')} rows="5" required className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="Exemplo:&#10;Cerveja Artesanal - 3 GP&#10;Kit de Reparo - 60 GP" />
                  <span className="text-[10px] text-slate-500 italic">Formato: Nome do Item - Preço (Separe sempre com um traço)</span>
                </div>
              </>
            )}

            <button type="submit" disabled={isLoadingLocal} className="mt-4 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                <Save className="w-5 h-5" /> {isLoadingLocal ? "A Guardar..." : isEditing ? "Atualizar Ficheiro Offline" : "Guardar Ficheiro Offline"}
            </button>
          </form>
        </div>
      </div>
    );
  };