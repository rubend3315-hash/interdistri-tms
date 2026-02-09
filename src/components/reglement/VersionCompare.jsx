import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function diffLines(oldText, newText) {
  const oldLines = oldText.split(/\n/).filter(Boolean);
  const newLines = newText.split(/\n/).filter(Boolean);
  const result = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";
    if (oldLine === newLine) {
      result.push({ type: "same", old: oldLine, new: newLine });
    } else if (!oldLine && newLine) {
      result.push({ type: "added", old: "", new: newLine });
    } else if (oldLine && !newLine) {
      result.push({ type: "removed", old: oldLine, new: "" });
    } else {
      result.push({ type: "changed", old: oldLine, new: newLine });
    }
  }
  return result;
}

export default function VersionCompare({ oldVersion, newVersion, oldLabel, newLabel }) {
  const oldText = stripHtml(oldVersion?.inhoud || oldVersion?.oude_inhoud || "");
  const newText = stripHtml(newVersion?.inhoud || newVersion?.oude_inhoud || "");
  const oldTitel = oldVersion?.titel || oldVersion?.oude_titel || "";
  const newTitel = newVersion?.titel || newVersion?.oude_titel || "";

  const lines = diffLines(oldText, newText);
  const titelChanged = oldTitel !== newTitel;

  return (
    <div className="space-y-4">
      {/* Header labels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <Badge className="bg-red-100 text-red-700 text-xs">{oldLabel}</Badge>
            {oldVersion?.datum && (
              <span className="text-[10px] text-red-500">
                {format(new Date(oldVersion.datum), "dd-MM-yyyy HH:mm")}
              </span>
            )}
          </div>
          {oldVersion?.bewerkt_door && (
            <p className="text-[10px] text-red-500 mt-1">Door: {oldVersion.bewerkt_door}</p>
          )}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <Badge className="bg-green-100 text-green-700 text-xs">{newLabel}</Badge>
            {newVersion?.datum && (
              <span className="text-[10px] text-green-500">
                {format(new Date(newVersion.datum), "dd-MM-yyyy HH:mm")}
              </span>
            )}
          </div>
          {newVersion?.bewerkt_door && (
            <p className="text-[10px] text-green-500 mt-1">Door: {newVersion.bewerkt_door}</p>
          )}
        </div>
      </div>

      {/* Titel comparison */}
      {titelChanged && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Titel</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
              <span className="line-through text-red-700">{oldTitel}</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
              <span className="text-green-700">{newTitel}</span>
            </div>
          </div>
        </div>
      )}

      {/* Inhoud comparison */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1">Inhoud</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Old side */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {lines.map((line, i) => (
                <div
                  key={`old-${i}`}
                  className={`px-3 py-1 text-xs font-mono border-b border-slate-100 ${
                    line.type === "removed" ? "bg-red-100 text-red-800" :
                    line.type === "changed" ? "bg-red-50 text-red-700" :
                    line.type === "added" ? "bg-slate-50 text-slate-300" :
                    "bg-white text-slate-600"
                  }`}
                >
                  <span className="text-slate-400 mr-2 select-none">{i + 1}</span>
                  {line.old || "\u00A0"}
                </div>
              ))}
            </div>
          </div>
          {/* New side */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {lines.map((line, i) => (
                <div
                  key={`new-${i}`}
                  className={`px-3 py-1 text-xs font-mono border-b border-slate-100 ${
                    line.type === "added" ? "bg-green-100 text-green-800" :
                    line.type === "changed" ? "bg-green-50 text-green-700" :
                    line.type === "removed" ? "bg-slate-50 text-slate-300" :
                    "bg-white text-slate-600"
                  }`}
                >
                  <span className="text-slate-400 mr-2 select-none">{i + 1}</span>
                  {line.new || "\u00A0"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          Verwijderd
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          Toegevoegd
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" />
          Gewijzigd
        </div>
      </div>
    </div>
  );
}