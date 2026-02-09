import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getWeek, getDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileSpreadsheet,
  Download,
  FileText,
  Euro,
  Clock,
  Moon,
  Calendar,
  Sun,
  Users,
  RefreshCw
} from "lucide-react";
import SalaryExportStamgegevens from "@/components/salary/SalaryExportStamgegevens";
import SalaryExportMutation from "@/components/salary/SalaryExportMutation";

export default function SalaryReports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['timeEntries-all'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: caoRules = [] } = useQuery({
    queryKey: ['caoRules'],
    queryFn: () => base44.entities.CaoRule.list()
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays-all'],
    queryFn: () => base44.entities.Holiday.list()
  });

  const isLoading = loadingEmployees || loadingEntries;

  // Parse selected month
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  // Filter entries for selected month
  const monthEntries = timeEntries.filter(entry => {
    if (!entry.date) return false;
    const entryDate = new Date(entry.date);
    return entryDate >= monthStart && entryDate <= monthEnd && entry.status === 'Goedgekeurd';
  });

  // Get active CAO rules - sorted by priority
  const activeRules = caoRules
    .filter(r => r.status === 'Actief')
    .sort((a, b) => (a.priority || 50) - (b.priority || 50));

  // Apply CAO rule to entry
  const applyRule = (rule, entry, employee, entryDate) => {
    if (!rule || rule.status !== 'Actief') return 0;
    
    const hourlyRate = employee.hourly_rate || 0;
    const totalHours = entry.total_hours || 0;
    if (totalHours === 0) return 0;

    // Check date validity
    const date = new Date(entryDate);
    if (rule.start_date) {
      const startDate = new Date(rule.start_date);
      if (date < startDate) return 0;
    }
    if (rule.end_date) {
      const endDate = new Date(rule.end_date);
      if (date > endDate) return 0;
    }

    // Check days of week (only if specified)
    if (rule.applies_to_days && rule.applies_to_days.length > 0) {
      const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
      const dayName = dayNames[getDay(date)];
      if (!rule.applies_to_days.includes(dayName)) return 0;
    }

    // Check time range (only if both start and end time are specified)
    if (rule.start_time && rule.end_time) {
      if (entry.start_time) {
        const entryTime = entry.start_time.substring(0, 5);
        // Handle overnight shifts (e.g., 22:00 to 06:00)
        if (rule.start_time > rule.end_time) {
          if (entryTime < rule.start_time && entryTime > rule.end_time) return 0;
        } else {
          if (entryTime < rule.start_time || entryTime > rule.end_time) return 0;
        }
      }
    }

    // Calculate based on calculation type
    switch (rule.calculation_type) {
      case 'Percentage (%)':
        return totalHours * hourlyRate * ((rule.percentage || 100) / 100 - 1);
      case 'Vast bedrag (€)':
        return rule.fixed_amount || 0;
      case 'Per uur (€/uur)':
        return totalHours * (rule.value || 0);
      case 'Per dag (€/dag)':
        return rule.value || 0;
      default:
        return 0;
    }
  };

  // Calculate salary for each employee
  const calculateEmployeeSalary = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return null;

    const entries = monthEntries.filter(e => e.employee_id === employeeId);
    
    let totalHours = 0;
    let nightHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;
    let overtimeHours = 0;

    entries.forEach(entry => {
      totalHours += entry.total_hours || 0;
      nightHours += entry.night_hours || 0;
      weekendHours += entry.weekend_hours || 0;
      holidayHours += entry.holiday_hours || 0;
      overtimeHours += entry.overtime_hours || 0;
    });

    const hourlyRate = employee.hourly_rate || 0;
    const baseSalary = totalHours * hourlyRate;
    
    // Apply all CAO rules with categorization
    const ruleBreakdown = {};
    let totalRuleAmount = 0;
    
    // Categorized amounts
    let overwerk130 = 0;
    let overwerk150 = 0;
    let overwerkZondagFeestdag = 0;
    let toeslag50 = 0;
    let toeslag100 = 0;
    let nachttoeslag = 0;
    let verblijfEendaags = 0;
    let verblijfMeerdaags = 0;

    activeRules.forEach(rule => {
      let ruleTotal = 0;
      entries.forEach(entry => {
        const amount = applyRule(rule, entry, employee, entry.date);
        ruleTotal += amount;
      });
      
      if (ruleTotal > 0) {
        ruleBreakdown[rule.name] = ruleTotal;
        totalRuleAmount += ruleTotal;
        
        // Categorize by rule name
        const ruleName = rule.name.toLowerCase();
        if (ruleName.includes('overwerk 130')) {
          overwerk130 += ruleTotal;
        } else if (ruleName.includes('overwerk 150')) {
          overwerk150 += ruleTotal;
        } else if (ruleName.includes('overwerk 200')) {
          overwerkZondagFeestdag += ruleTotal;
        } else if (ruleName.includes('toeslag 50')) {
          toeslag50 += ruleTotal;
        } else if (ruleName.includes('toeslag 100')) {
          toeslag100 += ruleTotal;
        } else if (ruleName.includes('nachttoeslag')) {
          nachttoeslag += ruleTotal;
        } else if (ruleName.includes('ééndaagse') || ruleName.includes('eendaagse')) {
          verblijfEendaags += ruleTotal;
        } else if (ruleName.includes('meerdaagse')) {
          verblijfMeerdaags += ruleTotal;
        }
      }
    });

    // Travel allowance
    const workDays = entries.length;
    const travelAllowance = workDays * (employee.travel_distance_km || 0) * 2 * (employee.travel_allowance_per_km || 0.23);

    const totalSalary = baseSalary + totalRuleAmount + travelAllowance;

    return {
      employee,
      totalHours,
      nightHours,
      weekendHours,
      holidayHours,
      overtimeHours,
      hourlyRate,
      baseSalary,
      ruleBreakdown,
      totalRuleAmount,
      overwerk130,
      overwerk150,
      overwerkZondagFeestdag,
      toeslag50,
      toeslag100,
      nachttoeslag,
      verblijfEendaags,
      verblijfMeerdaags,
      travelAllowance,
      totalSalary,
      workDays
    };
  };

  const activeEmployees = employees.filter(e => e.status === 'Actief');
  const reportData = activeEmployees
    .map(e => calculateEmployeeSalary(e.id))
    .filter(Boolean);

  const filteredReportData = selectedEmployee === 'all' 
    ? reportData 
    : reportData.filter(r => r.employee.id === selectedEmployee);

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      'Personeelsnummer',
      'Naam',
      'Afdeling',
      'Totaal uren',
      'Uurloon',
      'Basisloon',
      'Overwerk 130%',
      'Overwerk 150%',
      'Overwerk Zo/Feest',
      'Toeslag 50%',
      'Toeslag 100%',
      'Nachttoeslag',
      'Verblijf 1-daags',
      'Verblijf meerdaags',
      'Reiskosten',
      'Totaal bruto'
    ];

    const rows = filteredReportData.map(r => [
      r.employee.employee_number || '',
      `${r.employee.first_name} ${r.employee.last_name}`,
      r.employee.department || '',
      r.totalHours.toFixed(2),
      r.hourlyRate.toFixed(2),
      r.baseSalary.toFixed(2),
      r.overwerk130.toFixed(2),
      r.overwerk150.toFixed(2),
      r.overwerkZondagFeestdag.toFixed(2),
      r.toeslag50.toFixed(2),
      r.toeslag100.toFixed(2),
      r.nachttoeslag.toFixed(2),
      r.verblijfEendaags.toFixed(2),
      r.verblijfMeerdaags.toFixed(2),
      r.travelAllowance.toFixed(2),
      r.totalSalary.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loonrapport_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate months for selector
  const months = [];
  for (let i = -6; i <= 1; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    months.push(format(date, 'yyyy-MM'));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Loonrapporten</h1>
          <p className="text-slate-500 mt-1">CAO Beroepsgoederenvervoer berekeningen</p>
        </div>
        <Button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-4 h-4 mr-2" />
          Exporteer CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <Label>Periode</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>
                      {format(new Date(m + '-01'), "MMMM yyyy", { locale: nl })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Medewerker</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Alle medewerkers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Totaal uren</p>
                <p className="text-xl font-bold text-slate-900">
                  {filteredReportData.reduce((sum, r) => sum + r.totalHours, 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Moon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Nachturen</p>
                <p className="text-xl font-bold text-slate-900">
                  {filteredReportData.reduce((sum, r) => sum + r.nightHours, 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Weekenduren</p>
                <p className="text-xl font-bold text-slate-900">
                  {filteredReportData.reduce((sum, r) => sum + r.weekendHours, 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Euro className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Totaal bruto</p>
                <p className="text-xl font-bold text-slate-900">
                  €{filteredReportData.reduce((sum, r) => sum + r.totalSalary, 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Loonrapport {format(new Date(selectedMonth + '-01'), "MMMM yyyy", { locale: nl })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-96" />
            </div>
          ) : filteredReportData.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen goedgekeurde uren</h3>
              <p className="text-slate-500 mt-1">Er zijn geen goedgekeurde uren voor deze periode.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Medewerker</TableHead>
                    <TableHead className="text-right">Uren</TableHead>
                    <TableHead className="text-right">Uurloon</TableHead>
                    <TableHead className="text-right">Basisloon</TableHead>
                    <TableHead className="text-right">OW 130%</TableHead>
                    <TableHead className="text-right">OW 150%</TableHead>
                    <TableHead className="text-right">OW Zo/F</TableHead>
                    <TableHead className="text-right">Tsl 50%</TableHead>
                    <TableHead className="text-right">Tsl 100%</TableHead>
                    <TableHead className="text-right">Nacht</TableHead>
                    <TableHead className="text-right">Verb 1d</TableHead>
                    <TableHead className="text-right">Verb >1d</TableHead>
                    <TableHead className="text-right">Reis</TableHead>
                    <TableHead className="text-right font-bold">Totaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReportData.map(row => (
                    <TableRow key={row.employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">
                            {row.employee.first_name} {row.employee.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{row.employee.department}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">€{row.hourlyRate.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{row.baseSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{row.overwerk130 > 0 ? `€${row.overwerk130.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.overwerk150 > 0 ? `€${row.overwerk150.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.overwerkZondagFeestdag > 0 ? `€${row.overwerkZondagFeestdag.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.toeslag50 > 0 ? `€${row.toeslag50.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.toeslag100 > 0 ? `€${row.toeslag100.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.nachttoeslag > 0 ? `€${row.nachttoeslag.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.verblijfEendaags > 0 ? `€${row.verblijfEendaags.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{row.verblijfMeerdaags > 0 ? `€${row.verblijfMeerdaags.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">€{row.travelAllowance.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        €{row.totalSalary.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-100 font-bold">
                    <TableCell>Totaal</TableCell>
                    <TableCell className="text-right">
                      {filteredReportData.reduce((s, r) => s + r.totalHours, 0).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.baseSalary, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.overwerk130, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.overwerk150, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.overwerkZondagFeestdag, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.toeslag50, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.toeslag100, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.nachttoeslag, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.verblijfEendaags, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.verblijfMeerdaags, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{filteredReportData.reduce((s, r) => s + r.travelAllowance, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      €{filteredReportData.reduce((s, r) => s + r.totalSalary, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CAO Rules Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toegepaste CAO-regels ({activeRules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeRules.length === 0 ? (
            <p className="text-sm text-slate-500">
              Geen actieve CAO-regels gevonden. Voeg regels toe in het CAO-regels menu.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overwerk */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Overwerk</h4>
                <div className="flex flex-col gap-1">
                  {activeRules
                    .filter(r => r.category === 'Overwerk')
                    .sort((a, b) => {
                      const order = ['Overwerk 130%', 'Overwerk 150% zaterdag', 'Overwerk 200% zondag', 'Overwerk 200% Feestdag'];
                      return order.indexOf(a.name) - order.indexOf(b.name);
                    })
                    .map(rule => {
                      let displayText = rule.name;
                      if (rule.calculation_type === 'Percentage (%)' && rule.percentage) {
                        displayText = `${rule.name}: ${rule.percentage}%`;
                      } else if (rule.calculation_type === 'Vast bedrag (€)' && rule.fixed_amount) {
                        displayText = `${rule.name}: €${rule.fixed_amount}`;
                      } else if (rule.calculation_type === 'Per uur (€/uur)' && rule.value) {
                        displayText = `${rule.name}: €${rule.value}/uur`;
                      } else if (rule.calculation_type === 'Per dag (€/dag)' && rule.value) {
                        displayText = `${rule.name}: €${rule.value}/dag`;
                      }
                      return (
                        <Badge key={rule.id} variant="outline" className="text-xs w-fit">
                          {displayText}
                        </Badge>
                      );
                    })}
                  {activeRules.filter(r => r.category === 'Overwerk').length === 0 && (
                    <span className="text-xs text-slate-400">Geen regels</span>
                  )}
                </div>
              </div>

              {/* Bijzondere arbeid (toeslagen) */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Toeslagen</h4>
                <div className="flex flex-col gap-1">
                  {activeRules
                    .filter(r => r.category === 'Bijzondere arbeid')
                    .sort((a, b) => {
                      const order = ['Toeslag 50% zaterdag - aanvulling', 'Toeslag 100% zondag - aanvulling', 'Toeslag 100% feestdagen - aanvulling', 'Nachttoeslag eendaagse ritten (21:00-05:00)'];
                      const indexA = order.indexOf(a.name);
                      const indexB = order.indexOf(b.name);
                      if (indexA === -1 && indexB === -1) return 0;
                      if (indexA === -1) return 1;
                      if (indexB === -1) return -1;
                      return indexA - indexB;
                    })
                    .map(rule => {
                      let displayText = rule.name;
                      if (rule.calculation_type === 'Percentage (%)' && rule.percentage) {
                        displayText = `${rule.name}: ${rule.percentage}%`;
                      } else if (rule.calculation_type === 'Vast bedrag (€)' && rule.fixed_amount) {
                        displayText = `${rule.name}: €${rule.fixed_amount}`;
                      } else if (rule.calculation_type === 'Per uur (€/uur)' && rule.value) {
                        displayText = `${rule.name}: €${rule.value}/uur`;
                      } else if (rule.calculation_type === 'Per dag (€/dag)' && rule.value) {
                        displayText = `${rule.name}: €${rule.value}/dag`;
                      }
                      return (
                        <Badge key={rule.id} variant="outline" className="text-xs w-fit">
                          {displayText}
                        </Badge>
                      );
                    })}
                  {activeRules.filter(r => r.category === 'Bijzondere arbeid').length === 0 && (
                    <span className="text-xs text-slate-400">Geen regels</span>
                  )}
                </div>
              </div>

              {/* Verblijfkosten */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Verblijfkosten</h4>
                <div className="flex flex-col gap-1">
                  {activeRules
                    .filter(r => r.category === 'Verblijfkosten')
                    .sort((a, b) => {
                      const order = [
                        'Verblijfskosten ééndaagse ritten - basis (>4 uur)',
                        'Verblijfskosten ééndaagse ritten - avond (18:00-24:00)',
                        'Verblijfskosten ééndaagse ritten - lange dag toeslag',
                        'Verblijfskosten meerdaagse ritten - eerste dag',
                        'Verblijfskosten meerdaagse ritten - eerste dag avond',
                        'Verblijfskosten meerdaagse ritten - tussentijdse dag',
                        'Verblijfskosten meerdaagse ritten - laatste dag laat',
                        'Verblijfskosten meerdaagse ritten - laatste dag avond',
                        'Verblijfskosten meerdaagse ritten - laatste dag nacht',
                        'Verblijfskosten meerdaagse ritten - laatste dag',
                        'Verblijfskosten overstaan weekend/feestdag'
                      ];
                      const indexA = order.indexOf(a.name);
                      const indexB = order.indexOf(b.name);
                      if (indexA === -1 && indexB === -1) return 0;
                      if (indexA === -1) return 1;
                      if (indexB === -1) return -1;
                      return indexA - indexB;
                    })
                    .map(rule => {
                      let displayText = rule.name;
                      if (rule.calculation_type === 'Percentage (%)' && rule.percentage) {
                        displayText = `${rule.name}: ${rule.percentage}%`;
                      } else if (rule.calculation_type === 'Vast bedrag (€)' && rule.fixed_amount) {
                        displayText = `${rule.name}: €${rule.fixed_amount}`;
                      } else if (rule.calculation_type === 'Per uur (€/uur)' && rule.value) {
                        displayText = `${rule.name}: €${rule.value}/uur`;
                      } else if (rule.calculation_type === 'Per dag (€/dag)' && rule.value) {
                        displayText = `${rule.name}: €${rule.value}/dag`;
                      }
                      return (
                        <Badge key={rule.id} variant="outline" className="text-xs w-fit">
                          {displayText}
                        </Badge>
                      );
                    })}
                  {activeRules.filter(r => r.category === 'Verblijfkosten').length === 0 && (
                    <span className="text-xs text-slate-400">Geen regels</span>
                  )}
                </div>
              </div>


            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}