import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function parseLineType(description, productCode) {
  const desc = (description || "").toLowerCase();
  const code = (productCode || "").trim();

  // Spotta-specifieke types
  if (desc.includes("basis:")) return "basis";
  if (desc.includes("staffel:")) return "staffel";
  if (desc.includes("filiaalexemplaren")) return "filiaalexemplaren";
  if (desc.includes("handling")) return "handling";
  if (desc.includes("losse verspreiding")) return "losse_verspreiding";
  if (desc.includes("correctie")) return "correctie";
  if (desc.includes("display")) return "display";

  // DPG Media-specifieke types (op basis van product code + omschrijving)
  if (code === "123" || desc.includes("beschik. hub")) return "beschikbaarheid_hub";
  if (code === "165" || desc.includes("materiaal kosten")) return "materiaalkosten";
  if (code === "155" || desc.includes("compens. brandstof")) return "brandstofcompensatie";
  if (code === "170" || desc.includes("nt verg vervoer")) return "nt_vervoer_per_dag";
  if (code === "160" || desc.includes("verg vervoer per dag")) return "vervoer_per_dag";
  if (code === "910" || desc.includes("km verg")) return "km_vergoeding";

  return "overig";
}

function parseRouteCode(productCode) {
  if (!productCode) return "";
  const match = productCode.match(/^\d+\/(\d+)/);
  return match ? match[1] : productCode;
}

function parseMindeeJson(jsonData) {
  const fields = jsonData.fields || jsonData;

  const invoice = {
    invoice_number: fields.invoice_number?.value || "",
    invoice_date: fields.date?.value || "",
    due_date: fields.due_date?.value || null,
    supplier_name: fields.supplier_name?.value || "",
    supplier_address: fields.supplier_address?.fields?.address?.value || fields.supplier_address?.value || "",
    supplier_kvk: "",
    supplier_btw: "",
    customer_name: fields.customer_name?.value || "",
    reference_number: fields.reference_numbers?.items?.[0]?.value || "",
    description_period: fields.reference_numbers?.items?.[1]?.value || "",
    total_net: fields.total_net?.value || 0,
    total_tax: fields.total_tax?.value || 0,
    total_amount: fields.total_amount?.value || 0,
    currency: fields.locale?.fields?.currency?.value || "EUR",
  };

  // Extract KvK and BTW from supplier registrations
  const supplierRegs = fields.supplier_company_registration?.items || [];
  for (const reg of supplierRegs) {
    const type = reg.fields?.type?.value?.toUpperCase() || "";
    const number = reg.fields?.number?.value || "";
    if (type === "KVK") invoice.supplier_kvk = number;
    if (type === "VAT" || type === "BTW") invoice.supplier_btw = number;
  }

  const lineItems = (fields.line_items?.items || []).map(item => {
    const f = item.fields || {};
    const desc = f.description?.value || "";
    return {
      product_code: f.product_code?.value || "",
      description: desc,
      quantity: f.quantity?.value || 0,
      unit_price: f.unit_price?.value || 0,
      total_price: f.total_price?.value || 0,
      tax_rate: f.tax_rate?.value || 0,
      tax_amount: f.tax_amount?.value || 0,
      total_incl_tax: (f.total_price?.value || 0) + (f.tax_amount?.value || 0),
      route_code: parseRouteCode(f.product_code?.value),
      line_type: parseLineType(desc),
    };
  });

  return { invoice, lineItems };
}

export default function InvoiceImportModal({ open, onOpenChange, customerId }) {
  const [importTab, setImportTab] = useState("pdf");
  const [pdfFile, setPdfFile] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const resetModal = () => {
    setPdfFile(null);
    setJsonFile(null);
    setParsedData(null);
    setError(null);
    setSaving(false);
    setSuccess(false);
  };

  // Parse PDF using Base44's ExtractDataFromUploadedFile
  const parsePdfMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfFile({ name: file.name, url: file_url });

      const extractionSchema = {
        type: "object",
        properties: {
          invoice_number: { type: "string", description: "Factuurnummer" },
          invoice_date: { type: "string", description: "Factuurdatum (YYYY-MM-DD)" },
          supplier_name: { type: "string", description: "Naam leverancier" },
          supplier_kvk: { type: "string", description: "KvK nummer leverancier" },
          supplier_btw: { type: "string", description: "BTW nummer leverancier" },
          customer_name: { type: "string", description: "Naam klant" },
          reference_number: { type: "string", description: "Referentienummer (Uw referentie)" },
          description_period: { type: "string", description: "Omschrijving/periode" },
          total_net: { type: "number", description: "Totaal excl. BTW" },
          total_tax: { type: "number", description: "Totaal BTW" },
          total_amount: { type: "number", description: "Totaal incl. BTW" },
          line_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_code: { type: "string", description: "Wk/Route/dagcode" },
                description: { type: "string", description: "Productomschrijving" },
                quantity: { type: "number", description: "Aantal" },
                unit_price: { type: "number", description: "Bedrag per stuk excl. BTW" },
                total_price: { type: "number", description: "Totaal excl. BTW" },
                tax_rate: { type: "number", description: "BTW percentage" },
                tax_amount: { type: "number", description: "BTW bedrag" }
              }
            }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema
      });

      if (result.status === "error") {
        throw new Error(result.details || "Fout bij het verwerken van de PDF");
      }

      const output = result.output;
      const lineItems = (output.line_items || []).map(item => ({
        ...item,
        total_incl_tax: (item.total_price || 0) + (item.tax_amount || 0),
        route_code: parseRouteCode(item.product_code),
        line_type: parseLineType(item.description),
      }));

      return {
        invoice: {
          invoice_number: output.invoice_number || "",
          invoice_date: output.invoice_date || "",
          due_date: null,
          supplier_name: output.supplier_name || "",
          supplier_address: "",
          supplier_kvk: output.supplier_kvk || "",
          supplier_btw: output.supplier_btw || "",
          customer_name: output.customer_name || "",
          reference_number: output.reference_number || "",
          description_period: output.description_period || "",
          total_net: output.total_net || 0,
          total_tax: output.total_tax || 0,
          total_amount: output.total_amount || 0,
          currency: "EUR",
        },
        lineItems,
        source: "pdf",
        pdfUrl: file_url,
      };
    },
    onSuccess: (data) => setParsedData(data),
    onError: (err) => setError(err.message),
  });

  // Parse Mindee JSON
  const parseJsonMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setJsonFile({ name: file.name, url: file_url });

      const text = await new Response(file).text();
      const jsonData = JSON.parse(text);
      const { invoice, lineItems } = parseMindeeJson(jsonData);

      return { invoice, lineItems, source: "mindee_json", jsonUrl: file_url };
    },
    onSuccess: (data) => setParsedData(data),
    onError: (err) => setError(err.message),
  });

  const handleSave = async () => {
    if (!parsedData) return;
    setSaving(true);
    setError(null);

    const { invoice, lineItems, source, pdfUrl, jsonUrl } = parsedData;

    // Create invoice record
    const invoiceRecord = await base44.entities.SpottaInvoice.create({
      customer_id: customerId,
      ...invoice,
      line_count: lineItems.length,
      pdf_url: pdfUrl || "",
      json_url: jsonUrl || "",
      import_source: source,
      status: "Concept",
    });

    // Bulk create line items
    if (lineItems.length > 0) {
      const chunks = [];
      for (let i = 0; i < lineItems.length; i += 50) {
        chunks.push(lineItems.slice(i, i + 50));
      }
      for (const chunk of chunks) {
        await base44.entities.SpottaInvoiceLine.bulkCreate(
          chunk.map(line => ({
            invoice_id: invoiceRecord.id,
            customer_id: customerId,
            ...line,
          }))
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ['spotta-invoices', customerId] });
    queryClient.invalidateQueries({ queryKey: ['spotta-invoice-lines'] });
    setSaving(false);
    setSuccess(true);
  };

  const isLoading = parsePdfMutation.isPending || parseJsonMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetModal(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Factuur importeren</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {success ? (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <h3 className="text-lg font-semibold text-green-900">Factuur succesvol geïmporteerd!</h3>
                <p className="text-sm text-green-800">
                  Factuurnr. {parsedData?.invoice?.invoice_number} — {parsedData?.lineItems?.length} regels opgeslagen.
                </p>
                <Button onClick={() => { resetModal(); onOpenChange(false); }}>Sluiten</Button>
              </CardContent>
            </Card>
          ) : !parsedData ? (
            <Tabs value={importTab} onValueChange={setImportTab}>
              <TabsList>
                <TabsTrigger value="pdf" className="gap-2">
                  <FileText className="w-4 h-4" /> PDF uploaden
                </TabsTrigger>
                <TabsTrigger value="json" className="gap-2">
                  <Upload className="w-4 h-4" /> Mindee JSON uploaden
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="space-y-4">
                <p className="text-sm text-slate-600">Upload een PDF-factuur. De gegevens worden automatisch uitgelezen.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setError(null); parsePdfMutation.mutate(f); }
                    }}
                    disabled={isLoading}
                    className="hidden"
                    id="pdf-input"
                  />
                  <label htmlFor="pdf-input" className="cursor-pointer block">
                    {parsePdfMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>PDF wordt verwerkt...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-slate-400" />
                        <span className="text-sm font-medium">Klik om PDF te selecteren</span>
                      </div>
                    )}
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4">
                <p className="text-sm text-slate-600">Upload de JSON die je van Mindee hebt ontvangen.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setError(null); parseJsonMutation.mutate(f); }
                    }}
                    disabled={isLoading}
                    className="hidden"
                    id="json-input"
                  />
                  <label htmlFor="json-input" className="cursor-pointer block">
                    {parseJsonMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>JSON wordt verwerkt...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-400" />
                        <span className="text-sm font-medium">Klik om JSON te selecteren</span>
                      </div>
                    )}
                  </label>
                </div>
              </TabsContent>

              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </CardContent>
                </Card>
              )}
            </Tabs>
          ) : (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold text-lg">Factuuroverzicht</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Factuurnr.</p>
                      <p className="font-medium">{parsedData.invoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Datum</p>
                      <p className="font-medium">{parsedData.invoice.invoice_date}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Leverancier</p>
                      <p className="font-medium">{parsedData.invoice.supplier_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Periode</p>
                      <p className="font-medium">{parsedData.invoice.description_period}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Excl. BTW</p>
                      <p className="font-medium">€ {parsedData.invoice.total_net?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">BTW</p>
                      <p className="font-medium">€ {parsedData.invoice.total_tax?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Totaal</p>
                      <p className="font-semibold text-blue-700">€ {parsedData.invoice.total_amount?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Regels</p>
                      <p className="font-medium">{parsedData.lineItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items Preview */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Factuurregels ({parsedData.lineItems.length})</h3>
                  <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Omschrijving</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-right">Aantal</th>
                          <th className="px-3 py-2 text-right">Prijs</th>
                          <th className="px-3 py-2 text-right">BTW</th>
                          <th className="px-3 py-2 text-right">Totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.lineItems.map((line, idx) => (
                          <tr key={idx} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono whitespace-nowrap">{line.product_code}</td>
                            <td className="px-3 py-2 max-w-xs truncate">{line.description}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">{line.line_type}</Badge>
                            </td>
                            <td className="px-3 py-2 text-right">{line.quantity}</td>
                            <td className="px-3 py-2 text-right">€ {line.unit_price?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">€ {line.tax_amount?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">€ {line.total_incl_tax?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {!success && (
          <div className="border-t pt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { resetModal(); onOpenChange(false); }}>
              {parsedData ? "Annuleren" : "Sluiten"}
            </Button>
            {parsedData && (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opslaan...</>
                ) : (
                  "Factuur importeren"
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}