import React from 'react';
import { Wifi, WifiOff, Loader, CheckCircle, AlertCircle, CloudOff } from 'lucide-react';

export default function OfflineSyncIndicator({ isOnline, syncStatus, pendingCount = 0 }) {
  if (isOnline && syncStatus === 'idle' && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOnline ? (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            Offline{pendingCount > 0 ? ` - ${pendingCount} wijziging${pendingCount > 1 ? 'en' : ''} wachtend` : ' - Gegevens worden lokaal opgeslagen'}
          </span>
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
          <span className="text-sm font-medium">Synchronisatie mislukt - wordt opnieuw geprobeerd</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-slate-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <CloudOff className="w-4 h-4" />
          <span className="text-sm font-medium">{pendingCount} wijziging{pendingCount > 1 ? 'en' : ''} niet gesynchroniseerd</span>
        </div>
      ) : null}
    </div>
  );
}