import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Users, Map, User, EyeOff, Eye, Music, Play, Square, Repeat, FastForward, Clock, Plus, Trash2, Folder, X, Save, Upload, Wind, FileText, Store, Pencil, FolderOpen, ChevronLeft,Shield, Home, Battery, RefreshCw, Tag } from 'lucide-react';

// IMPORTAÇÃO CORRIGIDA: getAssetUrl adicionado!
import { localDB, getAllDataForBackup, importBackup, generateId, fileToDataUrl, getAssetUrl } from './services/db';
import { AudioManager, formatTime } from './components/AudioManager';
import { AmbientManager } from './components/AmbientManager';
import { SceneRenderer } from './components/SceneRenderer';
import { AssetModal } from './components/AssetModal';
import { ConflictTracker } from './components/conflict/ConflictTracker';
import { PictureInPicture } from './components/PictureInPicture';
import { CharacterSheet } from './components/CharacterSheet';
import { PartyTracker } from './components/PartyTracker';
import { TopNav } from './components/TopNav';
import { AudioBar } from './components/AudioBar';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';

// O Zustand Store
import { useRPGStore } from './store/useRPGStore';

// --- GERENCIADOR DE ÁUDIO INVISÍVEL ---

export default function App() {
  // Puxa as variáveis do Zustand
  const {
    role, isLoading, setRole, activeCampaignId, setActiveCampaignId,
    campaigns, locations, npcs, tracks, combatants, cutscenes, handouts, shops,
    activeScene, queuedTrackId, setQueuedTrackId, audioProgress, setAudioProgress,
    combatState, loadData, publishScene, deleteAsset, setModalState, setSheetModalState, updateCollection,
    conflicts, activeConflict, saveConflict, deleteConflict, startConflict, endConflict, updateActiveConflict,
    partyTrackerState, toggleNPCParty, uiState,
    addNPCToScene, removeNPCFromScene, toggleNPCHidden, switchNPCVariant, toggleNPCName
  } = useRPGStore();

  // Carrega os dados na primeira vez
  useEffect(() => {
    loadData();
  }, []);

  // Inicializa o Sincronizador de Cena (BroadcastChannel)
  useEffect(() => {
    const channel = new BroadcastChannel('rpg-sync');
    
    const loadInitialScene = async () => {
      const savedScene = await localDB.getItem('rpg-active-scene');
      if (savedScene) {
        useRPGStore.setState({ activeScene: {
          ...savedScene,
          audio: { ...savedScene.audio, volume: savedScene.audio?.volume !== undefined ? savedScene.audio.volume : 1 },
          ambient: { ...savedScene.ambient, volume: savedScene.ambient?.volume !== undefined ? savedScene.ambient.volume : 0.6 }
        }});
      }
    };
    loadInitialScene();

    channel.onmessage = (e) => {
      if (e.data && e.data.type === 'SCENE_UPDATE') {
        useRPGStore.setState({ activeScene: { ...e.data.scene, ambient: e.data.scene.ambient || { trackId: null, loop: true } } });
      } else if (e.data && e.data.type === 'VOLUME_UPDATE') {
        useRPGStore.setState(state => ({
          activeScene: {
            ...state.activeScene,
            [e.data.audioType]: { ...state.activeScene[e.data.audioType], volume: e.data.volume }
          }
        }));
      } else if (e.data && e.data.type === 'AUDIO_UPDATE') {
        // O SEGREDO: Atualiza APENAS o áudio, mantendo os arquivos de imagem (Blobs) 100% intactos!
        useRPGStore.setState(state => ({
          activeScene: {
            ...state.activeScene,
            audio: e.data.audio,
            ambient: e.data.ambient
          }
        }));
      }
    };

    return () => channel.close();
  }, []);


  // --- FUNÇÕES DE CONTROLE DO MESTRE ---
  const updateSceneElement = (type, item) => {
    if (item && (type === 'location' || type === 'npc')) {
      const { secretNotes, ...publicItem } = item;
      publishScene({ ...activeScene, [type]: publicItem });
    } else {
      publishScene({ ...activeScene, [type]: item });
    }
  };

  const clearScene = () => {
    publishScene({ location: null, refuge: null, npc: null, npcs: [], hideNpcName: false, isMapMode: false, cutscene: null, handout: null, shop: null, audio: { trackId: null, loop: true, seekEvent: null }, ambient: { trackId: null, loop: true } });
    setQueuedTrackId(null);
  };

  // --- FUNÇÕES DE NOTAS SECRETAS ---
  const updateAssetNotes = async (collectionName, id, notes) => {
    const currentData = useRPGStore.getState()[collectionName] || [];
    const newData = currentData.map(item => item.id === id ? { ...item, secretNotes: notes } : item);
    updateCollection(collectionName, newData);
    await localDB.setItem(collectionName, newData);
  };

  // --- ROTA EXPRESSA DE ÁUDIO (Evita piscar a tela) ---
  const publishAudioOnly = async (newAudio, newAmbient) => {
    const updatedScene = {
      ...activeScene,
      audio: newAudio !== undefined ? newAudio : activeScene.audio,
      ambient: newAmbient !== undefined ? newAmbient : activeScene.ambient
    };
    useRPGStore.setState({ activeScene: updatedScene }); // Atualiza local
    await localDB.setItem('rpg-active-scene', updatedScene); // Salva no HD
    
    // Envia SÓ O ÁUDIO pelo túnel!
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'AUDIO_UPDATE', audio: updatedScene.audio, ambient: updatedScene.ambient });
    channel.close();
  };

  // --- CONTROLES DE ÁUDIO DA TRILHA ---
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    useRPGStore.setState(state => ({ activeScene: { ...state.activeScene, audio: { ...state.activeScene.audio, volume: vol } } }));
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'VOLUME_UPDATE', audioType: 'audio', volume: vol });
    channel.close();
  };
  // Agora os comandos de áudio usam a rota expressa!
  const handleVolumeCommit = (e) => publishAudioOnly({ ...activeScene.audio, volume: parseFloat(e.target.value) }, undefined);

  const toggleLoop = (e) => publishAudioOnly({ ...activeScene.audio, loop: e.target.checked }, undefined);
  const stopAudio = () => { publishAudioOnly({ ...activeScene.audio, trackId: null, seekEvent: null }, undefined); setQueuedTrackId(null); };
  const executeTransition = () => { if (queuedTrackId) { publishAudioOnly({ ...activeScene.audio, trackId: queuedTrackId, seekEvent: 0 }, undefined); setQueuedTrackId(null); } };
  const handleSeekChange = (e) => setAudioProgress({ ...audioProgress, time: Number(e.target.value) });
  const handleSeekCommit = (e) => publishAudioOnly({ ...activeScene.audio, seekEvent: Number(e.target.value) }, undefined);

  // --- CONTROLES DE SOM AMBIENTE ---
  const handleAmbientVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    useRPGStore.setState(state => ({ activeScene: { ...state.activeScene, ambient: { ...state.activeScene.ambient, volume: vol } } }));
    const channel = new BroadcastChannel('rpg-sync');
    channel.postMessage({ type: 'VOLUME_UPDATE', audioType: 'ambient', volume: vol });
    channel.close();
  };
  const handleAmbientVolumeCommit = (e) => publishAudioOnly(undefined, { ...activeScene.ambient, volume: parseFloat(e.target.value) });

  const toggleAmbientLoop = (e) => publishAudioOnly(undefined, { ...activeScene.ambient, loop: e.target.checked });
  const stopAmbient = () => publishAudioOnly(undefined, { ...activeScene.ambient, trackId: null });
  const playAmbient = (id) => publishAudioOnly(undefined, { ...activeScene.ambient, trackId: id });


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


  // --- FILTROS DE CAMPANHA E LÓGICA DE PASTAS ---
  const activeLocations = locations.filter(l => l.campaignId === activeCampaignId);
  const activeNpcs = npcs.filter(n => n.campaignId === activeCampaignId);
  const activeTracks = tracks.filter(t => t.campaignId === activeCampaignId);
  const activeCutscenes = cutscenes.filter(c => c.campaignId === activeCampaignId);
  const activeHandouts = handouts.filter(h => h.campaignId === activeCampaignId);

  const activeRefuges = (useRPGStore.getState().refuges || []).filter(r => r.campaignId === activeCampaignId);
  const [activeFolderRefuges, setActiveFolderRefuges] = useState('');
  const displayRefuges = activeFolderRefuges ? activeRefuges.filter(r => r.folder === activeFolderRefuges) : activeRefuges.filter(r => !r.folder);
  const refugeFolders = [...new Set(activeRefuges.map(r => r.folder).filter(Boolean))];

  // Estados para saber em que pasta o Mestre está dentro de cada aba
  const [activeFolderLocations, setActiveFolderLocations] = useState('');
  const [activeFolderCutscenes, setActiveFolderCutscenes] = useState('');
  const [activeFolderNpcs, setActiveFolderNpcs] = useState('');
  const [activeFolderHandouts, setActiveFolderHandouts] = useState('');

  // Lógica de Separação (Mostra as pastas, ou mostra o que está solto na raiz)
  const locationFolders = [...new Set(activeLocations.map(l => l.folder).filter(Boolean))];
  const displayLocations = activeFolderLocations ? activeLocations.filter(l => l.folder === activeFolderLocations) : activeLocations.filter(l => !l.folder);

  const cutsceneFolders = [...new Set(activeCutscenes.map(c => c.folder).filter(Boolean))];
  const displayCutscenes = activeFolderCutscenes ? activeCutscenes.filter(c => c.folder === activeFolderCutscenes) : activeCutscenes.filter(c => !c.folder);

  const handoutFolders = [...new Set(activeHandouts.map(h => h.folder).filter(Boolean))];
  const displayHandouts = activeFolderHandouts ? activeHandouts.filter(h => h.folder === activeFolderHandouts) : activeHandouts.filter(h => !h.folder);

  // --- COMPONENTES VISUAIS ---

  if (isLoading && role === null) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-bold animate-pulse">Carregando Banco de Dados Local...</div>;
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wider text-amber-500 font-serif">RPG SCENE MANAGER</h1>
        <p className="text-slate-400 mb-12 text-center max-w-md">Os seus dados são guardados localmente neste dispositivo (Modo Offline).</p>
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center">
          <button onClick={() => setRole('master')} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-8 flex flex-col items-center transition-all hover:border-amber-500 group shadow-lg">
            <Monitor className="w-16 h-16 mb-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
            <h2 className="text-2xl font-bold">Tela do Mestre</h2>
          </button>
          <button onClick={() => setRole('player')} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-8 flex flex-col items-center transition-all hover:border-blue-500 group shadow-lg">
            <Users className="w-16 h-16 mb-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <h2 className="text-2xl font-bold">Tela dos Jogadores</h2>
          </button>
        </div>
      </div>
    );
  }


  // --- SISTEMA DE COMBATE ---
  const activeCombatants = combatants.filter(c => c.campaignId === activeCampaignId).sort((a, b) => b.initiative - a.initiative);

  const updateCombatState = async (newState) => {
    setCombatState(newState);
    await localDB.setItem('combat-state', newState);
  };

  const setTurn = (combatant) => {
    updateCombatState({ ...combatState, activeId: combatant.id });
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

  const clearCombat = async () => {
    if(!window.confirm("Limpar toda a iniciativa atual?")) return;
    const filtered = combatants.filter(c => c.campaignId !== activeCampaignId);
    
    updateCollection('combatants', filtered);
    await localDB.setItem('combatants', filtered);
    updateCombatState({ round: 1, activeId: null });
    updateSceneElement('npc', null);
  };

  const quickAddToCombat = async (npc) => {
    const initStr = window.prompt(`Digite a Iniciativa rolada para ${npc.name}:`, "10");
    if (initStr === null) return;
    
    const initiative = Number(initStr) || 0;
    
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
    updateCollection('combatants', updatedCombatants);
    await localDB.setItem('combatants', updatedCombatants);
  };
  //refugios
  const handleRefugeStatUpdate = async (field, value, isResource = false, resKey = null, resType = 'cur') => {
    if (!activeScene.refuge) return;
    let updatedRefuge = JSON.parse(JSON.stringify(activeScene.refuge)); // Clone profundo simples
    
    if (isResource) updatedRefuge.stats.resources[resKey][resType] = Number(value);
    else if (field.includes('stats.')) updatedRefuge.stats[field.split('.')[1]] = Number(value);
    else updatedRefuge[field] = Number(value);

    // Sincroniza a tela e salva no banco de dados para não perder os dados
    publishScene({ ...activeScene, refuge: updatedRefuge });
    const newData = (useRPGStore.getState().refuges || []).map(r => r.id === updatedRefuge.id ? updatedRefuge : r);
    updateCollection('refuges', newData);
    await localDB.setItem('refuges', newData);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col h-screen overflow-hidden">
      {role === 'master' && (
        <>
          <AudioManager audioState={activeScene.audio} setAudioProgress={setAudioProgress} tracksList={tracks} />
          <AmbientManager ambientState={activeScene.ambient} tracksList={tracks} />
          <PartyTracker />
          <KeyboardShortcuts />
          <AudioBar />
        </>
      )}
      <AssetModal />
      

      {role === 'player' ? (
        <div className="flex-1 relative">
          <SceneRenderer activeScene={activeScene} />
          <button onClick={() => setRole(null)} className="absolute top-4 right-4 text-white/10 hover:text-white/50 transition-colors z-50">            <EyeOff className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
          role === 'master' ? (partyTrackerState?.isCollapsed ? 'ml-12' : 'ml-[280px]') : 'ml-0'
        }`}>
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

          {/* MENU SUPERIOR COM TABS */}
          {activeCampaignId && <TopNav />}

          <div className="flex-1 flex overflow-hidden">
            {/* PAINEL CENTRAL (CONTROLOS E ATIVOS) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-8 custom-scrollbar pb-28">
              
              {!activeCampaignId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Folder className="w-24 h-24 mb-4 opacity-50" />
                  <h2 className="text-2xl font-bold text-slate-400">Nenhuma Campanha Selecionada</h2>
                  <p className="mt-2">Crie uma nova campanha no menu superior para começar a enviar os seus ficheiros.</p>
                </div>
              ) : (
                <>
                  {/* TAB 4: ÁUDIO */}
                  {uiState?.activeTab === 'audio' && (
                    <div className="tab-content flex flex-col gap-8">
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
                            <div className="flex items-center gap-2 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Vol:</span>
                              <input type="range" min="0" max="1" step="0.05" 
                                value={activeScene.audio?.volume !== undefined ? activeScene.audio.volume : 1} 
                                onChange={handleVolumeChange} 
                                onMouseUp={handleVolumeCommit} 
                                onTouchEnd={handleVolumeCommit} 
                                className="w-16 md:w-24 accent-purple-500 h-1 bg-slate-800 rounded appearance-none cursor-pointer" />
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
                            <div className="flex items-center gap-2 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Vol:</span>
                              <input type="range" min="0" max="1" step="0.05" 
                                value={activeScene.ambient?.volume !== undefined ? activeScene.ambient.volume : 0.6} 
                                onChange={handleAmbientVolumeChange} 
                                onMouseUp={handleAmbientVolumeCommit} 
                                onTouchEnd={handleAmbientVolumeCommit} 
                                className="w-16 md:w-24 accent-emerald-500 h-1 bg-slate-800 rounded appearance-none cursor-pointer" />
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {activeTracks.map(track => {
                            const isPlayingTrack = activeScene.audio?.trackId === track.id;
                            const isPlayingAmbient = activeScene.ambient?.trackId === track.id;
                            const isQueued = queuedTrackId === track.id;
                            
                            const trackTags = track.tags || [];
                            const hasTag = (name) => trackTags.some(t => t.toLowerCase() === name.toLowerCase());

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

                        {activeScene.audio?.trackId && (
                          <div className="mt-2 flex items-center gap-4 text-sm text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="w-12 text-right text-xs font-mono font-bold tracking-wider text-purple-400">{formatTime(audioProgress.time)}</span>
                            <input type="range" min="0" max={audioProgress.duration || 100} value={audioProgress.time || 0} onChange={handleSeekChange} onMouseUp={handleSeekCommit} onTouchEnd={handleSeekCommit} className="flex-1 accent-purple-500 cursor-pointer h-2 bg-black rounded-lg appearance-none border border-slate-800" />
                            <span className="w-12 text-xs font-mono tracking-wider text-slate-500">{formatTime(audioProgress.duration)}</span>
                          </div>
                        )}
                      </section>
                    </div>
                  )}

                  {/* TAB 2: MAPAS & CENÁRIOS */}
                  {uiState?.activeTab === 'maps' && (
                    <div className="tab-content flex flex-col gap-8">
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
                          {/* Botão de Voltar da Pasta */}
                          {activeFolderLocations && (
                            <div className="col-span-full flex items-center gap-2 mb-2">
                              <button onClick={() => setActiveFolderLocations('')} className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300 flex items-center gap-1 transition-colors border border-slate-700">
                                <ChevronLeft className="w-4 h-4"/> Voltar
                              </button>
                              <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-blue-400" /> Pasta: {activeFolderLocations}
                              </span>
                            </div>
                          )}

                          {!activeFolderLocations && (
                            <>
                              <div onClick={() => updateSceneElement('location', null)} className="cursor-pointer rounded-xl border-2 p-4 flex items-center justify-center bg-slate-800 h-28 border-slate-700 hover:border-slate-500">
                                <span className="text-slate-400 text-sm">Fundo Preto</span>
                              </div>
                              {/* Desenha os Ícones de Pastas de Cenários */}
                              {locationFolders.map(folder => (
                                <div key={folder} onClick={() => setActiveFolderLocations(folder)} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800/80 h-28 border-slate-700 hover:border-blue-500 transition-all group">
                                  <Folder className="w-10 h-10 text-blue-400 group-hover:scale-110 transition-transform mb-2 fill-current opacity-80" />
                                  <span className="text-slate-300 text-sm font-bold truncate w-full text-center">{folder}</span>
                                </div>
                              ))}
                            </>
                          )}
                          
                          {displayLocations.map(loc => (
                            <div key={loc.id} className="relative group h-28">
                              <div onClick={() => updateSceneElement('location', loc)} className={`cursor-pointer rounded-xl border-2 overflow-hidden w-full h-full relative ${activeScene.location?.id === loc.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                                <img src={getAssetUrl(loc.image || loc.fileData)} alt={loc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-black/60 flex items-end p-2"><span className="text-white text-xs font-medium truncate">{loc.name}</span></div>
                              </div>
                              
                              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                {activeScene.refuge && (
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      const updatedRefuge = { ...activeScene.refuge, locationId: loc.id, fileData: loc.fileData || loc.image };
                                      const currentRefuges = await localDB.getItem('refuges') || [];
                                      const updatedList = currentRefuges.map(r => r.id === updatedRefuge.id ? updatedRefuge : r);
                                      await localDB.setItem('refuges', updatedList);
                                      updateCollection('refuges', updatedList);
                                      publishScene({ ...activeScene, refuge: updatedRefuge });
                                    }} 
                                    title="Definir como Fundo do Refúgio Ativo" 
                                    className="p-1.5 bg-indigo-900/90 text-white rounded-lg hover:bg-indigo-600 shadow-lg transition-colors"
                                  >
                                    <Shield className="w-4 h-4 text-indigo-300" />
                                  </button>
                                )}
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
                    </div>
                  )}
                  
                  {/* TAB 3: ITENS, HANDOUTS & LOJAS */}
                  {uiState?.activeTab === 'items' && (
                    <div className="tab-content flex flex-col gap-8">
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
                                  {/* CORREÇÃO: getAssetUrl adicionado! */}
                                  {shop.fileData && <img src={getAssetUrl(shop.fileData)} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-opacity" alt={shop.name} />}
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
                    </div>
                  )}

                  {/* TAB 5: CUTSCENES (VÍDEOS) */}
                  {uiState?.activeTab === 'cutscenes' && (
                    <div className="tab-content flex flex-col gap-8">
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
                    </div>
                  )}

                  {/* TAB 1: ELENCO DA CAMPANHA (NPCs / JOGADORES) */}
                  {(!uiState?.activeTab || uiState?.activeTab === 'npcs') && (
                    <div className="tab-content flex flex-col gap-8">
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
                        Ocultar Todos os Nomes (????)
                      </label>
                    </div>

                    {/* --- PAINEL DE CONTROLADORES DE NPCs ATIVOS NA CENA --- */}
                    {(() => {
                      const rawNpcs = Array.isArray(activeScene.npcs) 
                        ? activeScene.npcs 
                        : (activeScene.npc ? [activeScene.npc] : []);
                      const activeSceneNpcs = rawNpcs.filter(n => !n.isFadingOut);

                      return (
                        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 mb-6 shadow-xl">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-amber-500" />
                              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                                NPCs na Cena ({activeSceneNpcs.length}/4)
                              </h3>
                            </div>
                            {activeSceneNpcs.length >= 4 && (
                              <span className="text-xs text-amber-400 font-medium bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                                Limite de 4 NPCs atingido
                              </span>
                            )}
                          </div>

                          {activeSceneNpcs.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2 text-center">
                              Nenhum NPC ativo na cena. Clique em um card do elenco abaixo para adicionar à cena.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                              {activeSceneNpcs.map((activeNpc, index) => {
                                const fullNpc = npcs.find(n => n.id === activeNpc.id) || activeNpc;
                                const currentVariant = (fullNpc.variants && fullNpc.variants[activeNpc.variantIndex || 0]) || activeNpc.fileData || fullNpc.fileData;

                                return (
                                  <div 
                                    key={activeNpc.id} 
                                    className={`flex items-center gap-3 p-2.5 bg-slate-950 rounded-lg border transition-all ${
                                      activeNpc.isHidden ? 'border-amber-900/50 bg-slate-950/80' : 'border-amber-500/40 shadow-md'
                                    }`}
                                  >
                                    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                                      <img 
                                        src={getAssetUrl(currentVariant)} 
                                        alt={activeNpc.name} 
                                        className={`w-full h-full object-cover object-top ${activeNpc.isHidden ? 'filter brightness-0 opacity-20' : ''}`} 
                                      />
                                      <span className="absolute bottom-0 right-0 bg-amber-600 text-slate-950 font-black text-[9px] px-1 rounded-tl">
                                        #{index + 1}
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold text-white truncate block">
                                          {activeNpc.hideName ? "????" : activeNpc.name}
                                        </span>
                                        {activeNpc.isHidden && (
                                          <span className="text-[9px] bg-slate-800 text-amber-400 font-semibold px-1 rounded">
                                            Silhueta
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1 mt-1.5">
                                        {fullNpc.variants && fullNpc.variants.length > 1 && (
                                          <button
                                            onClick={() => {
                                              const nextIdx = ((activeNpc.variantIndex || 0) + 1) % fullNpc.variants.length;
                                              switchNPCVariant(activeNpc.id, nextIdx);
                                            }}
                                            title="Trocar Expressão / Variante"
                                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                          </button>
                                        )}

                                        <button
                                          onClick={() => toggleNPCHidden(activeNpc.id)}
                                          title={activeNpc.isHidden ? "Revelar NPC (Desativar Silhueta)" : "Ocultar NPC (Mostrar Silhueta)"}
                                          className={`p-1 rounded border transition-colors ${
                                            activeNpc.isHidden 
                                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                          }`}
                                        >
                                          {activeNpc.isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        </button>

                                        <button
                                          onClick={() => toggleNPCName(activeNpc.id)}
                                          title={activeNpc.hideName ? "Mostrar Nome" : "Ocultar Nome (????)"}
                                          className={`p-1 rounded border transition-colors ${
                                            activeNpc.hideName 
                                              ? 'bg-amber-900/70 text-amber-300 border-amber-700' 
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                          }`}
                                        >
                                          <Tag className="w-3 h-3" />
                                        </button>

                                        <button
                                          onClick={() => removeNPCFromScene(activeNpc.id)}
                                          title="Remover da Cena"
                                          className="p-1 bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-white rounded border border-red-900/60 ml-auto transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    <div className="flex flex-col gap-8">
                      {(() => {
                        const rawNpcsList = Array.isArray(activeScene.npcs) 
                          ? activeScene.npcs 
                          : (activeScene.npc ? [activeScene.npc] : []);
                        const currentActiveNpcs = rawNpcsList.filter(n => !n.isFadingOut);

                        const renderCharacterCard = (npc) => {
                          const isNpcActive = activeScene.refuge 
                            ? activeScene.refugeNpcs?.some(n => n.id === npc.id)
                            : currentActiveNpcs.some(n => n.id === npc.id);

                          const activeSceneItem = currentActiveNpcs.find(n => n.id === npc.id);
                          const currentVariantIndex = activeSceneItem?.variantIndex || 0;
                          const displayImage = (!activeScene.refuge && isNpcActive && npc.variants?.[currentVariantIndex]) 
                            ? getAssetUrl(npc.variants[currentVariantIndex]) 
                            : getAssetUrl(npc.fileData);

                          return (
                            <div key={npc.id} className="relative group h-40">
                              <div 
                                onClick={() => { 
                                  if (activeScene.refuge) {
                                    let currentNpcs = activeScene.refugeNpcs || [];
                                    const exists = currentNpcs.find(n => n.id === npc.id);
                                    if (exists) {
                                      publishScene({ ...activeScene, refugeNpcs: currentNpcs.filter(n => n.id !== npc.id) });
                                    } else if (currentNpcs.length < 4) {
                                      publishScene({ ...activeScene, refugeNpcs: [...currentNpcs, { ...npc, fileData: npc.fileData }] });
                                    } else {
                                      alert("O Refúgio suporta no máximo 4 personagens visíveis.");
                                    }
                                  } else {
                                    if (isNpcActive) {
                                      removeNPCFromScene(npc.id);
                                    } else {
                                      if (currentActiveNpcs.length >= 4) {
                                        alert("Limite de 4 NPCs na cena atingido!");
                                      } else {
                                        addNPCToScene(npc);
                                      }
                                    }
                                  }
                                }} 
                                className={`cursor-pointer rounded-xl border-2 overflow-hidden bg-slate-800 w-full h-full relative transition-all duration-300 ${isNpcActive ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}
                              >
                                <img src={displayImage} alt={npc.name} className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-100 transition-all duration-300" />
                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-3 pt-6 pb-2">
                                  <h3 className="text-white text-sm font-bold truncate drop-shadow-md">{npc.name}</h3>
                                </div>
                                {isNpcActive && !activeScene.refuge && (
                                  <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                                    Na Cena
                                  </div>
                                )}
                              </div>
                              
                              {npc.variants && npc.variants.length > 1 && (
                                <div className="absolute bottom-1 right-2 flex gap-1 z-20">
                                  {npc.variants.map((vImg, idx) => (
                                    <div 
                                      key={idx}
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if(!activeScene.refuge && isNpcActive) {
                                          switchNPCVariant(npc.id, idx);
                                        }
                                      }}
                                      className={`w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden border-2 cursor-pointer transition-transform hover:scale-125 bg-slate-900 ${!activeScene.refuge && isNpcActive && currentVariantIndex === idx ? 'border-amber-500 scale-110 shadow-lg' : 'border-slate-400/50 hover:border-white'}`}
                                    >
                                      <img src={getAssetUrl(vImg)} className="w-full h-full object-cover object-top" alt="var" />
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                <button onClick={(e) => { e.stopPropagation(); setSheetModalState({ isOpen: true, npcId: npc.id }); }} title="Ficha do Personagem" className="p-1.5 bg-amber-600/90 text-slate-950 font-black rounded-lg hover:bg-amber-500 shadow-lg flex items-center justify-center border border-amber-400"><FileText className="w-3.5 h-3.5" /></button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleNPCParty(npc.id); }} 
                                  title={npc.inParty ? "Remover do Party Tracker" : "Adicionar ao Party Tracker"} 
                                  className={`p-1.5 rounded-lg shadow-lg flex items-center justify-center transition-colors border ${
                                    npc.inParty 
                                      ? 'bg-amber-500 text-slate-950 font-black border-amber-300 hover:bg-amber-400' 
                                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-amber-900/60 hover:text-amber-400 hover:border-amber-700'
                                  }`}
                                >
                                  <Users className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'npc', data: npc }); }} title="Editar NPC" className="p-1.5 bg-blue-900/90 text-white rounded-lg hover:bg-blue-600 shadow-lg flex items-center justify-center border border-blue-700 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteAsset('npcs', npc.id); }} title="Excluir NPC" className="p-1.5 bg-slate-900/90 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white shadow-lg flex items-center justify-center border border-slate-700 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          );
                        };

                        const playersList = activeNpcs.filter(n => n.type === 'player');
                        const enemiesList = activeNpcs.filter(n => n.type === 'enemy');
                        const npcsList = activeNpcs.filter(n => !n.type || n.type === 'npc');

                        return (
                          <>
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

                            {/* GRUPO: NPCs */}
                            {(() => {
                              // Extrai pastas só dos NPCs
                              const npcFolders = [...new Set(npcsList.map(n => n.folder).filter(Boolean))];
                              const displayNpcs = activeFolderNpcs ? npcsList.filter(n => n.folder === activeFolderNpcs) : npcsList.filter(n => !n.folder);

                              return (
                                <div>
                                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 border-b border-emerald-900/30 pb-1 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Personagens Neutros / Aliados
                                  </h3>
                                  
                                  {activeFolderNpcs && (
                                    <div className="flex items-center gap-2 mb-4">
                                      <button onClick={() => setActiveFolderNpcs('')} className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300 flex items-center gap-1 transition-colors border border-slate-700">
                                        <ChevronLeft className="w-4 h-4"/> Voltar
                                      </button>
                                      <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4 text-emerald-400" /> Pasta: {activeFolderNpcs}
                                      </span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                    {!activeFolderNpcs && (
                                      <>
                                        <div onClick={() => updateSceneElement('npc', null)} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800 h-40 border-slate-700 hover:border-slate-500">
                                          <EyeOff className="w-8 h-8 text-slate-500 mb-2" />
                                          <span className="text-slate-400 text-xs">Esconder Personagem</span>
                                        </div>
                                        {npcFolders.map(folder => (
                                          <div key={folder} onClick={() => setActiveFolderNpcs(folder)} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800/80 h-40 border-slate-700 hover:border-emerald-500 transition-all group">
                                            <Folder className="w-12 h-12 text-emerald-400 group-hover:scale-110 transition-transform mb-2 fill-current opacity-80" />
                                            <span className="text-slate-300 text-sm font-bold truncate w-full text-center">{folder}</span>
                                          </div>
                                        ))}
                                      </>
                                    )}
                                    {displayNpcs.map(renderCharacterCard)}
                                  </div>
                                </div>
                              )
                            })()}
                          </>
                        )
                      })()}
                    </div>
                  </section>
                </div>
              )}

              {/* HANDOUTS (ABAS DE ITENS) */}
              {uiState?.activeTab === 'items' && (
                <div className="tab-content flex flex-col gap-8">
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
                            {/* CORREÇÃO: getAssetUrl adicionado! */}
                            <img src={getAssetUrl(item.fileData)} alt={item.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
                              <span className="text-amber-400 text-xs font-bold truncate drop-shadow-md">{item.name}</span>
                            </div>
                          </div>
                          
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
                </div>
              )}

              {/* REFÚGIOS & CONFLITOS (DENTRO DA ABA CENÁRIOS / MAPAS) */}
              {uiState?.activeTab === 'maps' && (
                <div className="tab-content flex flex-col gap-8 mt-6">
                  {/* --- SEÇÃO REFÚGIOS --- */}
                  <section>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Shield className="w-5 h-5 text-indigo-400" /> Refúgios & Acampamentos
                        </h2>
                        <button onClick={() => setModalState({ isOpen: true, type: 'refuge', data: null })} className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-indigo-400 flex items-center gap-1 border border-slate-700">
                          <Upload className="w-3 h-3" /> Novo Refúgio
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                      <div onClick={() => publishScene({ ...activeScene, refuge: null, refugeNpcs: [] })} className="cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-slate-800 h-28 border-slate-700 hover:border-slate-500">
                         <Home className="w-6 h-6 text-slate-500 mb-2" />
                         <span className="text-slate-400 text-xs">Desativar Refúgio</span>
                      </div>
                      
                      {displayRefuges.map(ref => {
                        const bgData = ref.locationId 
                          ? (locations.find(l => l.id === ref.locationId)?.fileData || ref.fileData) 
                          : ref.fileData;

                        return (
                          <div key={ref.id} className="relative group h-28">
                            <div onClick={() => publishScene({ ...activeScene, refuge: ref, location: null, shop: null, isMapMode: false })} className={`cursor-pointer rounded-xl border-2 overflow-hidden w-full h-full relative ${activeScene.refuge?.id === ref.id ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                              <img src={getAssetUrl(bgData) || '/refugio-padrao.jpg'} alt={ref.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform opacity-60"/>
                              <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 to-transparent"><span className="text-indigo-300 font-bold text-sm truncate">{ref.name}</span></div>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 z-10">
                              <button onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'refuge', data: ref }); }} className="p-1.5 bg-blue-900/90 text-white rounded"><Pencil className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteAsset('refuges', ref.id); }} className="p-1.5 bg-red-900/90 text-white rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* HUD DO MESTRE (Só aparece quando o Refúgio está ativo) */}
                    {activeScene.refuge && activeScene.refuge.stats && (
                      <div className="bg-slate-950 border border-indigo-900/50 p-4 rounded-xl shadow-inner animate-fade-in-up mb-8">
                        <div className="flex justify-between items-center mb-4 border-b border-indigo-900/30 pb-2">
                          <h3 className="text-indigo-400 font-bold tracking-widest uppercase text-sm">Controle Geral do Refúgio</h3>
                          <span className="text-xs text-slate-500">Selecione NPCs na aba abaixo para exibi-los no refúgio ({activeScene.refugeNpcs?.length || 0}/4)</span>
                        </div>
                        
                        {/* Níveis Básicos */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          {['level', 'population', 'structures'].map((key, i) => (
                            <div key={key} className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded border border-slate-800">
                              <span className="text-xs font-bold text-slate-400 uppercase">{['Nível', 'População', 'Construções'][i]}</span>
                              <input type="number" min="0" value={activeScene.refuge[key]} onChange={(e) => handleRefugeStatUpdate(key, e.target.value)} className="w-16 bg-black border border-slate-700 rounded text-center text-indigo-300 font-bold" />
                            </div>
                          ))}
                        </div>

                        {/* Categorias */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-amber-500 uppercase font-bold tracking-widest">Moral</label>
                            <select value={activeScene.refuge.stats.moral} onChange={(e) => handleRefugeStatUpdate('stats.moral', e.target.value)} className="bg-black border border-slate-800 rounded p-1.5 text-xs text-slate-300">
                              {['0 - Amotinada', '1 - Desiludida', '2 - Hesitante', '3 - Resoluta', '4 - Animada', '5 - Empenhada', '6 - Exaltada'].map((opt, i) => <option key={i} value={i}>{opt}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-blue-500 uppercase font-bold tracking-widest">Defesa</label>
                            <select value={activeScene.refuge.stats.defesa} onChange={(e) => handleRefugeStatUpdate('stats.defesa', e.target.value)} className="bg-black border border-slate-800 rounded p-1.5 text-xs text-slate-300">
                              {['0 - Nenhuma', '1 - Linhas e sinos', '2 - Arame farpado', '3 - Muro de madeira', '4 - Muro de pedra/tijolo', '5 - Complexo prisional', '6 - Base militar'].map((opt, i) => <option key={i} value={i}>{opt}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-red-500 uppercase font-bold tracking-widest">Beligerância</label>
                            <select value={activeScene.refuge.stats.beligerancia} onChange={(e) => handleRefugeStatUpdate('stats.beligerancia', e.target.value)} className="bg-black border border-slate-800 rounded p-1.5 text-xs text-slate-300">
                              {['0 - Pacifista', '1 - Mínima', '2 - Razoável', '3 - Eficiente', '4 - Ameaçadora', '5 - Terrível', '6 - Arrasadora'].map((opt, i) => <option key={i} value={i}>{opt}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Recursos */}
                        <label className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest border-b border-emerald-900/30 w-full block pb-1 mb-3">Gestão de Recursos</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {[
                            { k: 'agua', n: 'Água' }, { k: 'plantas', n: 'Plantas' }, { k: 'animais', n: 'Animais' }, { k: 'madeira', n: 'Madeira' },
                            { k: 'minerais', n: 'Minerais' }, { k: 'biomassa', n: 'Biomassa' }, { k: 'alimento', n: 'Alimento' }, { k: 'vestuario', n: 'Vestuário' },
                            { k: 'municao', n: 'Munição' }, { k: 'combustivel', n: 'Combustível' }, { k: 'medicamento', n: 'Medicamento' }, { k: 'material', n: 'Material Const.' }
                          ].map(res => (
                            <div key={res.k} className="bg-slate-900 border border-slate-800 rounded p-2 flex flex-col gap-1.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase truncate">{res.n}</span>
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" value={activeScene.refuge.stats.resources[res.k].cur} onChange={(e) => handleRefugeStatUpdate(null, e.target.value, true, res.k, 'cur')} className="w-full bg-black text-white text-xs border border-slate-700 rounded text-center p-0.5" />
                                <span className="text-slate-600">/</span>
                                <input type="number" min="1" value={activeScene.refuge.stats.resources[res.k].max} onChange={(e) => handleRefugeStatUpdate(null, e.target.value, true, res.k, 'max')} className="w-full bg-black text-slate-400 text-xs border border-slate-700 rounded text-center p-0.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* --- SEÇÃO SISTEMA DE CONFLITOS DE ASSIMILAÇÃO --- */}
                  <section className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
                    <ConflictTracker
                      conflicts={conflicts}
                      activeConflict={activeConflict}
                      locations={locations}
                      tracks={tracks}
                      npcs={npcs}
                      onSaveConflict={saveConflict}
                      onDeleteConflict={deleteConflict}
                      onStartConflict={startConflict}
                      onEndConflict={endConflict}
                      onUpdateActiveConflict={updateActiveConflict}
                    />
                  </section>
                </div>
              )}

              {/* --- BLOCO DE NOTAS SECRETO DO MESTRE --- */}
                  <section className="bg-slate-950 p-4 rounded-xl border border-red-950 shadow-lg flex flex-col gap-4">
                    <h3 className="text-xs uppercase tracking-widest text-red-400 font-bold flex items-center gap-2 border-b border-red-950 pb-2">
                      <EyeOff className="w-4 h-4 text-red-500" /> Notas Secretas do Mestre
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none resize-none custom-scrollbar transition-colors leading-relaxed"
                            placeholder="Armadilhas, segredos do local, testes de dificuldade (DC), Lore escondida..."
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 italic bg-slate-900/40 p-3 rounded border border-dashed border-slate-800/60 flex items-center justify-center">
                          Nenhum cenário ativo na mesa.
                        </div>
                      )}

                      {/* Bloco do NPC Ativo */}
                      {activeScene.npc ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-emerald-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> NPC: {activeScene.npc.name}
                          </label>
                          <textarea
                            value={npcs.find(n => n.id === activeScene.npc.id)?.secretNotes || ''}
                            onChange={(e) => updateAssetNotes('npcs', activeScene.npc.id, e.target.value)}
                            rows="3"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none resize-none custom-scrollbar transition-colors leading-relaxed"
                            placeholder="Objetivos ocultos, fraquezas, itens que carrega, linhas de diálogo importantes..."
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 italic bg-slate-900/40 p-3 rounded border border-dashed border-slate-800/60 flex items-center justify-center">
                          Nenhum NPC ativo na mesa.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* --- GERENCIAMENTO DE DADOS & RODAPÉ --- */}
                  <section className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-md">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">Gerenciamento de Dados</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Sincronize ou faça backup de suas campanhas, mapas e NPCs.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleExportBackup}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5 text-emerald-400" /> Exportar Dados
                      </button>
                      
                      <label className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-blue-400" /> Importar Dados
                        <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
                      </label>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE PICTURE-IN-PICTURE (PIP) FLUTUANTE */}
      <PictureInPicture />

      {/* COMPONENTE FICHA DE PERSONAGEM (MODAL) */}
      <CharacterSheet />

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