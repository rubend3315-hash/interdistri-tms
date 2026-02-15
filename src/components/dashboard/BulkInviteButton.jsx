import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, SkipForward } from "lucide-react";

export default function BulkInviteButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleBulkInvite = async () => {
    setLoading(true);
    setResults(null);
    try {
      const response = await base44.functions.invoke('autoInviteEmployee', { bulk: true });
      setResults(response.data);
    } catch (err) {
      setResults({ 
        status: 'error', 
        summary: err?.response?.data?.error || err.message || 'Onbekende fout',
        results: [] 
      });
    }
    setLoading(false);
  };

  const invited = results?.results?.filter(r => r.status === 'success' || r.status === 'invited_no_email') || [];
  const skipped = results?.results?.filter(r => r.status === 'skipped') || [];

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); setResults(null); }}>
        <UserPlus className="w-4 h-4 mr-2" />
        Bulk Uitnodigen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medewerkers Bulk Uitnodigen</DialogTitle>
            <DialogDescription>
              Alle actieve medewerkers met een e-mailadres die nog geen gebruikersaccount hebben worden uitgenodigd.
            </DialogDescription>
          </DialogHeader>

          {!results && !loading && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleBulkInvite}>
                <UserPlus className="w-4 h-4 mr-2" />
                Start Uitnodigingen
              </Button>
            </DialogFooter>
          )}

          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Uitnodigingen worden verzonden...</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="font-semibold text-green-800">{results.summary}</p>
              </div>

              {invited.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Uitgenodigd ({invited.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {invited.map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-green-50 rounded px-3 py-1.5">
                        <span className="text-slate-700">{r.name}</span>
                        <span className="text-slate-500 text-xs">{r.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skipped.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <SkipForward className="w-4 h-4 text-slate-400" />
                    Overgeslagen ({skipped.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {skipped.map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-slate-50 rounded px-3 py-1.5">
                        <span className="text-slate-500">{r.name}</span>
                        <Badge variant="secondary" className="text-xs">{r.reason}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Sluiten</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}