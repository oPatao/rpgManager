import localforage from 'localforage';

export const localDB = localforage.createInstance({
  name: 'rpg-manager-db',
  storeName: 'rpg_store'
});

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getAssetUrl = (fileData) => {
  if (!fileData) return '';
  if (typeof fileData === 'string') return fileData;
  if (fileData instanceof Blob || fileData instanceof File) {
    return URL.createObjectURL(fileData);
  }
  return '';
};

const DB_KEYS = [
  'campaigns',
  'locations',
  'refuges',
  'npcs',
  'tracks',
  'combatants',
  'combat-state',
  'cutscenes',
  'handouts',
  'shops',
  'conflicts',
  'pip-state',
  'party-tracker-state',
  'ui-state',
  'rpg-active-scene'
];

export const getAllDataForBackup = async () => {
  const backup = {};
  for (const key of DB_KEYS) {
    const val = await localDB.getItem(key);
    if (val !== null && val !== undefined) {
      backup[key] = val;
    }
  }
  return backup;
};

export const importBackup = async (content) => {
  if (!content || typeof content !== 'object') return;
  for (const [key, value] of Object.entries(content)) {
    await localDB.setItem(key, value);
  }
};
