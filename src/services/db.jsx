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

const urlCache = new WeakMap();
const blobKeyCache = new Map();

export const getAssetUrl = (fileData) => {
  if (!fileData) return null;
  // Compatibilidade com ficheiros antigos que já estavam salvos em Base64
  if (typeof fileData === 'string') return fileData; 
  
  if (fileData instanceof Blob || fileData instanceof File) {
    // Se já criamos uma URL para esta exata referência, reaproveita
    if (urlCache.has(fileData)) return urlCache.get(fileData);
    
    // Cache secundário por assinatura do Blob (tamanho, tipo, nome, timestamp)
    // Isso garante que mesmo que o Blob seja reconstruído via structuredClone/BroadcastChannel/IndexedDB, a URL será a mesma
    const cacheKey = `${fileData.size}_${fileData.type}_${fileData.name || ''}_${fileData.lastModified || 0}`;
    if (cacheKey && blobKeyCache.has(cacheKey)) {
      const cachedUrl = blobKeyCache.get(cacheKey);
      urlCache.set(fileData, cachedUrl);
      return cachedUrl;
    }

    // Cria um link temporário direto na memória RAM do navegador
    const url = URL.createObjectURL(fileData);
    urlCache.set(fileData, url);
    if (cacheKey) {
      blobKeyCache.set(cacheKey, url);
    }
    return url;
  }
  return null;
};

export const localDB = {
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

export const getAllDataForBackup = async (options = {}) => {
  const { includeAudioBlobs = false } = options;
  const keys = ['campaigns', 'locations', 'refuges', 'npcs', 'tracks', 'rpg-active-scene', 'conflicts', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops', 'pip-state', 'party-tracker-state', 'ui-state'];
  const backup = {};
  for (const key of keys) {
    const items = await localDB.getItem(key) || [];
    
    // Se for um array de itens, converte os Blobs temporariamente para Base64 para caber no JSON
    if (Array.isArray(items)) {
       backup[key] = await Promise.all(items.map(async (item) => {
          const processed = { ...item };
          
          // OTIMIZAÇÃO: Áudios pesados locais (Blob) não são embutidos no backup por padrão
          // Isso evita arquivos JSON gigantescos (50MB-200MB+) e travamentos no navegador.
          // Metadados da faixa e links/streams web (URLs em texto) são 100% preservados!
          if (key === 'tracks') {
            if (processed.fileData instanceof Blob) {
              if (includeAudioBlobs) {
                processed.fileData = await fileToDataUrl(processed.fileData);
              } else {
                processed.fileData = null;
                processed.hasLocalAudio = true;
              }
            }
            return processed;
          }

          if (processed.fileData instanceof Blob) processed.fileData = await fileToDataUrl(processed.fileData);
          if (processed.variants) {
             processed.variants = await Promise.all(processed.variants.map(v => v instanceof Blob ? fileToDataUrl(v) : v));
          }
          return processed;
       }));
    } else {
       backup[key] = items;
    }
  }
  return backup;
};

export const importBackup = async (backupData) => {
  const keys = ['campaigns', 'locations', 'refuges', 'npcs', 'tracks', 'rpg-active-scene', 'conflicts', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops', 'pip-state', 'party-tracker-state', 'ui-state'];
  for (const key of keys) {
    if (backupData[key]) {
      if (key === 'tracks') {
        const existingTracks = (await localDB.getItem('tracks')) || [];
        const existingMap = new Map(existingTracks.map(t => [t.id, t]));
        const mergedTracks = backupData.tracks.map(importedTrack => {
          // Se a faixa veio sem áudio binário (backup leve) mas já existia no banco local com áudio, preserva o arquivo local!
          if (!importedTrack.fileData && existingMap.has(importedTrack.id)) {
            const existing = existingMap.get(importedTrack.id);
            if (existing && existing.fileData) {
              return { ...importedTrack, fileData: existing.fileData };
            }
          }
          return importedTrack;
        });
        await localDB.setItem(key, mergedTracks);
      } else {
        await localDB.setItem(key, backupData[key]);
      }
    }
  }
};

export const generateId = () => crypto.randomUUID();

export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};