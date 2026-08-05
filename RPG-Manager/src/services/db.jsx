// src/services/db.js
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

export const getAssetUrl = (fileData) => {
  if (!fileData) return null;
  // Compatibilidade com ficheiros antigos que já estavam salvos em Base64
  if (typeof fileData === 'string') return fileData; 
  
  if (fileData instanceof Blob || fileData instanceof File) {
    // Se já criamos uma URL para este arquivo, reaproveita
    if (urlCache.has(fileData)) return urlCache.get(fileData);
    
    // Cria um link temporário direto na memória RAM do navegador
    const url = URL.createObjectURL(fileData);
    urlCache.set(fileData, url);
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

export const getAllDataForBackup = async () => {
  const keys = ['campaigns', 'locations', 'refuges', 'npcs', 'tracks', 'rpg-active-scene', 'conflicts', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops', 'pip-state', 'party-tracker-state', 'ui-state'];
  const backup = {};
  for (const key of keys) {
    const items = await localDB.getItem(key) || [];
    
    // Se for um array de itens, converte os Blobs temporariamente para Base64 para caber no JSON
    if (Array.isArray(items)) {
       backup[key] = await Promise.all(items.map(async (item) => {
          const processed = { ...item };
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
      await localDB.setItem(key, backupData[key]);
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


