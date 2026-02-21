import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Truck, Clock, Menu } from "lucide-react";
import OfflineSyncIndicator from "@/components/OfflineSyncIndicator";
import { APP_VERSION } from "../utils/appVersion";

export default function MobileHeader({ todayShift, todayStr, isOnline, syncStatus, pendingCount, onMenuOpen }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <OfflineSyncIndicator isOnline={isOnline} syncStatus={syncStatus} pendingCount={pendingCount} />
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2.5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm flex items-center gap-2">
                <span>Interdistri TMS</span>
                <span className="text-xs opacity-70 font-normal">v{APP_VERSION}</span>
              </h1>
              <p className="text-xs text-blue-100">Mobiele App</p>
            </div>
          </div>
          <button
            onClick={onMenuOpen}
            className="p-3 -m-1 hover:bg-white/20 rounded-lg active:bg-white/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Menu openen"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white/10 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-100">Vandaag</p>
              <p className="font-semibold text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100">Tijd</p>
              <p className="font-semibold text-lg">{format(currentTime, "HH:mm")}</p>
            </div>
          </div>
        </div>

        {todayShift && (
          <div className="mt-2 bg-amber-400 text-amber-900 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <div>
                <p className="text-xs font-medium">
                  {todayShift.date === todayStr ? 'Dienst starttijd vandaag' : `Dienst ${format(new Date(todayShift.date), "EEEE d MMMM", { locale: nl })}`}
                </p>
                <p className="font-bold text-lg">{todayShift.service_start_time}</p>
                {todayShift.start_time && todayShift.end_time && (
                  <p className="text-xs mt-1"><strong>Shift:</strong> {todayShift.start_time} - {todayShift.end_time}</p>
                )}
              </div>
            </div>
            {todayShift.message && <p className="mt-1 text-xs">{todayShift.message}</p>}
          </div>
        )}
      </div>
    </>
  );
}