import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Shield, Users, FileText, Truck, Euro, ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { getDefaultPeriodes } from "@/components/salary/LoonperiodeConfig";
import AuditTimeEntries from "@/components/audit/AuditTimeEntries";
import AuditTrips from "@/components/audit/AuditTrips";
import AuditLoonrapport from "@/components/audit/AuditLoonrapport";
import AuditNormenset from "@/components/audit/AuditNormenset";

export default function PayCheckedAudit() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriode, setSelectedPeriode] = useState(1);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeTab, setActiveTab] = useState("steekproef");
  const periodes = getDefaultPeriodes();

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [], isLoading: loadingTE } = useQuery({
    queryKey: ['timeEntries-all'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['trips-all'],
    queryFn: () => base44.entities.Trip.list()
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays-all'],
    queryFn: () => base44.entities.Holiday.list()
  });

  const { data: salaryTables = [] } = useQuery({
    queryKey: ['salaryTables'],
    queryFn: () => base44.entities.SalaryTable.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === "Actief" && e.department !== "Charters")
      .sort((a, b) => getFullName(a).localeCompare(getFullName(b))),
    [employees]
  );

  const currentPeriode = periodes.find(p => p.periode === selectedPeriode) || periodes[0];

  const toggleEmployee = (id) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedEmployeeIds(activeEmployees.map(e => e.id));
  const selectNone = () => setSelectedEmployeeIds([]);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateReport = () => {
    if (selectedEmployeeIds.length === 0) return;
    // Expand all sections by default
    const sections = {};
    selectedEmployeeIds.forEach(id => {
      sections[`time-${id}`] = true;
      sections[`trips-${id}`] = true;
      sections[`loon-${id}`] = true;
    });
    setExpandedSections(sections);
    setShowReport(true);
  };

  const handlePrint = () => window.print();

  const isLoading = loadingEmp || loadingTE || loadingTrips;
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            PayChecked Audit Rapport
          </h1>
          <p className="text-slate-500 mt-1">
            Normenset Loonadministratie &amp; CAO Beroepsgoederenvervoer — Steekproefcontrole
          </p>
        </div>
        {showReport && (
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-1" /> Afdrukken
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="steekproef" className="gap-2">
            <FileText className="w-4 h-4" />
            Steekproef Rapport
          </TabsTrigger>
          <TabsTrigger value="normenset" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Normenset Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="normenset">
          <AuditNormenset />
        </TabsContent>

        <TabsContent value="steekproef">
      {/* Selectie */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Periode selectie */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Jaar</Label>
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loonperiode</Label>
              <Select value={String(selectedPeriode)} onValueChange={v => setSelectedPeriode(Number(v))}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodes.map(p => (
                    <SelectItem key={p.periode} value={String(p.periode)}>
                      Periode {p.periode} – {p.maand} (wk {p.weken[0]}-{p.weken[p.weken.length - 1]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Medewerker selectie */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medewerkers in steekproef</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Alles selecteren</Button>
                <Button variant="outline" size="sm" onClick={selectNone}>Niets selecteren</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {activeEmployees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5">
                  <Checkbox
                    checked={selectedEmployeeIds.includes(emp.id)}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                  />
                  <span className="text-sm truncate">
                    {emp.employee_number ? `(${emp.employee_number}) ` : ""}{getFullName(emp)}
                  </span>
                </label>
              ))}
            </div>
            <Badge variant="outline" className="text-sm">
              {selectedEmployeeIds.length} van {activeEmployees.length} medewerkers geselecteerd
            </Badge>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={selectedEmployeeIds.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-1" />
            Genereer Auditrapport
          </Button>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Rapport per medewerker */}
      {showReport && activeTab === "steekproef" && selectedEmployeeIds.map(empId => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return null;

        const empTimeEntries = timeEntries.filter(e => {
          if (e.employee_id !== emp.id || !e.date) return false;
          const d = new Date(e.date);
          if (d.getFullYear() !== selectedYear) return false;
          const weekNum = e.week_number || getWeekNumber(d);
          return currentPeriode.weken.includes(weekNum);
        });

        const empTrips = trips.filter(t => {
          if (t.employee_id !== emp.id || !t.date) return false;
          const d = new Date(t.date);
          if (d.getFullYear() !== selectedYear) return false;
          const weekNum = getWeekNumber(d);
          return currentPeriode.weken.includes(weekNum);
        });

        return (
          <div key={empId} className="space-y-3 print:break-before-page">
            {/* Medewerker header */}
            <Card className="overflow-hidden">
              <div className="bg-slate-800 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">
                      ({emp.employee_number || '-'}) {getFullName(emp)}
                    </h2>
                    <p className="text-slate-300 text-sm">
                      {emp.department} · {emp.function || '-'} · Periode {selectedPeriode} ({currentPeriode.maand} {selectedYear})
                    </p>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                    PayChecked Steekproef
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Tijdregistraties */}
            <SectionToggle
              icon={<FileText className="w-4 h-4" />}
              title={`Tijdregistraties met handtekening (${empTimeEntries.length} regels)`}
              sectionKey={`time-${empId}`}
              expanded={expandedSections[`time-${empId}`]}
              onToggle={toggleSection}
            >
              <AuditTimeEntries entries={empTimeEntries} employee={emp} />
            </SectionToggle>

            {/* Ritten */}
            <SectionToggle
              icon={<Truck className="w-4 h-4" />}
              title={`Rittenrapport (${empTrips.length} ritten)`}
              sectionKey={`trips-${empId}`}
              expanded={expandedSections[`trips-${empId}`]}
              onToggle={toggleSection}
            >
              <AuditTrips trips={empTrips} vehicles={vehicles} customers={customers} />
            </SectionToggle>

            {/* Loonrapport */}
            <SectionToggle
              icon={<Euro className="w-4 h-4" />}
              title="Loonrapport met weekberekening"
              sectionKey={`loon-${empId}`}
              expanded={expandedSections[`loon-${empId}`]}
              onToggle={toggleSection}
            >
              <AuditLoonrapport
                employee={emp}
                year={selectedYear}
                selectedPeriode={selectedPeriode}
                periodes={periodes}
                timeEntries={timeEntries}
                holidays={holidays}
                salaryTables={salaryTables}
              />
            </SectionToggle>
          </div>
        );
      })}
    </div>
  );
}

function SectionToggle({ icon, title, sectionKey, expanded, onToggle, children }) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center gap-3 px-5 py-3 bg-slate-100 hover:bg-slate-200 transition-colors text-left print:bg-slate-100"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        {icon}
        <span className="font-semibold text-sm text-slate-700">{title}</span>
      </button>
      {expanded && <CardContent className="p-0">{children}</CardContent>}
    </Card>
  );
}

function getWeekNumber(d) {
  const date = new Date(d);
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const daysSinceJan4 = Math.floor((date - jan4) / 86400000);
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  return Math.ceil((daysSinceJan4 + dayOfWeek + 1) / 7);
}