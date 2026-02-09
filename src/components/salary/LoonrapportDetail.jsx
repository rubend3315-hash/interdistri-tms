import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { getWeek, getDay, format } from "date-fns";

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

  // Huidige loonperiode info
  const currentPeriode = periodes.find(p => p.periode === selectedPeriode) || periodes[0];

  // Variabele kosten - bereken per week in de geselecteerde periode
  const holidayDates = new Set(holidays.map(h => h.date));

  const periodeEntries = useMemo(() => {
    return timeEntries.filter(e => {
      if (!e.date || e.status !== "Goedgekeurd" || e.employee_id !== employee.id) return false;
      const d = new Date(e.date);
      if (d.getFullYear() !== year) return false;
      const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
      return currentPeriode.weken.includes(wk);
    });
  }, [timeEntries, employee, year, currentPeriode]);

  const variabeleData = useMemo(() => {
    let verlof = 0, atv = 0, ziek = 0, feestdag = 0;
    let verblijfEendaags = 0;
    let toeslagMatrix19 = 0; // nachturen
    let dienstZa50 = 0, dienstZo100 = 0, dienstFeest100 = 0;
    let totalWorkedHours = 0;
    let woonWerk = 0;

    periodeEntries.forEach(e => {
      const hours = e.total_hours || 0;
      totalWorkedHours += hours;
      toeslagMatrix19 += e.night_hours || 0;
      verblijfEendaags += e.subsistence_allowance || 0;

      const st = (e.shift_type || "").toLowerCase();
      if (st.includes("verlof")) verlof += hours;
      if (st.includes("ziek")) ziek += hours;
      if (st.includes("atv")) atv += hours;

      const d = new Date(e.date);
      const dayOfWeek = getDay(d);
      const isHoliday = holidayDates.has(e.date);

      if (isHoliday) {
        feestdag += hours;
        dienstFeest100 += hours;
      } else if (dayOfWeek === 6) {
        dienstZa50 += hours;
      } else if (dayOfWeek === 0) {
        dienstZo100 += hours;
      }

      // Reiskosten
      if (hours > 0 && (e.travel_allowance_multiplier || 0) > 0) {
        woonWerk += (reiskosten.vergoeding_per_dag || 0) * (e.travel_allowance_multiplier || 1);
      }
    });

    return {
      verlof, atv, ziek, feestdag,
      verblijfEendaags,
      toeslagMatrix19,
      dienstZa50, dienstZo100, dienstFeest100,
      woonWerk: Math.round(woonWerk * 100) / 100,
    };
  }, [periodeEntries, holidayDates, reiskosten]);

  // Bedragen berekenen
  const toeslagMatrix19Bedrag = Math.round(variabeleData.toeslagMatrix19 * hourlyRate * 0.19 * 100) / 100;
  const dienstZa50Bedrag = Math.round(variabeleData.dienstZa50 * hourlyRate * 0.50 * 100) / 100;
  const dienstZo100Bedrag = Math.round(variabeleData.dienstZo100 * hourlyRate * 1.00 * 100) / 100;
  const dienstFeest100Bedrag = Math.round(variabeleData.dienstFeest100 * hourlyRate * 1.00 * 100) / 100;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar overzicht
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
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
            <p className="text-sm text-slate-500">Loonrun {year}-{String(selectedPeriode).padStart(2, "0")}</p>
          </div>
          <div className="divide-y">
            <Row label="Uren" value={contractHours >= 40 ? "Vast" : `Parttime (${contractHours} uur)`} />
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

      {/* Huidige loonperiode */}
      <Card>
        <div className="bg-slate-700 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">
            Huidige loonperiode {currentPeriode.maand} {year}
          </span>
          <span className="text-sm text-slate-300">Bedragen toelichting</span>
        </div>
        <CardContent className="p-0 divide-y">
          <Row label="SV dagen" value="20" />
          <Row label="Salarisperiodiek" value="Nee" />
        </CardContent>
      </Card>

      {/* Variabele kosten */}
      <Card>
        <div className="bg-slate-700 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">
            Variabele kosten loonperiode - Week {currentPeriode.weken[0]} t/m {currentPeriode.weken[currentPeriode.weken.length - 1]}
          </span>
          <span className="text-sm text-slate-300">Bedragen toelichting</span>
        </div>
        <CardContent className="p-0 divide-y">
          <Row label="Weeknummers in deze periode" value={currentPeriode.weken.join(", ")} />
          {variabeleData.verlof > 0 && (
            <Row label="Verlof" value={`${variabeleData.verlof.toFixed(4)} uur`} />
          )}
          {variabeleData.atv > 0 && (
            <Row label="ATV" value={`${variabeleData.atv.toFixed(4)} uur`} />
          )}
          {variabeleData.verblijfEendaags > 0 && (
            <RowWithAmount label="Verblijfkosten eendaags" value={`€ ${variabeleData.verblijfEendaags.toFixed(2)}`} />
          )}
          {variabeleData.toeslagMatrix19 > 0 && (
            <RowWithAmount
              label="Toeslagenmatrix 19%"
              value={`${variabeleData.toeslagMatrix19.toFixed(4)} uur`}
              amount={`€ ${toeslagMatrix19Bedrag.toFixed(2)}`}
            />
          )}
          {variabeleData.dienstZa50 > 0 && (
            <RowWithAmount
              label="Toeslag diensturen zaterdag 50%"
              value={`${variabeleData.dienstZa50.toFixed(4)} uur`}
              amount={`€ ${dienstZa50Bedrag.toFixed(2)}`}
            />
          )}
          {variabeleData.dienstZo100 > 0 && (
            <RowWithAmount
              label="Toeslag diensturen zondag 100%"
              value={`${variabeleData.dienstZo100.toFixed(4)} uur`}
              amount={`€ ${dienstZo100Bedrag.toFixed(2)}`}
            />
          )}
          {variabeleData.dienstFeest100 > 0 && (
            <RowWithAmount
              label="Toeslag diensturen feestdag 100%"
              value={`${variabeleData.dienstFeest100.toFixed(4)} uur`}
              amount={`€ ${dienstFeest100Bedrag.toFixed(2)}`}
            />
          )}
          {variabeleData.woonWerk > 0 && (
            <RowWithAmount label="Woon-werk onbelast" value={`€ ${variabeleData.woonWerk.toFixed(2)}`} />
          )}
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

function RowWithAmount({ label, value, amount }) {
  return (
    <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-8">
        <span className="text-sm text-slate-700">{value}</span>
        {amount && <span className="text-sm font-medium text-emerald-600">{amount}</span>}
      </div>
    </div>
  );
}