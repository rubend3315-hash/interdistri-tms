import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { getWeek, getDay, format } from "date-fns";
import { calculateWeekData, VARIABELE_KOLOMMEN } from "./LoonrapportOverzicht";

export default function LoonrapportDetail({
  employee, year, selectedPeriode, periodes, timeEntries, holidays, salaryTables, onBack
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

  const monthlyRate = useMemo(() => {
    if (!loonschaal || !salaryTables.length) return 0;
    const match = salaryTables.find(t =>
      t.status === "Actief" &&
      `${t.scale}${t.step != null ? ` Trede ${t.step}` : ""}` === loonschaal
    );
    return match?.monthly_salary || (hourlyRate * contractHours * 52 / 12);
  }, [loonschaal, salaryTables, hourlyRate, contractHours]);

  const yearlyRate = monthlyRate * 12;
  const dailyRate = monthlyRate / 21.75;
  const parttime = contractHours >= 40 ? 100 : Math.round((contractHours / 40) * 100);

  const inServiceDate = employee.in_service_since || employee.contract_start_date ||
    ((employee.contractregels || []).filter(c => c.startdatum).sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0]?.startdatum || "");

  const currentPeriode = periodes.find(p => p.periode === selectedPeriode) || periodes[0];

  // Bereken data per week in de geselecteerde periode
  const wekenDetail = useMemo(() => {
    return currentPeriode.weken.map(weekNr => {
      const weekEntries = timeEntries.filter(e => {
        if (!e.date || e.status !== "Goedgekeurd" || e.employee_id !== employee.id) return false;
        const d = new Date(e.date);
        if (d.getFullYear() !== year) return false;
        const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
        return wk === weekNr;
      });
      const data = calculateWeekData(employee, weekEntries, holidays);
      
      // Reiskosten
      let woonWerk = 0;
      weekEntries.forEach(e => {
        if ((e.total_hours || 0) > 0 && (e.travel_allowance_multiplier || 0) > 0) {
          woonWerk += (reiskosten.vergoeding_per_dag || 0) * (e.travel_allowance_multiplier || 1);
        }
      });
      data.woonwerk = Math.round(woonWerk * 100) / 100;

      return { weekNr, ...data };
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

  // Kolommen met data voor deze medewerker
  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      return wekenDetail.some(w => (w[col.key] || 0) !== 0) || (periodeTotals[col.key] || 0) !== 0;
    });
  }, [wekenDetail, periodeTotals]);

  // Toeslag bedragen berekenen uit periodeTotals
  const toeslagBedragen = useMemo(() => {
    const calc = (key, pct) => Math.round((periodeTotals[key] || 0) * hourlyRate * pct * 100) / 100;
    return {
      toeslagenmatrix_19: calc("toeslagenmatrix_19", 0.19),
      toeslag_za_50: calc("toeslag_za_50", 0.50),
      za_overwerk_150: calc("za_overwerk_150", 0.50), // 50% toeslag op 150%
      toeslag_zo_100: calc("toeslag_zo_100", 1.00),
      zo_overwerk_200: calc("zo_overwerk_200", 1.00), // 100% toeslag op 200%
      toeslag_feestdag_100: calc("toeslag_feestdag_100", 1.00),
      feestdag_overwerk_200: calc("feestdag_overwerk_200", 1.00),
      overwerk_130: calc("overwerk_130", 0.30), // 30% toeslag op 130%
      variabele_uren_100: isOproepkracht ? Math.round((periodeTotals.variabele_uren_100 || 0) * hourlyRate * 100) / 100 : 0,
    };
  }, [periodeTotals, hourlyRate, isOproepkracht]);

  const handlePrint = () => window.print();

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(4).replace(/\.?0+$/, "");
  };

  const fmtEuro = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    return `€ ${v.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar overzicht
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>

      {/* Koptekst */}
      <Card className="overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-bold text-lg">
                ({employee.initials || ""}) {getFullName(employee)}
              </p>
              <p className="text-slate-300 text-sm">Personeelsnummer: {employee.employee_number || "-"}</p>
            </div>
            <div>
              <p className="text-sm">Functie: <span className="font-medium">{employee.function || "-"}</span></p>
              <p className="text-sm">Afdeling: <span className="font-medium">{employee.department || "-"}</span></p>
            </div>
            <div>
              <p className="text-sm">In dienst: <span className="font-medium">{inServiceDate ? format(new Date(inServiceDate), "dd-MM-yyyy") : "-"}</span></p>
              <p className="text-sm">Uit dienst: <span className="font-medium">{employee.contract_end_date ? format(new Date(employee.contract_end_date), "dd-MM-yyyy") : ""}</span></p>
            </div>
          </div>
        </div>

        {/* Basis loongegevens */}
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b bg-slate-50">
            <p className="font-semibold text-slate-700">Basis loongegevens</p>
            <p className="text-sm text-slate-500">Loonrun {year}-{String(selectedPeriode).padStart(2, "0")} · {currentPeriode.maand}</p>
          </div>
          <div className="divide-y">
            <Row label="Uren" value={isOproepkracht ? "Oproep (variabel)" : contractHours >= 40 ? "Vast" : `Parttime (${contractHours} uur)`} />
            <Row label="Loonschaal" value={loonschaal || "-"} />
            <Row label="Parttime percentage" value={`${parttime},00 %`} />
            <Row label="Contracturen per week" value={contractHours.toFixed(2)} />
            <Row label="Bruto jaarloon" value={`€ ${yearlyRate.toFixed(2)}`} isCurrency />
            <Row label="Bruto maandloon" value={`€ ${monthlyRate.toFixed(2)}`} isCurrency />
            <Row label="Bruto dagloon" value={`€ ${dailyRate.toFixed(2)}`} isCurrency />
            <Row label="Bruto uurloon" value={`€ ${hourlyRate.toFixed(2)}`} isCurrency />
          </div>
        </CardContent>
      </Card>

      {/* Variabele componenten per week */}
      <Card className="overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-3">
          <span className="font-semibold text-sm">
            Variabele kosten Periode {selectedPeriode} – Week {currentPeriode.weken[0]} t/m {currentPeriode.weken[currentPeriode.weken.length - 1]}
          </span>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="sticky left-0 bg-slate-100 z-10 text-xs">Component</TableHead>
                  {currentPeriode.weken.map(wk => (
                    <TableHead key={wk} className="text-right text-xs whitespace-nowrap">Wk {wk}</TableHead>
                  ))}
                  <TableHead className="text-right text-xs font-bold bg-slate-200">Totaal</TableHead>
                  <TableHead className="text-right text-xs font-bold bg-slate-200">Bedrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleColumns.map(col => {
                  const total = periodeTotals[col.key] || 0;
                  const isEuro = col.key === "verblijfkosten";
                  const toeslagKey = col.key;
                  const bedrag = toeslagBedragen[toeslagKey] || null;

                  return (
                    <TableRow key={col.key} className="hover:bg-slate-50">
                      <TableCell className="sticky left-0 bg-white z-10 text-xs text-slate-600 whitespace-nowrap">
                        {col.label}
                      </TableCell>
                      {currentPeriode.weken.map(wk => {
                        const weekData = wekenDetail.find(w => w.weekNr === wk);
                        const val = weekData ? weekData[col.key] || 0 : 0;
                        return (
                          <TableCell key={wk} className="text-right text-xs text-slate-600">
                            {isEuro ? fmtEuro(val) : fmt(val)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right text-xs font-semibold bg-slate-50">
                        {isEuro ? fmtEuro(total) : fmt(total)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-600 bg-slate-50">
                        {isEuro ? fmtEuro(total) : bedrag ? fmtEuro(bedrag) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Woon-werk reiskosten */}
                {periodeTotals.woonwerk > 0 && (
                  <TableRow className="hover:bg-slate-50">
                    <TableCell className="sticky left-0 bg-white z-10 text-xs text-slate-600 whitespace-nowrap">
                      Woon-werkverkeer onbelast
                    </TableCell>
                    {currentPeriode.weken.map(wk => {
                      const weekData = wekenDetail.find(w => w.weekNr === wk);
                      return (
                        <TableCell key={wk} className="text-right text-xs text-slate-600">
                          {fmtEuro(weekData?.woonwerk || 0)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-xs font-semibold bg-slate-50">
                      {fmtEuro(periodeTotals.woonwerk)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-emerald-600 bg-slate-50">
                      {fmtEuro(periodeTotals.woonwerk)}
                    </TableCell>
                  </TableRow>
                )}
                {/* Totaalrij */}
                <TableRow className="bg-slate-200 font-bold border-t-2">
                  <TableCell className="sticky left-0 bg-slate-200 z-10 text-xs">Totaal periode</TableCell>
                  {currentPeriode.weken.map(wk => (
                    <TableCell key={wk} className="text-right text-xs">
                      {fmt(wekenDetail.find(w => w.weekNr === wk)?.uren_100 || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-xs bg-slate-200">
                    {fmt(periodeTotals.uren_100)}
                  </TableCell>
                  <TableCell className="text-right text-xs bg-slate-200" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, isCurrency }) {
  return (
    <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-medium ${isCurrency ? "text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}