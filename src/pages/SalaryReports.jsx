import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Euro,
  Users,
  RefreshCw,
  FileSpreadsheet,
  Scale,
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import SalaryExportStamgegevens from "@/components/salary/SalaryExportStamgegevens";
import SalaryExportMutation from "@/components/salary/SalaryExportMutation";
import LoonperiodeConfig, { getDefaultPeriodes } from "@/components/salary/LoonperiodeConfig";
import LoonrapportOverzicht from "@/components/salary/LoonrapportOverzicht";
import LoonrapportDetail from "@/components/salary/LoonrapportDetail";
import Urenbalans from "@/components/salary/Urenbalans";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function SalaryReports() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriode, setSelectedPeriode] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState("loonrapport");
  const [periodes, setPeriodes] = useState(getDefaultPeriodes());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [balansEmployeeIndex, setBalansEmployeeIndex] = useState(0);
  const [definitiefDialogOpen, setDefinitiefDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['timeEntries-all'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays-all'],
    queryFn: () => base44.entities.Holiday.list()
  });

  const { data: salaryTables = [] } = useQuery({
    queryKey: ['salaryTables'],
    queryFn: () => base44.entities.SalaryTable.list()
  });

  const isLoading = loadingEmployees || loadingEntries;

  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);

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
          <h1 className="text-3xl font-bold text-slate-900">Salarisadministratie</h1>
          <p className="text-slate-500 mt-1">CAO Beroepsgoederenvervoer – 13 periodes / 52 weken</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="loonrapport" className="gap-2">
            <Euro className="w-4 h-4" />
            Loonrapport
          </TabsTrigger>
          <TabsTrigger value="urenbalans" className="gap-2">
            <Scale className="w-4 h-4" />
            Urenbalans
          </TabsTrigger>
          <TabsTrigger value="mutaties" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Salarismutaties
          </TabsTrigger>
          <TabsTrigger value="stamgegevens" className="gap-2">
            <Users className="w-4 h-4" />
            Stamgegevens Export
          </TabsTrigger>
        </TabsList>

        {/* === LOONRAPPORT TAB === */}
        <TabsContent value="loonrapport">
          <div className="space-y-4">
            {/* Filters */}
            {!selectedEmployee && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Jaar</Label>
                      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Loonperiode</Label>
                      <Select value={String(selectedPeriode)} onValueChange={(v) => setSelectedPeriode(Number(v))}>
                        <SelectTrigger className="w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {periodes.map(p => (
                            <SelectItem key={p.periode} value={String(p.periode)}>
                              Periode {p.periode} – {p.maand} (wk {p.weken[0]}-{p.weken[p.weken.length - 1]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfig(!showConfig)}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-1" />
                      {showConfig ? "Verberg periodes" : "Periodes inzien"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Periodes configuratie */}
            {showConfig && !selectedEmployee && (
              <LoonperiodeConfig periodes={periodes} onSave={setPeriodes} />
            )}

            {/* Content */}
            {isLoading ? (
              <Skeleton className="h-96" />
            ) : selectedEmployee ? (
              <LoonrapportDetail
                employee={selectedEmployee}
                year={selectedYear}
                selectedPeriode={selectedPeriode}
                periodes={periodes}
                timeEntries={timeEntries}
                holidays={holidays}
                salaryTables={salaryTables}
                onBack={() => setSelectedEmployee(null)}
              />
            ) : (
              <LoonrapportOverzicht
                year={selectedYear}
                selectedPeriode={selectedPeriode}
                periodes={periodes}
                employees={employees}
                timeEntries={timeEntries}
                holidays={holidays}
                salaryTables={salaryTables}
                onSelectEmployee={setSelectedEmployee}
              />
            )}
          </div>
        </TabsContent>

        {/* === URENBALANS TAB === */}
        <TabsContent value="urenbalans">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Label>Jaar</Label>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            {isLoading ? (
              <Skeleton className="h-96" />
            ) : (
              <Urenbalans
                year={selectedYear}
                periodes={periodes}
                employees={employees}
                timeEntries={timeEntries}
                holidays={holidays}
                salaryTables={salaryTables}
                employeeIndex={balansEmployeeIndex}
                onChangeEmployee={setBalansEmployeeIndex}
              />
            )}
          </div>
        </TabsContent>

        {/* === STAMGEGEVENS TAB === */}
        <TabsContent value="stamgegevens">
          <SalaryExportStamgegevens employees={employees} />
        </TabsContent>

        {/* === MUTATIES TAB === */}
        <TabsContent value="mutaties">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
            <SalaryExportMutation
              employees={employees}
              timeEntries={timeEntries}
              salaryTables={salaryTables}
              selectedMonth={selectedMonth}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}