import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Users, Map, User, EyeOff, Eye, Music, Play, Square, Repeat, FastForward, Clock, Plus, Trash2, Folder, X, Save, Upload, Wind, FileText, Store, Pencil } from 'lucide-react';

// --- BASE DE DADOS LOCAL NATIVA (IndexedDB) ---
// Substitui o localforage por uma implementação que o navegador suporta nativamente
const DB_NAME = 'RPG-Manager-DB';
const STORE_NAME = 'assets_store';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const localDB = {
  getItem: async (key) => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("Erro ao ler da BD:", e);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve(value);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("Erro ao guardar na BD:", e);
    }
  }
};

// --- FUNÇÕES DE BACKUP CERTAS ---
const getAllDataForBackup = async () => {
  const keys = ['campaigns', 'locations', 'npcs', 'tracks', 'rpg-active-scene', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops'];
  const backup = {};
  for (const key of keys) {
    backup[key] = await localDB.getItem(key) || [];
  }
  return backup;
};

const importBackup = async (backupData) => {
  const keys = ['campaigns', 'locations', 'npcs', 'tracks', 'rpg-active-scene', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops'];
  for (const key of keys) {
    if (backupData[key]) {
      await localDB.setItem(key, backupData[key]);
    }
  }
};


// --- FUNÇÕES AUXILIARES ---
const formatTime = (timeInSeconds) => {
  if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";
  const m = Math.floor(timeInSeconds / 60);
  const s = Math.floor(timeInSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const generateId = () => crypto.randomUUID();

// Converte ficheiros (Imagens/MP3) para formato Base64 suportado pela BD Offline
const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- GERENCIADOR DE ÁUDIO INVISÍVEL ---
const AudioManager = ({ audioState, setAudioProgress, tracksList }) => {
  const player1 = useRef(null);
  const player2 = useRef(null);
  const activePlayer = useRef(1);
  const tracksRef = useRef([]);

  useEffect(() => {
     tracksRef.current = tracksList;
  }, [tracksList]);

  useEffect(() => {
    player1.current = new Audio();
    player2.current = new Audio();

    const progressInterval = setInterval(() => {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && !current.paused && current.duration) {
        setAudioProgress({ time: current.currentTime, duration: current.duration });
      }
    }, 1000);

    return () => clearInterval(progressInterval);
  }, [setAudioProgress]);

  // Altera o volume da trilha ativa em tempo real se o mestre mexer no slider
  useEffect(() => {
    if (!player1.current || !player2.current) return;
    const current = activePlayer.current === 1 ? player1.current : player2.current;
    if (current && !current.paused && audioState?.volume !== undefined) {
      current.volume = audioState.volume;
    }
  }, [audioState?.volume]);

  const fadeOut = (audioElement) => {
    if (!audioElement || audioElement.paused) return;
    const interval = setInterval(() => {
      let newVol = audioElement.volume - 0.1;
      if (newVol > 0.05) {
        audioElement.volume = newVol;
      } else {
        audioElement.volume = 0;
        audioElement.pause();
        audioElement.currentTime = 0;
        clearInterval(interval);
      }
    }, 100);
  };

  const fadeIn = (audioElement, targetVolume = 1) => {
    if (!audioElement) return;
    audioElement.volume = 0;
    const interval = setInterval(() => {
      let newVol = audioElement.volume + 0.1;
      if (newVol < targetVolume - 0.05) {
        audioElement.volume = newVol;
      } else {
        audioElement.volume = targetVolume;
        clearInterval(interval);
      }
    }, 100);
  };

  useEffect(() => {
    if (!player1.current || !player2.current) return;
    const current = activePlayer.current === 1 ? player1.current : player2.current;
    const next = activePlayer.current === 1 ? player2.current : player1.current;

    if (!audioState?.trackId) {
      fadeOut(player1.current);
      fadeOut(player2.current);
      setAudioProgress({ time: 0, duration: 0 });
      return;
    }

    const trackInfo = tracksRef.current.find(t => t.id === audioState.trackId);
    if (trackInfo) {
      next.src = trackInfo.fileData;
      next.loop = audioState.loop;
      next.volume = 0;
      
      const playPromise = next.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          fadeIn(next, audioState.volume !== undefined ? audioState.volume : 1);
          fadeOut(current);
          activePlayer.current = activePlayer.current === 1 ? 2 : 1;
        }).catch(e => console.log("Autoplay bloqueado.", e));
      }
    }
  }, [audioState?.trackId]);
  
  useEffect(() => {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && audioState) current.loop = audioState.loop;
  }, [audioState?.loop]);

  useEffect(() => {
    if (audioState?.seekEvent) {
      const current = activePlayer.current === 1 ? player1.current : player2.current;
      if (current && Math.abs(current.currentTime - audioState.seekEvent.time) > 2) {
          current.currentTime = audioState.seekEvent.time;
      }
    }
  }, [audioState?.seekEvent]);

  return null;
};

// --- GERENCIADOR DE ÁUDIO DE AMBIENTE INVISÍVEL ---
const AmbientManager = ({ ambientState, tracksList }) => {
  const player = useRef(null);
  const tracksRef = useRef([]);

  useEffect(() => {
    tracksRef.current = tracksList;
  }, [tracksList]);

  useEffect(() => {
    player.current = new Audio();
    return () => {
      if (player.current) player.current.pause();
    };
  }, []);

  // Altera o volume do ambiente em tempo real se o mestre mexer no slider
  useEffect(() => {
    if (player.current && !player.current.paused && ambientState?.volume !== undefined) {
      player.current.volume = ambientState.volume;
    }
  }, [ambientState?.volume]);

  useEffect(() => {
    if (!player.current) return;

    if (!ambientState?.trackId) {
      const actPlayer = player.current;
      const interval = setInterval(() => {
        if (actPlayer.volume > 0.1) {
          actPlayer.volume -= 0.1;
        } else {
          actPlayer.volume = 0;
          actPlayer.pause();
          clearInterval(interval);
        }
      }, 100);
      return;
    }

    const trackInfo = tracksRef.current.find(t => t.id === ambientState.trackId);
    if (trackInfo) {
      if (player.current.src === trackInfo.fileData && !player.current.paused) {
        player.current.loop = ambientState.loop;
        return;
      }

      player.current.src = trackInfo.fileData;
      player.current.loop = ambientState.loop;
      player.current.volume = ambientState.volume !== undefined ? ambientState.volume : 0.6; 
      player.current.play().catch(e => console.log("Autoplay ambiente bloqueado.", e));
    }
  }, [ambientState?.trackId]);

  useEffect(() => {
    if (player.current && ambientState) {
      player.current.loop = ambientState.loop;
    }
  }, [ambientState?.loop]);

  return null;
};


const SceneRenderer = ({ isPreview = false, activeScene }) => {
  const npcName = activeScene.hideNpcName ? "????" : (activeScene.npc?.name || "");
  const showMap = activeScene.isMapMode;
  const shop = activeScene.shop;

  // Lógica de Paginação Automática da Loja
  const [shopPage, setShopPage] = useState(0);
  useEffect(() => {
    if (!shop || !shop.items || shop.items.length <= 10) return;
    const totalPages = Math.ceil(shop.items.length / 10);
    const interval = setInterval(() => {
      setShopPage(prev => (prev + 1) % totalPages);
    }, 15000); // Roda a cada 15 segundos
    return () => clearInterval(interval);
  }, [shop]);

  useEffect(() => {
    setShopPage(0); // Reseta a página se a loja mudar
  }, [shop?.id]);

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-black">
      
      {/* 1. FUNDO / MAPA */}
      {activeScene.location && (
        <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${showMap ? 'bg-contain bg-no-repeat bg-center' : 'bg-cover bg-center'}`}
             style={{ 
               backgroundImage: `url(${activeScene.location.fileData})`, 
               filter: (activeScene.npc && !showMap) ? 'brightness(0.5) blur(2px)' : 'brightness(1)' 
             }} />
      )}
      
      {/* 2. LOJA E VENDEDOR (Substitui a visualização normal do NPC) */}
      {!showMap && activeScene.shop && activeScene.npc && (
        <div className="absolute inset-0 z-[70] flex items-end justify-between p-8 md:p-16 pointer-events-none">
          
          {/* Lado Esquerdo: NPC em pé com Placa de Nome Alinhada */}
          <div className="relative h-[85%] w-[40%] flex flex-col items-center justify-end animate-fade-in-up">
             <div className="absolute top-0 bg-[#2c1810]/90 border-2 border-[#8b5a2b] px-8 py-3 rounded shadow-[0_4px_15px_rgba(0,0,0,0.6)] backdrop-blur-md">
                <h2 className="text-[#e2b879] text-2xl font-serif font-bold tracking-widest uppercase">{npcName}</h2>
             </div>
             <img src={activeScene.npc.fileData} alt="Vendor" className="w-full h-[90%] object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
          </div>

          {/* Lado Direito: Quadro da Loja */}
          <div className="relative h-[85%] w-[55%] bg-[#1a1412]/95 border-4 border-[#5c3a21] rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto overflow-hidden animate-fade-in-up">
             
             {/* SE A LOJA TIVER IMAGEM, MOSTRA COMO BANNER NO TOPO */}
             {activeScene.shop.fileData ? (
               <div className="w-full h-32 md:h-48 relative border-b-4 border-[#4a2e1b] shrink-0">
                  <img src={activeScene.shop.fileData} className="w-full h-full object-cover opacity-80" alt={activeScene.shop.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/95 to-transparent flex items-end justify-center pb-4">
                      <h1 className="text-[#e2b879] text-3xl md:text-4xl font-serif font-bold uppercase tracking-widest drop-shadow-lg">{activeScene.shop.name}</h1>
                  </div>
               </div>
             ) : (
               <div className="bg-[#2c1810]/90 border-b-4 border-[#4a2e1b] p-6 text-center shrink-0">
                  <h1 className="text-[#e2b879] text-3xl md:text-4xl font-serif font-bold uppercase tracking-widest drop-shadow-md">{activeScene.shop.name}</h1>
               </div>
             )}

             <div className="flex-1 p-6 flex flex-col gap-2 overflow-hidden">
                <div className="flex justify-between border-b-2 border-[#5c3a21] pb-2 mb-2 px-2 shrink-0">
                   <span className="text-[#a67c52] font-serif font-bold uppercase tracking-widest text-lg">Item</span>
                   <span className="text-[#a67c52] font-serif font-bold uppercase tracking-widest text-lg">Valor</span>
                </div>
                {activeScene.shop.items.slice(shopPage * 10, (shopPage + 1) * 10).map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-[#241a17]/50 hover:bg-[#362722] p-3 rounded border-b border-[#3d2616] transition-colors">
                      <span className="text-slate-200 font-medium text-lg md:text-xl">{item.name}</span>
                      <span className="text-[#e2b879] font-bold text-lg md:text-xl">{item.price}</span>
                   </div>
                ))}
             </div>

             {/* Indicador de Paginação Visual */}
             {activeScene.shop.items.length > 10 && (
                <div className="bg-[#120e0c]/90 p-3 flex justify-center items-center gap-3 border-t-2 border-[#4a2e1b] shrink-0">
                   {Array.from({ length: Math.ceil(activeScene.shop.items.length / 10) }).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === shopPage ? 'bg-[#e2b879] shadow-[0_0_10px_rgba(226,184,121,0.8)]' : 'bg-[#3d2616]'}`} />
                   ))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* 3. RENDERIZA NPC NORMAL (Apenas se a loja NÃO estiver ativa) */}
      {!showMap && activeScene.npc && !activeScene.shop && (
        <>
          <div className={`absolute bottom-0 left-[2%] md:left-[5%] h-[75%] w-[50%] md:w-[40%] flex items-end justify-center pointer-events-none ${isPreview ? 'animate-none' : 'animate-fade-in-up'}`}>
            <img src={activeScene.npc.fileData} alt="NPC" className="w-full h-full object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
          </div>
          <div className="absolute bottom-12 right-[5%] w-[45%] z-20 pointer-events-none">
             <div className="bg-gradient-to-r from-black/90 to-slate-900/90 backdrop-blur-md border-t-4 border-l-4 border-amber-600 rounded-tr-3xl p-6 md:p-8 shadow-2xl pointer-events-auto">
               <h2 className="text-amber-500 text-3xl md:text-5xl font-serif font-bold tracking-wider mb-2 drop-shadow-lg">{npcName}</h2>
               {!activeScene.hideNpcName && activeScene.npc.role && <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-4">{activeScene.npc.role}</p>}
               {activeScene.npc.desc && <p className="text-slate-200 text-lg md:text-xl leading-relaxed italic border-l-2 border-slate-700 pl-4">"{activeScene.npc.desc}"</p>}
             </div>
          </div>
        </>
      )}

      {/* 2.5 HANDOUT (Exibição Central de Itens/Documentos) */}
      {activeScene.handout && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-8 animate-fade-in-up pointer-events-none">
           <div className="max-w-3xl max-h-full flex flex-col items-center gap-6 p-6 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.15)] pointer-events-auto">
              {/* Imagem do Item */}
              <img src={activeScene.handout.fileData} alt={activeScene.handout.name} className="max-h-[50vh] object-contain drop-shadow-2xl rounded-lg" />
              
              {/* Texto Opcional */}
              {activeScene.handout.desc && (
                <div className="bg-slate-950 border border-slate-800 p-4 md:p-6 rounded-xl w-full text-center shadow-inner">
                   <p className="text-amber-100/90 text-lg md:text-xl font-serif italic whitespace-pre-wrap leading-relaxed">
                     {activeScene.handout.desc}
                   </p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* 3. PLAYER DE CUTSCENE */}
      {activeScene.cutscene && (
        <video 
          src={activeScene.cutscene.fileData} 
          autoPlay 
          loop 
          playsInline
          controls={false}
          className="absolute inset-0 w-full h-full object-contain bg-black z-[100] animate-fade-in-up"
        />
      )}

      {/* INDICADOR DE ÁUDIO */}
      {activeScene.audio?.trackId && !isPreview && (
         <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-white/50 animate-pulse z-[110]">
            <Music className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Áudio Ativo</span>
         </div>
      )}
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);

  // Estados da Base de Dados Local
  const [campaigns, setCampaigns] = useState([]);
  const [locations, setLocations] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [combatants, setCombatants] = useState([]);
  const [combatState, setCombatState] = useState({ round: 1, activeId: null });
  const [cutscenes, setCutscenes] = useState([]);
  const [handouts, setHandouts] = useState([]);
  const [shops, setShops] = useState([]);
  
  const [activeScene, setActiveScene] = useState({ 
    location: null, 
    npc: null, 
    hideNpcName: false,
    isMapMode: false,
    cutscene: null, 
    handout: null,
    shop: null,
    audio: { trackId: null, loop: true, seekEvent: null },
    ambient: { trackId: null, loop: true }
  });
  
  const [queuedTrackId, setQueuedTrackId] = useState(null);
  const [audioProgress, setAudioProgress] = useState({ time: 0, duration: 0 });
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });

  // --- 1. CARREGAR DADOS DA BASE DE DADOS LOCAL ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      const dbCampaigns = await localDB.getItem('campaigns') || [];
      const dbLocations = await localDB.getItem('locations') || [];
      const dbNpcs = await localDB.getItem('npcs') || [];
      const dbTracks = await localDB.getItem('tracks') || [];
      const dbCombatants = await localDB.getItem('combatants') || []; 
      const dbCombatState = await localDB.getItem('combat-state') || { round: 1, activeId: null }; 
      const dbCutscenes = await localDB.getItem('cutscenes') || [];
      const dbHandouts = await localDB.getItem('handouts') || [];
      const dbShops = await localDB.getItem('shops') || [];
      
      setCampaigns(dbCampaigns);
      setLocations(dbLocations);
      setNpcs(dbNpcs);
      setTracks(dbTracks);
      setCombatants(dbCombatants); 
      setCombatState(dbCombatState); 
      setCutscenes(dbCutscenes);
      setHandouts(dbHandouts);
      setShops(dbShops);

      if (dbCampaigns.length > 0 && !activeCampaignId) {
        setActiveCampaignId(dbCampaigns[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar ficheiros locais:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- 2. SINCRONIZAÇÃO DA CENA ENTRE ABAS (Via BroadcastChannel) ---
  // --- 2. SINCRONIZAÇÃO DA CENA ENTRE ABAS (Via BroadcastChannel) ---
  useEffect(() => {
    const channel = new BroadcastChannel('rpg-sync');
    
    const loadInitialScene = async () => {
      const savedScene = await localDB.getItem('rpg-active-scene');
      if (savedScene) {
        setActiveScene({
          location: savedScene.location || null,
          npc: savedScene.npc || null,
          hideNpcName: savedScene.hideNpcName || false,
          isMapMode: savedScene.isMapMode || false,
          audio: { 
            trackId: savedScene.audio?.trackId || null, 
            loop: savedScene.audio?.loop !== false, 
            seekEvent: savedScene.audio?.seekEvent || null,
            volume: savedScene.audio?.volume !== undefined ? savedScene.audio.volume : 1 
          },
          ambient: { 
            trackId: savedScene.ambient?.trackId || null, 
            loop: savedScene.ambient?.loop !== false,
            volume: savedScene.ambient?.volume !== undefined ? savedScene.ambient.volume : 0.6 
          }
        });
      }
    };
    loadInitialScene();

    channel.onmessage = (e) => {
      if (e.data && e.data.type === 'SCENE_UPDATE') {
        const syncedScene = e.data.scene;
        setActiveScene({
          ...syncedScene,
          ambient: syncedScene?.ambient || { trackId: null, loop: true }
        });
      }
    };

    return () => channel.close();
  }, []);

  const publishScene = async (newScene) => {
    setActiveScene(newScene);
    await localDB.setItem('rpg-active-scene', newScene);
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'SCENE_UPDATE', scene: newScene });
    channel.close();
  };

  // --- 3. SISTEMA CRUD (GUARDAR FICHEIROS LOCALMENTE) ---
  const saveAsset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.target);
      const isEditing = !!modalState.data;

      // Se for edição, herda os dados antigos (como IDs e secretNotes). Se for novo, gera do zero.
      const data = isEditing ? { ...modalState.data } : { id: generateId(), campaignId: activeCampaignId };
      data.name = formData.get('name');
      
      const collectionName = modalState.type === 'campaign' ? 'campaigns' : 
                             modalState.type === 'location' ? 'locations' : 
                             modalState.type === 'npc' ? 'npcs' : 
                             modalState.type === 'cutscene' ? 'cutscenes' : 
                             modalState.type === 'combatant' ? 'combatants' : 
                             modalState.type === 'handout' ? 'handouts' : 
                             modalState.type === 'shop' ? 'shops' : 'tracks';

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

      if (modalState.type === 'handout') {
        data.desc = formData.get('desc');
      }

      if (modalState.type === 'shop') {
        data.vendorId = formData.get('vendorId');
        const itemsRaw = formData.get('itemsData') || '';
        data.items = itemsRaw.split('\n').filter(line => line.trim() !== '').map(line => {
           // Proteção caso o nome do item também tenha hífens
           const parts = line.split('-');
           if (parts.length > 1) {
               const price = parts.pop().trim();
               const name = parts.join('-').trim();
               return { name, price };
           }
           return { name: line.trim(), price: '' };
        });
      }

      // Se o usuário enviou uma nova imagem, converte-a. Se não enviou (mas está a editar), a imagem antiga é mantida pelo spread {...modalState.data}
      const fileInput = formData.get('fileInput');
      if (fileInput && fileInput.size > 0) {
         const base64Data = await fileToDataUrl(fileInput);
         data.fileData = base64Data;
      }

      const currentData = await localDB.getItem(collectionName) || [];
      let newDataList;
      
      if (isEditing) {
         newDataList = currentData.map(item => item.id === data.id ? data : item);
         
         // QoL: Atualiza a tela dos jogadores em tempo real se o item editado estiver ativo!
         if (modalState.type === 'shop' && activeScene.shop?.id === data.id) publishScene({ ...activeScene, shop: data });
         if (modalState.type === 'npc' && activeScene.npc?.id === data.id) publishScene({ ...activeScene, npc: data });
         if (modalState.type === 'location' && activeScene.location?.id === data.id) publishScene({ ...activeScene, location: data });
      } else {
         newDataList = [...currentData, data];
      }
      
      await localDB.setItem(collectionName, newDataList);
      
      if (collectionName === 'campaigns') { setCampaigns(newDataList); if (!isEditing) setActiveCampaignId(data.id); }
      if (collectionName === 'locations') setLocations(newDataList);
      if (collectionName === 'npcs') setNpcs(newDataList);
      if (collectionName === 'tracks') setTracks(newDataList);
      if (collectionName === 'combatants') setCombatants(newDataList);
      if (collectionName === 'cutscenes') setCutscenes(newDataList);
      if (collectionName === 'handouts') setHandouts(newDataList);
      if (collectionName === 'shops') setShops(newDataList);

    } catch (err) {
      console.error("Erro ao guardar ativo:", err);
      alert("Erro ao guardar ficheiro. Verifique o tamanho do arquivo.");
    }

    setModalState({ isOpen: false, type: null, data: null });
    setIsLoading(false);
  };

  const deleteAsset = async (collectionName, id) => {
    if(!confirm("Tem a certeza que quer apagar isto?")) return;
    
    try {
      const currentData = await localDB.getItem(collectionName) || [];
      const newDataList = currentData.filter(item => item.id !== id);
      
      await localDB.setItem(collectionName, newDataList);
      
      if (collectionName === 'campaigns') {
        setCampaigns(newDataList);
        if(activeCampaignId === id) setActiveCampaignId(null);
      }
      if (collectionName === 'locations') setLocations(newDataList);
      if (collectionName === 'npcs') setNpcs(newDataList);
      if (collectionName === 'tracks') setTracks(newDataList);
      if (collectionName === 'combatants') setCombatants(newDataList);
      if (collectionName === 'cutscenes') setCutscenes(newDataList);
      if (collectionName === 'handouts') setHandouts(newDataList);
      if (collectionName === 'shops') setShops(newDataList);
    } catch (err) {
      console.error("Erro ao apagar ativo:", err);
    }
  };


  // --- 4. FUNÇÕES DE CONTROLO DO MESTRE ---
  const updateSceneElement = (type, item) => {
    if (item && (type === 'location' || type === 'npc')) {
      // Remove estritamente as notas secretas antes de enviar para a cena ativa pública
      const { secretNotes, ...publicItem } = item;
      publishScene({ ...activeScene, [type]: publicItem });
    } else {
      publishScene({ ...activeScene, [type]: item });
    }
  };
  const stopAudio = () => { publishScene({ ...activeScene, audio: { ...activeScene.audio, trackId: null } }); setQueuedTrackId(null); };
  const toggleLoop = () => publishScene({ ...activeScene, audio: { ...activeScene.audio, loop: !activeScene.audio.loop } });

  const stopAmbient = () => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, trackId: null } });
  const toggleAmbientLoop = () => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, loop: !activeScene.ambient.loop } });
  const playAmbient = (trackId) => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, trackId, loop: true } });
  const updateAssetNotes = async (collection, id, notesText) => {
    if (collection === 'locations') {
      const updated = locations.map(loc => loc.id === id ? { ...loc, secretNotes: notesText } : loc);
      setLocations(updated);
      await localDB.setItem('locations', updated);
    } else if (collection === 'npcs') {
      const updated = npcs.map(npc => npc.id === id ? { ...npc, secretNotes: notesText } : npc);
      setNpcs(updated);
      await localDB.setItem('npcs', updated);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    publishScene({ ...activeScene, audio: { ...activeScene.audio, volume: vol } });
  };

  const handleAmbientVolumeChange = (e) => {
    const vol = Number(e.target.value);
    publishScene({ ...activeScene, ambient: { ...activeScene.ambient, volume: vol } });
  };
  
  const executeTransition = () => {
    if (!queuedTrackId) return;
    publishScene({ ...activeScene, audio: { ...activeScene.audio, trackId: queuedTrackId } });
    setQueuedTrackId(null);
  };

  const handleSeekChange = (e) => setAudioProgress(prev => ({ ...prev, time: Number(e.target.value) }));
  const handleSeekCommit = (e) => {
    const newTime = Number(e.target.value);
    publishScene({ ...activeScene, audio: { ...activeScene.audio, seekEvent: { time: newTime, id: Date.now() } } });
  };

  const clearScene = () => {
    publishScene({ 
      location: null, 
      npc: null, 
      hideNpcName: false, 
      isMapMode: false, // <-- NOVO
      audio: { trackId: null, loop: true, seekEvent: null },
      ambient: { trackId: null, loop: true }
    });
    setQueuedTrackId(null);
  };

  // --- INTERFACE DE BACKUP ---
  const handleExportBackup = async () => {
    try {
      const data = await getAllDataForBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rpg-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar:", err);
      alert("Erro ao gerar arquivo de backup.");
    }
  };

  const handleImportBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target.result);
        
        // Validação simples para ver se o JSON tem a estrutura correta
        if (!content.campaigns && !content.locations) {
          alert("Arquivo de backup inválido.");
          return;
        }

        if (confirm("Isso irá substituir todos os dados atuais. Deseja continuar?")) {
          setIsLoading(true);
          await importBackup(content);
          alert('Backup restaurado com sucesso! Recarregando painel...');
          window.location.reload();
        }
      } catch (err) {
        console.error("Erro ao importar:", err);
        alert("Erro ao ler o arquivo. Certifique-se de que é um JSON válido.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Filtros de Campanha
  const activeLocations = locations.filter(l => l.campaignId === activeCampaignId);
  const activeNpcs = npcs.filter(n => n.campaignId === activeCampaignId);
  const activeTracks = tracks.filter(t => t.campaignId === activeCampaignId);

  // --- COMPONENTES VISUAIS ---

  if (isLoading && role === null) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-bold animate-pulse">A Carregar Base de Dados Local...</div>;
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wider text-amber-500 font-serif">RPG SCENE MANAGER</h1>
        <p className="text-slate-400 mb-12 text-center max-w-md">Os seus dados são guardados localmente neste dispositivo (Modo Offline).</p>
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center">
          <button onClick={() => setRole('master')} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-8 flex flex-col items-center transition-all hover:border-amber-500 group shadow-lg">
            <Monitor className="w-16 h-16 mb-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
            <h2 className="text-2xl font-bold">Ecrã do Mestre</h2>
          </button>
          <button onClick={() => setRole('player')} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-8 flex flex-col items-center transition-all hover:border-blue-500 group shadow-lg">
            <Users className="w-16 h-16 mb-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <h2 className="text-2xl font-bold">Ecrã dos Jogadores</h2>
          </button>
        </div>
      </div>
    );
  }

  

  const AssetModal = () => {
    if (!modalState.isOpen) return null;
    const titles = { campaign: 'Nova Campanha', location: 'Novo Cenário', npc: 'Novo NPC', track: 'Nova Música / Som', combatant: 'Adicionar à Iniciativa', handout: 'Novo Handout / Item', shop: 'Nova Loja / Mercador' };
    const isEditing = !!modalState.data;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-amber-500">{isEditing ? 'Editar Ficheiro' : titles[modalState.type]}</h3>
            <button onClick={() => setModalState({ isOpen: false, type: null, data: null })} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          
          <form onSubmit={saveAsset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 uppercase font-bold">Nome</label>
              <input name="name" defaultValue={modalState.data?.name} required className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Obrigatório..." />
            </div>

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

            {/* UPGRADE: A Loja agora também aceita Imagens! */}
            {(modalState.type === 'location' || modalState.type === 'npc' || modalState.type === 'combatant' || modalState.type === 'handout' || modalState.type === 'shop') && (
              <div className="flex flex-col gap-1 border-t border-slate-800 pt-3 mt-1">
                <label className="text-xs text-slate-400 uppercase font-bold">Upload de Imagem (PNG/JPG)</label>
                <input type="file" name="fileInput" accept="image/*" required={!isEditing} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-900/30 file:text-amber-500 hover:file:bg-amber-900/50" />
                {isEditing && <span className="text-[10px] text-emerald-500 italic mt-1">Imagem já guardada. Envie uma nova apenas se quiser substituir.</span>}
                {modalState.type === 'npc' && <span className="text-[10px] text-slate-500 italic mt-1">Dica: Use imagens com fundo transparente (.png) para personagens.</span>}
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

            <button type="submit" disabled={isLoading} className="mt-4 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              <Save className="w-5 h-5" /> {isLoading ? "A Guardar..." : isEditing ? "Atualizar Ficheiro Offline" : "Guardar Ficheiro Offline"}
            </button>
          </form>
        </div>
      </div>
    );
  };
  // --- SISTEMA DE COMBATE ---
  const activeCombatants = combatants.filter(c => c.campaignId === activeCampaignId).sort((a, b) => b.initiative - a.initiative);

  const updateCombatState = async (newState) => {
    setCombatState(newState);
    await localDB.setItem('combat-state', newState);
  };

  const setTurn = (combatant) => {
    updateCombatState({ ...combatState, activeId: combatant.id });
    // Injeta o combatente como NPC na tela principal para todos verem!
    updateSceneElement('npc', {
      id: combatant.id,
      name: combatant.name,
      fileData: combatant.fileData,
      role: combatant.type === 'player' ? 'Jogador' : combatant.type === 'enemy' ? 'Inimigo' : 'Aliado',
      desc: `Iniciativa: ${combatant.initiative}`
    });
  };

  const nextTurn = () => {
    if (activeCombatants.length === 0) return;
    const currentIndex = activeCombatants.findIndex(c => c.id === combatState.activeId);
    let nextIndex = currentIndex + 1;
    let newRound = combatState.round;

    if (nextIndex >= activeCombatants.length) {
      nextIndex = 0;
      newRound += 1;
    }
    
    updateCombatState({ round: newRound, activeId: activeCombatants[nextIndex].id });
    setTurn(activeCombatants[nextIndex]);
  };

  const clearCombat = () => {
    if(!confirm("Limpar toda a iniciativa atual?")) return;
    setCombatants(combatants.filter(c => c.campaignId !== activeCampaignId));
    localDB.setItem('combatants', combatants.filter(c => c.campaignId !== activeCampaignId));
    updateCombatState({ round: 1, activeId: null });
    updateSceneElement('npc', null);
  };
  const quickAddToCombat = async (npc) => {
    const initStr = window.prompt(`Digite a Iniciativa rolada para ${npc.name}:`, "10");
    if (initStr === null) return; // Mestre cancelou
    
    const initiative = Number(initStr) || 0;
    
    // Mapeia o tipo do NPC para o tipo de combatente
    let combatType = 'ally';
    if (npc.type === 'player') combatType = 'player';
    if (npc.type === 'enemy') combatType = 'enemy';

    const newCombatant = {
      id: generateId(),
      campaignId: activeCampaignId,
      name: npc.name,
      type: combatType, 
      initiative: initiative,
      fileData: npc.fileData
    };

    const updatedCombatants = [...combatants, newCombatant];
    setCombatants(updatedCombatants);
    await localDB.setItem('combatants', updatedCombatants);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col h-screen overflow-hidden">
      <AudioManager audioState={activeScene.audio} setAudioProgress={setAudioProgress} tracksList={tracks} />
      <AmbientManager ambientState={activeScene.ambient} tracksList={tracks} /> {/* <-- ADICIONADO */}
      <AssetModal />
      

      {role === 'player' ? (
        <div className="flex-1 relative">
          <SceneRenderer activeScene={activeScene} />
          <button onClick={() => setRole(null)} className="absolute top-4 right-4 text-white/10 hover:text-white/50 transition-colors z-50">            <EyeOff className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <>
          {/* CABEÇALHO DO MESTRE */}
          <header className="bg-slate-950 border-b border-slate-800 p-4 flex flex-wrap justify-between items-center shadow-md z-10 gap-4">
            <div className="flex items-center gap-3">
              <Monitor className="text-amber-500 w-6 h-6" />
              <h1 className="text-xl font-bold text-white tracking-wide">Painel do Mestre</h1>
            </div>
            
            {/* SELETOR DE CAMPANHAS */}
            <div className="flex flex-1 max-w-md items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
              <Folder className="w-5 h-5 text-blue-400" />
              <select 
                value={activeCampaignId || ''} 
                onChange={(e) => setActiveCampaignId(e.target.value)}
                className="bg-transparent text-white font-medium flex-1 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>Selecione uma Campanha...</option>
                {campaigns.map(camp => (
                  <option key={camp.id} value={camp.id}>{camp.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setModalState({ isOpen: true, type: 'campaign', data: null })}
                className="text-amber-500 hover:text-amber-400 bg-amber-900/30 p-1 rounded transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4">
              <button onClick={clearScene} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg text-sm font-medium">Blackout Geral</button>
              <button onClick={() => setRole(null)} className="text-slate-400 hover:text-white">Sair</button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* PAINEL CENTRAL (CONTROLOS E ATIVOS) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-8 custom-scrollbar">
              
              {!activeCampaignId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Folder className="w-24 h-24 mb-4 opacity-50" />
                  <h2 className="text-2xl font-bold text-slate-400">Nenhuma Campanha Selecionada</h2>
                  <p className="mt-2">Crie uma nova campanha no menu superior para começar a enviar os seus ficheiros.</p>
                </div>
              ) : (
                <>
                  {/* --- SEÇÃO ÁUDIO (DUPLA CAMADA + VOLUMES + TAGS) --- */}
                  <section className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md flex flex-col gap-4">
                    
                    {/* Cabeçalho Geral de Upload */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Music className="w-5 h-5 text-purple-400" /> Gerenciador de Áudio
                      </h2>
                      <button 
                        onClick={() => setModalState({ isOpen: true, type: 'track', data: null })}
                        className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-purple-400 flex items-center gap-1 border border-slate-700"
                      >
                        <Upload className="w-3 h-3" /> Fazer Upload de Áudio
                      </button>
                    </div>

                    {/* SUB-PAINEL 1: CONTROLES DA TRILHA SONORA */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-purple-400 fill-current" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Trilha Principal:</span>
                        <span className="text-xs text-purple-300 italic truncate max-w-[150px]">
                          {tracks.find(t => t.id === activeScene.audio?.trackId)?.name || "Nenhuma tocando"}
                        </span>
                      </div>
                      <div className="flex gap-4 items-center ml-auto">
                        {/* Slider de Volume da Trilha */}
                        <div className="flex items-center gap-2 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Vol:</span>
                          <input type="range" min="0" max="1" step="0.05" value={activeScene.audio?.volume !== undefined ? activeScene.audio.volume : 1} onChange={handleVolumeChange} className="w-16 md:w-24 accent-purple-500 h-1 bg-slate-800 rounded appearance-none cursor-pointer" />
                        </div>

                        {queuedTrackId && (
                          <button onClick={executeTransition} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 animate-pulse">
                            <FastForward className="w-3 h-3 fill-current" /> Transicionar
                          </button>
                        )}
                        <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer hover:text-white">
                          <input type="checkbox" checked={activeScene.audio?.loop} onChange={toggleLoop} className="accent-purple-500" />
                          Loop
                        </label>
                        <button onClick={stopAudio} className="text-[10px] bg-slate-800 hover:bg-red-950 text-slate-300 py-1 px-2 rounded border border-slate-700">
                          Parar Trilha
                        </button>
                      </div>
                    </div>

                    {/* SUB-PAINEL 2: CONTROLES DO SOM AMBIENTE */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Som Ambiente:</span>
                        <span className="text-xs text-emerald-300 italic truncate max-w-[150px]">
                          {tracks.find(t => t.id === activeScene.ambient?.trackId)?.name || "Nenhum ativo"}
                        </span>
                      </div>
                      <div className="flex gap-4 items-center ml-auto">
                        {/* Slider de Volume do Ambiente */}
                        <div className="flex items-center gap-2 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Vol:</span>
                          <input type="range" min="0" max="1" step="0.05" value={activeScene.ambient?.volume !== undefined ? activeScene.ambient.volume : 0.6} onChange={handleAmbientVolumeChange} className="w-16 md:w-24 accent-emerald-500 h-1 bg-slate-800 rounded appearance-none cursor-pointer" />
                        </div>

                        <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer hover:text-white">
                          <input type="checkbox" checked={activeScene.ambient?.loop} onChange={toggleAmbientLoop} className="accent-emerald-500" />
                          Loop
                        </label>
                        <button onClick={stopAmbient} className="text-[10px] bg-slate-800 hover:bg-red-950 text-slate-300 py-1 px-2 rounded border border-slate-700">
                          Parar Ambiente
                        </button>
                      </div>
                    </div>

                    {activeTracks.length === 0 && <p className="text-slate-500 text-sm italic py-2">Sem músicas ou ambientes. Faça upload de um MP3.</p>}

                    {/* LISTAGEM DE CARD DE ÁUDIOS COM CORES INTELIGENTES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeTracks.map(track => {
                        const isPlayingTrack = activeScene.audio?.trackId === track.id;
                        const isPlayingAmbient = activeScene.ambient?.trackId === track.id;
                        const isQueued = queuedTrackId === track.id;
                        
                        const trackTags = track.tags || [];
                        const hasTag = (name) => trackTags.some(t => t.toLowerCase() === name.toLowerCase());

                        // Determinação de cores dinâmicas baseadas nas tags customizadas
                        let cardColorClass = 'border-slate-800 bg-slate-900/50 hover:border-slate-700';
                        if (isPlayingTrack) cardColorClass = 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.15)] bg-slate-900';
                        else if (isPlayingAmbient) cardColorClass = 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)] bg-slate-900';
                        else if (isQueued) cardColorClass = 'border-amber-500 border-dashed bg-slate-900';
                        else if (hasTag('combate') || hasTag('batalha') || hasTag('boss')) cardColorClass = 'border-red-900/40 bg-red-950/10 hover:border-red-700/60';
                        else if (hasTag('tranquila') || hasTag('calma') || hasTag('cidade')) cardColorClass = 'border-cyan-900/40 bg-cyan-950/10 hover:border-cyan-700/60';
                        else if (hasTag('suspense') || hasTag('terror') || hasTag('caverna')) cardColorClass = 'border-orange-900/40 bg-orange-950/10 hover:border-orange-700/60';

                        return (
                          <div key={track.id} className={`relative group p-3 rounded-xl border flex flex-col gap-2 transition-all ${cardColorClass}`}>
                            <div className="pr-6">
                              <span className="font-medium text-xs text-slate-200 truncate block">{track.name}</span>
                              {/* Listagem visual das badges das tags */}
                              {trackTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {trackTags.map((tag, idx) => (
                                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-400 border border-slate-800 uppercase tracking-tight font-semibold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-1.5 mt-auto pt-1">
                              <button 
                                onClick={() => { if (!isPlayingTrack) setQueuedTrackId(track.id); }}
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1
                                  ${isPlayingTrack ? 'bg-purple-600 text-white' : 'bg-slate-800/80 hover:bg-purple-950 text-purple-400'}`}
                              >
                                <Play className="w-2.5 h-2.5 fill-current" /> Trilha
                              </button>
                              
                              <button 
                                onClick={() => playAmbient(track.id)}
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1
                                  ${isPlayingAmbient ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 hover:bg-emerald-950 text-emerald-400'}`}
                              >
                                <Wind className="w-2.5 h-2.5" /> Ambiente
                              </button>
                            </div>

                              
                              {/* Botões de Editar e Excluir Áudio */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'track', data: track }); }} title="Editar Áudio" className="p-1.5 bg-blue-900/90 text-white rounded hover:bg-blue-600 transition-colors">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteAsset('tracks', track.id); }} title="Excluir Áudio" className="p-1.5 bg-red-950 text-red-400 rounded hover:bg-red-600 hover:text-white transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* BARRA DE PROGRESSO DA TRILHA PRINCIPAL */}
                    {activeScene.audio?.trackId && (
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="w-12 text-right text-xs font-mono font-bold tracking-wider text-purple-400">{formatTime(audioProgress.time)}</span>
                        <input type="range" min="0" max={audioProgress.duration || 100} value={audioProgress.time || 0} onChange={handleSeekChange} onMouseUp={handleSeekCommit} onTouchEnd={handleSeekCommit} className="flex-1 accent-purple-500 cursor-pointer h-2 bg-black rounded-lg appearance-none border border-slate-800" />
                        <span className="w-12 text-xs font-mono tracking-wider text-slate-500">{formatTime(audioProgress.duration)}</span>
                      </div>
                    )}
                  </section>

                  {/* --- SEÇÃO CENÁRIOS --- */}
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Map className="w-5 h-5 text-blue-400" /> Cenários
                        </h2>
                        <button 
                          onClick={() => setModalState({ isOpen: true, type: 'location', data: null })}
                          className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-blue-400 flex items-center gap-1 border border-slate-700"
                        >
                          <Upload className="w-3 h-3" /> Fazer Upload
                        </button>
                      </div>
                      {/* NOVO TOGGLE: MODO PLANTA BAIXA */}
                      <label className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded cursor-pointer border transition-all ${activeScene.isMapMode ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-blue-950/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/40'}`}>
                        <input 
                          type="checkbox" 
                          checked={activeScene.isMapMode || false} 
                          onChange={(e) => publishScene({ ...activeScene, isMapMode: e.target.checked })} 
                          className="hidden" 
                        />
                        <Map className="w-4 h-4" /> {activeScene.isMapMode ? 'Modo Mapa: ATIVO' : 'Modo Planta Baixa'}
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      <div onClick={() => updateSceneElement('location', null)} className="cursor-pointer rounded-xl border-2 p-4 flex items-center justify-center bg-slate-800 h-28 border-slate-700 hover:border-slate-500">
                        <span className="text-slate-400 text-sm">Fundo Preto</span>
                      </div>
                      
                      {activeLocations.map(loc => (
                        <div key={loc.id} className="relative group h-28">
                          <div onClick={() => updateSceneElement('location', loc)} className={`cursor-pointer rounded-xl border-2 overflow-hidden w-full h-full relative ${activeScene.location?.id === loc.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                            <img src={loc.image || loc.fileData} alt={loc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-black/60 flex items-end p-2"><span className="text-white text-xs font-medium truncate">{loc.name}</span></div>
                          </div>
                          {/* Botões de Editar e Excluir Cenário */}
                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'location', data: loc }); }} className="p-1.5 bg-blue-900/90 text-white rounded-lg hover:bg-blue-600 shadow-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteAsset('locations', loc.id); }} className="p-1.5 bg-red-900/90 text-white rounded-lg hover:bg-red-600 shadow-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* --- SEÇÃO LOJAS / COMÉRCIO --- */}
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Map className="w-5 h-5 text-yellow-600" /> Lojas & Comércio
                        </h2>
                        <button 
                          onClick={() => setModalState({ isOpen: true, type: 'shop', data: null })}
                          className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-yellow-500 flex items-center gap-1 border border-slate-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Criar Loja
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      <div onClick={() => publishScene({ ...activeScene, shop: null })} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800 h-24 border-slate-700 hover:border-slate-500 transition-colors">
                         <Store className="w-6 h-6 text-slate-500 mb-2" />
                         <span className="text-slate-400 text-xs text-center font-medium">Fechar Loja</span>
                      </div>
                      
                      {shops.filter(s => s.campaignId === activeCampaignId).map(shop => {
                        const isShopActive = activeScene.shop?.id === shop.id;
                        return (
                          <div key={shop.id} className="relative group h-24">
                            <div onClick={() => { const vendor = npcs.find(n => n.id === shop.vendorId); publishScene({ ...activeScene, shop: shop, npc: vendor || null }); }} 
                              className={`cursor-pointer rounded-xl border-2 overflow-hidden w-full h-full relative flex flex-col justify-end bg-slate-900 ${isShopActive ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                              {shop.fileData && <img src={shop.fileData} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-opacity" alt={shop.name} />}
                              <div className="relative z-10 p-2 bg-gradient-to-t from-black/90 to-transparent pt-6">
                                <span className="text-yellow-500 font-bold text-sm truncate block drop-shadow-md">{shop.name}</span>
                                <span className="text-slate-300 text-[10px] truncate block">{shop.items.length} itens catalogados</span>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'shop', data: shop }); }} className="p-1.5 bg-blue-900/90 text-white rounded hover:bg-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteAsset('shops', shop.id); }} className="p-1.5 bg-red-900/90 text-white rounded hover:bg-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                  {/* --- SEÇÃO CUTSCENES (VÍDEOS) --- */}
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Monitor className="w-5 h-5 text-pink-400" /> Cutscenes & Vídeos
                        </h2>
                        <button 
                          onClick={() => setModalState({ isOpen: true, type: 'cutscene', data: null })}
                          className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-pink-400 flex items-center gap-1 border border-slate-700 transition-colors"
                        >
                          <Upload className="w-3 h-3" /> Fazer Upload
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      <div onClick={() => updateSceneElement('cutscene', null)} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800 h-28 border-slate-700 hover:border-slate-500">
                         <Square className="w-6 h-6 text-slate-500 mb-2" />
                         <span className="text-slate-400 text-xs text-center">Desativar / Parar Vídeo</span>
                      </div>
                      
                      {cutscenes.filter(c => c.campaignId === activeCampaignId).map(video => (
                        <div key={video.id} className="relative group h-28">
                          <div onClick={() => updateSceneElement('cutscene', video)} className={`cursor-pointer rounded-xl border-2 overflow-hidden w-full h-full relative flex items-center justify-center bg-black ${activeScene.cutscene?.id === video.id ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                            <Play className="w-8 h-8 text-white/50 group-hover:text-white transition-colors" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2"><span className="text-white text-xs font-medium truncate">{video.name}</span></div>
                          </div>
                          {/* Botões de Editar e Excluir Vídeo */}
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'cutscene', data: video }); }} className="p-1.5 bg-blue-900/90 text-white rounded-lg hover:bg-blue-600 shadow-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteAsset('cutscenes', video.id); }} className="p-1.5 bg-red-900/90 text-white rounded-lg hover:bg-red-600 shadow-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* --- SEÇÃO ELENCO (DIVIDIDO EM JOGADORES, INIMIGOS E NPCs) --- */}
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-6">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <User className="w-5 h-5 text-emerald-400" /> Elenco da Campanha
                        </h2>
                        <button 
                          onClick={() => setModalState({ isOpen: true, type: 'npc', data: null })}
                          className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-emerald-400 flex items-center gap-1 border border-slate-700"
                        >
                          <Upload className="w-3 h-3" /> Fazer Upload
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-amber-400 font-bold bg-amber-900/20 px-3 py-1 rounded cursor-pointer border border-amber-900/50 hover:bg-amber-900/40">
                        <input type="checkbox" checked={activeScene.hideNpcName} onChange={(e) => updateSceneElement('hideNpcName', e.target.checked)} className="accent-amber-500" />
                        Ocultar Nome (????)
                      </label>
                    </div>
                    
                    <div className="flex flex-col gap-8">
                      {/* Função interna para renderizar um card de personagem com o botão + */}
                      {(() => {
                        const renderCharacterCard = (npc) => (
                          <div key={npc.id} className="relative group h-40">
                            <div onClick={() => updateSceneElement('npc', npc)} className={`cursor-pointer rounded-xl border-2 overflow-hidden bg-slate-800 w-full h-full relative ${activeScene.npc?.id === npc.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                              <img src={npc.image || npc.fileData} alt={npc.name} className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-3 pt-6">
                                <h3 className="text-white text-sm font-bold truncate drop-shadow-md">{npc.name}</h3>
                              </div>
                            </div>
                            
                            {/* Botões Flutuantes (Adicionar Combate, Editar, Excluir) */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); quickAddToCombat(npc); }} 
                                title="Adicionar Rápido à Iniciativa"
                                className="p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-500 shadow-lg flex items-center justify-center border border-red-400/50"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'npc', data: npc }); }} 
                                title="Editar Personagem"
                                className="p-1.5 bg-blue-900/90 text-white rounded-lg hover:bg-blue-600 shadow-lg flex items-center justify-center border border-blue-700 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteAsset('npcs', npc.id); }} 
                                title="Excluir Personagem"
                                className="p-1.5 bg-slate-900/90 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white shadow-lg flex items-center justify-center border border-slate-700 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );

                        const playersList = activeNpcs.filter(n => n.type === 'player');
                        const enemiesList = activeNpcs.filter(n => n.type === 'enemy');
                        const npcsList = activeNpcs.filter(n => !n.type || n.type === 'npc');

                        return (
                          <>
                            {/* GRUPO: JOGADORES */}
                            {playersList.length > 0 && (
                              <div>
                                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 border-b border-blue-900/30 pb-1 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Heróis / Jogadores
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                  {playersList.map(renderCharacterCard)}
                                </div>
                              </div>
                            )}

                            {/* GRUPO: INIMIGOS */}
                            {enemiesList.length > 0 && (
                              <div>
                                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 border-b border-red-900/30 pb-1 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Ameaças / Inimigos
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                  {enemiesList.map(renderCharacterCard)}
                                </div>
                              </div>
                            )}

                            {/* GRUPO: NPCs (Sempre mostra a caixa de "Esconder NPC" aqui) */}
                            <div>
                              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 border-b border-emerald-900/30 pb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Personagens Neutros / Aliados
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                <div onClick={() => updateSceneElement('npc', null)} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800 h-40 border-slate-700 hover:border-slate-500">
                                  <EyeOff className="w-8 h-8 text-slate-500 mb-2" />
                                  <span className="text-slate-400 text-xs">Esconder Personagem</span>
                                </div>
                                {npcsList.map(renderCharacterCard)}
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </section>
                  {/* --- SEÇÃO HANDOUTS (ITENS E DOCUMENTOS) --- */}
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-amber-500" /> Handouts & Itens
                        </h2>
                        <button 
                          onClick={() => setModalState({ isOpen: true, type: 'handout', data: null })}
                          className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-amber-500 flex items-center gap-1 border border-slate-700 transition-colors"
                        >
                          <Upload className="w-3 h-3" /> Fazer Upload
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      <div onClick={() => updateSceneElement('handout', null)} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800 h-32 border-slate-700 hover:border-slate-500 transition-colors">
                         <EyeOff className="w-6 h-6 text-slate-500 mb-2" />
                         <span className="text-slate-400 text-xs text-center font-medium">Esconder Handout</span>
                      </div>
                      
                      {handouts.filter(h => h.campaignId === activeCampaignId).map(item => (
                        <div key={item.id} className="relative group h-32">
                          <div onClick={() => updateSceneElement('handout', item)} className={`cursor-pointer rounded-xl border-2 overflow-hidden w-full h-full relative flex items-center justify-center bg-slate-900 ${activeScene.handout?.id === item.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                            <img src={item.fileData} alt={item.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
                              <span className="text-amber-400 text-xs font-bold truncate drop-shadow-md">{item.name}</span>
                            </div>
                          </div>
                          {/* Botões de Editar e Excluir Handout */}
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'handout', data: item }); }} className="p-1.5 bg-blue-900/90 text-white rounded-lg hover:bg-blue-600 shadow-lg hover:scale-110 transition-all">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteAsset('handouts', item.id); }} className="p-1.5 bg-red-900/80 text-white rounded-lg hover:bg-red-600 shadow-lg hover:scale-110 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>     
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* --- SEÇÃO INICIATIVA & COMBATE --- */}
                  <section className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Users className="w-5 h-5 text-red-500" /> Rastreador de Combate
                        </h2>
                        <div className="bg-red-950/40 border border-red-900 px-3 py-1 rounded text-red-400 font-bold tracking-wider text-sm">
                          RODADA {combatState.round}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={clearCombat}
                          className="bg-slate-800 hover:bg-red-950 text-xs px-3 py-1.5 rounded text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
                        >
                          Limpar Combate
                        </button>
                        <button 
                          onClick={() => setModalState({ isOpen: true, type: 'combatant', data: null })}
                          className="bg-red-900/40 hover:bg-red-900/60 text-xs px-3 py-1.5 rounded text-red-400 flex items-center gap-1 border border-red-900 transition-colors font-bold"
                        >
                          <Plus className="w-3 h-3" /> Adicionar à Iniciativa
                        </button>
                        <button 
                          onClick={nextTurn}
                          className="bg-red-600 hover:bg-red-500 text-xs px-4 py-1.5 rounded text-white flex items-center gap-1 border border-red-500 transition-colors font-bold shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                        >
                          <FastForward className="w-3 h-3 fill-current" /> Próximo Turno
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {activeCombatants.length === 0 ? (
                        <p className="text-slate-500 text-sm italic py-4 text-center">Nenhum combatente na iniciativa. Clique em "Adicionar à Iniciativa".</p>
                      ) : (
                        activeCombatants.map((combatant) => {
                          const isActive = combatState.activeId === combatant.id;
                          // Cores baseadas no tipo
                          const typeStyles = {
                            player: "bg-blue-950/20 border-blue-900/50 text-blue-400",
                            enemy: "bg-red-950/20 border-red-900/50 text-red-400",
                            ally: "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                          };
                          const activeStyle = isActive ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-slate-900" : "border-slate-800 hover:border-slate-600 bg-slate-900/40";

                          return (
                            <div key={combatant.id} className={`flex items-center gap-4 p-2 rounded-lg border-2 transition-all group ${activeStyle}`}>
                              <div className="w-12 h-12 rounded-md overflow-hidden bg-black shrink-0 border border-slate-700">
                                <img src={combatant.fileData} alt={combatant.name} className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100" />
                              </div>
                              
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white uppercase tracking-wider">{combatant.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-tight ${typeStyles[combatant.type]}`}>
                                    {combatant.type === 'player' ? 'Jogador' : combatant.type === 'enemy' ? 'Inimigo' : 'Aliado'}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400">Iniciativa: {combatant.initiative}</span>
                              </div>

                              {isActive && (
                                <div className="px-3">
                                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500 animate-pulse">
                                    <Play className="w-3 h-3 fill-current" /> TURNO ATUAL
                                  </span>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setTurn(combatant)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-medium text-slate-300 transition-colors"
                                >
                                  Forçar Turno
                                </button>
                                <button 
                                  onClick={() => deleteAsset('combatants', combatant.id)} 
                                  className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* PREVIEW LATERAL */}
            <div className="w-[350px] lg:w-[450px] bg-slate-950 border-l border-slate-800 p-4 flex flex-col hidden md:flex shrink-0 p-4 overflow-y-auto custom-scrollbar">
              <h2 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Ecrã dos Jogadores
              </h2>
              <div className="w-full h-[300px] lg:h-[400px] rounded-xl overflow-hidden border-4 border-slate-800 relative bg-black shadow-inner mb-4 shrink-0">
                <SceneRenderer isPreview={true} activeScene={activeScene} />
              </div>

              {/* --- NOVO: BLOCO DE NOTAS SECRETO DO MESTRE --- */}
              <div className="bg-slate-900 border border-red-950 rounded-lg p-4 mb-4 flex flex-col gap-4 shadow-lg">
                <h3 className="text-xs uppercase tracking-widest text-red-400 font-bold flex items-center gap-2 border-b border-red-950 pb-2">
                  <EyeOff className="w-3.5 h-3.5 text-red-500" /> Notas Secretas do Mestre
                </h3>
                
                {/* Bloco do Cenário Ativo */}
                {activeScene.location ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-blue-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Cenário: {activeScene.location.name}
                    </label>
                    <textarea
                      value={locations.find(l => l.id === activeScene.location.id)?.secretNotes || ''}
                      onChange={(e) => updateAssetNotes('locations', activeScene.location.id, e.target.value)}
                      rows="3"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none resize-none custom-scrollbar transition-colors leading-relaxed"
                      placeholder="Armadilhas, segredos do local, testes de dificuldade (DC), Lore escondida..."
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 italic bg-slate-950/40 p-2 rounded border border-dashed border-slate-800/60">
                    Nenhum cenário ativo na mesa.
                  </div>
                )}

                {/* Bloco do NPC Ativo */}
                {activeScene.npc ? (
                  <div className="flex flex-col gap-1.5 border-t border-slate-800/60 pt-3">
                    <label className="text-[10px] text-emerald-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> NPC: {activeScene.npc.name}
                    </label>
                    <textarea
                      value={npcs.find(n => n.id === activeScene.npc.id)?.secretNotes || ''}
                      onChange={(e) => updateAssetNotes('npcs', activeScene.npc.id, e.target.value)}
                      rows="3"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none resize-none custom-scrollbar transition-colors leading-relaxed"
                      placeholder="Objetivos ocultos, fraquezas, itens que carrega, linhas de diálogo importantes..."
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 italic bg-slate-950/40 p-2 rounded border border-dashed border-slate-800/60">
                    Nenhum NPC ativo na mesa.
                  </div>
                )}
              </div>

              {/* GERENCIAMENTO DE DADOS */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4 shrink-0">
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-3">Gerenciamento de Dados</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleExportBackup}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save className="w-3 h-3 text-emerald-400" /> Exportar Dados
                  </button>
                  
                  <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
                    <Upload className="w-3 h-3 text-blue-400" /> Importar Dados
                    <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
                  </label>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mt-auto">
                 <p className="text-slate-400 text-xs leading-relaxed">
                   Abra uma nova aba neste navegador e selecione "Ecrã dos Jogadores" para que as suas alterações sejam sincronizadas de forma local e automática.
                 </p>
              </div>
            </div>
          </div>
        </>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}} />
    </div>
  );
}