import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Clock, GitCompare, RotateCcw, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import VersionCompare from "./VersionCompare";

export default function VersionHistoryPanel({ artikel, onRevert, onClose }) {
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [compareLeft, setCompareLeft] = useState(null);
  const [compareRight, setCompareRight] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [revertVersion, setRevertVersion] = useState(null);

  const versieGeschiedenis = artikel?.versie_geschiedenis || [];

  // Build full version list: old versions + current
  const allVersions = [
    ...versieGeschiedenis.map(v => ({
      versie: v.versie,
      titel: v.oude_titel || artikel.titel,
      inhoud: v.oude_inhoud || "",
      datum: v.datum,
      bewerkt_door: v.bewerkt_door,
      isCurrent: false,
    })),
    {
      versie: artikel.versie || 1,
      titel: artikel.titel,
      inhoud: artikel.inhoud,
      datum: artikel.updated_date,
      bewerkt_door: null,
      isCurrent: true,
    }
  ].sort((a, b) => b.versie - a.versie);

  const handleCompare = () => {
    if (compareLeft !== null && compareRight !== null) {
      setShowCompare(true);
    }
  };

  const handleRevert = (version) => {
    setRevertVersion(version);
  };

  const confirmRevert = () => {
    if (revertVersion) {
      onRevert({
        titel: revertVersion.titel,
        inhoud: revertVersion.inhoud,
      });
      setRevertVersion(null);
    }
  };

  const leftVersion = compareLeft !== null ? allVersions.find(v => v.versie === compareLeft) : null;
  const rightVersion = compareRight !== null ? allVersions.find(v => v.versie === compareRight) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Versiegeschiedenis – Artikel {artikel.artikel_nummer}: {artikel.titel}
        </h2>
        <Button variant="outline" size="sm" onClick={onClose}>Terug</Button>
      </div>

      {/* Compare toolbar */}
      {allVersions.length >= 2 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <GitCompare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Vergelijk versies:</span>
              <select
                className="text-sm border rounded px-2 py-1 bg-white"
                value={compareLeft ?? ""}
                onChange={(e) => setCompareLeft(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecteer links...</option>
                {allVersions.map(v => (
                  <option key={`l-${v.versie}`} value={v.versie}>
                    Versie {v.versie} {v.isCurrent ? "(huidig)" : ""}
                  </option>
                ))}
              </select>
              <span className="text-sm text-blue-600">↔</span>
              <select
                className="text-sm border rounded px-2 py-1 bg-white"
                value={compareRight ?? ""}
                onChange={(e) => setCompareRight(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecteer rechts...</option>
                {allVersions.map(v => (
                  <option key={`r-${v.versie}`} value={v.versie}>
                    Versie {v.versie} {v.isCurrent ? "(huidig)" : ""}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={compareLeft === null || compareRight === null || compareLeft === compareRight}
                onClick={handleCompare}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <GitCompare className="w-3 h-3 mr-1" /> Vergelijken
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version timeline */}
      <div className="space-y-2">
        {allVersions.map((v) => (
          <Card
            key={v.versie}
            className={`transition-all ${v.isCurrent ? "border-blue-300 bg-blue-50/30" : ""} ${expandedVersion === v.versie ? "ring-1 ring-slate-300" : ""}`}
          >
            <CardHeader
              className="py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedVersion(expandedVersion === v.versie ? null : v.versie)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedVersion === v.versie ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <Badge className={v.isCurrent ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}>
                    v{v.versie}
                  </Badge>
                  <span className="text-sm font-medium text-slate-800">{v.titel}</span>
                  {v.isCurrent && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Huidig</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {v.datum ? format(new Date(v.datum), "dd-MM-yyyy HH:mm") : "-"}
                    {v.bewerkt_door ? ` • ${v.bewerkt_door}` : ""}
                  </span>
                  {!v.isCurrent && (
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleRevert(v); }}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Herstellen
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedVersion === v.versie && (
              <CardContent className="pt-0 pb-4">
                <div className="border rounded-lg p-4 bg-white">
                  <p className="text-xs font-medium text-slate-500 mb-2">Inhoud (versie {v.versie})</p>
                  <div
                    className="text-sm text-slate-700 prose prose-sm max-w-none max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: v.inhoud }}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Compare dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vergelijking: Versie {compareLeft} ↔ Versie {compareRight}</DialogTitle>
          </DialogHeader>
          {leftVersion && rightVersion && (
            <VersionCompare
              oldVersion={leftVersion}
              newVersion={rightVersion}
              oldLabel={`Versie ${leftVersion.versie}${leftVersion.isCurrent ? " (huidig)" : ""}`}
              newLabel={`Versie ${rightVersion.versie}${rightVersion.isCurrent ? " (huidig)" : ""}`}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Revert confirmation */}
      <AlertDialog open={!!revertVersion} onOpenChange={() => setRevertVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terugzetten naar versie {revertVersion?.versie}?</AlertDialogTitle>
            <AlertDialogDescription>
              De huidige versie wordt opgeslagen in de versiegeschiedenis. Het artikel wordt teruggezet naar de titel en inhoud van versie {revertVersion?.versie}. Dit kan niet ongedaan worden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700" onClick={confirmRevert}>
              <RotateCcw className="w-4 h-4 mr-1" /> Terugzetten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}