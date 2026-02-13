import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Archive, RefreshCw, Loader2, Mail, FileText, AlertTriangle } from "lucide-react";

export default function BulkActions({ documents, employees }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [bulkFilter, setBulkFilter] = useState("expired");
  const [running, setRunning] = useState(false);

  const filteredDocs = useMemo(() => {
    const today = new Date();
    return documents.filter(d => {
      if (bulkFilter === "expired") {
        return d.expiry_date && differenceInDays(new Date(d.expiry_date), today) < 0 && d.status !== "Gearchiveerd";
      }
      if (bulkFilter === "expiring") {
        const days = d.expiry_date ? differenceInDays(new Date(d.expiry_date), today) : 999;
        return days >= 0 && days <= 30 && d.status !== "Gearchiveerd";
      }
      if (bulkFilter === "archived") {
        return d.status === "Gearchiveerd";
      }
      if (bulkFilter === "no_file") {
        return !d.file_url && d.status !== "Gearchiveerd";
      }
      return true;
    });
  }, [documents, bulkFilter]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filteredDocs.length) {
      setSelected([]);
    } else {
      setSelected(filteredDocs.map(d => d.id));
    }
  };

  const bulkArchive = async () => {
    setRunning(true);
    let count = 0;
    for (const id of selected) {
      await base44.entities.Document.update(id, { status: "Gearchiveerd" });
      count++;
    }
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setSelected([]);
    setRunning(false);
    toast.success(`${count} documenten gearchiveerd`);
  };

  const bulkMarkExpired = async () => {
    setRunning(true);
    let count = 0;
    for (const id of selected) {
      await base44.entities.Document.update(id, { status: "Verlopen" });
      count++;
    }
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setSelected([]);
    setRunning(false);
    toast.success(`${count} documenten gemarkeerd als verlopen`);
  };

  const bulkSendReminders = async () => {
    setRunning(true);
    let sent = 0;
    for (const id of selected) {
      const doc = documents.find(d => d.id === id);
      if (!doc?.linked_employee_id) continue;
      const emp = employees.find(e => e.id === doc.linked_employee_id);
      if (!emp?.email) continue;

      await base44.integrations.Core.SendEmail({
        to: emp.email,
        subject: `Herinnering: ${doc.document_type} verloopt binnenkort`,
        body: `<p>Beste ${emp.first_name},</p><p>Je document <strong>${doc.name}</strong> (${doc.document_type}) ${doc.expiry_date ? 'verloopt op ' + doc.expiry_date : 'moet worden vernieuwd'}.</p><p>Neem contact op met je leidinggevende om dit te regelen.</p>`,
      });
      sent++;
    }
    setRunning(false);
    toast.success(`${sent} herinnering(en) verzonden`);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={bulkFilter} onValueChange={(v) => { setBulkFilter(v); setSelected([]); }}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expired">Verlopen documenten</SelectItem>
            <SelectItem value="expiring">Verloopt binnen 30 dagen</SelectItem>
            <SelectItem value="no_file">Zonder bestand</SelectItem>
            <SelectItem value="archived">Gearchiveerd</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-2">{filteredDocs.length} documenten</Badge>

        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge className="bg-blue-100 text-blue-700">{selected.length} geselecteerd</Badge>
            {(bulkFilter === "expired") && (
              <Button variant="outline" size="sm" onClick={bulkArchive} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                Archiveren
              </Button>
            )}
            {(bulkFilter === "expiring") && (
              <>
                <Button variant="outline" size="sm" onClick={bulkSendReminders} disabled={running}>
                  {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />}
                  Herinnering sturen
                </Button>
                <Button variant="outline" size="sm" onClick={bulkMarkExpired} disabled={running}>
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Markeer verlopen
                </Button>
              </>
            )}
            {bulkFilter === "no_file" && (
              <Button variant="outline" size="sm" onClick={bulkArchive} disabled={running}>
                <Archive className="w-4 h-4 mr-1" />
                Archiveren
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Document list */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Geen documenten in deze categorie.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="py-2.5 px-3 w-10">
                  <Checkbox
                    checked={selected.length === filteredDocs.length && filteredDocs.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-600">Document</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-600">Type</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-600">Medewerker</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-600">Vervaldatum</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="border-b hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <Checkbox
                      checked={selected.includes(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
                    />
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{doc.name}</td>
                  <td className="py-2.5 px-3"><Badge variant="outline">{doc.document_type}</Badge></td>
                  <td className="py-2.5 px-3 text-slate-600">{doc.linked_entity_name || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {doc.expiry_date ? format(new Date(doc.expiry_date), "d MMM yyyy", { locale: nl }) : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge className={
                      doc.status === 'Actief' ? 'bg-green-100 text-green-700' :
                      doc.status === 'Verlopen' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }>{doc.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}