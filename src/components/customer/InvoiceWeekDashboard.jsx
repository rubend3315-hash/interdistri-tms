import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Truck, Package, DollarSign } from "lucide-react";
import PeriodSelector from "./PeriodSelector";
import YearRevenueChart from "./YearRevenueChart";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"
];

export default function InvoiceWeekDashboard({ customerId }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("all");
  const [period, setPeriod] = useState(null);

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['spotta-invoices-dash', customerId],
    queryFn: () => base44.entities.SpottaInvoice.filter({ customer_id: customerId }, '-created_date'),
    enabled: !!customerId,
  });

  const { data: allLines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['spotta-lines-dash', customerId],
    queryFn: () => base44.entities.SpottaInvoiceLine.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles-dash', customerId],
    queryFn: () => base44.entities.Article.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routes-dash', customerId],
    queryFn: () => base44.entities.Route.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  // Build invoice date lookup for period filtering
  const invoiceDateMap = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      map[inv.id] = inv.invoice_date; // "2026-01-25"
    });
    return map;
  }, [invoices]);

  // Filter lines by selected invoice AND period
  const lines = useMemo(() => {
    let filtered = allLines;
    
    // Filter by invoice
    if (selectedInvoiceId !== "all") {
      filtered = filtered.filter(l => l.invoice_id === selectedInvoiceId);
    }
    
    // Filter by period (based on invoice date)
    if (period) {
      const invoiceIdsInPeriod = new Set(
        invoices
          .filter(inv => inv.invoice_date && inv.invoice_date >= period.startDate && inv.invoice_date <= period.endDate)
          .map(inv => inv.id)
      );
      filtered = filtered.filter(l => invoiceIdsInPeriod.has(l.invoice_id));
    }
    
    return filtered;
  }, [allLines, selectedInvoiceId, period, invoices]);

  // Build article lookup by route_code (e.g. article_number "SPOTTA-R4431" => route_code "4431")
  const articleByRouteCode = useMemo(() => {
    const map = {};
    articles.forEach(a => {
      const match = a.article_number?.match(/R(\d+)/);
      if (match) map[match[1]] = a;
    });
    return map;
  }, [articles]);

  // Route lookup
  const routeByCode = useMemo(() => {
    const map = {};
    routes.forEach(r => { map[r.route_code] = r; });
    return map;
  }, [routes]);

  // === 1. Per route opbrengsten ===
  const routeRevenue = useMemo(() => {
    const map = {};
    lines.forEach(line => {
      const rc = line.route_code || "Onbekend";
      if (!map[rc]) map[rc] = { route_code: rc, total_excl: 0, total_incl: 0, quantity: 0, lines: 0 };
      map[rc].total_excl += line.total_price || 0;
      map[rc].total_incl += line.total_incl_tax || 0;
      map[rc].quantity += line.quantity || 0;
      map[rc].lines += 1;
    });
    return Object.values(map).sort((a, b) => b.total_excl - a.total_excl);
  }, [lines]);

  // === 2. Handling kosten per dag (quantity = aantal dagen) ===
  const handlingLines = useMemo(() => {
    return lines.filter(l =>
      l.line_type === "handling" || l.line_type === "losse_verspreiding"
    );
  }, [lines]);

  const handlingPerRoute = useMemo(() => {
    const map = {};
    handlingLines.forEach(line => {
      const rc = line.route_code || "Onbekend";
      if (!map[rc]) map[rc] = { route_code: rc, total: 0, count: 0 };
      map[rc].total += line.total_price || 0;
      map[rc].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [handlingLines]);

  // === 3. Overzicht per line_type ===
  const lineTypeSummary = useMemo(() => {
    const map = {};
    lines.forEach(line => {
      const lt = line.line_type || "overig";
      if (!map[lt]) map[lt] = { type: lt, total: 0, count: 0 };
      map[lt].total += line.total_price || 0;
      map[lt].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [lines]);

  const totalExcl = useMemo(() => lines.reduce((s, l) => s + (l.total_price || 0), 0), [lines]);
  const totalIncl = useMemo(() => lines.reduce((s, l) => s + (l.total_incl_tax || 0), 0), [lines]);
  const totalHandling = useMemo(() => handlingLines.reduce((s, l) => s + (l.total_price || 0), 0), [handlingLines]);

  const lineTypeLabels = {
    basis: "Basis", staffel: "Staffel", filiaalexemplaren: "Filiaalexemplaren",
    handling: "Handling", losse_verspreiding: "Losse verspreiding", correctie: "Correctie",
    display: "Display", beschikbaarheid_hub: "Beschikbaarheid hub", materiaalkosten: "Materiaalkosten",
    brandstofcompensatie: "Brandstofcompensatie", vervoer_per_dag: "Vervoer p/dag",
    nt_vervoer_per_dag: "NT Vervoer p/dag", km_vergoeding: "Km-vergoeding", overig: "Overig"
  };

  if (loadingInvoices || loadingLines) {
    return <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;
  }

  // Chart data for top 10 routes
  const routeChartData = routeRevenue.slice(0, 15).map(r => ({
    route: r.route_code,
    "Excl. BTW": Math.round(r.total_excl * 100) / 100,
  }));

  const pieData = lineTypeSummary.map(lt => ({
    name: lineTypeLabels[lt.type] || lt.type,
    value: Math.round(lt.total * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Header met factuur selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Weekdashboard Factuur
        </h2>
        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecteer factuur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle facturen ({invoices.length})</SelectItem>
            {invoices.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.invoice_number} - {inv.description_period || inv.invoice_date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Periode selector */}
      <PeriodSelector onPeriodChange={setPeriod} invoices={invoices} />

      {/* Jaaromzet grafiek */}
      <YearRevenueChart invoices={invoices} allLines={allLines} />

      {/* KPI's */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Totaal excl. BTW</p>
                <p className="text-lg font-bold text-slate-900">€ {totalExcl.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Handling kosten</p>
                <p className="text-lg font-bold text-slate-900">€ {totalHandling.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Actieve routes</p>
                <p className="text-lg font-bold text-slate-900">{routeRevenue.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opbrengsten per route - Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opbrengsten per route (excl. BTW)</CardTitle>
        </CardHeader>
        <CardContent>
          {routeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={routeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="route" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `€ ${v.toFixed(2)}`} />
                <Bar dataKey="Excl. BTW" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">Geen data beschikbaar</p>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Verdeling per type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verdeling per kostentype</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `€ ${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Geen data</p>
            )}
          </CardContent>
        </Card>

        {/* Handling kosten per route */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Handling & losse verspreiding per route</CardTitle>
          </CardHeader>
          <CardContent>
            {handlingPerRoute.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {handlingPerRoute.map(h => (
                  <div key={h.route_code} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{h.route_code}</Badge>
                      <span className="text-sm text-slate-600">{h.count} regels</span>
                    </div>
                    <span className="font-semibold text-slate-900">€ {h.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Geen handling kosten</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail tabel: opbrengsten per route met artikel koppeling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route opbrengsten & artikelkoppeling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Route</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Routenaam</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Artikel</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Artikelprijs</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Regels</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Dagen</th>
                  <th className="pb-2 font-medium text-slate-500 text-right">Excl. BTW</th>
                </tr>
              </thead>
              <tbody>
                {routeRevenue.map((r, i) => {
                  const article = articleByRouteCode[r.route_code];
                  const route = routeByCode[r.route_code];
                  const currentPrice = article?.price_rules?.[0]?.price;

                  return (
                    <tr key={r.route_code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="py-2 pr-4">
                        <Badge className="bg-blue-50 text-blue-700">{r.route_code}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {route?.route_name || "-"}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {article ? (
                          <span className="text-xs">{article.article_number}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-600">
                        {currentPrice != null ? `€ ${currentPrice.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-600">{r.lines}</td>
                      <td className="py-2 pr-4 text-right text-slate-600">{r.quantity}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">€ {r.total_excl.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-4" colSpan={6}>Totaal</td>
                  <td className="py-2 text-right">€ {totalExcl.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Kosten type overzicht */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uitsplitsing per kostentype</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Type</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Aantal regels</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Totaal excl. BTW</th>
                  <th className="pb-2 font-medium text-slate-500 text-right">% van totaal</th>
                </tr>
              </thead>
              <tbody>
                {lineTypeSummary.map((lt, i) => (
                  <tr key={lt.type} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="py-2 pr-4">
                      <Badge variant="outline">{lineTypeLabels[lt.type] || lt.type}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">{lt.count}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900">€ {lt.total.toFixed(2)}</td>
                    <td className="py-2 text-right text-slate-600">
                      {totalExcl > 0 ? ((lt.total / totalExcl) * 100).toFixed(1) : 0}%
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