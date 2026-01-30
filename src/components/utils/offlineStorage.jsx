// IndexedDB setup for offline data storage
const DB_NAME = 'InterdistriOffline';
const DB_VERSION = 1;
const STORE_NAMES = {
  timeEntries: 'timeEntries',
  trips: 'trips',
  inspections: 'inspections',
  expenses: 'expenses',
  syncQueue: 'syncQueue'
};

let db = null;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create object stores
      Object.values(STORE_NAMES).forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      });
    };
  });
}

export async function saveOfflineData(storeName, data) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add({ ...data, timestamp: Date.now() });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getOfflineData(storeName) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function removeOfflineData(storeName, id) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function addToSyncQueue(action, data) {
  if (!db) await initDB();
  
  const queueItem = {
    action,
    data,
    timestamp: Date.now(),
    synced: false
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.syncQueue], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.syncQueue);
    const request = store.add(queueItem);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getSyncQueue() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.syncQueue], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.syncQueue);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.filter(item => !item.synced));
  });
}

export async function markAsSynced(queueId) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.syncQueue], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.syncQueue);
    const getRequest = store.get(queueId);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        const updateRequest = store.put(item);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function clearSyncQueue() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.syncQueue], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.syncQueue);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}