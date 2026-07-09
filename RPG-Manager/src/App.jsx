import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Users, Map, User, EyeOff, Eye, Music, Play, Square, Repeat, FastForward, Clock, Plus, Trash2, Folder, X, Save, Upload, Wind, FileText, Store, Pencil } from 'lucide-react';

import { localDB, getAllDataForBackup, importBackup, generateId, fileToDataUrl } from './services/db';
import { AudioManager, formatTime } from './components/AudioManager';
import { AmbientManager } from './components/AmbientManager';
import { SceneRenderer } from './components/SceneRenderer';
import { AssetModal } from './components/AssetModal';

// O Zustand Store
import { useRPGStore } from './store/useRPGStore';

// --- GERENCIADOR DE ÁUDIO INVISÍVEL ---

export default function App() {
  // Puxa as variáveis do Zustand
  const {
    role, isLoading, setRole, activeCampaignId, setActiveCampaignId,
    campaigns, locations, npcs, tracks, combatants, cutscenes, handouts, shops,
    activeScene, queuedTrackId, setQueuedTrackId, audioProgress, setAudioProgress,
    combatState, loadData, publishScene, deleteAsset, setModalState, updateCollection
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
    publishScene({ location: null, npc: null, hideNpcName: false, isMapMode: false, cutscene: null, handout: null, shop: null, audio: { trackId: null, loop: true, seekEvent: null }, ambient: { trackId: null, loop: true } });
    setQueuedTrackId(null);
  };

  // --- FUNÇÕES DE NOTAS SECRETAS ---
  const updateAssetNotes = async (collectionName, id, notes) => {
    const currentData = useRPGStore.getState()[collectionName] || [];
    const newData = currentData.map(item => item.id === id ? { ...item, secretNotes: notes } : item);
    updateCollection(collectionName, newData);
    await localDB.setItem(collectionName, newData);
  };

  // --- CONTROLES DE ÁUDIO DA TRILHA ---
  const handleVolumeChange = (e) => publishScene({ ...activeScene, audio: { ...activeScene.audio, volume: parseFloat(e.target.value) } });
  const toggleLoop = (e) => publishScene({ ...activeScene, audio: { ...activeScene.audio, loop: e.target.checked } });
  const stopAudio = () => { publishScene({ ...activeScene, audio: { ...activeScene.audio, trackId: null, seekEvent: null } }); setQueuedTrackId(null); };
  const executeTransition = () => { if (queuedTrackId) { publishScene({ ...activeScene, audio: { ...activeScene.audio, trackId: queuedTrackId, seekEvent: 0 } }); setQueuedTrackId(null); } };
  const handleSeekChange = (e) => setAudioProgress({ ...audioProgress, time: Number(e.target.value) });
  const handleSeekCommit = (e) => publishScene({ ...activeScene, audio: { ...activeScene.audio, seekEvent: Number(e.target.value) } });

  // --- CONTROLES DE SOM AMBIENTE ---
  const handleAmbientVolumeChange = (e) => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, volume: parseFloat(e.target.value) } });
  const toggleAmbientLoop = (e) => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, loop: e.target.checked } });
  const stopAmbient = () => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, trackId: null } });
  const playAmbient = (id) => publishScene({ ...activeScene, ambient: { ...activeScene.ambient, trackId: id } });

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

  const clearCombat = async () => {
    if(!window.confirm("Limpar toda a iniciativa atual?")) return;
    const filtered = combatants.filter(c => c.campaignId !== activeCampaignId);
    
    updateCollection('combatants', filtered); // Usa o Zustand!
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
    updateCollection('combatants', updatedCombatants); // Usa o Zustand!
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
                        const renderCharacterCard = (npc) => {
                          // Se este for o NPC ativo, mostra a imagem que está na cena (para o Mestre saber que expressão está na tela)
                          const isNpcActive = activeScene.npc?.id === npc.id;
                          const displayImage = isNpcActive ? activeScene.npc.fileData : npc.fileData;

                          return (
                            <div key={npc.id} className="relative group h-40">
                              {/* Card Principal - Clicar aqui reseta para a imagem principal (Default) */}
                              <div onClick={() => updateSceneElement('npc', { ...npc, fileData: npc.fileData })} className={`cursor-pointer rounded-xl border-2 overflow-hidden bg-slate-800 w-full h-full relative ${isNpcActive ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                                <img src={displayImage} alt={npc.name} className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-100 transition-all duration-300" />
                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-3 pt-6 pb-2">
                                  <h3 className="text-white text-sm font-bold truncate drop-shadow-md">{npc.name}</h3>
                                </div>
                              </div>
                              
                              {/* --- NOVO: Miniaturas de Variantes Visuais (Expressões) --- */}
                              {npc.variants && npc.variants.length > 1 && (
                                <div className="absolute bottom-1 right-2 flex gap-1 z-20">
                                  {npc.variants.map((vImg, idx) => (
                                    <div 
                                      key={idx}
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // Ao clicar na miniatura, atualiza a cena com esta imagem exata!
                                        updateSceneElement('npc', { ...npc, fileData: vImg }); 
                                      }}
                                      className={`w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden border-2 cursor-pointer transition-transform hover:scale-125 bg-slate-900 ${isNpcActive && activeScene.npc.fileData === vImg ? 'border-amber-500 scale-110 shadow-lg' : 'border-slate-400/50 hover:border-white'}`}
                                      title={`Expressão ${idx + 1}`}
                                    >
                                      <img src={vImg} className="w-full h-full object-cover object-top" alt="var" />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Botões Flutuantes (Adicionar Combate, Editar, Excluir) */}
                              <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
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
                        };

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
                <Eye className="w-4 h-4" /> Tela dos Jogadores
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
                   Abra uma nova aba neste navegador e selecione "Tela dos Jogadores" para que as suas alterações sejam sincronizadas de forma local e automática.
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