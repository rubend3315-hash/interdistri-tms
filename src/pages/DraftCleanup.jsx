import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DraftCleanup() {
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setError(null);
    setCleanupResult(null);
    const res = await base44.functions.invoke("previewEmptyTimeEntryDrafts", {});
    if (res.data?.success) {
      setPreviewData(res.data);
    } else {
      setError(res.data?.error || "Fout bij ophalen preview");
    }
    setPreviewLoading(false);
  };

  const handleCleanup = async () => {
    setShowConfirm(false);
    setCleanupLoading(true);
    setError(null);
    const res = await base44.functions.invoke("cleanupEmptyTimeEntryDrafts", {});
    if (res.data?.success) {
      setCleanupResult(res.data);
      setPreviewData(null);
    } else {
      setError(res.data?.error || "Fout bij opschonen");
    }
    setCleanupLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lege Concept Drafts Opschonen</h1>
        <p className="text-sm text-slate-500 mt-1">
          Beheer en verwijder lege TimeEntry records met status "Concept" die geen tijden, uren of locaties bevatten.
        </p>
      </div>

      {/* Acties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acties</CardTitle>
          <CardDescription>Controleer eerst welke lege drafts er zijn, en schoon daarna op.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handlePreview} disabled={previewLoading} variant="outline">
            {previewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Controleer lege drafts
          </Button>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={cleanupLoading || !previewData || previewData.count === 0}
            variant="destructive"
          >
            {cleanupLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Opschonen lege drafts
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Cleanup resultaat */}
      {cleanupResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              Opschonen voltooid — {cleanupResult.deleted_count} drafts verwijderd.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Preview resultaten */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Preview resultaat
              <Badge variant={previewData.count > 0 ? "destructive" : "secondary"}>
                {previewData.count} lege drafts
              </Badge>
            </CardTitle>
          </CardHeader>
          {previewData.count > 0 && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">Medewerker ID</th>
                      <th className="pb-2 pr-4">Datum</th>
                      <th className="pb-2">Aangemaakt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-mono text-xs text-slate-600">{entry.id}</td>
                        <td className="py-2 pr-4 text-slate-700">{entry.employee_id || "—"}</td>
                        <td className="py-2 pr-4 text-slate-700">{entry.date || "—"}</td>
                        <td className="py-2 text-slate-500 text-xs">
                          {entry.created_date ? new Date(entry.created_date).toLocaleString("nl-NL") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Bevestigingsdialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lege drafts verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je alle {previewData?.count || 0} lege Concept TimeEntries wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} className="bg-red-600 hover:bg-red-700">
              Ja, verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}