import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { useRPGStore } from '../store/useRPGStore';
import { useAssetUrl } from '../hooks/useAssetUrl';

const SINGLE_NPC_POSITION = { left: '50%', width: '28%' };

const NPC_POSITIONS = {
  1: { left: '37.5%', width: '25%' },   // centro-esquerda
  2: { left: '62.5%', width: '25%' },  // centro-direita
  3: { left: '12.5%', width: '25%' },  // longe-esquerda
  4: { left: '87.5%', width: '25%' },  // longe-direita
};

const INDEX_TO_POSITION = [1, 2, 3, 4];

const NPCRender = React.memo(({ npc, position, globalHideName, showBadge = true, isPreview = false, onNPCClick }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const isFadingOut = npc.isFadingOut;
  const isHidden = npc.isHidden;

  let opacity = 1;
  if (isFadingOut || !mounted) {
    opacity = 0;
  } else if (isHidden) {
    opacity = 0.75;
  }

  const currentAsset = (npc.variants && npc.variants[npc.variantIndex]) 
    ? npc.variants[npc.variantIndex] 
    : npc.fileData;
  const avatarUrl = useAssetUrl(currentAsset);

  const shouldHideName = globalHideName || npc.hideName;

  return (
    <div
      className={`absolute bottom-0 h-[85%] flex flex-col items-center justify-end transition-all duration-500 ease-in-out -translate-x-1/2 z-20 ${
        isPreview ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
      } ${isHidden ? 'border border-white/10 rounded-xl' : ''}`}
      style={{
        left: position.left,
        width: position.width,
        opacity: opacity,
      }}
      onClick={(e) => onNPCClick && onNPCClick(npc.id, e)}
    >
      <div className="relative w-full h-full flex items-end justify-center">
        <img
          src={avatarUrl}
          className={`w-full h-full object-contain object-bottom transition-all duration-500 ${
            isHidden ? 'silhouette' : 'drop-shadow-[0_0_30px_rgba(0,0,0,0.9)]'
          }`}
          style={{
            filter: isHidden ? 'brightness(0) contrast(1)' : 'none',
          }}
          alt={npc.name}
        />
        {!isHidden && showBadge && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-xl border border-amber-500/50 shadow-2xl max-w-[90%] text-center z-20">
            <span className="text-white text-xl md:text-3xl font-serif font-bold text-center block truncate drop-shadow-md">
              {shouldHideName ? '????' : npc.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

const SceneRendererComponent = ({ isPreview = false, activeScene }) => {
  const showMap = activeScene.isMapMode;
  const shop = activeScene.shop;
  const locations = useRPGStore(state => state.locations);
  const refuges = useRPGStore(state => state.refuges);
  const npcs = useRPGStore(state => state.npcs);
  const role = useRPGStore(state => state.role);
  const setSheetModalState = useRPGStore(state => state.setSheetModalState);

  // 1. UNIFICAÇÃO DO BACKGROUND (Locação ou Refúgio) com busca na Store para estabilidade total
  const currentLoc = activeScene.location?.id
    ? locations.find(l => l.id === activeScene.location.id) || activeScene.location
    : activeScene.location;

  const currentRefugeLoc = activeScene.refuge?.locationId
    ? locations.find(l => l.id === activeScene.refuge.locationId)
    : null;

  const currentRefuge = activeScene.refuge?.id
    ? refuges.find(r => r.id === activeScene.refuge.id) || activeScene.refuge
    : activeScene.refuge;

  const bgAsset = currentRefuge
    ? (currentRefugeLoc?.fileData || currentRefugeLoc?.image || currentRefuge.fileData || currentRefuge.image)
    : (currentLoc?.fileData || currentLoc?.image);

  const bgUrl = useAssetUrl(bgAsset);

  // 2. UNIFICAÇÃO DOS NPCS (Busca estável na store de NPCs)
  const rawSceneNPCs = activeScene.refuge
    ? (Array.isArray(activeScene.refugeNpcs) ? activeScene.refugeNpcs : [])
    : (Array.isArray(activeScene.npcs) && activeScene.npcs.length > 0
      ? activeScene.npcs
      : (activeScene.npc
        ? [{
            id: activeScene.npc.id,
            name: activeScene.npc.name,
            role: activeScene.npc.role || '',
            desc: activeScene.npc.desc || '',
            fileData: activeScene.npc.fileData,
            variants: activeScene.npc.variants || [],
            variantIndex: activeScene.npc.variantIndex || 0,
            hideName: activeScene.hideNpcName || activeScene.npc.hideName || false,
            isHidden: activeScene.npc.isHidden || false,
            isFadingOut: false
          }]
        : []));

  const activeNPCs = rawSceneNPCs.map(sceneNpc => {
    const storeNpc = npcs.find(n => n.id === sceneNpc.id);
    if (!storeNpc) return sceneNpc;
    return {
      ...storeNpc,
      ...sceneNpc,
      fileData: sceneNpc.fileData || storeNpc.fileData,
      variants: sceneNpc.variants || storeNpc.variants
    };
  });

  const npcName = activeScene.hideNpcName 
    ? "????" 
    : (activeNPCs[0]?.name || activeScene.npc?.name || "");

  // Handout, Cutscene & Shop Assets memoizados via useAssetUrl
  const handoutUrl = useAssetUrl(activeScene.handout?.fileData);
  const cutsceneUrl = useAssetUrl(activeScene.cutscene?.fileData);
  const shopUrl = useAssetUrl(activeScene.shop?.fileData);
  const vendorAsset = activeNPCs[0]?.variants?.[activeNPCs[0].variantIndex] || activeNPCs[0]?.fileData;
  const vendorUrl = useAssetUrl(vendorAsset);

  // Manipulador de clique nos NPCs para abrir a ficha
  const handleNPCClick = (npcId, e) => {
    if (e) e.stopPropagation();
    if (isPreview) return;
    if (role === 'master' && npcId) {
      setSheetModalState({ isOpen: true, npcId });
    }
  };

  // Lógica de Paginação Automática da Loja
  const [shopPage, setShopPage] = useState(0);
  useEffect(() => {
    if (!shop || !shop.items || shop.items.length <= 10) return;
    const totalPages = Math.ceil(shop.items.length / 10);
    const interval = setInterval(() => {
      setShopPage(prev => (prev + 1) % totalPages);
    }, 15000);
    return () => clearInterval(interval);
  }, [shop]);

  useEffect(() => {
    setShopPage(0);
  }, [shop?.id]);

  const moralLabels = ['Amotinada', 'Desiludida', 'Hesitante', 'Resoluta', 'Animada', 'Empenhada', 'Exaltada'];
  const defenseLabels = ['Nenhuma', 'Linhas e sinos', 'Arame farpado', 'Muro de madeira', 'Muro de pedra ou tijolo', 'Complexo prisional', 'Base militar'];
  const warLabels = ['Pacifista', 'Mínima', 'Razoável', 'Eficiente', 'Ameaçadora', 'Terrível', 'Arrasadora'];

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-black">
      
      {/* 1. IMAGEM DE FUNDO UNIFICADA (LOCAÇÃO OU REFÚGIO) - USANDO ELEMENTO <img> DIRETO EM VEZ DE STYLED BACKGROUND-IMAGE */}
      {bgUrl ? (
        <img 
          src={bgUrl}
          alt="Fundo da Cena"
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out pointer-events-none ${
            showMap ? 'object-contain' : 'object-cover'
          }`}
          style={{ 
            filter: (activeNPCs.length > 0 && !showMap) ? 'brightness(0.5) blur(2px)' : 'brightness(1)' 
          }}
        />
      ) : activeScene.refuge ? (
        <img 
          src="/refugio-padrao.jpg" 
          alt="Refúgio Padrão" 
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out pointer-events-none"
        />
      ) : null}

      {/* GRADIENTE OVERLAY QUANDO REFÚGIO ESTÁ ATIVO */}
      {activeScene.refuge && (
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/30 to-black/80 pointer-events-none" />
      )}

      {/* --- HUD DO REFÚGIO (OVERLAY DE ESTATÍSTICAS) --- */}
      {activeScene.refuge && activeScene.refuge.stats && (
        <div className="absolute top-0 left-0 w-full p-6 md:p-8 z-30 flex flex-col gap-4 animate-fade-in-up pointer-events-none">
          {/* Header: Nome e Níveis Básicos */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-[#8b5a2b]/50 pb-4">
            <div>
              <h1 className="text-[#e2b879] text-4xl md:text-5xl font-serif font-bold uppercase tracking-widest drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
                {activeScene.refuge.name}
              </h1>
              <div className="flex gap-6 mt-2">
                <span className="text-slate-300 font-bold tracking-wider text-sm md:text-base">NÍVEL: <span className="text-white text-lg">{activeScene.refuge.level}</span></span>
                <span className="text-slate-300 font-bold tracking-wider text-sm md:text-base">POPULAÇÃO: <span className="text-white text-lg">{activeScene.refuge.population}</span></span>
                <span className="text-slate-300 font-bold tracking-wider text-sm md:text-base">CONSTRUÇÕES: <span className="text-white text-lg">{activeScene.refuge.structures}</span></span>
              </div>
            </div>

            {/* Tags Categóricas */}
            <div className="flex gap-3 mt-4 md:mt-0">
              <div className="bg-amber-950/60 border border-amber-700/50 px-4 py-1.5 rounded backdrop-blur-md flex flex-col items-center">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Moral</span>
                <span className="text-amber-100 font-serif font-bold md:text-lg">{moralLabels[activeScene.refuge.stats.moral] || 'Desconhecida'}</span>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/50 px-4 py-1.5 rounded backdrop-blur-md flex flex-col items-center">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Defesa</span>
                <span className="text-blue-100 font-serif font-bold md:text-lg">{defenseLabels[activeScene.refuge.stats.defesa] || 'Nenhuma'}</span>
              </div>
              <div className="bg-red-950/60 border border-red-700/50 px-4 py-1.5 rounded backdrop-blur-md flex flex-col items-center">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Beligerância</span>
                <span className="text-red-100 font-serif font-bold md:text-lg">{warLabels[activeScene.refuge.stats.beligerancia] || 'Pacifista'}</span>
              </div>
            </div>
          </div>

          {/* Grid de Recursos */}
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 mt-2">
            {[
              { k: 'agua', n: 'Água' }, { k: 'plantas', n: 'Plantas' }, { k: 'animais', n: 'Animais' }, { k: 'madeira', n: 'Madeira' },
              { k: 'minerais', n: 'Minerais' }, { k: 'biomassa', n: 'Biomassa' }, { k: 'alimento', n: 'Alimento' }, { k: 'vestuario', n: 'Vestuário' },
              { k: 'municao', n: 'Munição' }, { k: 'combustivel', n: 'Combustível' }, { k: 'medicamento', n: 'Medicamento' }, { k: 'material', n: 'Material' }
            ].map(res => {
              const data = activeScene.refuge.stats.resources?.[res.k] || { cur: 0, max: 0 };
              const percentage = data.max > 0 ? (data.cur / data.max) * 100 : 0;
              const isLow = percentage < 20;

              return (
                <div key={res.k} className="bg-black/60 border border-white/10 rounded overflow-hidden backdrop-blur-sm flex flex-col relative">
                  <div className={`absolute bottom-0 left-0 w-full h-1 ${isLow ? 'bg-red-600' : 'bg-[#a67c52]'} transition-all`} style={{ width: `${percentage}%` }} />
                  <div className="p-2 flex flex-col z-10">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{res.n}</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-sm md:text-base font-bold ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>{data.cur}</span>
                      <span className="text-[10px] text-slate-500">/{data.max}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 2. LOJA E VENDEDOR */}
      {!showMap && activeScene.shop && activeNPCs.length > 0 && (
        <div className="absolute inset-0 z-[70] flex items-end justify-between p-8 md:p-16 pointer-events-none">
          <div className="relative h-[85%] w-[40%] flex flex-col items-center justify-end animate-fade-in-up">
             <div className="absolute top-0 bg-[#2c1810]/90 border-2 border-[#8b5a2b] px-8 py-3 rounded shadow-[0_4px_15px_rgba(0,0,0,0.6)] backdrop-blur-md">
                <h2 className="text-[#e2b879] text-2xl font-serif font-bold tracking-widest uppercase">{npcName}</h2>
             </div>
             {vendorUrl && (
               <img src={vendorUrl} alt="Vendor" className="w-full h-[90%] object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
             )}
          </div>

          <div className="relative h-[85%] w-[55%] bg-[#1a1412]/95 border-4 border-[#5c3a21] rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto overflow-hidden animate-fade-in-up">
             {shopUrl ? (
               <div className="w-full h-32 md:h-48 relative border-b-4 border-[#4a2e1b] shrink-0">
                  <img src={shopUrl} className="w-full h-full object-cover opacity-80" alt={activeScene.shop.name} />
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
                {(activeScene.shop.items || []).slice(shopPage * 10, (shopPage + 1) * 10).map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-[#241a17]/50 hover:bg-[#362722] p-3 rounded border-b border-[#3d2616] transition-colors">
                      <span className="text-slate-200 font-medium text-lg md:text-xl">{item.name}</span>
                      <span className="text-[#e2b879] font-bold text-lg md:text-xl">{item.price}</span>
                   </div>
                ))}
             </div>

             {activeScene.shop.items?.length > 10 && (
                <div className="bg-[#120e0c]/90 p-3 flex justify-center items-center gap-3 border-t-2 border-[#4a2e1b] shrink-0">
                   {Array.from({ length: Math.ceil(activeScene.shop.items.length / 10) }).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === shopPage ? 'bg-[#e2b879] shadow-[0_0_10px_rgba(226,184,121,0.8)]' : 'bg-[#3d2616]'}`} />
                   ))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* 3. RENDERIZA MÚLTIPLOS NPCS (SISTEMA UNIFICADO DE NPCS) */}
      {!showMap && !activeScene.shop && !activeScene.cutscene && !activeScene.handout && activeNPCs.length > 0 && (() => {
        const visibleNPCs = activeNPCs.filter(n => !n.isFadingOut);
        const isSingleNPC = visibleNPCs.length === 1;

        return (
          <>
            {activeNPCs.map((npc, index) => {
              const posKey = INDEX_TO_POSITION[index] || 1;
              const position = isSingleNPC ? SINGLE_NPC_POSITION : NPC_POSITIONS[posKey];
              return (
                <NPCRender
                  key={npc.id}
                  npc={npc}
                  position={position}
                  globalHideName={activeScene.hideNpcName}
                  showBadge={!isSingleNPC}
                  isPreview={isPreview}
                  onNPCClick={handleNPCClick}
                />
              );
            })}

            {/* Placa clássica em destaque se houver apenas 1 NPC na cena */}
            {isSingleNPC && (() => {
              const singleNpc = visibleNPCs[0];
              const shouldHideSingleName = activeScene.hideNpcName || singleNpc.hideName;
              const singleName = shouldHideSingleName ? "????" : singleNpc.name;

              return (
                <div className="absolute bottom-12 right-[5%] w-[45%] z-20 pointer-events-none animate-fade-in-up">
                  <div 
                    className={`bg-gradient-to-r from-black/90 to-slate-900/90 backdrop-blur-md border-t-4 border-l-4 border-amber-600 rounded-tr-3xl p-6 md:p-8 shadow-2xl ${
                      isPreview ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
                    }`}
                    onClick={(e) => handleNPCClick(singleNpc.id, e)}
                  >
                    <h2 className="text-amber-500 text-4xl md:text-6xl font-serif font-bold tracking-wider mb-2 drop-shadow-lg">
                      {singleName}
                    </h2>
                    {!shouldHideSingleName && singleNpc.role && (
                      <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-4">
                        {singleNpc.role}
                      </p>
                    )}
                    {singleNpc.desc && (
                      <p className="text-slate-200 text-lg md:text-xl leading-relaxed italic border-l-2 border-slate-700 pl-4">
                        "{singleNpc.desc}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        );
      })()}

      {/* 4. HANDOUT (EXIBIÇÃO DE ITENS/DOCUMENTOS) */}
      {activeScene.handout && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-8 animate-fade-in-up pointer-events-none">
           <div className="max-w-3xl max-h-full flex flex-col items-center gap-6 p-6 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.15)] pointer-events-auto">
              {handoutUrl && (
                <img src={handoutUrl} alt={activeScene.handout.name} className="max-h-[50vh] object-contain drop-shadow-2xl rounded-lg" />
              )}
              
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

      {/* 5. PLAYER DE CUTSCENE */}
      {activeScene.cutscene && cutsceneUrl && (
        <video 
          src={cutsceneUrl} 
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

export const SceneRenderer = React.memo(
  SceneRendererComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.isPreview === nextProps.isPreview &&
      prevProps.activeScene === nextProps.activeScene
    );
  }
);
