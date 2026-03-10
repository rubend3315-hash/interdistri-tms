import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { getWeek, getDay, format } from "date-fns";
import { calculateWeekData, VARIABELE_KOLOMMEN } from "./LoonrapportOverzicht";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

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
  const contractHours = contract.uren_per_week ?? 0;
  const isOproepkracht = (contract.type_contract || "").toLowerCase().includes("oproep");

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

  // Oproepkracht: uurloon incl. 8% vakantiebijslag (CAO art. 10)
  const oproepUurloonInclVB = isOproepkracht ? Math.round(hourlyRate * 1.08 * 100) / 100 : 0;

  const yearlyRate = monthlyRate * 12;
  const dailyRate = monthlyRate / 21.75;
  const parttime = contractHours >= 40 ? 100 : Math.round((contractHours / 40) * 100);

  const inServiceDate = employee.in_service_since ||
    ((employee.contractregels || []).filter(c => c.startdatum).sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0]?.startdatum || "");

  const currentPeriode = periodes.find(p => p.periode === selectedPeriode);

  // Geen weekmapping → foutmelding
  if (!currentPeriode || currentPeriode.weken.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar overzicht
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-red-500 font-medium">
            Geen weekmapping ingesteld voor Periode {selectedPeriode}. Configureer de weken via "Periodes inzien".
          </CardContent>
        </Card>
      </div>
    );
  }

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
      // Bereken startdatum van deze week voor contract-lookup
      const jan4 = new Date(year, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNr - 1) * 7);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const data = calculateWeekData(employee, weekEntries, holidays, weekStartStr);
      
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
  // Oproepkracht: verberg toeslag_za_50/toeslag_zo_100 (dubbel met diensttoeslag)
  // Contractmedewerker: verberg diensttoeslag_za_150/diensttoeslag_zo_200
  const hiddenKeys = isOproepkracht
    ? new Set(["toeslag_za_50", "toeslag_zo_100", "uren_100"])
    : new Set(["diensttoeslag_za_150", "diensttoeslag_zo_200"]);

  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      if (hiddenKeys.has(col.key)) return false;
      return wekenDetail.some(w => (w[col.key] || 0) !== 0) || (periodeTotals[col.key] || 0) !== 0;
    });
  }, [wekenDetail, periodeTotals, isOproepkracht]);

  // Toeslag bedragen berekenen uit periodeTotals
  // Oproepkracht: functieloon + 8% VB als basisloon (CAO art. 10)
  const toeslagBedragen = useMemo(() => {
    const basisLoon = isOproepkracht ? oproepUurloonInclVB : hourlyRate;
    const calc = (key, pct) => Math.round((periodeTotals[key] || 0) * basisLoon * pct * 100) / 100;
    return {
      toeslagenmatrix_19: calc("toeslagenmatrix_19", 0.19),
      toeslag_za_50: calc("toeslag_za_50", 0.50),
      diensttoeslag_za_150: calc("diensttoeslag_za_150", 1.50),
      za_overwerk_150: calc("za_overwerk_150", 0.50),
      toeslag_zo_100: calc("toeslag_zo_100", 1.00),
      zo_overwerk_200: calc("zo_overwerk_200", 1.00),
      toeslag_feestdag_100: calc("toeslag_feestdag_100", 1.00),
      feestdag_overwerk_200: calc("feestdag_overwerk_200", 1.00),
      overwerk_130: calc("overwerk_130", 0.30),
      variabele_uren_100: isOproepkracht ? Math.round((periodeTotals.variabele_uren_100 || 0) * basisLoon * 100) / 100 : 0,
    };
  }, [periodeTotals, hourlyRate, isOproepkracht, oproepUurloonInclVB]);

  // Uursoort-mapping ophalen
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;

  // Map VARIABELE_KOLOMMEN keys naar mapping keys
  const getMappingKey = (colKey) => {
    const keyMap = {
      toeslag_za_50: "toeslag_za_50",
      za_overwerk_150: "overwerk_zaterdag_150",
      toeslag_zo_100: "toeslag_zo_100",
      zo_overwerk_200: "overwerk_zondag_200",
      diensttoeslag_za_150: "diensturen_zaterdag_150",
      diensttoeslag_zo_200: "diensturen_zondag_200",
    };
    return keyMap[colKey] || colKey;
  };

  const getCodeSuffix = (colKey) => {
    const code = uursoortMapping?.[getMappingKey(colKey)];
    return code ? ` (${code})` : "";
  };

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
      <div className="flex items-center print:hidden">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar overzicht
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
              <p className="text-sm">Uit dienst: <span className="font-medium">{employee.out_of_service_date ? format(new Date(employee.out_of_service_date), "dd-MM-yyyy") : ""}</span></p>
            </div>
          </div>
        </div>

        {/* Basis loongegevens */}
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b bg-slate-50">
            <p className="font-semibold text-slate-700">Basis loongegevens</p>
            <p className="text-sm text-slate-500">Loonrun {year}-{String(selectedPeriode).padStart(2, "0")} · Weken: {currentPeriode.weken.length > 0 ? currentPeriode.weken.join(", ") : "—"}</p>
          </div>
          <div className="divide-y">
            <Row label="Uren" value={isOproepkracht ? "Oproepcontract (variabel)" : contractHours >= 40 ? "Vast" : `Parttime (${contractHours} uur)`} />
            <Row label="Loonschaal" value={loonschaal || "-"} />
            {!isOproepkracht && <Row label="Parttime percentage" value={`${parttime},00 %`} />}
            {!isOproepkracht && <Row label="Contracturen per week" value={contractHours.toFixed(2)} />}
            {!isOproepkracht && <Row label="Bruto jaarloon" value={`€ ${yearlyRate.toFixed(2)}`} isCurrency />}
            {!isOproepkracht && <Row label="Bruto maandloon" value={`€ ${monthlyRate.toFixed(2)}`} isCurrency />}
            {!isOproepkracht && <Row label="Bruto dagloon" value={`€ ${dailyRate.toFixed(2)}`} isCurrency />}
            <Row label="Bruto uurloon (functieloon)" value={`€ ${hourlyRate.toFixed(2)}`} isCurrency />
            {isOproepkracht && <Row label="Uurloon incl. 8% VB (CAO art. 10)" value={`€ ${oproepUurloonInclVB.toFixed(2)}`} isCurrency />}
            {isOproepkracht && <Row label="Overuren drempel" value="8 uur per kalenderdag" />}
          </div>
        </CardContent>
      </Card>

      {/* Variabele kosten loonperiode - opgeteld */}
      <Card className="overflow-hidden">
        <div className="bg-slate-700 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">
            Variabele kosten loonperiode {currentPeriode.weken.length > 0 ? (() => {
              const jan4 = new Date(year, 0, 4);
              const firstWeekStart = new Date(jan4);
              firstWeekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (currentPeriode.weken[0] - 1) * 7);
              const lastWeekStart = new Date(jan4);
              lastWeekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (currentPeriode.weken[currentPeriode.weken.length - 1] - 1) * 7);
              const lastWeekEnd = new Date(lastWeekStart);
              lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
              return `${format(firstWeekStart, "dd-MM-yyyy")} t/m ${format(lastWeekEnd, "dd-MM-yyyy")}`;
            })() : ""}
          </span>
          <span className="text-sm text-slate-300">Bedragen toelichting</span>
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Weeknummers */}
            <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
              <span className="text-sm text-slate-600">Weeknummers in deze periode</span>
              <span className="text-sm font-medium text-slate-700">
                {currentPeriode.weken.join(", ")}
              </span>
            </div>

            {/* Saldo uren voor vakantiebijslag en verlofuren */}
            {(() => {
              const saldoVakantieUren = Math.round(wekenDetail.reduce((s, w) => s + (w.saldo_vakantie_uren || 0), 0) * 10000) / 10000;
              if (saldoVakantieUren > 0) {
                return (
                  <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
                    <span className="text-sm text-slate-600">Saldo uren voor berekening vakantiebijslag en verlofuren</span>
                    <div className="flex items-center gap-8">
                      <span className="text-sm font-medium text-slate-700">{fmt(saldoVakantieUren)} uur</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Variabele kosten regels - alleen gevulde tonen */}
            {visibleColumns.map(col => {
              const total = periodeTotals[col.key] || 0;
              if (total === 0) return null;
              const isEuro = col.key === "verblijfkosten";
              const isDagen = col.key === "gewerkte_dagen";
              const bedrag = toeslagBedragen[col.key] || null;

              return (
                <div key={col.key} className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
                  <span className="text-sm text-slate-600">{col.label}{getCodeSuffix(col.key)}</span>
                  <div className="flex items-center gap-8">
                    <span className="text-sm font-medium text-slate-700 min-w-[100px] text-right">
                      {isEuro ? `€ ${total.toFixed(2)}` : isDagen ? `${fmt(total)} ${total === 1 ? 'dag' : 'dagen'}` : `${fmt(total)} uur`}
                    </span>
                    {!isEuro && bedrag ? (
                      <span className="text-sm font-medium text-slate-700 min-w-[100px] text-right">
                        € {bedrag.toFixed(2)}
                      </span>
                    ) : (
                      <span className="min-w-[100px]" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Woon-werkverkeer */}
            {periodeTotals.woonwerk > 0 && (
              <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
                <span className="text-sm text-slate-600">Woon-werk onbelast</span>
                <div className="flex items-center gap-8">
                  <span className="text-sm font-medium text-slate-700 min-w-[100px] text-right">
                    € {periodeTotals.woonwerk.toFixed(2)}
                  </span>
                  <span className="min-w-[100px]" />
                </div>
              </div>
            )}

            {/* Inhoudingen */}
            {(() => {
              const meals = wekenDetail.reduce((s, w) => {
                const weekEntries = timeEntries.filter(e => {
                  if (!e.date || e.employee_id !== employee.id) return false;
                  const d = new Date(e.date);
                  const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
                  return wk === w.weekNr;
                });
                return s + weekEntries.reduce((ms, e) => ms + (e.meals || 0), 0);
              }, 0);
              if (meals > 0) {
                return (
                  <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
                    <span className="text-sm text-slate-600">Inhoudingen</span>
                    <div className="flex items-center gap-8">
                      <span className="text-sm font-medium text-slate-700 min-w-[100px] text-right">
                        € {meals.toFixed(2)}
                      </span>
                      <span className="min-w-[100px]" />
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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