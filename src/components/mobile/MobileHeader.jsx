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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 pt-2 pb-2.5">
        {/* Top row: logo + time + menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-[13px] leading-tight">Interdistri TMS</h1>
              <p className="text-[10px] text-blue-200">{format(new Date(), "EEEE d MMMM", { locale: nl })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums">{format(currentTime, "HH:mm")}</span>
            <button
              onClick={onMenuOpen}
              className="p-2 -mr-1 hover:bg-white/20 rounded-lg active:bg-white/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Menu openen"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shift notification — compact inline */}
        {todayShift && (
          <div className="mt-2 flex items-center gap-2 bg-amber-400/90 text-amber-900 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-bold text-[15px]">{todayShift.service_start_time}</span>
              <span className="text-[11px] truncate">
                {todayShift.date === todayStr ? 'Start dienst vandaag' : `Dienst ${format(new Date(todayShift.date), "EEE d MMM", { locale: nl })}`}
              </span>
            </div>
            {todayShift.start_time && todayShift.end_time && (
              <span className="text-[10px] flex-shrink-0">Shift {todayShift.start_time}-{todayShift.end_time}</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}