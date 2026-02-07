import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Loader2, Download } from "lucide-react";
import { startOfWeek, endOfWeek, format, addDays, getISOWeek, getYear } from "date-fns";
import { nl } from "date-fns/locale";
import { getValidPriceRule } from "@/components/utils/priceRuleUtils";
import WeekReportTable from "./WeekReportTable";
import BesteltijdReport, { parseTimeToHours } from "./BesteltijdReport";

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

function parseDatum(datumStr) {
  if (!datumStr) return null;
  const parts = String(datumStr).split('-');
  if (parts.length === 3) {
    // DD-MM-YYYY
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function CalculationsTab({ customerId }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportTab, setReportTab] = useState("weekrapport");
  const [dayFilter, setDayFilter] = useState("all"); // 'all', 'maandag', 'dinsdag-zaterdag'
  const [calculated, setCalculated] = useState(false);

  // Fetch articles for this customer
  const { data: articles = [] } = useQuery({
    queryKey: ['articles', customerId],
    queryFn: () => customerId ? base44.entities.Article.filter({ customer_id: customerId }) : [],
    enabled: !!customerId
  });

  // Fetch TI Model Routes for this customer
  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['ti-model-routes', customerId],
    queryFn: () => customerId ? base44.entities.TIModelRoute.filter({ customer_id: customerId, status: 'Actief' }) : [],
    enabled: !!customerId
  });

  // Fetch PostNL import data
  const { data: importResults = [], isLoading: loadingImports } = useQuery({
    queryKey: ['postnl-imports-calc'],
    queryFn: () => base44.entities.PostNLImportResult.list(),
    staleTime: 0
  });

  // Calculate week boundaries
  const weekStart = useMemo(() => {
    const d = new Date(selectedDate);
    return startOfWeek(d, { weekStartsOn: 1 });
  }, [selectedDate]);

  const weekEnd = useMemo(() => {
    return endOfWeek(weekStart, { weekStartsOn: 1 });
  }, [weekStart]);

  const weekNumber = useMemo(() => getISOWeek(weekStart), [weekStart]);
  const yearNumber = useMemo(() => getYear(weekStart), [weekStart]);

  // Get article prices: map article description to price
  const articlePrices = useMemo(() => {
    const prices = {};
    articles.forEach(art => {
      const rule = getValidPriceRule(art.price_rules, weekStart);
      if (rule) {
        prices[art.description] = rule.price;
        prices[art.article_number] = rule.price;
      }
    });
    return prices;
  }, [articles, weekStart]);

  // Flatten and filter import data for the selected week
  const weekData = useMemo(() => {
    if (!importResults || importResults.length === 0) return [];

    const rows = [];
    importResults.forEach(item => {
      if (!item?.data) return;
      const innerData = item.data.data || item.data;
      if (!innerData || typeof innerData !== 'object') return;

      const datum = parseDatum(innerData['Datum']);
      if (!datum) return;
      if (datum < weekStart || datum > weekEnd) return;

      rows.push({
        ...innerData,
        _parsedDate: datum,
        _dayOfWeek: datum.getDay(), // 0=Sun, 1=Mon, ...
        _dayName: DAY_NAMES[datum.getDay()],
        _starttijdShift: item.starttijd_shift || '',
      });
    });

    // Deduplicate
    const seen = new Set();
    return rows.filter(row => {
      const key = `${row['Datum']}_${row['Chauffeur']}_${row['Ritnaam']}_${row['Vrijgegeven']}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [importResults, weekStart, weekEnd]);

  // Build report rows with tariff calculations
  const buildReportRows = (dataRows, isMonday) => {
    // Get the correct stop price based on Monday vs other days
    const stopPrice = isMonday
      ? (articlePrices['Aantal afgeleverd - Stops Maandagtarief'] || articlePrices['ART-004'] || 0)
      : (articlePrices['Aantal afgeleverd - Stops'] || articlePrices['ART-001'] || 0);
    const stuksPrice = articlePrices['Aantal afgeleverd - Stuks'] || articlePrices['ART-002'] || 0;
    const pbaPrice = articlePrices['PBA - Bezorgd'] || articlePrices['ART-003'] || 0;
    const legitPrice = articlePrices['Legitimatiecheck aan de deur'] || articlePrices['ART-005'] || 0;
    const collectPrice = articlePrices['Aantal stuks afgehaald/gecollecteerd'] || articlePrices['ART-006'] || 0;

    return dataRows.map(row => {
      const stops = Number(row['Aantal afgeleverd - stops']) || 0;
      const stuks = Number(row['Aantal afgeleverd - stuks']) || 0;
      const bml = Number(row['Legitimatiecheck aan de deur']) || 0;
      const pba = Number(row['Aantal PBA-pakketten bezorgd']) || 0;
      const collectie = Number(row['Aantal stuks afgehaald/gecollecteerd']) || 0;

      const stoptarief = stops * stopPrice;
      const stukstarief = stuks * stuksPrice;
      const bmlTarief = bml * legitPrice;
      const pbaTarief = pba * pbaPrice;
      const collectTarief = collectie * collectPrice;
      const omzet = stoptarief + stukstarief + bmlTarief + pbaTarief + collectTarief;

      return {
        chauffeur: row['Chauffeur'] || '-',
        kenteken: row['Kenteken'] || '-',
        route: row['Ritnaam'] || '-',
        succesvolleStops: stops,
        stuksGeleverd: stuks,
        bml,
        pbaBezorgd: pba,
        collectie,
        stoptarief,
        stukstarief,
        bmlTarief,
        pbaTarief,
        collectTarief,
        omzet,
        datum: row['Datum'] || '-',
        besteltijdNorm: row['Besteltijd Norm'] || '-',
        besteltijdBruto: row['Besteltijd Bruto'] || '-',
        besteltijdNetto: row['Besteltijd Netto'] || '-',
        voorbereiding: row['Voorbereiding, aan-/afrijtijd en afhandeling'] || '-',
        totaalRit: row['Totaal rit'] || '-',
        totaalRitUren: parseTimeToHours(row['Totaal rit']),
        aantalRouteStops: Number(row['Aantal tijdens route - stops']) || 0,
        aantalRouteStuks: Number(row['Aantal tijdens route - stuks']) || 0,
      };
    });
  };

  // Split data by day of week
  const dayGroups = useMemo(() => {
    const groups = {};
    // Days: 1=Maandag, 2=Dinsdag, ..., 6=Zaterdag, 0=Zondag
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];

    dayOrder.forEach(dayNum => {
      const dayRows = weekData.filter(r => r._dayOfWeek === dayNum);
      if (dayRows.length > 0) {
        const isMonday = dayNum === 1;
        groups[dayNum] = {
          dayName: DAY_NAMES[dayNum],
          isMonday,
          rows: buildReportRows(dayRows, isMonday),
        };
      }
    });

    return groups;
  }, [weekData, articlePrices]);

  // Grand totals
  const grandTotals = useMemo(() => {
    const allRows = Object.values(dayGroups).flatMap(g => g.rows);
    return allRows.reduce((acc, r) => ({
      succesvolleStops: acc.succesvolleStops + (r.succesvolleStops || 0),
      stuksGeleverd: acc.stuksGeleverd + (r.stuksGeleverd || 0),
      bml: acc.bml + (r.bml || 0),
      pbaBezorgd: acc.pbaBezorgd + (r.pbaBezorgd || 0),
      collectie: acc.collectie + (r.collectie || 0),
      stoptarief: acc.stoptarief + (r.stoptarief || 0),
      stukstarief: acc.stukstarief + (r.stukstarief || 0),
      bmlTarief: acc.bmlTarief + (r.bmlTarief || 0),
      pbaTarief: acc.pbaTarief + (r.pbaTarief || 0),
      collectTarief: acc.collectTarief + (r.collectTarief || 0),
      omzet: acc.omzet + (r.omzet || 0),
    }), { succesvolleStops: 0, stuksGeleverd: 0, bml: 0, pbaBezorgd: 0, collectie: 0, stoptarief: 0, stukstarief: 0, bmlTarief: 0, pbaTarief: 0, collectTarief: 0, omzet: 0 });
  }, [dayGroups]);

  // All besteltijd rows
  const besteltijdRows = useMemo(() => {
    return Object.values(dayGroups).flatMap(g => g.rows);
  }, [dayGroups]);

  // Filtered day groups
  const filteredDayGroups = useMemo(() => {
    if (dayFilter === 'maandag') {
      return Object.fromEntries(Object.entries(dayGroups).filter(([k]) => k === '1'));
    }
    if (dayFilter === 'dinsdag-zaterdag') {
      return Object.fromEntries(Object.entries(dayGroups).filter(([k]) => k !== '1'));
    }
    return dayGroups;
  }, [dayGroups, dayFilter]);

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return '-';
    return `€ ${v.toFixed(2)}`;
  };

  const handleCalculate = () => {
    setCalculated(true);
  };

  return (
    <div className="space-y-4">
      {/* Periode Selectie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekrapport genereren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Week startdatum (maandag)</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setCalculated(false); }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Week</Label>
              <div className="text-sm font-semibold text-slate-900 pt-2">
                Week {weekNumber} - {yearNumber}
                <span className="text-slate-500 font-normal ml-2">
                  ({format(weekStart, 'dd-MM-yyyy')} t/m {format(weekEnd, 'dd-MM-yyyy')})
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="bg-blue-600 hover:bg-blue-700 w-full"
            disabled={loadingImports}
          >
            {loadingImports ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Laden...</>
            ) : (
              'Berekeningen uitvoeren'
            )}
          </Button>
        </CardContent>
      </Card>

      {calculated && (
        <>
          {/* Tabs for report types */}
          <Tabs value={reportTab} onValueChange={setReportTab}>
            <TabsList>
              <TabsTrigger value="weekrapport">Weekrapport</TabsTrigger>
              <TabsTrigger value="besteltijd">Besteltijd & Uurtarief</TabsTrigger>
            </TabsList>

            {/* WEEK RAPPORT TAB */}
            <TabsContent value="weekrapport" className="space-y-4 mt-4">
              {/* Report Header */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#2c3e6b]">PostNL weekrapport</h2>
                      <p className="text-slate-600">Periode week {weekNumber} - {yearNumber}</p>
                    </div>
                  </div>

                  {/* Day filter */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium text-slate-700">Filter:</span>
                    <Select value={dayFilter} onValueChange={setDayFilter}>
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Hele week</SelectItem>
                        <SelectItem value="maandag">Alleen Maandag</SelectItem>
                        <SelectItem value="dinsdag-zaterdag">Dinsdag t/m Zaterdag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Grand Total Summary */}
                  <div className="mb-6">
                    <div className="bg-[#2c3e6b] text-white px-4 py-1.5 rounded-t-lg">
                      <span className="font-semibold text-sm">Realisatie over de geselecteerde periode</span>
                    </div>
                    <div className="overflow-x-auto border border-t-0 border-slate-200 rounded-b-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Succesvolle stops</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Stuks geleverd</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">BML</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">PBA Bezorgd</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Collectie</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Stoptarief</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Stukstarief</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">BMLtarief</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">PBAtarief</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Collectietarief</th>
                            <th className="text-right py-2 px-2 font-medium text-slate-600">Omzet</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="font-semibold">
                            <td className="py-2 px-2 text-right">{grandTotals.succesvolleStops}</td>
                            <td className="py-2 px-2 text-right">{grandTotals.stuksGeleverd}</td>
                            <td className="py-2 px-2 text-right">{grandTotals.bml}</td>
                            <td className="py-2 px-2 text-right">{grandTotals.pbaBezorgd}</td>
                            <td className="py-2 px-2 text-right">{grandTotals.collectie}</td>
                            <td className="py-2 px-2 text-right">{fmt(grandTotals.stoptarief)}</td>
                            <td className="py-2 px-2 text-right">{fmt(grandTotals.stukstarief)}</td>
                            <td className="py-2 px-2 text-right">{fmt(grandTotals.bmlTarief)}</td>
                            <td className="py-2 px-2 text-right">{fmt(grandTotals.pbaTarief)}</td>
                            <td className="py-2 px-2 text-right">{fmt(grandTotals.collectTarief)}</td>
                            <td className="py-2 px-2 text-right font-bold">{fmt(grandTotals.omzet)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Day Tables */}
                  {Object.keys(filteredDayGroups).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500">Geen data gevonden voor week {weekNumber} - {yearNumber}</p>
                      <p className="text-xs text-slate-400 mt-1">Totaal rijen in database: {importResults.length}</p>
                    </div>
                  ) : (
                    Object.entries(filteredDayGroups).map(([dayNum, group]) => (
                      <WeekReportTable
                        key={dayNum}
                        dayLabel={group.dayName}
                        rows={group.rows}
                      />
                    ))
                  )}

                  {/* Footer */}
                  <div className="text-xs text-slate-400 mt-4 flex justify-between">
                    <span>Rapport gegenereerd op {format(new Date(), 'dd-MM-yyyy HH:mm')}</span>
                    <span>Artikelen: {articles.filter(a => a.status === 'Actief').length} actief</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BESTELTIJD TAB */}
            <TabsContent value="besteltijd" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Besteltijd & Uurtarief Rapportage - Week {weekNumber}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BesteltijdReport rows={besteltijdRows} tiModelRoutes={tiModelRoutes} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Tarieven overzicht */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gebruikte tarieven</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {articles.filter(a => a.status === 'Actief').map(art => {
                  const rule = getValidPriceRule(art.price_rules, weekStart);
                  return (
                    <div key={art.id} className="flex justify-between bg-slate-50 rounded p-2">
                      <span className="text-slate-600">{art.description}</span>
                      <span className="font-semibold">{rule ? `€ ${rule.price.toFixed(2)}` : '-'}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}