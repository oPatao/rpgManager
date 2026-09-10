import React from 'react';
import { getAssetUrl } from '../services/db';

export const SceneRenderer = ({ activeScene }) => {
  if (!activeScene) {
    return (
      <div className="w-full h-full min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        Nenhum cenário ativo selecionado.
      </div>
    );
  }

  // 1. Cutscene prioridade máxima
  if (activeScene.cutscene?.fileData) {
    const isVideo = activeScene.cutscene.fileType?.startsWith('video/') || activeScene.cutscene.name?.match(/\.(mp4|webm|ogg)$/i);
    const assetUrl = getAssetUrl(activeScene.cutscene.fileData);

    return (
      <div className="relative w-full h-full min-h-screen bg-black flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            src={assetUrl}
            autoPlay
            loop
            muted={false}
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={assetUrl}
            alt={activeScene.cutscene.name || 'Cutscene'}
            className="w-full h-full object-contain"
          />
        )}
        <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white font-medium text-sm">
          {activeScene.cutscene.name}
        </div>
      </div>
    );
  }

  // 2. Handout aberto
  if (activeScene.handout?.fileData) {
    const assetUrl = getAssetUrl(activeScene.handout.fileData);
    return (
      <div className="relative w-full h-full min-h-screen bg-black/90 flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl max-h-[85vh] bg-slate-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <img
            src={assetUrl}
            alt={activeScene.handout.name}
            className="w-full max-h-[70vh] object-contain bg-black"
          />
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            <h3 className="text-amber-400 font-bold text-lg">{activeScene.handout.name}</h3>
            {activeScene.handout.desc && (
              <p className="text-slate-300 text-sm mt-1">{activeScene.handout.desc}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Cenário normal (Location ou Refuge)
  const bgData = activeScene.location?.fileData || activeScene.location?.image || activeScene.refuge?.fileData;
  const bgUrl = bgData ? getAssetUrl(bgData) : null;

  // Lista de NPCs na cena (suporta array npcs ou npc individual)
  const npcsToRender = activeScene.npcs?.length
    ? activeScene.npcs.filter(n => !n.isHidden)
    : activeScene.npc
    ? [activeScene.npc]
    : [];

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 overflow-hidden flex items-end justify-center select-none">
      {/* Imagem de Fundo / Cenário */}
      {bgUrl ? (
        <img
          src={bgUrl}
          alt={activeScene.location?.name || activeScene.refuge?.name || 'Cenário'}
          className={`absolute inset-0 w-full h-full transition-all duration-700 ${
            activeScene.isMapMode ? 'object-contain bg-black' : 'object-cover'
          }`}
        />
      ) : (
        <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black" />
      )}

      {/* Gradiente de sobreposição para contraste */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

      {/* NPCs na Cena */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pb-8 flex items-end justify-center gap-6 flex-wrap pointer-events-none">
        {npcsToRender.map((npc, idx) => {
          const variantImg = npc.variants && typeof npc.variantIndex === 'number' && npc.variants[npc.variantIndex]
            ? npc.variants[npc.variantIndex]
            : npc.fileData;
          const npcUrl = getAssetUrl(variantImg);

          return (
            <div
              key={npc.id || idx}
              className={`flex flex-col items-center max-w-[320px] transition-all duration-500 pointer-events-auto ${
                npc.isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              {npcUrl ? (
                <div className="relative group">
                  <img
                    src={npcUrl}
                    alt={npc.name}
                    className="max-h-[60vh] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] filter brightness-95"
                  />
                </div>
              ) : null}

              {/* Tag com Nome e Função */}
              {!activeScene.hideNpcName && !npc.hideName && (
                <div className="mt-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl text-center max-w-[260px]">
                  <h4 className="text-white font-bold text-sm tracking-wide">{npc.name}</h4>
                  {npc.role && (
                    <span className="text-amber-400 text-xs font-medium block mt-0.5">
                      {npc.role}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Título do Cenário / Refúgio no topo */}
      {(activeScene.location?.name || activeScene.refuge?.name) && (
        <div className="absolute top-6 left-6 z-20 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl shadow-lg pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold block">
            {activeScene.location ? 'Localização' : 'Refúgio'}
          </span>
          <h2 className="text-white font-semibold text-base">
            {activeScene.location?.name || activeScene.refuge?.name}
          </h2>
        </div>
      )}
    </div>
  );
};
