import React, { useState, useEffect } from "react";
import { Check, Loader2, FileText } from "lucide-react";

export default function AutoSaveIndicator({ lastSavedAt, isSaving, draftLoaded = false }) {
  const [timeAgo, setTimeAgo] = useState("");
  const [savedTime, setSavedTime] = useState("");

  useEffect(() => {
    if (!lastSavedAt) return;

    const update = () => {
      const diff = Math.floor((Date.now() - lastSavedAt) / 1000);
      if (diff < 5) setTimeAgo("zojuist");
      else if (diff < 60) setTimeAgo(`${diff}s geleden`);
      else if (diff < 3600) setTimeAgo(`${Math.floor(diff / 60)}m geleden`);
      else setTimeAgo(`${Math.floor(diff / 3600)}u geleden`);
    };

    // Store formatted time for the "Laatst opgeslagen" display
    const d = new Date(lastSavedAt);
    setSavedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);

    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [lastSavedAt]);

  if (!lastSavedAt && !isSaving) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs px-2 py-1">
      {isSaving ? (
        <>
          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          <span className="text-blue-600">Opslaan...</span>
        </>
      ) : lastSavedAt ? (
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-blue-500" />
          <span className="text-blue-600">Concept</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-600">{savedTime}</span>
        </div>
      ) : null}
    </div>
  );
}