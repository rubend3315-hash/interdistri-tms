import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileSpreadsheet, Download } from "lucide-react";
import { getWeek, getDay } from "date-fns";
import { getFullName } from "@/components/utils/employeeUtils";

// Kolom-definities voor de variabele componenten (op basis van Urensoort entity)
export const VARIABELE_KOLOMMEN = [
  { key: "gewerkte_dagen", label: "Gewerkte dagen" },
  { key: "uren_100", label: "100% uren" },
  { key: "compensatie_uren", label: "Compensatie-uren" },
  { key: "aanvulling_contract", label: "Aanvulling contract" },
  { key: "diensttoeslag_za_150", label: "Diensturen zaterdag 150%" },
  { key: "diensttoeslag_zo_200", label: "Diensturen zondag 200%" },
  { key: "vakantiedag", label: "Vakantiedag" },
  { key: "ziek", label: "Ziek" },
  { key: "verlof", label: "Verlof" },
  { key: "feestdag", label: "Feestdag" },
  { key: "atv", label: "ATV" },
  { key: "bijzonder_verlof", label: "Bijzonder verlof" },
  { key: "partner_verlof", label: "Partner verlof" },
  { key: "onbetaald_verlof", label: "Onbetaald verlof" },
  { key: "ouderschapsverlof_betaald", label: "Ouderschapsverl. (betaald 70%)" },
  { key: "ouderschapsverlof_onbetaald", label: "Ouderschapsverl. (onbetaald)" },
  { key: "variabele_uren_100", label: "Variabele uren 100%" },
  { key: "toeslagenmatrix_19", label: "Toeslagenmatrix 19%" },
  { key: "toeslag_za_50", label: "Toeslag diensturen zaterdag 50%" },
  { key: "za_overwerk_150", label: "Zaterdag overwerk 150%" },
  { key: "toeslag_zo_100", label: "Toeslag diensturen zondag 100%" },
  { key: "zo_overwerk_200", label: "Zondag overwerk 200%" },
  { key: "diensturen_feestdag_200", label: "Diensturen feestdag 200%" },
  { key: "toeslag_feestdag_100", label: "Toeslag diensturen feestdag 100%" },
  { key: "feestdag_overwerk_200", label: "Feestdag overwerk 200%" },
  { key: "overwerk_130", label: "Overwerk 130%" },
  { key: "partnerverlof_week", label: "Partnerverlof" },
  { key: "verblijfkosten", label: "Verblijfkosten" },
];

export function calculateWeekData(employee, entries, holidays, weekStartDate) {
  // Bepaal welk contract actief was voor deze week
  const activeContracts = (employee.contractregels || [])
    .filter(c => c.status !== "Inactief")
    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum));

  let contract = activeContracts[0] || {};
  if (weekStartDate && activeContracts.length > 1) {
    const refDate = new Date(weekStartDate);
    contract = activeContracts.find(c => {
      const start = new Date(c.startdatum);
      const end = c.einddatum ? new Date(c.einddatum) : new Date("2099-12-31");
      return refDate >= start && refDate <= end;
    }) || activeContracts[0] || {};
  }

  const contractHours = contract.uren_per_week || employee.contract_hours || 0;

  let totalHours = 0;
  let saturdayHours = 0;
  let sundayHours = 0;
  let holidayHoursWorked = 0;
  let weekdayHours = 0;
  let nightHours = 0;
  let gewerkteDagen = 0;
  let subsistence = 0;
  let verlofHours = 0;
  let ziekHours = 0;
  let atvHours = 0;
  let bijzonderVerlof = 0;
  let partnerVerlof = 0;
  let onbetaaldVerlof = 0;
  let ouderschapsBetaald = 0;
  let ouderschapsOnbetaald = 0;
  let partnerverlofWeek = 0;

  const holidayDates = new Set(holidays.map(h => h.date));

  entries.forEach(e => {
    const hours = e.total_hours || 0;
    totalHours += hours;
    nightHours += e.night_hours || 0;
    subsistence += e.subsistence_allowance || 0;

    if (hours > 0) gewerkteDagen++;

    const d = new Date(e.date);
    const dayOfWeek = getDay(d);
    const isHoliday = holidayDates.has(e.date);

    if (isHoliday) {
      holidayHoursWorked += hours;
    } else if (dayOfWeek === 0) {
      sundayHours += hours;
    } else if (dayOfWeek === 6) {
      saturdayHours += hours;
    } else {
      weekdayHours += hours;
    }

    // Check shift type for verlof/ziek/atv etc.
    const st = (e.shift_type || "").toLowerCase();
    if (st.includes("bijzonder verlof") || st.includes("bijzonderverlof")) bijzonderVerlof += hours;
    else if (st.includes("partner verlof") || st.includes("partnerverlof")) partnerVerlof += hours;
    else if (st.includes("onbetaald verlof") || st.includes("onbetaaldverlof")) onbetaaldVerlof += hours;
    else if (st.includes("ouderschapsverlof") && st.includes("betaald")) ouderschapsBetaald += hours;
    else if (st.includes("ouderschapsverlof") && st.includes("onbetaald")) ouderschapsOnbetaald += hours;
    else if (st.includes("partnerverlof week")) partnerverlofWeek += hours;
    else if (st.includes("verlof")) verlofHours += hours;
    if (st.includes("ziek")) ziekHours += hours;
    if (st.includes("atv")) atvHours += hours;
  });

  // Aanvulling contract: als weekdaguren < contract, aanvullen vanuit za/zo
  const regularHours = weekdayHours;
  let aanvullingZa = 0;
  let aanvullingZo = 0;
  let remaining = Math.max(0, contractHours - regularHours);

  if (remaining > 0 && saturdayHours > 0) {
    aanvullingZa = Math.min(remaining, saturdayHours);
    remaining -= aanvullingZa;
  }
  if (remaining > 0 && sundayHours > 0) {
    aanvullingZo = Math.min(remaining, sundayHours);
    remaining -= aanvullingZo;
  }
  const aanvulling = aanvullingZa + aanvullingZo;

  // Diensturen = uren op die dag (voor aanvulling)
  const dienstZa = saturdayHours;
  const dienstZo = sundayHours;
  const dienstFeestdag = holidayHoursWorked;

  // Toeslag berekening: over aanvullings-uren
  const toeslagZa50 = aanvullingZa; // uren die aanvullen uit zaterdag → 50% toeslag
  const toeslagZo100 = aanvullingZo; // uren die aanvullen uit zondag → 100% toeslag
  const toeslagFeestdag100 = Math.min(holidayHoursWorked, Math.max(0, contractHours - regularHours - aanvullingZa - aanvullingZo));

  // Overwerk: uren boven contracturen
  const overwerkZa150 = Math.max(0, saturdayHours - aanvullingZa);
  const overwerkZo200 = Math.max(0, sundayHours - aanvullingZo);
  const overwerkFeestdag200 = Math.max(0, holidayHoursWorked - toeslagFeestdag100);
  const overwerk130 = Math.max(0, regularHours - contractHours);

  // Oproepkracht: check op basis van het actieve contract voor deze week
  const isOproep = employee.contract_type === "Oproep" ||
    ((contract.type_contract || "").toLowerCase().includes("oproep"));
  const variabeleUren100 = isOproep ? totalHours : 0;

  const r = (v) => Math.round(v * 10000) / 10000;

  return {
    gewerkte_dagen: gewerkteDagen,
    uren_100: r(totalHours),
    compensatie_uren: 0,
    aanvulling_contract: isOproep ? 0 : r(aanvulling),
    diensttoeslag_za_150: r(dienstZa),
    diensttoeslag_zo_200: r(dienstZo),
    vakantiedag: 0,
    ziek: r(ziekHours),
    verlof: r(verlofHours),
    feestdag: r(holidayHoursWorked),
    atv: r(atvHours),
    bijzonder_verlof: r(bijzonderVerlof),
    partner_verlof: r(partnerVerlof),
    onbetaald_verlof: r(onbetaaldVerlof),
    ouderschapsverlof_betaald: r(ouderschapsBetaald),
    ouderschapsverlof_onbetaald: r(ouderschapsOnbetaald),
    variabele_uren_100: r(variabeleUren100),
    toeslagenmatrix_19: r(nightHours),
    toeslag_za_50: r(toeslagZa50),
    za_overwerk_150: r(overwerkZa150),
    toeslag_zo_100: r(toeslagZo100),
    zo_overwerk_200: r(overwerkZo200),
    diensturen_feestdag_200: r(dienstFeestdag),
    toeslag_feestdag_100: r(toeslagFeestdag100),
    feestdag_overwerk_200: r(overwerkFeestdag200),
    overwerk_130: r(overwerk130),
    partnerverlof_week: r(partnerverlofWeek),
    verblijfkosten: Math.round(subsistence * 100) / 100,
  };
}

export default function LoonrapportOverzicht({
  year, selectedPeriode, periodes, employees, timeEntries, holidays, salaryTables, onSelectEmployee
}) {
  const [expandedPeriodes, setExpandedPeriodes] = useState(new Set([selectedPeriode]));

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === "Actief" && e.department !== "Charters" && e.opnemen_in_loonrapport !== false),
  [employees]);

  // Get all entries for the year grouped by week
  const entriesByWeek = useMemo(() => {
    const map = {};
    timeEntries.forEach(e => {
      if (!e.date || e.status !== "Goedgekeurd") return;
      const d = new Date(e.date);
      if (d.getFullYear() !== year) return;
      const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
      if (!map[wk]) map[wk] = [];
      map[wk].push(e);
    });
    return map;
  }, [timeEntries, year]);

  const togglePeriode = (p) => {
    const next = new Set(expandedPeriodes);
    next.has(p) ? next.delete(p) : next.add(p);
    setExpandedPeriodes(next);
  };

  // Bereken totalen per periode
  const periodeData = useMemo(() => {
    return periodes.map(periode => {
      const wekenData = periode.weken.map(weekNr => {
        const weekEntries = entriesByWeek[weekNr] || [];
        const jan4 = new Date(year, 0, 4);
        const weekStart = new Date(jan4);
        weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNr - 1) * 7);
        const weekStartStr = weekStart.toISOString().split("T")[0];

        const perEmployee = activeEmployees.map(emp => {
          const empEntries = weekEntries.filter(e => e.employee_id === emp.id);
          const data = calculateWeekData(emp, empEntries, holidays, weekStartStr);
          return { employee: emp, ...data };
        });

        const totals = {};
        VARIABELE_KOLOMMEN.forEach(k => {
          totals[k.key] = perEmployee.reduce((s, e) => s + (e[k.key] || 0), 0);
        });

        return { weekNr, perEmployee, totals };
      });

      // Per medewerker: tel alle weken in de periode op
      const perEmployeeTotals = activeEmployees.map(emp => {
        const empTotals = {};
        VARIABELE_KOLOMMEN.forEach(col => {
          empTotals[col.key] = wekenData.reduce((s, w) => {
            const empData = w.perEmployee.find(e => e.employee.id === emp.id);
            return s + ((empData && empData[col.key]) || 0);
          }, 0);
        });
        return { employee: emp, ...empTotals };
      });

      // Periode totalen
      const periodeTotals = {};
      VARIABELE_KOLOMMEN.forEach(k => {
        periodeTotals[k.key] = perEmployeeTotals.reduce((s, e) => s + (e[k.key] || 0), 0);
      });

      return { ...periode, wekenData, perEmployeeTotals, periodeTotals };
    });
  }, [periodes, entriesByWeek, activeEmployees, holidays]);

  // Bepaal welke kolommen data hebben (>0) om lege kolommen te verbergen
  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      return periodeData.some(p => p.periodeTotals[col.key] > 0);
    });
  }, [periodeData]);

  const exportCSV = () => {
    const currentPeriodeData = periodeData.find(p => p.periode === selectedPeriode);
    if (!currentPeriodeData) return;

    const headers = ["Periode", "Weken", "Medewerker", ...visibleColumns.map(c => c.label)];
    const rows = [];

    const wekenStr = currentPeriodeData.weken.join(", ");
    currentPeriodeData.perEmployeeTotals.forEach(emp => {
      const hasData = visibleColumns.some(c => emp[c.key] > 0);
      if (!hasData) return;
      rows.push([
        `${year}-${String(currentPeriodeData.periode).padStart(2, "0")}`,
        wekenStr,
        getFullName(emp.employee),
        ...visibleColumns.map(c => emp[c.key] || 0)
      ]);
    });

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loonrapport_periode-${String(selectedPeriode).padStart(2, "0")}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(4).replace(/\.?0+$/, "");
  };

  const fmtEuro = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    return `€${v.toFixed(2).replace(".", ",")}`;
  };

  const formatCell = (col, val) => {
    if (col.key === "verblijfkosten") return fmtEuro(val);
    return fmt(val);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
          {activeEmployees.length} medewerkers · {year}
        </Badge>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      {periodeData.map(p => (
        <Card key={p.periode} className="overflow-hidden">
          {/* Periode header - klikbaar */}
          <button
            onClick={() => togglePeriode(p.periode)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedPeriodes.has(p.periode) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-semibold">{year}-{String(p.periode).padStart(2, "0")}</span>
              <span className="text-slate-300 text-sm">{p.maand}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>{p.periodeTotals.gewerkte_dagen || 0} dagen</span>
              <span>{fmt(p.periodeTotals.uren_100)} uren</span>
              {visibleColumns.filter(c => c.key !== "gewerkte_dagen" && c.key !== "uren_100").map(col => {
                const val = p.periodeTotals[col.key];
                if (!val) return null;
                return (
                  <span key={col.key} className="text-slate-300">
                    {formatCell(col, val)}
                  </span>
                );
              })}
            </div>
          </button>

          {/* Uitklapbare inhoud */}
          {expandedPeriodes.has(p.periode) && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      <TableHead className="sticky left-0 bg-slate-100 z-10">Medewerker</TableHead>
                      <TableHead className="text-center text-xs whitespace-nowrap">Weken</TableHead>
                      {visibleColumns.map(col => (
                        <TableHead key={col.key} className="text-right text-xs whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.perEmployeeTotals
                      .filter(emp => emp.uren_100 > 0 || emp.verlof > 0 || emp.ziek > 0 || emp.feestdag > 0 || emp.atv > 0 || emp.bijzonder_verlof > 0)
                      .map(emp => (
                        <TableRow
                          key={emp.employee.id}
                          className="hover:bg-blue-50 cursor-pointer"
                          onClick={() => onSelectEmployee?.(emp.employee)}
                        >
                          <TableCell className="sticky left-0 bg-white z-10 text-sm font-medium">
                            {getFullName(emp.employee)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-500">
                            {p.weken.join(", ")}
                          </TableCell>
                          {visibleColumns.map(col => (
                            <TableCell key={col.key} className="text-right text-sm text-slate-600">
                              {formatCell(col, emp[col.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    {/* Periode totaal */}
                    <TableRow className="bg-slate-200 font-bold border-t-2">
                      <TableCell className="sticky left-0 bg-slate-200 z-10">
                        Totaal Periode {p.periode}
                      </TableCell>
                      <TableCell className="bg-slate-200" />
                      {visibleColumns.map(col => (
                        <TableCell key={col.key} className="text-right">
                          {formatCell(col, p.periodeTotals[col.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}