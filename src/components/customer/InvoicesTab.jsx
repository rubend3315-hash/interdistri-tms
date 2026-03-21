import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import InvoiceImportModal from "./InvoiceImportModal";
import InvoiceDetailView from "./InvoiceDetailView";

export default function InvoicesTab({ customerId }) {
  const [importOpen, setImportOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['spotta-invoices', customerId],
    queryFn: () => base44.entities.SpottaInvoice.filter({ customer_id: customerId }, '-invoice_date'),
    enabled: !!customerId,
  });

  if (selectedInvoiceId) {
    return (
      <InvoiceDetailView
        invoiceId={selectedInvoiceId}
        customerId={customerId}
        onBack={() => setSelectedInvoiceId(null)}
      />
    );
  }

  const statusColors = {
    Concept: "bg-slate-100 text-slate-700",
    Verwerkt: "bg-blue-100 text-blue-700",
    Gekoppeld: "bg-green-100 text-green-700",
    Goedgekeurd: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Facturen ({invoices.length})</h2>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setImportOpen(true)}>
          <Plus className="w-4 h-4" /> Factuur importeren
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-20" />
            </Card>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Geen facturen</h3>
            <p className="text-sm text-slate-500 mb-4">Importeer een factuur via PDF of Mindee JSON.</p>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setImportOpen(true)}>
              <Plus className="w-4 h-4" /> Eerste factuur importeren
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Card
              key={inv.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedInvoiceId(inv.id)}
            >
              <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">{inv.invoice_number}</p>
                    <Badge className={statusColors[inv.status] || "bg-slate-100"}>{inv.status}</Badge>
                    <Badge variant="outline" className="text-xs">{inv.import_source === "mindee_json" ? "Mindee" : inv.import_source === "pdf" ? "PDF" : "Handmatig"}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{inv.supplier_name}</span>
                    {inv.invoice_date && <span>{inv.invoice_date}</span>}
                    {inv.description_period && <span>Periode: {inv.description_period}</span>}
                    <span>{inv.line_count} regels</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-slate-900">€ {inv.total_amount?.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">excl. € {inv.total_net?.toFixed(2)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InvoiceImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        customerId={customerId}
      />
    </div>
  );
}