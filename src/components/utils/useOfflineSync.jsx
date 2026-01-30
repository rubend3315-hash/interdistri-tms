import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  initDB,
  getSyncQueue,
  markAsSynced,
  addToSyncQueue
} from './offlineStorage';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Initialize DB on mount
  useEffect(() => {
    initDB().catch(console.error);
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queued data when online
  const syncQueuedData = async () => {
    if (!isOnline) return;

    setSyncStatus('syncing');
    try {
      const queuedItems = await getSyncQueue();

      for (const item of queuedItems) {
        try {
          const { action, data } = item;

          // Execute action based on type
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
          }

          // Mark as synced
          await markAsSynced(item.id);
        } catch (error) {
          console.error('Sync error for item:', item, error);
          // Continue with next item if one fails
        }
      }

      setSyncStatus('synced');
      // Reset status after 2 seconds
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  return {
    isOnline,
    syncStatus,
    syncQueuedData,
    addToQueue: addToSyncQueue
  };
}