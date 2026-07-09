// src/components/SceneRenderer.jsx
import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { getAssetUrl } from '../services/db';

export const SceneRenderer = ({ isPreview = false, activeScene }) => {
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
               backgroundImage: `url(${getAssetUrl(activeScene.location.fileData)})`,
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
             <img src={getAssetUrl(activeScene.npc.fileData)} alt="Vendor" className="w-full h-[90%] object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
          </div>

          {/* Lado Direito: Quadro da Loja */}
          <div className="relative h-[85%] w-[55%] bg-[#1a1412]/95 border-4 border-[#5c3a21] rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto overflow-hidden animate-fade-in-up">
             
             {/* SE A LOJA TIVER IMAGEM, MOSTRA COMO BANNER NO TOPO */}
             {activeScene.shop.fileData ? (
               <div className="w-full h-32 md:h-48 relative border-b-4 border-[#4a2e1b] shrink-0">
                  <img src={getAssetUrl(activeScene.shop.fileData)} className="w-full h-full object-cover opacity-80" alt={activeScene.shop.name} />
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
          <div className={`absolute bottom-0 left-[0%] md:left-[2%] h-[85%] w-[65%] md:w-[55%] flex items-end justify-center pointer-events-none ${isPreview ? 'animate-none' : 'animate-fade-in-up'}`}>
            <img src={getAssetUrl(activeScene.npc.fileData)} alt="NPC" className="w-full h-full object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
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
              <img src={getAssetUrl(activeScene.handout.fileData)} alt={activeScene.handout.name} className="max-h-[50vh] object-contain drop-shadow-2xl rounded-lg" />
              
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

      {/* 4. PLAYER DE CUTSCENE */}
      {activeScene.cutscene && (
        <video 
          src={getAssetUrl(activeScene.cutscene.fileData)} 
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