import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronDown, Download } from "lucide-react";
import { getWeek, getDay } from "date-fns";
import { getFullName } from "@/components/utils/employeeUtils";
import { calculateWeekData, VARIABELE_KOLOMMEN } from "@/components/salary/LoonrapportOverzicht";

export default function Urenbalans({
  year, periodes, employees, timeEntries, holidays, salaryTables,
  employeeIndex, onChangeEmployee
}) {
  const activeEmployees = useMemo(() =>
    employees
      .filter(e => e.status === "Actief" && e.department !== "Charters")
      .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "")),
    [employees]
  );

  const employee = activeEmployees[employeeIndex] || activeEmployees[0];
  if (!employee) return <p className="text-slate-500">Geen medewerkers gevonden.</p>;

  const activeContracts = useMemo(() => {
    return (employee.contractregels || [])
      .filter(c => c.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum));
  }, [employee]);

  const contract = activeContracts[0] || {};
  const contractHours = contract.uren_per_week || employee.contract_hours || 0;
  const isOproepkracht = employee.contract_type === "Oproep" ||
    (contract.type_contract || "").toLowerCase().includes("oproep");

  // Functie om het juiste contract per weekdatum op te zoeken
  const getContractForDate = (dateStr) => {
    if (activeContracts.length <= 1) return contract;
    const refDate = new Date(dateStr);
    return activeContracts.find(c => {
      const start = new Date(c.startdatum);
      const end = c.einddatum ? new Date(c.einddatum) : new Date("2099-12-31");
      return refDate >= start && refDate <= end;
    }) || contract;
  };

  const loonschaal = contract.loonschaal || employee.salary_scale || "";
  const hourlyRate = useMemo(() => {
    if (employee.hourly_rate) return employee.hourly_rate;
    if (!loonschaal || !salaryTables.length) return 0;
    const match = salaryTables.find(t =>
      t.status === "Actief" &&
      `${t.scale}${t.step != null ? ` Trede ${t.step}` : ""}` === loonschaal
    );
    return match?.hourly_rate || 0;
  }, [employee, loonschaal, salaryTables]);

  const holidayDates = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // Groepeer entries per week
  const entriesByWeek = useMemo(() => {
    const map = {};
    timeEntries.forEach(e => {
      if (!e.date || e.status !== "Goedgekeurd" || e.employee_id !== employee.id) return;
      const d = new Date(e.date);
      if (d.getFullYear() !== year) return;
      const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
      if (!map[wk]) map[wk] = [];
      map[wk].push(e);
    });
    return map;
  }, [timeEntries, employee, year]);

  // Bereken per periode de uren-balans inclusief weekdetails
  const periodeBalans = useMemo(() => {
    let saldoCumulatief = 0;

    return periodes.map(periode => {
      let contractUren = 0;
      let gewerkteUren = 0;
      let verlofUren = 0;
      let ziekUren = 0;
      let atvUren = 0;
      let feestdagUren = 0;
      let bijzonderVerlof = 0;

      // Bereken weekdetails met calculateWeekData
      const weekDetails = periode.weken.map(weekNr => {
        const jan4 = new Date(year, 0, 4);
        const weekStart = new Date(jan4);
        weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNr - 1) * 7);
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekContract = getContractForDate(weekStartStr);
        const weekContractHours = weekContract.uren_per_week || employee.contract_hours || 0;
        const weekIsOproep = employee.contract_type === "Oproep" ||
          (weekContract.type_contract || "").toLowerCase().includes("oproep");

        if (!weekIsOproep) {
          contractUren += weekContractHours;
        }
        const entries = entriesByWeek[weekNr] || [];

        // Berekende weekdata via gedeelde functie
        const weekData = calculateWeekData(employee, entries, holidays, weekStartStr);

        let weekWorked = 0;
        let weekVerlof = 0;
        let weekZiek = 0;
        let weekAtv = 0;
        let weekFeestdag = 0;
        let weekBvl = 0;

        entries.forEach(e => {
          const hours = e.total_hours || 0;
          weekWorked += hours;
          const st = (e.shift_type || "").toLowerCase();
          if (st.includes("bijzonder verlof") || st.includes("bijzonderverlof")) weekBvl += hours;
          else if (st.includes("verlof")) weekVerlof += hours;
          if (st.includes("ziek")) weekZiek += hours;
          if (st.includes("atv")) weekAtv += hours;
          if (holidayDates.has(e.date)) weekFeestdag += hours;
        });

        verlofUren += weekVerlof;
        ziekUren += weekZiek;
        atvUren += weekAtv;
        feestdagUren += weekFeestdag;
        bijzonderVerlof += weekBvl;
        gewerkteUren += weekWorked;

        return { weekNr, weekData, contractHours: weekIsOproep ? 0 : weekContractHours };
      });

      const saldo = gewerkteUren - contractUren;
      saldoCumulatief += saldo;

      // Oproepkracht: variabele uren
      let variabeleUren = 0;
      periode.weken.forEach(weekNr => {
        const jan4 = new Date(year, 0, 4);
        const ws = new Date(jan4);
        ws.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNr - 1) * 7);
        const wc = getContractForDate(ws.toISOString().split("T")[0]);
        const wIsOproep = employee.contract_type === "Oproep" ||
          (wc.type_contract || "").toLowerCase().includes("oproep");
        if (wIsOproep) {
          const wEntries = entriesByWeek[weekNr] || [];
          wEntries.filter(e => e.employee_id === employee.id).forEach(e => {
            variabeleUren += e.total_hours || 0;
          });
        }
      });
      variabeleUren = Math.round(variabeleUren * 100) / 100;
      const variabeleBedrag = Math.round(variabeleUren * hourlyRate * 100) / 100;

      return {
        periode: periode.periode,
        maand: periode.maand,
        weken: `${periode.weken[0]}-${periode.weken[periode.weken.length - 1]}`,
        wekenNrs: periode.weken,
        weekDetails,
        aantalWeken: periode.weken.length,
        contractUren: Math.round(contractUren * 100) / 100,
        gewerkteUren: Math.round(gewerkteUren * 100) / 100,
        verlofUren: Math.round(verlofUren * 100) / 100,
        ziekUren: Math.round(ziekUren * 100) / 100,
        atvUren: Math.round(atvUren * 100) / 100,
        feestdagUren: Math.round(feestdagUren * 100) / 100,
        bijzonderVerlof: Math.round(bijzonderVerlof * 100) / 100,
        saldo: Math.round(saldo * 100) / 100,
        saldoCumulatief: Math.round(saldoCumulatief * 100) / 100,
        variabeleUren: Math.round(variabeleUren * 100) / 100,
        variabeleBedrag,
      };
    });
  }, [timeEntries, employee, year, periodes, contractHours, holidayDates, entriesByWeek, holidays]);

  // Bepaal welke detailkolommen data hebben over alle weken
  const visibleDetailColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      return periodeBalans.some(p =>
        p.weekDetails.some(w => (w.weekData[col.key] || 0) > 0)
      );
    });
  }, [periodeBalans]);

  // Jaartotalen
  const totalen = useMemo(() => {
    const t = { contractUren: 0, gewerkteUren: 0, verlofUren: 0, ziekUren: 0, atvUren: 0, feestdagUren: 0, bijzonderVerlof: 0, saldo: 0, variabeleUren: 0, variabeleBedrag: 0 };
    periodeBalans.forEach(p => {
      t.contractUren += p.contractUren;
      t.gewerkteUren += p.gewerkteUren;
      t.verlofUren += p.verlofUren;
      t.ziekUren += p.ziekUren;
      t.atvUren += p.atvUren;
      t.feestdagUren += p.feestdagUren;
      t.bijzonderVerlof += p.bijzonderVerlof;
      t.saldo += p.saldo;
      t.variabeleUren += p.variabeleUren;
      t.variabeleBedrag += p.variabeleBedrag;
    });
    Object.keys(t).forEach(k => t[k] = Math.round(t[k] * 100) / 100);
    return t;
  }, [periodeBalans]);

  const fmt = (v) => {
    if (v === 0) return "-";
    return v.toFixed(2).replace(".", ",");
  };

  const fmtSaldo = (v) => {
    if (v === 0) return "-";
    const str = Math.abs(v).toFixed(2).replace(".", ",");
    return v > 0 ? `+${str}` : `-${str}`;
  };

  const fmtEuro = (v) => {
    if (v === 0) return "-";
    return `€${v.toFixed(2).replace(".", ",")}`;
  };

  const exportCSV = () => {
    const baseHeaders = ["Periode", "Maand", "Weken", "Contract", "Gewerkt", "Verlof", "Ziek", "ATV", "Feestdag", "Bijz. verlof"];
    const oproepHeaders = isOproepkracht ? ["Var. uren", "Var. bedrag"] : [];
    const headers = [...baseHeaders, ...oproepHeaders, "Saldo", "Saldo cumulatief"];
    const rows = periodeBalans.map(p => {
      const base = [p.periode, p.maand, p.weken, p.contractUren, p.gewerkteUren,
        p.verlofUren, p.ziekUren, p.atvUren, p.feestdagUren, p.bijzonderVerlof];
      const oproep = isOproepkracht ? [p.variabeleUren, p.variabeleBedrag] : [];
      return [...base, ...oproep, p.saldo, p.saldoCumulatief];
    });
    const totalBase = [totalen.contractUren, totalen.gewerkteUren,
      totalen.verlofUren, totalen.ziekUren, totalen.atvUren, totalen.feestdagUren, totalen.bijzonderVerlof];
    const totalOproep = isOproepkracht ? [totalen.variabeleUren, totalen.variabeleBedrag] : [];
    rows.push(["Totaal", "", "", ...totalBase, ...totalOproep, totalen.saldo, ""]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urenbalans_${getFullName(employee).replace(/\s/g, "_")}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [expandedPeriodes, setExpandedPeriodes] = useState(new Set());

  const togglePeriode = (periodeNr) => {
    setExpandedPeriodes(prev => {
      const next = new Set(prev);
      next.has(periodeNr) ? next.delete(periodeNr) : next.add(periodeNr);
      return next;
    });
  };

  const fmtDetail = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(4).replace(/\.?0+$/, "");
  };

  const fmtDetailEuro = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    return `€${v.toFixed(2).replace(".", ",")}`;
  };

  const formatDetailCell = (col, val) => {
    if (col.key === "verblijfkosten") return fmtDetailEuro(val);
    return fmtDetail(val);
  };

  return (
    <div className="space-y-4">
      {/* Navigatie */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={employeeIndex <= 0}
              onClick={() => onChangeEmployee(employeeIndex - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
            </Button>
            <div className="text-center">
              <p className="font-bold text-slate-900">{getFullName(employee)}</p>
              <p className="text-xs text-slate-500">
                {employee.employee_number || ""} · {employee.department || ""} · {employee.function || ""} · {isOproepkracht ? "Oproepkracht" : `Contract ${contractHours} uur/week`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {employeeIndex + 1} van {activeEmployees.length}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={employeeIndex >= activeEmployees.length - 1}
              onClick={() => onChangeEmployee(employeeIndex + 1)}
            >
              Volgende <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balans tabel */}
      <Card className="overflow-hidden">
        <div className="bg-slate-700 text-white px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">Urenbalans {year} – {getFullName(employee)}</span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-slate-600" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="text-xs">Per.</TableHead>
                  <TableHead className="text-xs">Maand</TableHead>
                  <TableHead className="text-xs text-center">Weken</TableHead>
                  <TableHead className="text-xs text-right">Contract</TableHead>
                  <TableHead className="text-xs text-right">Gewerkt</TableHead>
                  <TableHead className="text-xs text-right">Verlof</TableHead>
                  <TableHead className="text-xs text-right">Ziek</TableHead>
                  <TableHead className="text-xs text-right">ATV</TableHead>
                  <TableHead className="text-xs text-right">Feestdag</TableHead>
                  <TableHead className="text-xs text-right">Bijz. verlof</TableHead>
                  {isOproepkracht && <TableHead className="text-xs text-right">Var. uren</TableHead>}
                  {isOproepkracht && <TableHead className="text-xs text-right">Var. bedrag</TableHead>}
                  <TableHead className="text-xs text-right">Saldo</TableHead>
                  <TableHead className="text-xs text-right">Cumulatief</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodeBalans.map(p => (
                  <React.Fragment key={p.periode}>
                    <TableRow
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => togglePeriode(p.periode)}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1">
                          {expandedPeriodes.has(p.periode) ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {p.periode}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{p.maand}</TableCell>
                      <TableCell className="text-sm text-center text-slate-500">{p.weken}</TableCell>
                      <TableCell className="text-sm text-right">{fmt(p.contractUren)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{fmt(p.gewerkteUren)}</TableCell>
                      <TableCell className="text-sm text-right text-blue-600">{fmt(p.verlofUren)}</TableCell>
                      <TableCell className="text-sm text-right text-orange-600">{fmt(p.ziekUren)}</TableCell>
                      <TableCell className="text-sm text-right text-purple-600">{fmt(p.atvUren)}</TableCell>
                      <TableCell className="text-sm text-right text-amber-600">{fmt(p.feestdagUren)}</TableCell>
                      <TableCell className="text-sm text-right text-teal-600">{fmt(p.bijzonderVerlof)}</TableCell>
                      {isOproepkracht && <TableCell className="text-sm text-right font-medium text-indigo-600">{fmt(p.variabeleUren)}</TableCell>}
                      {isOproepkracht && <TableCell className="text-sm text-right font-medium text-indigo-600">{fmtEuro(p.variabeleBedrag)}</TableCell>}
                      <TableCell className={`text-sm text-right font-semibold ${p.saldo > 0 ? "text-emerald-600" : p.saldo < 0 ? "text-red-600" : "text-slate-400"}`}>
                        {fmtSaldo(p.saldo)}
                      </TableCell>
                      <TableCell className={`text-sm text-right font-semibold ${p.saldoCumulatief > 0 ? "text-emerald-600" : p.saldoCumulatief < 0 ? "text-red-600" : "text-slate-400"}`}>
                        {fmtSaldo(p.saldoCumulatief)}
                      </TableCell>
                    </TableRow>

                    {/* Uitklapbare weekdetails */}
                    {expandedPeriodes.has(p.periode) && (
                      <TableRow>
                        <TableCell colSpan={10 + (isOproepkracht ? 2 : 0) + 2} className="p-0 bg-slate-50">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-100">
                                  <TableHead className="text-xs font-semibold">Week</TableHead>
                                  <TableHead className="text-xs text-right font-semibold">Gewerkte dagen</TableHead>
                                  <TableHead className="text-xs text-right font-semibold">100% uren</TableHead>
                                  {visibleDetailColumns
                                    .filter(c => c.key !== "gewerkte_dagen" && c.key !== "uren_100")
                                    .map(col => (
                                      <TableHead key={col.key} className="text-xs text-right whitespace-nowrap">{col.label}</TableHead>
                                    ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {p.weekDetails.map(w => {
                                  const hasData = (w.weekData.uren_100 || 0) > 0 || (w.weekData.verlof || 0) > 0 || (w.weekData.ziek || 0) > 0 || (w.weekData.feestdag || 0) > 0;
                                  return (
                                    <TableRow key={w.weekNr} className={hasData ? "" : "text-slate-400"}>
                                      <TableCell className="text-sm font-medium pl-6">{year} - {w.weekNr}</TableCell>
                                      <TableCell className="text-sm text-right">{fmtDetail(w.weekData.gewerkte_dagen)}</TableCell>
                                      <TableCell className="text-sm text-right">{fmtDetail(w.weekData.uren_100)}</TableCell>
                                      {visibleDetailColumns
                                        .filter(c => c.key !== "gewerkte_dagen" && c.key !== "uren_100")
                                        .map(col => (
                                          <TableCell key={col.key} className="text-sm text-right">
                                            {formatDetailCell(col, w.weekData[col.key])}
                                          </TableCell>
                                        ))}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {/* Totaalrij */}
                <TableRow className="bg-slate-200 font-bold border-t-2">
                  <TableCell colSpan={3} className="text-sm">Jaartotaal</TableCell>
                  <TableCell className="text-sm text-right">{fmt(totalen.contractUren)}</TableCell>
                  <TableCell className="text-sm text-right">{fmt(totalen.gewerkteUren)}</TableCell>
                  <TableCell className="text-sm text-right text-blue-600">{fmt(totalen.verlofUren)}</TableCell>
                  <TableCell className="text-sm text-right text-orange-600">{fmt(totalen.ziekUren)}</TableCell>
                  <TableCell className="text-sm text-right text-purple-600">{fmt(totalen.atvUren)}</TableCell>
                  <TableCell className="text-sm text-right text-amber-600">{fmt(totalen.feestdagUren)}</TableCell>
                  <TableCell className="text-sm text-right text-teal-600">{fmt(totalen.bijzonderVerlof)}</TableCell>
                  {isOproepkracht && <TableCell className="text-sm text-right text-indigo-600">{fmt(totalen.variabeleUren)}</TableCell>}
                  {isOproepkracht && <TableCell className="text-sm text-right text-indigo-600">{fmtEuro(totalen.variabeleBedrag)}</TableCell>}
                  <TableCell className={`text-sm text-right font-bold ${totalen.saldo > 0 ? "text-emerald-600" : totalen.saldo < 0 ? "text-red-600" : ""}`}>
                    {fmtSaldo(totalen.saldo)}
                  </TableCell>
                  <TableCell className="text-sm text-right" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Samenvatting badges */}
      <div className="flex flex-wrap gap-2">
        {isOproepkracht && <Badge className="bg-indigo-100 text-indigo-700">Oproepkracht</Badge>}
        <Badge className="bg-slate-100 text-slate-700">Contract: {fmt(totalen.contractUren)} uur</Badge>
        <Badge className="bg-emerald-100 text-emerald-700">Gewerkt: {fmt(totalen.gewerkteUren)} uur</Badge>
        <Badge className={`${totalen.saldo >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          Saldo: {fmtSaldo(totalen.saldo)} uur
        </Badge>
        {totalen.verlofUren > 0 && <Badge className="bg-blue-100 text-blue-700">Verlof: {fmt(totalen.verlofUren)} uur</Badge>}
        {totalen.ziekUren > 0 && <Badge className="bg-orange-100 text-orange-700">Ziek: {fmt(totalen.ziekUren)} uur</Badge>}
        {isOproepkracht && totalen.variabeleBedrag > 0 && (
          <Badge className="bg-indigo-100 text-indigo-700">Variabel: {fmtEuro(totalen.variabeleBedrag)}</Badge>
        )}
      </div>
    </div>
  );
}