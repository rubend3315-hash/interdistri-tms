import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function SalaryExportMutation({ employees, timeEntries, salaryTables, selectedMonth }) {
  // Uursoort-mapping ophalen
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;

  const [yearNum, monthNum] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(yearNum, monthNum - 1));
  const monthEnd = endOfMonth(new Date(yearNum, monthNum - 1));

  const activeEmployees = employees.filter(e => e.status === "Actief");

  const monthEntries = useMemo(() => timeEntries.filter(entry => {
    if (!entry.date) return false;
    const d = new Date(entry.date);
    return d >= monthStart && d <= monthEnd && entry.status === "Goedgekeurd";
  }), [timeEntries, monthStart, monthEnd]);

  const getActiveContract = (emp) => {
    return (emp.contractregels || [])
      .filter(c => c.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  };

  const getActiveReiskosten = (emp) => {
    return (emp.reiskostenregels || [])
      .filter(r => r.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  };

  const getHourlyRate = (emp) => {
    if (emp.hourly_rate) return emp.hourly_rate;
    const contract = getActiveContract(emp);
    if (!contract.loonschaal || !salaryTables.length) return 0;
    const match = salaryTables.find(t =>
      t.status === "Actief" &&
      `${t.scale}${t.step != null ? ` Trede ${t.step}` : ""}` === contract.loonschaal
    );
    return match?.hourly_rate || 0;
  };

  const mutationData = useMemo(() => {
    return activeEmployees.map(emp => {
      const entries = monthEntries.filter(e => e.employee_id === emp.id);
      const contract = getActiveContract(emp);
      const reiskosten = getActiveReiskosten(emp);
      const hourlyRate = getHourlyRate(emp);

      let totalHours = 0, overtimeHours = 0, nightHours = 0, weekendHours = 0, holidayHours = 0;
      let subsistence = 0, advancedCosts = 0, meals = 0, wkr = 0;

      entries.forEach(e => {
        totalHours += e.total_hours || 0;
        overtimeHours += e.overtime_hours || 0;
        nightHours += e.night_hours || 0;
        weekendHours += e.weekend_hours || 0;
        holidayHours += e.holiday_hours || 0;
        subsistence += e.subsistence_allowance || 0;
        advancedCosts += e.advanced_costs || 0;
        meals += e.meals || 0;
        wkr += e.wkr || 0;
      });

      const contractHours = contract.uren_per_week ?? 0;
      const workWeeks = 4.33;
      const expectedHours = contractHours * workWeeks;
      const workDays = entries.length;
      const travelPerDay = reiskosten.vergoeding_per_dag || 0;
      const totalTravel = workDays * travelPerDay;

      return {
        employee: emp,
        contractHours,
        expectedHours: Math.round(expectedHours * 10) / 10,
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        nightHours: Math.round(nightHours * 100) / 100,
        weekendHours: Math.round(weekendHours * 100) / 100,
        holidayHours: Math.round(holidayHours * 100) / 100,
        hourlyRate,
        baseSalary: Math.round(totalHours * hourlyRate * 100) / 100,
        workDays,
        travelPerDay,
        totalTravel: Math.round(totalTravel * 100) / 100,
        subsistence: Math.round(subsistence * 100) / 100,
        advancedCosts: Math.round(advancedCosts * 100) / 100,
        meals: Math.round(meals * 100) / 100,
        wkr: Math.round(wkr * 100) / 100,
        loonschaal: contract.loonschaal || emp.salary_scale || "",
        difference: Math.round((totalHours - expectedHours) * 10) / 10
      };
    }).sort((a, b) => getFullName(a.employee).localeCompare(getFullName(b.employee)));
  }, [activeEmployees, monthEntries, salaryTables]);

  const exportMutationCSV = () => {
    const owCode = uursoortMapping?.overwerk_130 || "OW";
    const headers = [
      "Personeelsnummer", "Naam", "Afdeling", "Loonschaal",
      "Contract uren/wk", "Verwachte uren", "Gewerkte uren", "Verschil",
      `Overwerk (${owCode})`, "Nacht uren", "Weekend uren", "Feestdag uren",
      "Uurloon", "Basisloon",
      "Werkdagen", "Reiskosten/dag", "Totaal reiskosten",
      "Verblijfskosten", "Voorgeschoten kosten", "Inhoudingen", "WKR"
    ];

    const rows = mutationData.map(r => [
      r.employee.employee_number || "",
      getFullName(r.employee),
      r.employee.department || "",
      r.loonschaal,
      r.contractHours,
      r.expectedHours,
      r.totalHours,
      r.difference,
      r.overtimeHours,
      r.nightHours,
      r.weekendHours,
      r.holidayHours,
      r.hourlyRate.toFixed(2),
      r.baseSalary.toFixed(2),
      r.workDays,
      r.travelPerDay.toFixed(2),
      r.totalTravel.toFixed(2),
      r.subsistence.toFixed(2),
      r.advancedCosts.toFixed(2),
      r.meals.toFixed(2),
      r.wkr.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")
    ).join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salaris_mutatie_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => ({
    totalHours: mutationData.reduce((s, r) => s + r.totalHours, 0),
    expectedHours: mutationData.reduce((s, r) => s + r.expectedHours, 0),
    overtimeHours: mutationData.reduce((s, r) => s + r.overtimeHours, 0),
    nightHours: mutationData.reduce((s, r) => s + r.nightHours, 0),
    weekendHours: mutationData.reduce((s, r) => s + r.weekendHours, 0),
    baseSalary: mutationData.reduce((s, r) => s + r.baseSalary, 0),
    totalTravel: mutationData.reduce((s, r) => s + r.totalTravel, 0),
    subsistence: mutationData.reduce((s, r) => s + r.subsistence, 0),
  }), [mutationData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
            {mutationData.length} medewerkers
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">
            {totals.totalHours.toFixed(1)} uren totaal
          </Badge>
        </div>
        <Button onClick={exportMutationCSV} className="bg-purple-600 hover:bg-purple-700">
          <Download className="w-4 h-4 mr-2" />
          Export Mutatie CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">Verwachte uren</p>
            <p className="text-lg font-bold">{totals.expectedHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">Gewerkte uren</p>
            <p className="text-lg font-bold">{totals.totalHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">Totaal basisloon</p>
            <p className="text-lg font-bold">€{totals.baseSalary.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">Totaal reiskosten</p>
            <p className="text-lg font-bold">€{totals.totalTravel.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Salarismutaties - Uren & Vergoedingen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Medewerker</TableHead>
                  <TableHead>Loonschaal</TableHead>
                  <TableHead className="text-right">Contract u/wk</TableHead>
                  <TableHead className="text-right">Verwacht</TableHead>
                  <TableHead className="text-right">Gewerkt</TableHead>
                  <TableHead className="text-right">Verschil</TableHead>
                  <TableHead className="text-right">Overwerk</TableHead>
                  <TableHead className="text-right">Nacht</TableHead>
                  <TableHead className="text-right">Weekend</TableHead>
                  <TableHead className="text-right">Uurloon</TableHead>
                  <TableHead className="text-right">Basisloon</TableHead>
                  <TableHead className="text-right">Reiskosten</TableHead>
                  <TableHead className="text-right">Verblijf</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mutationData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-slate-500">
                      <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Geen data voor deze periode
                    </TableCell>
                  </TableRow>
                ) : (
                  mutationData.map(r => (
                    <TableRow key={r.employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{getFullName(r.employee)}</p>
                          <p className="text-xs text-slate-500">{r.employee.department}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">{r.loonschaal || "-"}</TableCell>
                      <TableCell className="text-right">{r.contractHours || "-"}</TableCell>
                      <TableCell className="text-right">{r.expectedHours}</TableCell>
                      <TableCell className="text-right font-medium">{r.totalHours}</TableCell>
                      <TableCell className={`text-right font-medium ${r.difference > 0 ? "text-emerald-600" : r.difference < 0 ? "text-red-600" : ""}`}>
                        {r.difference > 0 ? "+" : ""}{r.difference}
                      </TableCell>
                      <TableCell className="text-right">{r.overtimeHours > 0 ? r.overtimeHours : "-"}</TableCell>
                      <TableCell className="text-right">{r.nightHours > 0 ? r.nightHours : "-"}</TableCell>
                      <TableCell className="text-right">{r.weekendHours > 0 ? r.weekendHours : "-"}</TableCell>
                      <TableCell className="text-right">€{r.hourlyRate.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{r.baseSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.totalTravel > 0 ? `€${r.totalTravel.toFixed(2)}` : "-"}</TableCell>
                      <TableCell className="text-right">{r.subsistence > 0 ? `€${r.subsistence.toFixed(2)}` : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
                {mutationData.length > 0 && (
                  <TableRow className="bg-slate-100 font-bold">
                    <TableCell>Totaal</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{totals.expectedHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{totals.totalHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {(totals.totalHours - totals.expectedHours).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">{totals.overtimeHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{totals.nightHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{totals.weekendHours.toFixed(1)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">€{totals.baseSalary.toFixed(2)}</TableCell>
                    <TableCell className="text-right">€{totals.totalTravel.toFixed(2)}</TableCell>
                    <TableCell className="text-right">€{totals.subsistence.toFixed(2)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Medewerkers zonder uren warning */}
      {mutationData.filter(r => r.totalHours === 0).length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Medewerkers zonder goedgekeurde uren</p>
                <p className="text-sm text-amber-700 mt-1">
                  {mutationData.filter(r => r.totalHours === 0).map(r => getFullName(r.employee)).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}