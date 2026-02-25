import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileSpreadsheet, Download } from "lucide-react";
import { getWeek, getDay } from "date-fns";
import { getFullName } from "@/components/utils/employeeUtils";
import { getLooncomponentLabel } from "@/components/utils/uursoortMapping";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

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

  // Oproepkracht: check op basis van het actieve contract voor deze week
  const isOproep = employee.contract_type === "Oproep" ||
    ((contract.type_contract || "").toLowerCase().includes("oproep"));

  const r = (v) => Math.round(v * 10000) / 10000;

  // === OPROEPKRACHT LOGICA (CAO art. 10) ===
  // Overuren per kalenderdag > 8 uur. Geen aanvulling, geen compensatie, geen weekvergelijking.
  if (isOproep) {
    // Groepeer entries per kalenderdag voor dagelijkse > 8 uur toetsing
    const dayMap = {};
    entries.forEach(e => {
      if (!e.date) return;
      // Splits dienst over middernacht als end_date verschilt van date
      const startDate = e.date;
      const endDate = e.end_date || e.date;
      const hours = e.total_hours || 0;

      if (startDate !== endDate && hours > 0 && e.start_time && e.end_time) {
        // Nachtdienst: split proportioneel per kalenderdag
        const [sH, sM] = e.start_time.split(':').map(Number);
        const [eH, eM] = e.end_time.split(':').map(Number);
        const startMin = sH * 60 + sM;
        let endMin = eH * 60 + eM;
        if (endMin <= startMin) endMin += 1440;
        const totalMin = endMin - startMin - (e.break_minutes || 0);
        if (totalMin <= 0) {
          if (!dayMap[startDate]) dayMap[startDate] = 0;
          return;
        }
        const minutesBefore = 1440 - startMin; // minuten vóór middernacht
        const minutesAfter = endMin - 1440;    // minuten na middernacht
        const breakMin = e.break_minutes || 0;
        // Verdeel pauze proportioneel
        const breakBefore = Math.round(breakMin * (minutesBefore / (minutesBefore + minutesAfter)));
        const breakAfter = breakMin - breakBefore;
        const hoursBefore = Math.max(0, (minutesBefore - breakBefore) / 60);
        const hoursAfter = Math.max(0, (minutesAfter - breakAfter) / 60);
        dayMap[startDate] = (dayMap[startDate] || 0) + hoursBefore;
        dayMap[endDate] = (dayMap[endDate] || 0) + hoursAfter;
      } else {
        dayMap[startDate] = (dayMap[startDate] || 0) + hours;
      }
    });

    // Per kalenderdag ma-vr > 8 uur → overuren. Za/zo = diensturen, GEEN overwerk.
    let oproepOveruren = 0;
    for (const [dateStr, dayHours] of Object.entries(dayMap)) {
      const dow = new Date(dateStr).getDay();
      // Alleen ma(1)-vr(5): overwerk 130%. Za(6)/zo(0) gaan naar diensturen-toeslag.
      if (dow >= 1 && dow <= 5 && dayHours > 8) {
        oproepOveruren += dayHours - 8;
      }
    }

    // Oproepkracht: toeslagen za/zo/feestdag/nacht blijven ongewijzigd
    // Alleen overuren = per kalenderdag > 8 uur, geen aanvulling/compensatie/weekvergelijking
    return {
      gewerkte_dagen: gewerkteDagen,
      uren_100: r(totalHours),
      compensatie_uren: 0,
      aanvulling_contract: 0,
      diensttoeslag_za_150: r(saturdayHours),
      diensttoeslag_zo_200: r(sundayHours),
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
      variabele_uren_100: r(totalHours),
      toeslagenmatrix_19: (employee.is_chauffeur !== false) ? r(nightHours) : 0,
      toeslag_za_50: r(saturdayHours),
      za_overwerk_150: 0,
      toeslag_zo_100: r(sundayHours),
      zo_overwerk_200: 0,
      diensturen_feestdag_200: r(holidayHoursWorked),
      toeslag_feestdag_100: r(holidayHoursWorked),
      feestdag_overwerk_200: 0,
      overwerk_130: r(oproepOveruren),
      partnerverlof_week: r(partnerverlofWeek),
      verblijfkosten: Math.round(subsistence * 100) / 100,
    };
  }

  // === REGULIERE LOGICA (niet-oproepkracht) ===
  // Contracttekort = hoeveel uren nog nodig zijn om contracturen vol te maken
  // na doordeweekse uren + feestdaguren (feestdag telt mee als gewerkt).
  const contractTekort = Math.max(0, contractHours - weekdayHours);

  // Weekenduren binnen contracttekort → basis_100 + toeslag (za 50% / zo 100%)
  // Weekenduren boven contracttekort → overwerk (za 150% / zo 200%)
  // Volgorde aanvulling: eerst zaterdag, dan zondag
  const zaAanvulling = Math.min(saturdayHours, contractTekort);
  const zaOverwerk = Math.max(0, saturdayHours - zaAanvulling);
  const restTekortNaZa = Math.max(0, contractTekort - zaAanvulling);

  const zoAanvulling = Math.min(sundayHours, restTekortNaZa);
  const zoOverwerk = Math.max(0, sundayHours - zoAanvulling);
  const restTekortNaZo = Math.max(0, restTekortNaZa - zoAanvulling);

  // Feestdag: binnen restant contracttekort → diensturen + toeslag, boven → overwerk
  const feestdagDienst = Math.min(holidayHoursWorked, restTekortNaZo);
  const feestdagOverwerk = Math.max(0, holidayHoursWorked - feestdagDienst);

  const aanvulling = zaAanvulling + zoAanvulling;

  // Overwerk 130% = doordeweekse uren boven contracturen
  const overwerk130 = Math.max(0, weekdayHours - contractHours);

  const variabeleUren100 = 0;

  return {
    gewerkte_dagen: gewerkteDagen,
    uren_100: r(totalHours),
    compensatie_uren: 0,
    aanvulling_contract: r(aanvulling),
    diensttoeslag_za_150: 0,
    diensttoeslag_zo_200: 0,
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
    toeslagenmatrix_19: (employee.is_chauffeur !== false) ? r(nightHours) : 0,
    toeslag_za_50: r(zaAanvulling),
    za_overwerk_150: r(zaOverwerk),
    toeslag_zo_100: r(zoAanvulling),
    zo_overwerk_200: r(zoOverwerk),
    diensturen_feestdag_200: r(holidayHoursWorked),
    toeslag_feestdag_100: r(feestdagDienst),
    feestdag_overwerk_200: r(feestdagOverwerk),
    overwerk_130: r(overwerk130),
    partnerverlof_week: r(partnerverlofWeek),
    verblijfkosten: Math.round(subsistence * 100) / 100,
  };
}

export default function LoonrapportOverzicht({
  year, selectedPeriode, periodes, employees, timeEntries, holidays, salaryTables, onSelectEmployee
}) {
  // Haal uursoort-mapping op uit PayrollSettings
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;
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

    const headers = ["Periode", "Weken", "Medewerker", ...visibleColumns.map(c => {
      const mappingKey = c.key === "toeslag_za_50" ? "toeslag_za_50"
        : c.key === "za_overwerk_150" ? "overwerk_zaterdag_150"
        : c.key === "toeslag_zo_100" ? "toeslag_zo_100"
        : c.key === "zo_overwerk_200" ? "overwerk_zondag_200"
        : c.key === "diensttoeslag_za_150" ? "diensturen_zaterdag_150"
        : c.key === "diensttoeslag_zo_200" ? "diensturen_zondag_200"
        : c.key;
      const code = uursoortMapping?.[mappingKey];
      return code ? `${c.label} (${code})` : c.label;
    })];
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
                      {visibleColumns.map(col => {
                        // Map looncomponent keys → VARIABELE_KOLOMMEN key mapping
                        const mappingKey = col.key === "toeslag_za_50" ? "toeslag_za_50"
                          : col.key === "za_overwerk_150" ? "overwerk_zaterdag_150"
                          : col.key === "toeslag_zo_100" ? "toeslag_zo_100"
                          : col.key === "zo_overwerk_200" ? "overwerk_zondag_200"
                          : col.key === "diensttoeslag_za_150" ? "diensturen_zaterdag_150"
                          : col.key === "diensttoeslag_zo_200" ? "diensturen_zondag_200"
                          : col.key;
                        const code = uursoortMapping?.[mappingKey];
                        return (
                          <TableHead key={col.key} className="text-right text-xs whitespace-nowrap">
                            {col.label}{code ? ` (${code})` : ""}
                          </TableHead>
                        );
                      })}
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