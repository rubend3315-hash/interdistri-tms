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

  const { data: loonperiodeStatuses = [] } = useQuery({
    queryKey: ['loonperiodeStatuses'],
    queryFn: () => base44.entities.LoonperiodeStatus.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const definitiefMutation = useMutation({
    mutationFn: async ({ year, periode, action }) => {
      const existing = loonperiodeStatuses.find(s => s.year === year && s.periode === periode);
      if (action === "definitief") {
        const user = await base44.auth.me();
        if (existing) {
          return base44.entities.LoonperiodeStatus.update(existing.id, {
            status: "Definitief",
            definitief_datum: new Date().toISOString(),
            definitief_door: user?.email
          });
        } else {
          return base44.entities.LoonperiodeStatus.create({
            year, periode, status: "Definitief",
            definitief_datum: new Date().toISOString(),
            definitief_door: user?.email
          });
        }
      } else {
        if (existing) {
          return base44.entities.LoonperiodeStatus.update(existing.id, { status: "Open" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loonperiodeStatuses'] });
      setDefinitiefDialogOpen(false);
    }
  });

  const currentPeriodeStatus = loonperiodeStatuses.find(
    s => s.year === selectedYear && s.periode === selectedPeriode
  );
  const isDefinitief = currentPeriodeStatus?.status === "Definitief";

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
                    {isDefinitief ? (
                      <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1.5 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Definitief – {currentPeriodeStatus?.definitief_door} op {currentPeriodeStatus?.definitief_datum ? format(new Date(currentPeriodeStatus.definitief_datum), "d MMM yyyy HH:mm", { locale: nl }) : ""}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 px-3 py-1.5 flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5" />
                        Open – Nog niet definitief
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      {!isDefinitief && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setDefinitiefDialogOpen(true)}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Definitief maken
                        </Button>
                      )}
                      {isDefinitief && currentUser?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => definitiefMutation.mutate({ year: selectedYear, periode: selectedPeriode, action: "heropenen" })}
                        >
                          <Unlock className="w-4 h-4 mr-1" />
                          Heropenen
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfig(!showConfig)}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-1" />
                        {showConfig ? "Verberg periodes" : "Periodes inzien"}
                      </Button>
                    </div>
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

      {/* Definitief maken dialog */}
      <Dialog open={definitiefDialogOpen} onOpenChange={setDefinitiefDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Loonperiode definitief maken
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-2">
                U staat op het punt Periode {selectedPeriode} ({periodes.find(p => p.periode === selectedPeriode)?.maand}) van {selectedYear} definitief te maken.
              </p>
              <p className="text-sm text-amber-700">
                Na het definitief maken:
              </p>
              <ul className="text-sm text-amber-700 mt-1 list-disc ml-5 space-y-1">
                <li>Kunnen tijdregistraties in deze periode niet meer gewijzigd worden</li>
                <li>Kunnen ritten in deze periode niet meer gewijzigd worden</li>
                <li>Het loonrapport van deze periode wordt vergrendeld</li>
                <li>Alleen een admin kan de periode heropenen</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDefinitiefDialogOpen(false)}>
                Annuleren
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => definitiefMutation.mutate({ year: selectedYear, periode: selectedPeriode, action: "definitief" })}
                disabled={definitiefMutation.isPending}
              >
                <Lock className="w-4 h-4 mr-1" />
                Bevestigen – Definitief maken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}