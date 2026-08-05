import { create } from 'zustand';
import { localDB } from '../services/db';

export const useRPGStore = create((set, get) => ({
  // ESTADOS GERAIS
  role: null,
  isLoading: true,
  activeCampaignId: null,
  queuedTrackId: null,
  audioProgress: { time: 0, duration: 0 },
  modalState: { isOpen: false, type: null, data: null },
  sheetModalState: { isOpen: false, npcId: null },
  combatState: { round: 1, activeId: null },
  activeConflict: null,
  pipState: {
    isVisible: true,
    isMinimized: false,
    size: 'medium',
  },
  partyTrackerState: {
    isCollapsed: false,
  },
  uiState: {
    activeTab: 'npcs',
  },
  
  // ARQUIVOS DO BANCO DE DADOS
  campaigns: [], locations: [], npcs: [], tracks: [], 
  combatants: [], cutscenes: [], handouts: [], shops: [], refuges: [],
  conflicts: [],

  // A CENA ATUAL (SINCRONIZADA)
  activeScene: {
    location: null, refuge: null, npc: null, npcs: [], hideNpcName: false, isMapMode: false,
    cutscene: null, handout: null, shop: null,
    audio: { trackId: null, loop: true, seekEvent: null },
    ambient: { trackId: null, loop: true }
  },

  // FUNÇÕES DE ATUALIZAÇÃO SIMPLES (Setters)
  setRole: (role) => set({ role }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),
  setQueuedTrackId: (id) => set({ queuedTrackId: id }),
  setModalState: (modalState) => set({ modalState }),
  setSheetModalState: (sheetModalState) => set({ sheetModalState }),
  updateNPCSheet: async (npcId, sheet) => {
    const npcs = get().npcs || [];
    const updatedNpcs = npcs.map(npc =>
      npc.id === npcId ? { ...npc, sheet } : npc
    );
    set({ npcs: updatedNpcs });
    await localDB.setItem('npcs', updatedNpcs);

    const activeScene = get().activeScene;
    if (activeScene.npc?.id === npcId) {
      const newScene = { ...activeScene, npc: { ...activeScene.npc, sheet } };
      get().publishScene(newScene);
    }
  },
  setPipState: (pipState) => set((state) => {
    const nextState = typeof pipState === 'function' ? pipState(state.pipState) : pipState;
    localDB.setItem('pip-state', nextState);
    return { pipState: nextState };
  }),
  setPartyTrackerState: (partyTrackerState) => set((state) => {
    const nextState = typeof partyTrackerState === 'function' 
      ? partyTrackerState(state.partyTrackerState) 
      : partyTrackerState;
    localDB.setItem('party-tracker-state', nextState);
    return { partyTrackerState: nextState };
  }),
  setUiState: (uiState) => set((state) => {
    const nextState = typeof uiState === 'function' ? uiState(state.uiState) : uiState;
    localDB.setItem('ui-state', nextState);
    return { uiState: nextState };
  }),
  toggleNPCParty: async (npcId) => {
    const npcs = get().npcs || [];
    const updated = npcs.map(npc =>
      npc.id === npcId ? { ...npc, inParty: !npc.inParty } : npc
    );
    set({ npcs: updated });
    await localDB.setItem('npcs', updated);
  },
  updateNPCStats: async (npcId, stats) => {
    const npcs = get().npcs || [];
    const updated = npcs.map(npc => {
      if (npc.id !== npcId) return npc;
      const sheet = npc.sheet || {};
      return {
        ...npc,
        sheet: { ...sheet, ...stats }
      };
    });
    set({ npcs: updated });
    await localDB.setItem('npcs', updated);
  },
  
  // Atualizador especial para o progresso do áudio (que roda a cada 1 seg)
  setAudioProgress: (updater) => set((state) => ({ 
    audioProgress: typeof updater === 'function' ? updater(state.audioProgress) : updater 
  })),

  // FUNÇÃO: CARREGAR TUDO DO IndexedDB
  loadData: async () => {
    set({ isLoading: true });
    const dbCampaigns = await localDB.getItem('campaigns') || [];
    const loadedConflicts = await localDB.getItem('conflicts') || [];
    const activeConf = loadedConflicts.find(c => c.isActive) || null;
    const savedPipState = await localDB.getItem('pip-state');
    const savedPartyTrackerState = await localDB.getItem('party-tracker-state');
    const savedUiState = await localDB.getItem('ui-state');
    const savedScene = await localDB.getItem('rpg-active-scene');

    set({
      campaigns: dbCampaigns,
      locations: await localDB.getItem('locations') || [],
      refuges: await localDB.getItem('refuges') || [],
      npcs: await localDB.getItem('npcs') || [],
      tracks: await localDB.getItem('tracks') || [],
      combatants: await localDB.getItem('combatants') || [],
      combatState: await localDB.getItem('combat-state') || { round: 1, activeId: null },
      conflicts: loadedConflicts,
      activeConflict: activeConf,
      pipState: savedPipState || { isVisible: true, isMinimized: false, size: 'medium' },
      partyTrackerState: savedPartyTrackerState || { isCollapsed: false },
      uiState: savedUiState || { activeTab: 'npcs' },
      activeScene: savedScene ? { ...savedScene, npcs: savedScene.npcs || (savedScene.npc ? [{ ...savedScene.npc, variantIndex: 0, hideName: savedScene.hideNpcName || false, isHidden: false, isFadingOut: false }] : []) } : get().activeScene,
      cutscenes: await localDB.getItem('cutscenes') || [],
      handouts: await localDB.getItem('handouts') || [],
      shops: await localDB.getItem('shops') || [],
      activeCampaignId: dbCampaigns.length > 0 ? dbCampaigns[0].id : null,
      isLoading: false
    });
  },

  // FUNÇÕES DO SISTEMA DE CONFLITOS
  saveConflict: async (conflictData) => {
    const currentConflicts = get().conflicts || [];
    const index = currentConflicts.findIndex(c => c.id === conflictData.id);
    let updatedList;
    if (index >= 0) {
      updatedList = [...currentConflicts];
      updatedList[index] = conflictData;
    } else {
      updatedList = [...currentConflicts, conflictData];
    }
    await localDB.setItem('conflicts', updatedList);
    set({ conflicts: updatedList });
  },

  deleteConflict: async (id) => {
    const currentConflicts = get().conflicts || [];
    const updatedList = currentConflicts.filter(c => c.id !== id);
    await localDB.setItem('conflicts', updatedList);
    set({ conflicts: updatedList });
    if (get().activeConflict?.id === id) {
      get().endConflict();
    }
  },

  startConflict: async (id) => {
    const currentConflicts = get().conflicts || [];
    const targetConflict = currentConflicts.find(c => c.id === id);
    if (!targetConflict) return;

    const activatedConflict = {
      ...targetConflict,
      isActive: true,
      currentRound: 1,
      currentTurn: 'players',
      rolledValues: []
    };

    const updatedList = currentConflicts.map(c => c.id === id ? activatedConflict : { ...c, isActive: false });
    await localDB.setItem('conflicts', updatedList);
    set({ conflicts: updatedList, activeConflict: activatedConflict });

    // ATIVAR A MÍDIA PRÉ-DEFINIDA SE EXISTIR
    const currentScene = get().activeScene;
    let newScene = { ...currentScene };

    if (activatedConflict.backgroundId) {
      const bgLoc = (get().locations || []).find(l => l.id === activatedConflict.backgroundId);
      if (bgLoc) newScene.location = bgLoc;
    }

    if (activatedConflict.trackId) {
      newScene.audio = { trackId: activatedConflict.trackId, loop: true, seekEvent: null };
    }

    get().publishScene(newScene);

    // TRANSMITIR CONFLICT_START VIA BROADCASTCHANNEL
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({
      type: 'CONFLICT_START',
      payload: {
        conflictId: id,
        backgroundId: activatedConflict.backgroundId,
        trackId: activatedConflict.trackId
      }
    });
    channel.close();
  },

  endConflict: async () => {
    const activeConf = get().activeConflict;
    if (activeConf) {
      const currentConflicts = get().conflicts || [];
      const updatedList = currentConflicts.map(c => c.id === activeConf.id ? { ...c, isActive: false } : c);
      await localDB.setItem('conflicts', updatedList);
      set({ conflicts: updatedList, activeConflict: null });
    } else {
      set({ activeConflict: null });
    }

    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'CONFLICT_END', payload: {} });
    channel.close();
  },

  updateActiveConflict: async (updatedConflict) => {
    set({ activeConflict: updatedConflict });
    const currentConflicts = get().conflicts || [];
    const updatedList = currentConflicts.map(c => c.id === updatedConflict.id ? updatedConflict : c);
    await localDB.setItem('conflicts', updatedList);
    set({ conflicts: updatedList });

    // Transmitir atualização em tempo real
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'CONFLICT_UPDATE', conflict: updatedConflict });
    channel.close();
  },

  // FUNÇÕES DE GERENCIAMENTO DE NPCs NA CENA
  addNPCToScene: async (npcData) => {
    const activeScene = get().activeScene || {};
    const rawNpcs = Array.isArray(activeScene.npcs) 
      ? activeScene.npcs 
      : (activeScene.npc ? [activeScene.npc] : []);

    // Remove qualquer versão fadingOut antiga ou duplicada deste mesmo NPC
    const currentNpcs = rawNpcs.filter(n => !n.isFadingOut && n.id !== npcData.id);
    if (currentNpcs.length >= 4) return; // máximo 4

    const newNPC = {
      id: npcData.id,
      name: npcData.name,
      role: npcData.role || '',
      desc: npcData.desc || '',
      fileData: npcData.fileData,
      variants: npcData.variants || [],
      variantIndex: 0,
      hideName: false,
      isHidden: false,
      isFadingOut: false
    };
    const newNpcs = [...currentNpcs, newNPC];
    await get().publishScene({ ...activeScene, npcs: newNpcs, npc: newNpcs[0] || null });
  },

  removeNPCFromScene: async (npcId) => {
    const activeScene = get().activeScene || {};
    const rawNpcs = Array.isArray(activeScene.npcs) 
      ? activeScene.npcs 
      : (activeScene.npc ? [activeScene.npc] : []);

    if (!rawNpcs.some(n => n.id === npcId)) return;

    // Marca como fading out para animação suave de saída na tela do jogador
    const fadingNpcs = rawNpcs.map(n =>
      n.id === npcId ? { ...n, isFadingOut: true } : n
    );
    const activeRemaining = fadingNpcs.filter(n => !n.isFadingOut);
    const primaryNpc = activeRemaining.length > 0 ? activeRemaining[0] : null;

    await get().publishScene({ ...activeScene, npcs: fadingNpcs, npc: primaryNpc });

    // Remove do array definitivamente após 500ms
    setTimeout(async () => {
      const current = get().activeScene || {};
      const currentList = Array.isArray(current.npcs) 
        ? current.npcs 
        : (current.npc ? [current.npc] : []);
      const filteredNpcs = currentList.filter(n => n.id !== npcId);
      const remainingNpc = filteredNpcs.filter(n => !n.isFadingOut)[0] || null;
      await get().publishScene({ ...current, npcs: filteredNpcs, npc: remainingNpc });
    }, 500);
  },

  toggleNPCHidden: async (npcId) => {
    const activeScene = get().activeScene || {};
    const rawNpcs = Array.isArray(activeScene.npcs) 
      ? activeScene.npcs 
      : (activeScene.npc ? [activeScene.npc] : []);
    const updatedNpcs = rawNpcs.map(n =>
      n.id === npcId ? { ...n, isHidden: !n.isHidden } : n
    );
    await get().publishScene({ ...activeScene, npcs: updatedNpcs, npc: updatedNpcs[0] || null });
  },

  switchNPCVariant: async (npcId, variantIndex) => {
    const activeScene = get().activeScene || {};
    const rawNpcs = Array.isArray(activeScene.npcs) 
      ? activeScene.npcs 
      : (activeScene.npc ? [activeScene.npc] : []);
    const updatedNpcs = rawNpcs.map(n =>
      n.id === npcId ? { ...n, variantIndex } : n
    );
    await get().publishScene({ ...activeScene, npcs: updatedNpcs, npc: updatedNpcs[0] || null });
  },

  toggleNPCName: async (npcId) => {
    const activeScene = get().activeScene || {};
    const rawNpcs = Array.isArray(activeScene.npcs) 
      ? activeScene.npcs 
      : (activeScene.npc ? [activeScene.npc] : []);
    const updatedNpcs = rawNpcs.map(n =>
      n.id === npcId ? { ...n, hideName: !n.hideName } : n
    );
    await get().publishScene({ ...activeScene, npcs: updatedNpcs, npc: updatedNpcs[0] || null });
  },

  // FUNÇÃO: ATUALIZAR E TRANSMITIR A CENA (O antigo publishScene)
  publishScene: async (newScene) => {
    set({ activeScene: newScene });
    await localDB.setItem('rpg-active-scene', newScene);
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'SCENE_UPDATE', scene: newScene });
    channel.close();
  },

  // FUNÇÃO: DELETAR ARQUIVO
  deleteAsset: async (collectionName, id) => {
    const currentData = get()[collectionName] || [];
    const newDataList = currentData.filter(item => item.id !== id);
    
    await localDB.setItem(collectionName, newDataList);
    set({ [collectionName]: newDataList }); // Atualiza a variável correta dinamicamente
    
    if (collectionName === 'campaigns' && get().activeCampaignId === id) {
      set({ activeCampaignId: null });
    }

    // Se deletar um NPC, remove da cena ativa se estiver sendo exibido
    if (collectionName === 'npcs') {
      const activeScene = get().activeScene;
      let sceneNeedsUpdate = false;
      let newScene = { ...activeScene };

      if (activeScene.npc?.id === id) {
        newScene.npc = null;
        sceneNeedsUpdate = true;
      }
      if (activeScene.npcs?.some(n => n.id === id)) {
        newScene.npcs = activeScene.npcs.filter(n => n.id !== id);
        sceneNeedsUpdate = true;
      }
      if (activeScene.refugeNpcs?.some(n => n.id === id)) {
        newScene.refugeNpcs = activeScene.refugeNpcs.filter(n => n.id !== id);
        sceneNeedsUpdate = true;
      }
      if (sceneNeedsUpdate) {
        get().publishScene(newScene);
      }
    }
  },

  // FUNÇÃO: ATUALIZAR UM ARRAY INTEIRO (Usado após salvar/editar um arquivo)
  updateCollection: (collectionName, newData) => {
    set({ [collectionName]: newData });
  }
}));