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
  const [progress, setProgress] = useState("");

  const handleBulkInvite = async () => {
    setLoading(true);
    setResults(null);
    setProgress("Medewerkers en gebruikers ophalen...");

    const inviteResults = [];

    // Fetch all active employees and existing users from frontend
    const allEmployees = await base44.entities.Employee.filter({ status: 'Actief' });
    const allUsers = await base44.entities.User.list('-created_date', 500);
    const existingEmails = new Set(allUsers.map(u => u.email?.toLowerCase()));

    let count = 0;
    for (const emp of allEmployees) {
      const email = emp.email;
      if (!email) {
        inviteResults.push({ name: `${emp.first_name} ${emp.last_name}`, status: 'skipped', reason: 'geen e-mail' });
        continue;
      }
      if (existingEmails.has(email.toLowerCase())) {
        inviteResults.push({ name: `${emp.first_name} ${emp.last_name}`, email, status: 'skipped', reason: 'heeft al account' });
        continue;
      }

      count++;
      const employeeName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
      setProgress(`Uitnodigen: ${employeeName} (${count})...`);

      try {
        await base44.users.inviteUser(email, 'user');
        existingEmails.add(email.toLowerCase());
        inviteResults.push({ name: employeeName, email, status: 'success' });
      } catch (err) {
        inviteResults.push({ name: employeeName, email, status: 'error', reason: err.message || 'Uitnodiging mislukt' });
      }
    }

    const invited = inviteResults.filter(r => r.status === 'success').length;
    const skipped = inviteResults.filter(r => r.status === 'skipped').length;
    const failed = inviteResults.filter(r => r.status === 'error').length;

    setResults({
      status: 'success',
      summary: `${invited} uitgenodigd, ${skipped} overgeslagen${failed > 0 ? `, ${failed} mislukt` : ''}`,
      results: inviteResults,
    });
    setLoading(false);
    setProgress("");
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