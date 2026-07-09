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
  const keys = ['campaigns', 'locations', 'npcs', 'tracks', 'rpg-active-scene', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops'];
  const backup = {};
  for (const key of keys) {
    backup[key] = await localDB.getItem(key) || [];
  }
  return backup;
};

export const importBackup = async (backupData) => {
  const keys = ['campaigns', 'locations', 'npcs', 'tracks', 'rpg-active-scene', 'combatants', 'combat-state', 'cutscenes', 'handouts', 'shops'];
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


