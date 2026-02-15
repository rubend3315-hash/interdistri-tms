import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, FileText, ExternalLink, Link2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InvoiceDetailView({ invoiceId, customerId, onBack }) {
  const queryClient = useQueryClient();

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['spotta-invoice', invoiceId],
    queryFn: async () => {
      const invoices = await base44.entities.SpottaInvoice.filter({ customer_id: customerId });
      return invoices.find(i => i.id === invoiceId);
    },
    enabled: !!invoiceId,
  });

  const { data: lines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['spotta-invoice-lines', invoiceId],
    queryFn: () => base44.entities.SpottaInvoiceLine.filter({ invoice_id: invoiceId }),
    enabled: !!invoiceId,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles', customerId],
    queryFn: () => base44.entities.Article.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete all lines first
      for (const line of lines) {
        await base44.entities.SpottaInvoiceLine.delete(line.id);
      }
      // Then delete the invoice
      await base44.entities.SpottaInvoice.delete(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotta-invoices', customerId] });
      onBack();
    },
  });

  // Auto-match lines to articles
  const matchedLines = useMemo(() => {
    if (!lines.length || !articles.length) return lines;
    return lines.map(line => {
      if (line.matched_article_id) return line;
      const matchedArticle = articles.find(a => {
        const desc = (a.description || "").toLowerCase();
        const lineDesc = (line.description || "").toLowerCase();
        return desc === lineDesc || lineDesc.includes(desc);
      });
      return matchedArticle ? { ...line, matched_article_id: matchedArticle.id, _matchedArticle: matchedArticle } : line;
    });
  }, [lines, articles]);

  // Summary by line type
  const typeSummary = useMemo(() => {
    const summary = {};
    for (const line of lines) {
      const type = line.line_type || "overig";
      if (!summary[type]) summary[type] = { count: 0, total_excl: 0, total_incl: 0 };
      summary[type].count++;
      summary[type].total_excl += line.total_price || 0;
      summary[type].total_incl += line.total_incl_tax || 0;
    }
    return summary;
  }, [lines]);

  if (loadingInvoice || loadingLines) {
    return <div className="space-y-4"><Card className="animate-pulse"><CardContent className="pt-6 h-40" /></Card></div>;
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Terug</Button>
        <Card className="p-12 text-center"><p>Factuur niet gevonden</p></Card>
      </div>
    );
  }

  const typeLabels = {
    basis: "Basis routes",
    staffel: "Staffels",
    filiaalexemplaren: "Filiaalexemplaren",
    handling: "Handling kosten",
    losse_verspreiding: "Losse verspreidingen",
    correctie: "Correcties",
    display: "Display",
    overig: "Overig",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Terug naar facturen
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" /> Verwijderen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Factuur verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dit verwijdert factuur {invoice.invoice_number} en alle {lines.length} regels. Dit kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Invoice Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Factuur {invoice.invoice_number}</h2>
              <p className="text-sm text-slate-500">{invoice.supplier_name} — {invoice.description_period}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={
                invoice.status === "Concept" ? "bg-slate-100 text-slate-700" :
                invoice.status === "Gekoppeld" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }>{invoice.status}</Badge>
              {invoice.pdf_url && (
                <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="w-3 h-3" /> PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-slate-500">Datum</p><p className="font-medium">{invoice.invoice_date}</p></div>
            <div><p className="text-slate-500">Referentie</p><p className="font-medium">{invoice.reference_number || "-"}</p></div>
            <div><p className="text-slate-500">KvK</p><p className="font-medium">{invoice.supplier_kvk || "-"}</p></div>
            <div><p className="text-slate-500">BTW nr.</p><p className="font-medium">{invoice.supplier_btw || "-"}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-slate-500">Excl. BTW</p>
            <p className="text-xl font-bold">€ {invoice.total_net?.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-slate-500">BTW</p>
            <p className="text-xl font-bold">€ {invoice.total_tax?.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-slate-500">Totaal</p>
            <p className="text-xl font-bold text-blue-700">€ {invoice.total_amount?.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary by type */}
      <Card>
        <CardHeader><CardTitle className="text-base">Samenvatting per type</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(typeSummary).map(([type, data]) => (
              <div key={type} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">{typeLabels[type] || type}</p>
                <p className="font-semibold">{data.count} regels</p>
                <p className="text-sm text-slate-700">€ {data.total_excl.toFixed(2)} excl.</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Factuurregels ({lines.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Omschrijving</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Aantal</th>
                  <th className="px-3 py-2 text-right">Prijs</th>
                  <th className="px-3 py-2 text-right">BTW %</th>
                  <th className="px-3 py-2 text-right">BTW €</th>
                  <th className="px-3 py-2 text-right">Totaal €</th>
                  <th className="px-3 py-2 text-center">Artikel</th>
                </tr>
              </thead>
              <tbody>
                {matchedLines.map((line, idx) => (
                  <tr key={line.id || idx} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{line.product_code}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={line.description}>{line.description}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{line.line_type}</Badge></td>
                    <td className="px-3 py-2 text-right">{line.quantity}</td>
                    <td className="px-3 py-2 text-right">€ {line.unit_price?.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{line.tax_rate}%</td>
                    <td className="px-3 py-2 text-right">€ {line.tax_amount?.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">€ {line.total_incl_tax?.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      {line.matched_article_id ? (
                        <Link2 className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}