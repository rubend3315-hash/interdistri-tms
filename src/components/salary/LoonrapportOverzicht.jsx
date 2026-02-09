import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileSpreadsheet, Download } from "lucide-react";
import { getWeek, getDay } from "date-fns";
import { getFullName } from "@/components/utils/employeeUtils";

// Kolom-definities voor de variabele componenten (op basis van Urensoort entity)
const VARIABELE_KOLOMMEN = [
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

function calculateWeekData(employee, entries, holidays) {
  const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  const contract = (employee.contractregels || [])
    .filter(c => c.status !== "Inactief")
    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  const contractHours = contract.uren_per_week || employee.contract_hours || 0;

  let totalHours = 0;
  let saturdayHours = 0;
  let sundayHours = 0;
  let holidayHours = 0;
  let weekdayHours = 0;
  let nightHours = 0;
  let gewerkteDagen = 0;
  let subsistence = 0;
  let verlofHours = 0;
  let ziekHours = 0;
  let atvHours = 0;

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
      holidayHours += hours;
    } else if (dayOfWeek === 0) {
      sundayHours += hours;
    } else if (dayOfWeek === 6) {
      saturdayHours += hours;
    } else {
      weekdayHours += hours;
    }

    // Check shift type for verlof/ziek/atv
    const st = (e.shift_type || "").toLowerCase();
    if (st.includes("verlof")) verlofHours += hours;
    if (st.includes("ziek")) ziekHours += hours;
    if (st.includes("atv")) atvHours += hours;
  });

  // Aanvulling contract berekening
  const regularHours = weekdayHours;
  let aanvulling = 0;
  let remaining = contractHours - regularHours;

  if (remaining > 0 && saturdayHours > 0) {
    const fromSat = Math.min(remaining, saturdayHours);
    aanvulling += fromSat;
    remaining -= fromSat;
  }
  if (remaining > 0 && sundayHours > 0) {
    const fromSun = Math.min(remaining, sundayHours);
    aanvulling += fromSun;
    remaining -= fromSun;
  }

  // Overwerk berekening
  const effectiveWorked = regularHours + saturdayHours + sundayHours + holidayHours;
  const overwerkBase = Math.max(0, regularHours - contractHours);
  const overwerkZa = Math.max(0, saturdayHours - Math.max(0, contractHours - regularHours));
  const overwerkZo = Math.max(0, sundayHours - Math.max(0, contractHours - regularHours - saturdayHours));

  return {
    gewerkte_dagen: gewerkteDagen,
    uren_100: Math.round(totalHours * 10000) / 10000,
    compensatie_uren: 0,
    aanvulling_contract: Math.round(aanvulling * 10000) / 10000,
    meeruren: Math.round(overwerkBase * 10000) / 10000,
    diensttoeslag_za_150: Math.round(overwerkZa * 10000) / 10000,
    diensttoeslag_zo_200: Math.round(overwerkZo * 10000) / 10000,
    vakantiedag: 0,
    ziek: Math.round(ziekHours * 10000) / 10000,
    verlof: Math.round(verlofHours * 10000) / 10000,
    feestdag: Math.round(holidayHours * 10000) / 10000,
    atv: Math.round(atvHours * 10000) / 10000,
    bijzonder_verlof: 0,
    partner_verlof: 0,
    onbetaald_verlof: 0,
    ouderschapsverlof_betaald: 0,
    ouderschapsverlof_onbetaald: 0,
    variabele_uren_100: 0,
    toeslagenmatrix_19: Math.round(nightHours * 10000) / 10000,
    verblijfkosten: Math.round(subsistence * 100) / 100,
  };
}

export default function LoonrapportOverzicht({
  year, selectedPeriode, periodes, employees, timeEntries, holidays, salaryTables, onSelectEmployee
}) {
  const [expandedPeriodes, setExpandedPeriodes] = useState(new Set([selectedPeriode]));

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === "Actief" && e.department !== "Charters"),
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
        
        const perEmployee = activeEmployees.map(emp => {
          const empEntries = weekEntries.filter(e => e.employee_id === emp.id);
          const data = calculateWeekData(emp, empEntries, holidays);
          return { employee: emp, ...data };
        });

        // Week totalen
        const totals = {};
        VARIABELE_KOLOMMEN.forEach(k => {
          totals[k.key] = perEmployee.reduce((s, e) => s + (e[k.key] || 0), 0);
        });

        return { weekNr, perEmployee, totals };
      });

      // Periode totalen
      const periodeTotals = {};
      VARIABELE_KOLOMMEN.forEach(k => {
        periodeTotals[k.key] = wekenData.reduce((s, w) => s + (w.totals[k.key] || 0), 0);
      });

      return { ...periode, wekenData, periodeTotals };
    });
  }, [periodes, entriesByWeek, activeEmployees, holidays]);

  // Bepaal welke kolommen data hebben (>0) om lege kolommen te verbergen
  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      return periodeData.some(p => p.periodeTotals[col.key] > 0);
    });
  }, [periodeData]);

  const exportCSV = () => {
    const headers = ["Periode", "Week", "Medewerker", ...visibleColumns.map(c => c.label)];
    const rows = [];

    periodeData.forEach(p => {
      p.wekenData.forEach(w => {
        w.perEmployee.forEach(emp => {
          const hasData = visibleColumns.some(c => emp[c.key] > 0);
          if (!hasData) return;
          rows.push([
            `${year}-${String(p.periode).padStart(2, "0")}`,
            `${year} - ${w.weekNr}`,
            getFullName(emp.employee),
            ...visibleColumns.map(c => emp[c.key] || 0)
          ]);
        });
      });
    });

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loonrapport_overzicht_${year}.csv`;
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
                      <TableHead className="sticky left-0 bg-slate-100 z-10">Week</TableHead>
                      {visibleColumns.map(col => (
                        <TableHead key={col.key} className="text-right text-xs whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.wekenData.map(w => (
                      <React.Fragment key={w.weekNr}>
                        {/* Week totaal rij */}
                        <TableRow className="bg-slate-50 font-medium border-t-2 border-slate-200">
                          <TableCell className="sticky left-0 bg-slate-50 z-10 font-semibold">
                            {year} - {w.weekNr}
                          </TableCell>
                          {visibleColumns.map(col => (
                            <TableCell key={col.key} className="text-right text-sm">
                              {formatCell(col, w.totals[col.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                        {/* Per medewerker */}
                        {w.perEmployee
                          .filter(emp => emp.uren_100 > 0 || emp.verlof > 0 || emp.ziek > 0 || emp.feestdag > 0 || emp.atv > 0)
                          .map(emp => (
                            <TableRow
                              key={`${w.weekNr}-${emp.employee.id}`}
                              className="hover:bg-blue-50 cursor-pointer"
                              onClick={() => onSelectEmployee?.(emp.employee)}
                            >
                              <TableCell className="sticky left-0 bg-white z-10 pl-8 text-slate-600 text-sm">
                                {getFullName(emp.employee)}
                              </TableCell>
                              {visibleColumns.map(col => (
                                <TableCell key={col.key} className="text-right text-sm text-slate-600">
                                  {formatCell(col, emp[col.key])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </React.Fragment>
                    ))}
                    {/* Periode totaal */}
                    <TableRow className="bg-slate-200 font-bold border-t-2">
                      <TableCell className="sticky left-0 bg-slate-200 z-10">
                        Totaal Periode {p.periode}
                      </TableCell>
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