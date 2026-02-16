import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFullName } from "@/components/utils/employeeUtils";
import { getWeek, format } from "date-fns";
import { calculateWeekData, VARIABELE_KOLOMMEN } from "@/components/salary/LoonrapportOverzicht";

export default function AuditLoonrapport({
  employee, year, selectedPeriode, periodes, timeEntries, holidays, salaryTables
}) {
  const contract = useMemo(() => {
    return (employee.contractregels || [])
      .filter(c => c.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  }, [employee]);

  const reiskosten = useMemo(() => {
    return (employee.reiskostenregels || [])
      .filter(r => r.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  }, [employee]);

  const loonschaal = contract.loonschaal || employee.salary_scale || "";
  const contractHours = contract.uren_per_week || employee.contract_hours || 0;
  const isOproepkracht = employee.contract_type === "Oproep" ||
    (contract.type_contract || "").toLowerCase().includes("oproep");

  const hourlyRate = useMemo(() => {
    if (employee.hourly_rate) return employee.hourly_rate;
    if (!loonschaal || !salaryTables.length) return 0;
    const match = salaryTables.find(t =>
      t.status === "Actief" &&
      `${t.scale}${t.step != null ? ` Trede ${t.step}` : ""}` === loonschaal
    );
    return match?.hourly_rate || 0;
  }, [employee, loonschaal, salaryTables]);

  const currentPeriode = periodes.find(p => p.periode === selectedPeriode) || periodes[0];

  // Week data
  const wekenDetail = useMemo(() => {
    return currentPeriode.weken.map(weekNr => {
      const weekEntries = timeEntries.filter(e => {
        if (!e.date || e.status !== "Goedgekeurd" || e.employee_id !== employee.id) return false;
        const d = new Date(e.date);
        if (d.getFullYear() !== year) return false;
        const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
        return wk === weekNr;
      });
      const jan4 = new Date(year, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNr - 1) * 7);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const data = calculateWeekData(employee, weekEntries, holidays, weekStartStr);

      let woonWerk = 0;
      weekEntries.forEach(e => {
        if ((e.total_hours || 0) > 0 && (e.travel_allowance_multiplier || 0) > 0) {
          woonWerk += (reiskosten.vergoeding_per_dag || 0) * (e.travel_allowance_multiplier || 1);
        }
      });
      data.woonwerk = Math.round(woonWerk * 100) / 100;

      return { weekNr, weekStartStr, ...data };
    });
  }, [timeEntries, employee, year, currentPeriode, holidays, reiskosten]);

  // Periode totalen
  const periodeTotals = useMemo(() => {
    const totals = {};
    VARIABELE_KOLOMMEN.forEach(col => {
      totals[col.key] = wekenDetail.reduce((s, w) => s + (w[col.key] || 0), 0);
    });
    totals.woonwerk = wekenDetail.reduce((s, w) => s + (w.woonwerk || 0), 0);
    return totals;
  }, [wekenDetail]);

  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col =>
      wekenDetail.some(w => (w[col.key] || 0) !== 0) || (periodeTotals[col.key] || 0) !== 0
    );
  }, [wekenDetail, periodeTotals]);

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(4).replace(/\.?0+$/, "");
  };

  const inServiceDate = employee.in_service_since || employee.contract_start_date ||
    ((employee.contractregels || []).filter(c => c.startdatum).sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0]?.startdatum || "");

  return (
    <div className="space-y-3 p-4">
      {/* Stamgegevens */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <InfoItem label="Loonschaal" value={loonschaal || "-"} />
        <InfoItem label="Contracturen/week" value={`${contractHours} uur`} />
        <InfoItem label="Uurloon" value={`€ ${hourlyRate.toFixed(2)}`} />
        <InfoItem label="In dienst" value={inServiceDate ? format(new Date(inServiceDate), "dd-MM-yyyy") : "-"} />
      </div>

      {/* Weekberekening tabel */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100 text-xs">
              <TableHead className="font-semibold">Component</TableHead>
              {wekenDetail.map(w => (
                <TableHead key={w.weekNr} className="text-center font-semibold">
                  Wk {w.weekNr}
                </TableHead>
              ))}
              <TableHead className="text-center font-bold bg-slate-200">Totaal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleColumns.map(col => {
              const isEuro = col.key === "verblijfkosten";
              return (
                <TableRow key={col.key} className="text-xs">
                  <TableCell className="font-medium whitespace-nowrap">{col.label}</TableCell>
                  {wekenDetail.map(w => (
                    <TableCell key={w.weekNr} className="text-center">
                      {isEuro ? (w[col.key] ? `€${w[col.key].toFixed(2)}` : "-") : fmt(w[col.key])}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold bg-slate-50">
                    {isEuro ? (periodeTotals[col.key] ? `€${periodeTotals[col.key].toFixed(2)}` : "-") : fmt(periodeTotals[col.key])}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Woon-werkverkeer */}
            {periodeTotals.woonwerk > 0 && (
              <TableRow className="text-xs">
                <TableCell className="font-medium">Woon-werk onbelast</TableCell>
                {wekenDetail.map(w => (
                  <TableCell key={w.weekNr} className="text-center">
                    {w.woonwerk > 0 ? `€${w.woonwerk.toFixed(2)}` : "-"}
                  </TableCell>
                ))}
                <TableCell className="text-center font-semibold bg-slate-50">
                  €{periodeTotals.woonwerk.toFixed(2)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Toeslag bedragen */}
      <div className="text-xs text-slate-500 px-2">
        <p>* Berekeningen conform CAO Beroepsgoederenvervoer · Uurloon: €{hourlyRate.toFixed(2)}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}