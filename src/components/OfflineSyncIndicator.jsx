import React from 'react';
import { Wifi, WifiOff, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function OfflineSyncIndicator({ isOnline, syncStatus }) {
  if (isOnline && syncStatus === 'idle') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOnline ? (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline - Gegevens worden opgeslagen</span>
        </div>
      ) : syncStatus === 'syncing' ? (
        <div className="bg-blue-500 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Synchroniseren...</span>
        </div>
      ) : syncStatus === 'synced' ? (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Gegevens gesynchroniseerd</span>
        </div>
      ) : syncStatus === 'error' ? (
        <div className="bg-red-500 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Synchronisatie mislukt</span>
        </div>
      ) : null}
    </div>
  );
}