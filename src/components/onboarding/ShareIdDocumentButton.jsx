import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Loader2, CheckCircle2, AlertTriangle, FileText, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ShareIdDocumentButton({ employeeId, employeeName, onboardingDocumentId, onboardingDocument }) {
  const [open, setOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // If onboarding document is available, use it directly; otherwise fetch from DB
  const hasOnboardingDoc = !!onboardingDocumentId;

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['id_documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const docs = await base44.entities.Document.filter({ linked_employee_id: employeeId });
      return docs.filter(d => ['Identiteitsbewijs', 'Paspoort', 'Rijbewijs'].includes(d.document_type));
    },
    enabled: open && !!employeeId && !hasOnboardingDoc,
  });

  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings_idshare'],
    queryFn: () => base44.entities.PayrollSettings.list(),
    enabled: open,
  });

  const handleOpen = () => {
    setResult(null);
    setSelectedDocId(onboardingDocumentId || "");
    const ps = payrollSettings[0];
    setRecipientEmail(ps?.payroll_email || "");
    setOpen(true);
  };

  const handleSend = async () => {
    if (!selectedDocId || !recipientEmail) {
      toast.error("Selecteer een document en vul een e-mailadres in.");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('shareIdDocument', {
        document_id: selectedDocId,
        employee_id: employeeId,
        employee_name: employeeName,
        recipient_email: recipientEmail,
      });
      if (res.data?.success) {
        setResult({ success: true, message: res.data.message, expires_at: res.data.expires_at });
        toast.success("Beveiligde link verzonden!");
      } else {
        setResult({ success: false, message: res.data?.error || "Onbekende fout" });
        toast.error(res.data?.error || "Verzending mislukt");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Onbekende fout";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="h-7 text-xs gap-1.5">
        <Shield className="w-3.5 h-3.5" />
        ID-document delen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Veilig ID-document delen
            </DialogTitle>
            <DialogDescription>
              Het document wordt NIET als bijlage verstuurd. Alleen een beveiligde downloadlink.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Security notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Beveiligingsbeleid</p>
                <ul className="mt-1 space-y-0.5">
                  <li>• Link verloopt na 48 uur</li>
                  <li>• Maximaal 5 downloads</li>
                  <li>• Elke download wordt gelogd</li>
                  <li>• Geen bijlage in e-mail</li>
                </ul>
              </div>
            </div>

            {/* Document selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ID-document</Label>
              {hasOnboardingDoc ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">
                      {onboardingDocument?.document_type || "ID-document"} — geüpload tijdens onboarding
                    </p>
                    {onboardingDocument?.file_name && (
                      <p className="text-xs text-green-600">{onboardingDocument.file_name}</p>
                    )}
                  </div>
                </div>
              ) : loadingDocs ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Documenten laden...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-50 rounded p-3">
                  <FileText className="w-4 h-4 mb-1 text-slate-400" />
                  Geen ID-documenten gevonden. Upload eerst een document in Stap 3 (ID-document).
                </div>
              ) : (
                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Kies document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] py-0">{doc.document_type}</Badge>
                          {doc.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Recipient */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ontvanger e-mailadres</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="loonadministratie@example.nl"
                className="text-sm"
              />
            </div>

            {/* Result */}
            {result && (
              <div className={`rounded-lg p-3 text-xs flex items-start gap-2 ${result.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {result.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-semibold">{result.success ? 'Verzonden!' : 'Mislukt'}</p>
                  <p>{result.message}</p>
                  {result.expires_at && (
                    <p className="mt-1 text-[10px] opacity-75">
                      Verloopt: {new Date(result.expires_at).toLocaleString('nl-NL')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !selectedDocId || !recipientEmail}
                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Beveiligd verzenden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}