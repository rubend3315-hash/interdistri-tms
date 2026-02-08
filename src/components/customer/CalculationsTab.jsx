import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Loader2, Printer } from "lucide-react";
import { startOfWeek, endOfWeek, format, addDays, getISOWeek, getYear, setISOWeek, setYear as setDateYear, startOfISOWeek, endOfISOWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { getValidPriceRule } from "@/components/utils/priceRuleUtils";
import WeekReportTable from "./WeekReportTable";
import BesteltijdReport, { parseTimeToHours } from "./BesteltijdReport";
import WeekSamenvatting from "./WeekSamenvatting";
import ActiviteitenReport from "./ActiviteitenReport";
import TrendReport from "./TrendReport";
import RouteOverview from "./RouteOverview";
import WerkaanbodTab from "./WerkaanbodTab";
import DataRefreshIndicator from "@/components/DataRefreshIndicator";

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
  const currentYear = getYear(new Date());
  const currentWeek = getISOWeek(new Date());
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedWeek, setSelectedWeek] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportTab, setReportTab] = useState("weekrapport");
  const [dayFilter, setDayFilter] = useState("all");
  const [calculated, setCalculated] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const queryClient = useQueryClient();

  // Real-time subscriptions
  useEffect(() => {
    const unsubs = [
      base44.entities.PostNLImportResult.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['postnl-imports-calc'] });
        setLastRefresh(Date.now());
      }),
      base44.entities.Article.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setLastRefresh(Date.now());
      }),
      base44.entities.TIModelRoute.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['ti-model-routes'] });
        setLastRefresh(Date.now());
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient]);

  // When year/week changes, update start/end dates
  const handleWeekChange = (wk) => {
    setSelectedWeek(wk);
    setCalculated(false);
    if (wk === "all") {
      const yr = parseInt(selectedYear);
      setStartDate(format(new Date(yr, 0, 1), 'yyyy-MM-dd'));
      setEndDate(format(new Date(yr, 11, 31), 'yyyy-MM-dd'));
    } else if (wk) {
      const yr = parseInt(selectedYear);
      const weekNum = parseInt(wk);
      const d = startOfISOWeek(setISOWeek(setDateYear(new Date(yr, 0, 4), yr), weekNum));
      const e = endOfISOWeek(d);
      setStartDate(format(d, 'yyyy-MM-dd'));
      setEndDate(format(e, 'yyyy-MM-dd'));
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleYearChange = (yr) => {
    setSelectedYear(yr);
    setSelectedWeek("");
    setStartDate("");
    setEndDate("");
    setCalculated(false);
  };

  // Fetch employees and time entries for besteltijd report
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-besteltijd'],
    queryFn: () => base44.entities.Employee.filter({ department: 'PakketDistributie' }),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries-besteltijd', startDate, endDate],
    queryFn: () => base44.entities.TimeEntry.list('-date', 5000),
    enabled: !!startDate && !!endDate
  });

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

  // Fetch PostNL import data - use filter with pagination to get ALL records
  const { data: importResults = [], isLoading: loadingImports } = useQuery({
    queryKey: ['postnl-imports-calc'],
    queryFn: async () => {
      const allResults = [];
      let skip = 0;
      const pageSize = 2000;
      while (true) {
        const batch = await base44.entities.PostNLImportResult.filter({}, '-created_date', pageSize, skip);
        allResults.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      console.log(`[PostNL Import] Totaal opgehaald: ${allResults.length} records`);
      return allResults;
    },
    staleTime: 0
  });

  // Auto-select week of most recent import on first load
  const [autoLoaded, setAutoLoaded] = useState(false);
  useEffect(() => {
    if (autoLoaded || loadingImports || !importResults || importResults.length === 0) return;
    
    // Find the most recent date across all imports
    let latestDate = null;
    importResults.forEach(item => {
      if (!item?.data) return;
      const innerData = item.data.data || item.data;
      if (!innerData) return;
      const parsed = parseDatum(innerData['Datum']);
      if (parsed && (!latestDate || parsed > latestDate)) {
        latestDate = parsed;
      }
    });
    
    if (latestDate) {
      const yr = getYear(latestDate);
      const wk = getISOWeek(latestDate);
      setSelectedYear(String(yr));
      setSelectedWeek(String(wk));
      const d = startOfISOWeek(setISOWeek(setDateYear(new Date(yr, 0, 4), yr), wk));
      const e = endOfISOWeek(d);
      setStartDate(format(d, 'yyyy-MM-dd'));
      setEndDate(format(e, 'yyyy-MM-dd'));
      setCalculated(true);
      setReportTab("activiteiten");
    }
    setAutoLoaded(true);
  }, [importResults, loadingImports, autoLoaded]);

  // Calculate week boundaries from startDate/endDate
  const weekStart = useMemo(() => {
    if (!startDate) return startOfWeek(new Date(), { weekStartsOn: 1 });
    return new Date(startDate);
  }, [startDate]);

  const weekEnd = useMemo(() => {
    if (!endDate) return endOfWeek(new Date(), { weekStartsOn: 1 });
    return new Date(endDate);
  }, [endDate]);

  const isFullYear = selectedWeek === "all";
  const weekNumber = useMemo(() => isFullYear ? null : (selectedWeek ? parseInt(selectedWeek) : getISOWeek(weekStart)), [selectedWeek, weekStart, isFullYear]);
  const yearNumber = useMemo(() => parseInt(selectedYear), [selectedYear]);

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
      // Compare dates without time component to avoid timezone issues
      const datumDate = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate()).getTime();
      const startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
      const endDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()).getTime();
      if (datumDate < startDate || datumDate > endDate) return;

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
        succesvolleStops: stops,
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
    <div className="space-y-4 print-report">
      <DataRefreshIndicator lastRefresh={lastRefresh} />
      {/* Jaar & Week selectie */}
      <Card className="print:hidden">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Jaar:</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Week:</Label>
              <Select value={selectedWeek} onValueChange={handleWeekChange}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Maak een keuze ..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Heel jaar</SelectItem>
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCalculate}
              disabled={loadingImports || !selectedWeek}
              className="bg-orange-400 hover:bg-orange-500 text-white"
            >
              {loadingImports ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Laden...</>
              ) : (
                'Uitvoeren'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rapport parameters */}
      <Card className="print:hidden">
        <CardHeader className="py-2 px-4 bg-slate-50 border-b">
          <CardTitle className="text-sm font-semibold text-blue-700">Rapport parameters</CardTitle>
        </CardHeader>
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Startdatum:</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCalculated(false); }}
                  className="w-44"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Einddatum:</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCalculated(false); }}
                  className="w-44"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for report types - always visible */}
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
          <TabsList>
            <TabsTrigger value="weekrapport">Weekrapport</TabsTrigger>
            <TabsTrigger value="besteltijd">Besteltijd & Uurtarief</TabsTrigger>
            <TabsTrigger value="samenvatting">Samenvatting per week</TabsTrigger>
            <TabsTrigger value="activiteiten">Activiteitenrapport</TabsTrigger>
            <TabsTrigger value="routeoverzicht">Route Overzicht</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="werkaanbod">Werkaanbod</TabsTrigger>
          </TabsList>
          {calculated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="print:hidden gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </Button>
          )}
        </div>

      {calculated && (
        <>
            {/* WEEK RAPPORT TAB */}
            <TabsContent value="weekrapport" className="space-y-4 mt-4">
              {/* Report Header */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#2c3e6b]">PostNL weekrapport</h2>
                      <p className="text-slate-600">{isFullYear ? `Heel jaar ${yearNumber}` : `Periode week ${weekNumber} - ${yearNumber}`}</p>
                    </div>
                  </div>

                  {/* Day filter */}
                    <div className="flex items-center gap-3 mb-4 print:hidden">
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
                      {dayFilter !== "all" && (
                        <Button variant="outline" size="sm" onClick={() => setDayFilter("all")}>
                          Reset filters
                        </Button>
                      )}
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
                      <p className="text-slate-500">Geen data gevonden voor {isFullYear ? `jaar ${yearNumber}` : `week ${weekNumber} - ${yearNumber}`}</p>
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
                  <CardTitle className="text-base">Besteltijd & Uurtarief Rapportage - {isFullYear ? `Heel jaar ${yearNumber}` : `Week ${weekNumber}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BesteltijdReport rows={besteltijdRows} tiModelRoutes={tiModelRoutes} employees={employees} timeEntries={timeEntries} weekStart={weekStart} weekEnd={weekEnd} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* SAMENVATTING TAB */}
            <TabsContent value="samenvatting" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Samenvatting per Route / Chauffeur {isFullYear ? `- Heel jaar ${yearNumber}` : `per Week (week ${weekNumber})`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <WeekSamenvatting rows={besteltijdRows} tiModelRoutes={tiModelRoutes} />
                </CardContent>
              </Card>
            </TabsContent>
            {/* ACTIVITEITEN TAB */}
            <TabsContent value="activiteiten" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activiteitenrapport - {isFullYear ? `Heel jaar ${yearNumber}` : `Week ${weekNumber}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActiviteitenReport weekData={weekData} />
                </CardContent>
              </Card>
            </TabsContent>
            {/* ROUTE OVERZICHT TAB */}
            <TabsContent value="routeoverzicht" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Route Overzicht — {isFullYear ? `Heel jaar ${yearNumber}` : `Week ${weekNumber} (${yearNumber})`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteOverview weekData={weekData} besteltijdRows={besteltijdRows} tiModelRoutes={tiModelRoutes} />
                </CardContent>
              </Card>
            </TabsContent>
            {/* TRENDS TAB */}
            <TabsContent value="trends" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trend Overzicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendReport rows={besteltijdRows} tiModelRoutes={tiModelRoutes} />
                </CardContent>
              </Card>
            </TabsContent>
            {/* WERKAANBOD TAB */}
            <TabsContent value="werkaanbod" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Werkaanbod — Trends Stops & Stuks</CardTitle>
                </CardHeader>
                <CardContent>
                  <WerkaanbodTab importResults={importResults} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
        </Tabs>

        {calculated && (
          <Card className="print:hidden">
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
        )}
    </div>
  );
}