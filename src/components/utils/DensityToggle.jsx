import React from "react";
import { useDensity } from "./DensityContext";
import { Minimize2, Maximize2 } from "lucide-react";

export default function DensityToggle() {
  const { density, toggleDensity } = useDensity();
  const isCompact = density === "compact";

  return (
    <button
      onClick={toggleDensity}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
      title={isCompact ? "Standaard weergave" : "Compacte weergave"}
    >
      {isCompact ? (
        <Maximize2 className="w-3.5 h-3.5" />
      ) : (
        <Minimize2 className="w-3.5 h-3.5" />
      )}
      <span>Weergave: {isCompact ? "Compact" : "Standaard"}</span>
    </button>
  );
}