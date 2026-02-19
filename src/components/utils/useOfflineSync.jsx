import { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  initDB,
  getSyncQueue,
  markAsSynced,
  addToSyncQueue,
  updateSyncQueueItem,
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

const MAX_RETRIES = 3;

/**
 * Classify an error to determine retry strategy.
 * Returns: { retryable, permanent, code }
 */
function classifyError(error) {
  // Axios-style response error
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 409) {
      const errorCode = data?.error;
      // TIME_OVERLAP / DATE_OVERLAP = permanent failure (data conflicts with existing entry)
      if (errorCode === 'TIME_OVERLAP' || errorCode === 'DATE_OVERLAP') {
        return { retryable: false, permanent: true, code: errorCode, message: data?.message };
      }
      // CONCURRENT_SUBMIT = transient, retry later
      if (errorCode === 'CONCURRENT_SUBMIT') {
        return { retryable: true, permanent: false, code: errorCode };
      }
      // Default 409 = idempotent duplicate (submission_id already processed)
      return { retryable: false, permanent: false, alreadyDone: true, code: errorCode || 'DUPLICATE_SUBMISSION' };
    }
    if (status === 422) {
      // Validation error — data is wrong, retrying won't help
      return { retryable: false, permanent: true, code: 'VALIDATION_ERROR', message: data?.message };
    }
    if (status === 401 || status === 403) {
      // Auth expired — retrying later when session is refreshed might help
      return { retryable: true, permanent: false, code: 'UNAUTHORIZED' };
    }
    if (status >= 500) {
      // Server error — transient, retry
      return { retryable: true, permanent: false, code: 'SERVER_ERROR' };
    }
    // Other 4xx — permanent
    return { retryable: false, permanent: true, code: data?.error || `HTTP_${status}` };
  }

  // No response = network error — transient, retry
  return { retryable: true, permanent: false, code: 'NETWORK_ERROR' };
}

/**
 * Process a single sync queue item.
 * Returns: { success, alreadyDone, permanent, retryable, code, message }
 */
async function processSyncItem(item) {
  const { action, data } = item;

  try {
    if (action === 'submitTimeEntry') {
      // Atomic backend function call — submission_id in payload ensures idempotency
      const response = await base44.functions.invoke('submitTimeEntry', data);
      const result = response.data;

      if (result.success) {
        return { success: true };
      }
      // Backend returned success:false in body (not HTTP error)
      if (result.error === 'DUPLICATE_SUBMISSION' || result.error === 'OVERLAP_DETECTED') {
        return { success: false, alreadyDone: true, code: result.error };
      }
      if (result.error === 'VALIDATION_ERROR') {
        return { success: false, permanent: true, code: 'VALIDATION_ERROR', message: result.message };
      }
      return { success: false, retryable: true, code: result.error || 'UNKNOWN' };
    }

    // Legacy entity-based actions
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
      default:
        console.warn('Unknown sync action:', action);
        return { success: false, permanent: true, code: 'UNKNOWN_ACTION' };
    }

    return { success: true };

  } catch (error) {
    const classification = classifyError(error);
    return { success: false, ...classification };
  }
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'partial'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const syncLockRef = useRef(false);

  // Initialize DB on mount
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      const retryable = queue.filter(i => !i.permanentFailure);
      const updates = await getPendingItems(STORE_NAMES.pendingUpdates);
      const deletes = await getPendingItems(STORE_NAMES.pendingDeletes);
      setPendingCount(retryable.length + updates.length + deletes.length);
    } catch { /* DB not ready yet */ }
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

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Core sync logic
  const syncQueuedData = async () => {
    if (!navigator.onLine) return;
    if (syncLockRef.current) return; // prevent concurrent syncs
    syncLockRef.current = true;

    setSyncStatus('syncing');
    let successCount = 0;
    let errorCount = 0;
    let permanentFailCount = 0;

    try {
      // 1. Process deletes FIRST
      const pendingDeletes = await getPendingItems(STORE_NAMES.pendingDeletes);
      for (const item of pendingDeletes) {
        if (!navigator.onLine) break; // stop if we went offline mid-sync
        try {
          const entity = ENTITY_MAP[item.entityName];
          if (entity) {
            await entity.delete(item.recordId);
          }
          await removeOfflineData(STORE_NAMES.pendingDeletes, item.id);
          successCount++;
        } catch (error) {
          console.error('Delete sync error:', item, error);
          errorCount++;
        }
      }

      // 2. Process updates
      const pendingUpdates = await getPendingItems(STORE_NAMES.pendingUpdates);
      for (const item of pendingUpdates) {
        if (!navigator.onLine) break;
        try {
          const entity = ENTITY_MAP[item.entityName];
          if (entity) {
            await entity.update(item.recordId, item.data);
          }
          await removeOfflineData(STORE_NAMES.pendingUpdates, item.id);
          successCount++;
        } catch (error) {
          console.error('Update sync error:', item, error);
          errorCount++;
        }
      }

      // 3. Process sync queue (creates + submitTimeEntry)
      const queuedItems = await getSyncQueue();
      // Filter out permanently failed items
      const retryableItems = queuedItems.filter(i => !i.permanentFailure);

      for (const item of retryableItems) {
        if (!navigator.onLine) break;

        const result = await processSyncItem(item);

        if (result.success || result.alreadyDone) {
          // Success or idempotent duplicate — mark done
          await markAsSynced(item.id);
          successCount++;

          if (result.alreadyDone) {
            console.info(`Sync item ${item.id} (${item.action}): already processed (${result.code}), marked as synced.`);
          }
        } else if (result.permanent) {
          // Permanent failure — stop retrying, mark as failed
          await updateSyncQueueItem(item.id, {
            permanentFailure: true,
            lastError: result.code + (result.message ? `: ${result.message}` : ''),
            retryCount: (item.retryCount || 0) + 1,
          });
          permanentFailCount++;
          console.error(`Sync item ${item.id} (${item.action}): permanent failure — ${result.code}`);
        } else if (result.retryable) {
          const newRetryCount = (item.retryCount || 0) + 1;
          if (newRetryCount >= MAX_RETRIES) {
            // Exceeded max retries — mark as permanent failure
            await updateSyncQueueItem(item.id, {
              permanentFailure: true,
              lastError: `Max retries exceeded: ${result.code}`,
              retryCount: newRetryCount,
            });
            permanentFailCount++;
            console.error(`Sync item ${item.id} (${item.action}): max retries exceeded.`);
          } else {
            // Bump retry count, will be retried next sync cycle
            await updateSyncQueueItem(item.id, {
              retryCount: newRetryCount,
              lastError: result.code,
            });
            errorCount++;
          }
        }
      }

      // Update pending count
      await updatePendingCount();

      // Determine final status
      if (errorCount > 0 && successCount === 0) {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else if (errorCount > 0 && successCount > 0) {
        setSyncStatus('error');
        toast.warning(`${successCount} gesynchroniseerd, ${errorCount} mislukt — wordt opnieuw geprobeerd.`);
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else if (permanentFailCount > 0 && successCount === 0 && errorCount === 0) {
        setSyncStatus('error');
        toast.error(`${permanentFailCount} item(s) kon niet worden gesynchroniseerd. Controleer je invoer.`);
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else if (successCount > 0) {
        setSyncStatus('synced');
        if (successCount > 0) {
          toast.success(`${successCount} offline wijziging${successCount > 1 ? 'en' : ''} gesynchroniseerd.`);
        }
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        // Nothing to sync
        setSyncStatus('idle');
      }

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      syncLockRef.current = false;
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