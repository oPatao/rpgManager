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
  combatState: { round: 1, activeId: null },
  
  // ARQUIVOS DO BANCO DE DADOS
  campaigns: [], locations: [], npcs: [], tracks: [], 
  combatants: [], cutscenes: [], handouts: [], shops: [],

  // A CENA ATUAL (SINCRONIZADA)
  activeScene: {
    location: null, npc: null, hideNpcName: false, isMapMode: false,
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
  
  // Atualizador especial para o progresso do áudio (que roda a cada 1 seg)
  setAudioProgress: (updater) => set((state) => ({ 
    audioProgress: typeof updater === 'function' ? updater(state.audioProgress) : updater 
  })),

  // FUNÇÃO: CARREGAR TUDO DO IndexedDB
  loadData: async () => {
    set({ isLoading: true });
    const dbCampaigns = await localDB.getItem('campaigns') || [];
    set({
      campaigns: dbCampaigns,
      locations: await localDB.getItem('locations') || [],
      npcs: await localDB.getItem('npcs') || [],
      tracks: await localDB.getItem('tracks') || [],
      combatants: await localDB.getItem('combatants') || [],
      combatState: await localDB.getItem('combat-state') || { round: 1, activeId: null },
      cutscenes: await localDB.getItem('cutscenes') || [],
      handouts: await localDB.getItem('handouts') || [],
      shops: await localDB.getItem('shops') || [],
      activeCampaignId: dbCampaigns.length > 0 ? dbCampaigns[0].id : null,
      isLoading: false
    });
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
    if(!window.confirm("Tem certeza que deseja apagar este item?")) return;
    const currentData = get()[collectionName] || [];
    const newDataList = currentData.filter(item => item.id !== id);
    
    await localDB.setItem(collectionName, newDataList);
    set({ [collectionName]: newDataList }); // Atualiza a variável correta dinamicamente
    
    if (collectionName === 'campaigns' && get().activeCampaignId === id) {
      set({ activeCampaignId: null });
    }
  },

  // FUNÇÃO: ATUALIZAR UM ARRAY INTEIRO (Usado após salvar/editar um arquivo)
  updateCollection: (collectionName, newData) => {
    set({ [collectionName]: newData });
  }
}));