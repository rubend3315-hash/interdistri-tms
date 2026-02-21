// IndexedDB setup for offline data storage
const DB_NAME = 'InterdistriOffline';
const DB_VERSION = 2;
const STORE_NAMES = {
  timeEntries: 'timeEntries',
  trips: 'trips',
  inspections: 'inspections',
  expenses: 'expenses',
  syncQueue: 'syncQueue',
  pendingUpdates: 'pendingUpdates',
  pendingDeletes: 'pendingDeletes'
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
    synced: false,
    retryCount: 0,
    lastError: null,
    permanentFailure: false,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.syncQueue], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.syncQueue);
    const request = store.add(queueItem);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Update a queue item (e.g. increment retryCount, set lastError)
export async function updateSyncQueueItem(queueId, updates) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.syncQueue], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.syncQueue);
    const getRequest = store.get(queueId);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        Object.assign(item, updates);
        const putRequest = store.put(item);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Add a pending update (last write wins - overwrites previous pending update for same entity+recordId)
export async function addPendingUpdate(entityName, recordId, data) {
  if (!db) await initDB();

  const item = {
    entityName,
    recordId,
    data,
    timestamp: Date.now()
  };

  // Check if there's already a pending update for this record
  const existing = await getPendingItems(STORE_NAMES.pendingUpdates);
  const existingItem = existing.find(e => e.entityName === entityName && e.recordId === recordId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.pendingUpdates], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.pendingUpdates);

    if (existingItem) {
      // Last write wins: overwrite previous pending update
      const updated = { ...existingItem, data, timestamp: Date.now() };
      const request = store.put(updated);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    } else {
      const request = store.add(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    }
  });
}

// Add a pending delete
export async function addPendingDelete(entityName, recordId) {
  if (!db) await initDB();

  // Also remove any pending updates for this record (delete takes priority)
  const pendingUpdates = await getPendingItems(STORE_NAMES.pendingUpdates);
  const matchingUpdate = pendingUpdates.find(e => e.entityName === entityName && e.recordId === recordId);
  if (matchingUpdate) {
    await removeOfflineData(STORE_NAMES.pendingUpdates, matchingUpdate.id);
  }

  // Check if already queued for deletion
  const pendingDeletes = await getPendingItems(STORE_NAMES.pendingDeletes);
  const alreadyQueued = pendingDeletes.find(e => e.entityName === entityName && e.recordId === recordId);
  if (alreadyQueued) return alreadyQueued.id;

  const item = {
    entityName,
    recordId,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAMES.pendingDeletes], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.pendingDeletes);
    const request = store.add(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Get all pending items from a store
export async function getPendingItems(storeName) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
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

export { STORE_NAMES };