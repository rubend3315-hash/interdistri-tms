import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Printer, Users, BarChart3, List, CalendarDays, TrendingUp } from "lucide-react";
import KPIImportOverview from "@/components/employee-report/KPIImportOverview";
import { getYear, getISOWeek, startOfISOWeek, endOfISOWeek, format, setISOWeek, setYear as setDateYear } from "date-fns";
import { parseTimeToHours } from "@/components/customer/BesteltijdReport";
import { getValidPriceRule } from "@/components/utils/priceRuleUtils";
import KPIImportDialog from "@/components/employee-report/KPIImportDialog";
import KPITable from "@/components/employee-report/KPITable";
import EmployeeSummaryTable from "@/components/employee-report/EmployeeSummaryTable";
import EmployeeYearOverview from "@/components/employee-report/EmployeeYearOverview";
import KPITrendCharts from "@/components/employee-report/KPITrendCharts";

function parseDatum(datumStr) {
  if (!datumStr) return null;
  const parts = String(datumStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function EmployeeReport() {
  const currentYear = getYear(new Date());
  const currentWeek = getISOWeek(new Date());
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedWeek, setSelectedWeek] = useState(String(currentWeek));
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState("summary");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  // Callback when KPI import completes - auto set week/year from file
  const handleImportComplete = (week, year) => {
    setSelectedWeek(String(week));
    setSelectedYear(String(year));
  };

  const weekNum = parseInt(selectedWeek) || currentWeek;
  const yearNum = parseInt(selectedYear) || currentYear;

  const weekStart = useMemo(() => {
    const d = startOfISOWeek(setISOWeek(setDateYear(new Date(yearNum, 0, 4), yearNum), weekNum));
    return d;
  }, [weekNum, yearNum]);

  const weekEnd = useMemo(() => endOfISOWeek(weekStart), [weekStart]);

  // Fetch PakketDistributie employees for validation
  const { data: pdEmployees = [] } = useQuery({
    queryKey: ['pd-employees'],
    queryFn: () => base44.entities.Employee.filter({ department: 'PakketDistributie', status: 'Actief' }),
  });

  // Fetch KPI data for selected week
  const { data: kpiData = [], isLoading: loadingKPI } = useQuery({
    queryKey: ['employee-kpi', weekNum, yearNum],
    queryFn: () => base44.entities.EmployeeKPI.filter({ week: weekNum, year: yearNum })
  });

  // Fetch KPI doelen for selected week
  const { data: kpiDoelen = [] } = useQuery({
    queryKey: ['kpi-doelen', weekNum, yearNum],
    queryFn: () => base44.entities.KPIDoel.filter({ week: weekNum, jaar: yearNum })
  });

  // Fetch all KPI data for the year (for employee name list)
  const { data: yearKpiData = [] } = useQuery({
    queryKey: ['employee-kpi-year-names', yearNum],
    queryFn: () => base44.entities.EmployeeKPI.filter({ year: yearNum })
  });

  // Get unique employee names from year KPI data
  const employeeNames = useMemo(() => {
    const names = [...new Set(yearKpiData.map(k => k.medewerker_naam).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [yearKpiData]);

  // Filtered KPI data based on selected employee
  const filteredKpiData = useMemo(() => {
    if (selectedEmployee === "all") return kpiData;
    return kpiData.filter(k => k.medewerker_naam === selectedEmployee);
  }, [kpiData, selectedEmployee]);

  // Fetch PostNL customer to find customer_id
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-report'],
    queryFn: () => base44.entities.Customer.list()
  });
  const postNLCustomer = customers.find(c => c.company_name === 'PostNL');

  // Fetch articles
  const { data: articles = [] } = useQuery({
    queryKey: ['articles-report', postNLCustomer?.id],
    queryFn: () => postNLCustomer ? base44.entities.Article.filter({ customer_id: postNLCustomer.id }) : [],
    enabled: !!postNLCustomer
  });

  // Fetch TI Model routes
  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['ti-routes-report', postNLCustomer?.id],
    queryFn: () => postNLCustomer ? base44.entities.TIModelRoute.filter({ customer_id: postNLCustomer.id, status: 'Actief' }) : [],
    enabled: !!postNLCustomer
  });

  // Fetch import results for report rows - fetch ALL records with pagination
  const { data: importResults = [], isLoading: loadingImports } = useQuery({
    queryKey: ['postnl-imports-report'],
    queryFn: async () => {
      const allResults = [];
      let skip = 0;
      const limit = 500;
      while (true) {
        const batch = await base44.entities.PostNLImportResult.list('-created_date', limit, skip);
        if (!batch || batch.length === 0) break;
        allResults.push(...batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      return allResults;
    }
  });

  // Build report rows for selected week (same logic as CalculationsTab)
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

  const reportRows = useMemo(() => {
    if (!importResults || importResults.length === 0) return [];

    const rows = [];
    const seen = new Set();

    importResults.forEach(item => {
      if (!item?.data) return;
      const innerData = item.data.data || item.data;
      if (!innerData || typeof innerData !== 'object') return;

      // Filter by ISO week date range (ma t/m zo), onafhankelijk van jaar
      const datum = parseDatum(innerData['Datum']);
      if (!datum) return;
      
      const datumMs = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate()).getTime();
      const startMs = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
      const endMs = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()).getTime();
      if (datumMs < startMs || datumMs > endMs) return;

      const key = `${innerData['Datum']}_${innerData['Chauffeur']}_${innerData['Ritnaam']}_${innerData['Vrijgegeven']}`;
      if (seen.has(key)) return;
      seen.add(key);

      const isMonday = datum.getDay() === 1;
      const stopPrice = isMonday
        ? (articlePrices['Aantal afgeleverd - Stops Maandagtarief'] || articlePrices['ART-004'] || 0)
        : (articlePrices['Aantal afgeleverd - Stops'] || articlePrices['ART-001'] || 0);
      const stuksPrice = articlePrices['Aantal afgeleverd - Stuks'] || articlePrices['ART-002'] || 0;
      const pbaPrice = articlePrices['PBA - Bezorgd'] || articlePrices['ART-003'] || 0;
      const legitPrice = articlePrices['Legitimatiecheck aan de deur'] || articlePrices['ART-005'] || 0;
      const collectPrice = articlePrices['Aantal stuks afgehaald/gecollecteerd'] || articlePrices['ART-006'] || 0;

      const stops = Number(innerData['Aantal afgeleverd - stops']) || 0;
      const stuks = Number(innerData['Aantal afgeleverd - stuks']) || 0;
      const bml = Number(innerData['Legitimatiecheck aan de deur']) || 0;
      const pba = Number(innerData['Aantal PBA-pakketten bezorgd']) || 0;
      const collectie = Number(innerData['Aantal stuks afgehaald/gecollecteerd']) || 0;

      const omzet = (stops * stopPrice) + (stuks * stuksPrice) + (bml * legitPrice) + (pba * pbaPrice) + (collectie * collectPrice);

      rows.push({
        chauffeur: innerData['Chauffeur'] || '-',
        route: innerData['Ritnaam'] || '-',
        datum: innerData['Datum'] || '-',
        weekNum: parseInt(innerData['Week']) || null,
        succesvolleStops: stops,
        aantalRouteStops: Number(innerData['Aantal tijdens route - stops']) || 0,
        aantalRouteStuks: Number(innerData['Aantal tijdens route - stuks']) || 0,
        omzet,
        totaalRitUren: parseTimeToHours(innerData['Totaal rit']),
        besteltijdNetto: innerData['Besteltijd Netto'] || '-',
      });
    });

    return rows;
  }, [importResults, weekStart, weekEnd, articlePrices]);

  const isLoading = loadingKPI || loadingImports;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medewerkersrapport</h1>
          <p className="text-slate-500 mt-1">KPI's, hitrate, misgelopen omzet en uurtarief per medewerker</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="print:hidden gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={() => setImportOpen(true)} className="bg-blue-600 hover:bg-blue-700 print:hidden">
            <Upload className="w-4 h-4 mr-2" /> KPI importeren
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Jaar:</Label>
              <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); }}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Week:</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Medewerker:</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Alle medewerkers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  {employeeNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-slate-500">
              {format(weekStart, 'dd-MM-yyyy')} t/m {format(weekEnd, 'dd-MM-yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Samenvatting
          </TabsTrigger>
          <TabsTrigger value="kpi" className="gap-2">
            <Users className="w-4 h-4" /> KPI Data
          </TabsTrigger>
          <TabsTrigger value="year" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Jaaroverzicht
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Trends
          </TabsTrigger>
          <TabsTrigger value="imports" className="gap-2">
            <List className="w-4 h-4" /> KPI Imports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Medewerkersoverzicht - Week {weekNum} ({yearNum})
                {selectedEmployee !== "all" && ` - ${selectedEmployee}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <EmployeeSummaryTable
                  reportRows={selectedEmployee === "all" ? reportRows : reportRows.filter(r => {
                    const chauffeur = (r.chauffeur || '').toLowerCase().trim().replace(/,/g, '');
                    const selected = selectedEmployee.toLowerCase().trim().replace(/,/g, '');
                    return chauffeur === selected || chauffeur.includes(selected) || selected.includes(chauffeur);
                  })}
                  kpiData={filteredKpiData}
                  kpiDoelen={kpiDoelen}
                  tiModelRoutes={tiModelRoutes}
                  articles={articles}
                  weekStart={weekStart}
                  pdEmployees={pdEmployees}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                KPI Scores - Week {weekNum} ({yearNum})
                {selectedEmployee !== "all" && ` - ${selectedEmployee}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKPI ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <KPITable kpiData={filteredKpiData} pdEmployees={pdEmployees} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="year" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Jaaroverzicht KPI {yearNum}
                {selectedEmployee !== "all" ? ` - ${selectedEmployee}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeYearOverview employeeName={selectedEmployee} year={selectedYear} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                KPI Trends {yearNum}
                {selectedEmployee !== "all" ? ` - ${selectedEmployee}` : ' - Team'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KPITrendCharts employeeName={selectedEmployee} year={selectedYear} kpiDoelen={kpiDoelen} weekNum={weekNum} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="imports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geïmporteerde KPI bestanden</CardTitle>
            </CardHeader>
            <CardContent>
              <KPIImportOverview />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <KPIImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        customerId={postNLCustomer?.id}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}