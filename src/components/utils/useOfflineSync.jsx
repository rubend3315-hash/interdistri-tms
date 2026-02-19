import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  initDB,
  getSyncQueue,
  markAsSynced,
  addToSyncQueue,
  addPendingUpdate,
  addPendingDelete,
  getPendingItems,
  removeOfflineData,
  STORE_NAMES
} from './offlineStorage';

// Map entity names to SDK entity accessors
const ENTITY_MAP = {
  TimeEntry: base44.entities.TimeEntry,
  Trip: base44.entities.Trip,
  VehicleInspection: base44.entities.VehicleInspection,
  Expense: base44.entities.Expense,
  StandplaatsWerk: base44.entities.StandplaatsWerk,
};

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'conflict'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize DB on mount
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  // Update pending count periodically
  const updatePendingCount = useCallback(async () => {
    const queue = await getSyncQueue();
    const updates = await getPendingItems(STORE_NAMES.pendingUpdates);
    const deletes = await getPendingItems(STORE_NAMES.pendingDeletes);
    setPendingCount(queue.length + updates.length + deletes.length);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueuedData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count on mount and periodically
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Sync queued data when online
  const syncQueuedData = async () => {
    if (!navigator.onLine) return;

    setSyncStatus('syncing');
    let hasErrors = false;

    try {
      // 1. Process deletes FIRST (highest priority)
      const pendingDeletes = await getPendingItems(STORE_NAMES.pendingDeletes);
      for (const item of pendingDeletes) {
        try {
          const entity = ENTITY_MAP[item.entityName];
          if (entity) {
            await entity.delete(item.recordId);
          }
          await removeOfflineData(STORE_NAMES.pendingDeletes, item.id);
        } catch (error) {
          console.error('Delete sync error:', item, error);
          hasErrors = true;
        }
      }

      // 2. Process updates (last write wins)
      const pendingUpdates = await getPendingItems(STORE_NAMES.pendingUpdates);
      for (const item of pendingUpdates) {
        try {
          const entity = ENTITY_MAP[item.entityName];
          if (entity) {
            await entity.update(item.recordId, item.data);
          }
          await removeOfflineData(STORE_NAMES.pendingUpdates, item.id);
        } catch (error) {
          console.error('Update sync error:', item, error);
          hasErrors = true;
        }
      }

      // 3. Process creates (sync queue)
      const queuedItems = await getSyncQueue();
      for (const item of queuedItems) {
        try {
          const { action, data } = item;

          switch (action) {
            case 'createTimeEntry':
              await base44.entities.TimeEntry.create(data);
              break;
            case 'createTrip':
              await base44.entities.Trip.create(data);
              break;
            case 'createInspection':
              await base44.entities.VehicleInspection.create(data);
              break;
            case 'createExpense':
              await base44.entities.Expense.create(data);
              break;
            case 'createStandplaatsWerk':
              await base44.entities.StandplaatsWerk.create(data);
              break;
          }

          await markAsSynced(item.id);
        } catch (error) {
          console.error('Create sync error:', item, error);
          hasErrors = true;
        }
      }

      // Update pending count
      await updatePendingCount();

      if (hasErrors) {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  return {
    isOnline,
    syncStatus,
    pendingCount,
    syncQueuedData,
    addToQueue: addToSyncQueue,
    addPendingUpdate,
    addPendingDelete
  };
}