import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { Brain, TrendingUp, AlertTriangle, FileText, Loader2, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { parseISO, format } from "date-fns";

export default function InvoiceAIAnalysis({ invoices = [], allLines = [] }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prepare monthly revenue summary for the LLM
  const monthlyData = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      if (!inv.invoice_date || !inv.total_net) return;
      const d = parseISO(inv.invoice_date);
      const key = format(d, "yyyy-MM");
      if (!map[key]) map[key] = { month: key, total: 0, count: 0, invoices: [] };
      map[key].total += inv.total_net;
      map[key].count += 1;
      map[key].invoices.push({
        number: inv.invoice_number,
        amount: inv.total_net,
        date: inv.invoice_date,
        period: inv.description_period
      });
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  // Per-invoice summary for outlier detection
  const invoiceSummary = useMemo(() => {
    return invoices
      .filter(inv => inv.total_net != null)
      .map(inv => ({
        number: inv.invoice_number,
        date: inv.invoice_date,
        total_net: inv.total_net,
        line_count: inv.line_count,
        period: inv.description_period
      }))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [invoices]);

  // Line type breakdown
  const lineTypeBreakdown = useMemo(() => {
    const map = {};
    allLines.forEach(line => {
      const lt = line.line_type || "overig";
      if (!map[lt]) map[lt] = { type: lt, total: 0, count: 0 };
      map[lt].total += line.total_price || 0;
      map[lt].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [allLines]);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    const prompt = `Je bent een financieel analist gespecialiseerd in transportlogistiek facturatie. Analyseer de volgende factuurgegevens van een klant en geef een uitgebreide analyse in het Nederlands.

MAANDELIJKSE OMZET (excl. BTW):
${JSON.stringify(monthlyData.map(m => ({ maand: m.month, omzet_excl_btw: Math.round(m.total * 100) / 100, aantal_facturen: m.count })), null, 2)}

FACTUUR OVERZICHT:
${JSON.stringify(invoiceSummary.map(i => ({ factuurnr: i.number, datum: i.date, bedrag_excl_btw: Math.round(i.total_net * 100) / 100, regels: i.line_count, periode: i.period })), null, 2)}

VERDELING PER KOSTENTYPE:
${JSON.stringify(lineTypeBreakdown.map(lt => ({ type: lt.type, totaal_excl_btw: Math.round(lt.total * 100) / 100, aantal_regels: lt.count })), null, 2)}

Geef je analyse als een JSON-object met de volgende structuur. Alle bedragen in euro's excl. BTW.`;

    const response_json_schema = {
      type: "object",
      properties: {
        voorspelling: {
          type: "object",
          properties: {
            maanden: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  maand: { type: "string", description: "Formaat YYYY-MM" },
                  verwachte_omzet: { type: "number" },
                  toelichting: { type: "string" }
                }
              },
              description: "Voorspelling voor de komende 6 maanden"
            },
            methode: { type: "string", description: "Uitleg over de gebruikte voorspellingsmethode" }
          }
        },
        uitschieters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              factuurnr: { type: "string" },
              datum: { type: "string" },
              bedrag: { type: "number" },
              type: { type: "string", description: "hoog of laag" },
              reden: { type: "string", description: "Mogelijke verklaring" }
            }
          },
          description: "Facturen met ongebruikelijk hoog of laag bedrag"
        },
        samenvatting: {
          type: "object",
          properties: {
            trends: {
              type: "array",
              items: { type: "string" },
              description: "Lijst van belangrijkste trends"
            },
            afwijkingen: {
              type: "array",
              items: { type: "string" },
              description: "Lijst van opvallende afwijkingen"
            },
            aanbevelingen: {
              type: "array",
              items: { type: "string" },
              description: "Aanbevelingen op basis van de analyse"
            }
          }
        }
      }
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema
      });
      setAnalysis(result);
    } catch (err) {
      setError(err.message || "Er ging iets mis bij de AI-analyse.");
    } finally {
      setLoading(false);
    }
  };

  // Forecast chart data
  const forecastChartData = useMemo(() => {
    if (!analysis?.voorspelling?.maanden) return [];
    const historical = monthlyData.map(m => ({
      maand: m.month,
      omzet: Math.round(m.total),
      type: "Historisch"
    }));
    const forecast = analysis.voorspelling.maanden.map(m => ({
      maand: m.maand,
      voorspelling: Math.round(m.verwachte_omzet),
      type: "Voorspelling"
    }));
    return [...historical, ...forecast];
  }, [analysis, monthlyData]);

  if (invoices.length === 0) return null;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Factuuranalyse
        </CardTitle>
        <Button
          onClick={runAnalysis}
          disabled={loading}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyseren...</>
          ) : analysis ? (
            <><RefreshCw className="w-4 h-4" /> Opnieuw</>
          ) : (
            <><Brain className="w-4 h-4" /> Analyseer</>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!analysis && !loading && !error && (
          <p className="text-sm text-slate-500 text-center py-6">
            Klik op "Analyseer" om AI-inzichten te genereren op basis van {invoices.length} facturen.
          </p>
        )}

        {loading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-40" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-6 pt-2">
            {/* 1. Voorspelling */}
            {analysis.voorspelling && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-800">
                  <TrendingUp className="w-4 h-4" />
                  Omzetvoorspelling komende 6 maanden
                </h3>
                {analysis.voorspelling.methode && (
                  <p className="text-xs text-slate-500 italic">{analysis.voorspelling.methode}</p>
                )}
                {forecastChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={forecastChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="maand" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => `€ ${v?.toLocaleString('nl-NL')}`} />
                      <Bar dataKey="omzet" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Historisch" />
                      <Bar dataKey="voorspelling" fill="#a855f7" radius={[3, 3, 0, 0]} name="Voorspelling" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {analysis.voorspelling.maanden?.map(m => (
                    <div key={m.maand} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-xs text-purple-600 font-medium">{m.maand}</p>
                      <p className="text-lg font-bold text-purple-900">€ {m.verwachte_omzet?.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      {m.toelichting && <p className="text-xs text-slate-500 mt-1">{m.toelichting}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Uitschieters */}
            {analysis.uitschieters?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  Uitschieters
                </h3>
                <div className="space-y-2">
                  {analysis.uitschieters.map((u, i) => (
                    <div key={i} className={`border rounded-lg p-3 ${u.type === 'hoog' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={u.type === 'hoog' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                            {u.type === 'hoog' ? '↑ Hoog' : '↓ Laag'}
                          </Badge>
                          <span className="text-sm font-medium">{u.factuurnr}</span>
                          <span className="text-xs text-slate-500">{u.datum}</span>
                        </div>
                        <span className="font-bold">€ {u.bedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {u.reden && <p className="text-xs text-slate-600 mt-1">{u.reden}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Samenvatting */}
            {analysis.samenvatting && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <FileText className="w-4 h-4" />
                  Samenvatting & Aanbevelingen
                </h3>
                
                {analysis.samenvatting.trends?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Trends</p>
                    <ul className="space-y-1">
                      {analysis.samenvatting.trends.map((t, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.samenvatting.afwijkingen?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Afwijkingen</p>
                    <ul className="space-y-1">
                      {analysis.samenvatting.afwijkingen.map((a, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.samenvatting.aanbevelingen?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Aanbevelingen</p>
                    <ul className="space-y-1">
                      {analysis.samenvatting.aanbevelingen.map((r, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}