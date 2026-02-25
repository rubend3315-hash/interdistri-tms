import React, { useMemo } from "react";
import { getFullName } from "@/components/utils/employeeUtils";
import { getWeek, getDay, format } from "date-fns";
import { calculateWeekData, VARIABELE_KOLOMMEN } from "./LoonrapportOverzicht";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function LoonrapportPrintItem({ employee, year, selectedPeriode, periodes, timeEntries, holidays, salaryTables }) {
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
      return { weekNr, ...data };
    });
  }, [timeEntries, employee, year, currentPeriode, holidays, reiskosten]);

  const periodeTotals = useMemo(() => {
    const totals = {};
    VARIABELE_KOLOMMEN.forEach(col => {
      totals[col.key] = wekenDetail.reduce((s, w) => s + (w[col.key] || 0), 0);
    });
    totals.woonwerk = wekenDetail.reduce((s, w) => s + (w.woonwerk || 0), 0);
    return totals;
  }, [wekenDetail]);

  // Oproepkracht: verberg toeslag_za_50/toeslag_zo_100 (dubbel met diensttoeslag)
  // Contractmedewerker: verberg diensttoeslag_za_150/diensttoeslag_zo_200
  const hiddenKeys = isOproepkracht
    ? new Set(["toeslag_za_50", "toeslag_zo_100"])
    : new Set(["diensttoeslag_za_150", "diensttoeslag_zo_200"]);

  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      if (hiddenKeys.has(col.key)) return false;
      return wekenDetail.some(w => (w[col.key] || 0) !== 0) || (periodeTotals[col.key] || 0) !== 0;
    });
  }, [wekenDetail, periodeTotals, isOproepkracht]);

  const toeslagBedragen = useMemo(() => {
    const calc = (key, pct) => Math.round((periodeTotals[key] || 0) * hourlyRate * pct * 100) / 100;
    return {
      toeslagenmatrix_19: calc("toeslagenmatrix_19", 0.19),
      toeslag_za_50: calc("toeslag_za_50", 0.50),
      za_overwerk_150: calc("za_overwerk_150", 0.50),
      toeslag_zo_100: calc("toeslag_zo_100", 1.00),
      zo_overwerk_200: calc("zo_overwerk_200", 1.00),
      toeslag_feestdag_100: calc("toeslag_feestdag_100", 1.00),
      feestdag_overwerk_200: calc("feestdag_overwerk_200", 1.00),
      overwerk_130: calc("overwerk_130", 0.30),
      variabele_uren_100: isOproepkracht ? Math.round((periodeTotals.variabele_uren_100 || 0) * hourlyRate * 100) / 100 : 0,
    };
  }, [periodeTotals, hourlyRate, isOproepkracht]);

  // Uursoort-mapping ophalen
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;

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

  // Check if employee has any data
  const hasData = periodeTotals.uren_100 > 0 || periodeTotals.verlof > 0 || periodeTotals.ziek > 0 || periodeTotals.feestdag > 0 || periodeTotals.variabele_uren_100 > 0;
  if (!hasData) return null;

  // Period date range
  const periodeDateRange = currentPeriode.weken.length > 0 ? (() => {
    const jan4 = new Date(year, 0, 4);
    const firstWeekStart = new Date(jan4);
    firstWeekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (currentPeriode.weken[0] - 1) * 7);
    const lastWeekStart = new Date(jan4);
    lastWeekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (currentPeriode.weken[currentPeriode.weken.length - 1] - 1) * 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    return `${format(firstWeekStart, "dd-MM-yyyy")} t/m ${format(lastWeekEnd, "dd-MM-yyyy")}`;
  })() : "";

  const meals = wekenDetail.reduce((s, w) => {
    const weekEntries = timeEntries.filter(e => {
      if (!e.date || e.employee_id !== employee.id) return false;
      const d = new Date(e.date);
      const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
      return wk === w.weekNr;
    });
    return s + weekEntries.reduce((ms, e) => ms + (e.meals || 0), 0);
  }, 0);

  // Saldo uren voor vakantiebijslag/verlof = som van min(weekuren, 40) per week
  const saldoVakantieUren = Math.round(wekenDetail.reduce((s, w) => s + (w.saldo_vakantie_uren || 0), 0) * 10000) / 10000;

  return (
    <div className="print-report-item" style={{ pageBreakAfter: "always", pageBreakInside: "avoid" }}>
      {/* Header */}
      <div style={{ background: "#334155", color: "white", padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "12px" }}>
        <div>
          <p style={{ fontWeight: "bold", fontSize: "14px" }}>({employee.initials || ""}) {getFullName(employee)}</p>
          <p style={{ color: "#cbd5e1" }}>Personeelsnummer: {employee.employee_number || "-"}</p>
        </div>
        <div>
          <p>Functie: <strong>{employee.function || "-"}</strong></p>
          <p>Afdeling: <strong>{employee.department || "-"}</strong></p>
        </div>
        <div>
          <p>In dienst: <strong>{inServiceDate ? format(new Date(inServiceDate), "dd-MM-yyyy") : "-"}</strong></p>
          <p>Uit dienst: <strong>{employee.contract_end_date ? format(new Date(employee.contract_end_date), "dd-MM-yyyy") : ""}</strong></p>
        </div>
      </div>

      {/* Basis loongegevens */}
      <div style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 20px", background: "#f8fafc" }}>
        <p style={{ fontWeight: 600, color: "#334155", fontSize: "13px" }}>Basis loongegevens</p>
        <p style={{ fontSize: "11px", color: "#64748b" }}>Loonrun {year}-{String(selectedPeriode).padStart(2, "0")} · {currentPeriode.maand}</p>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <tbody>
          {[
            ["Uren", isOproepkracht ? "Oproep (variabel)" : contractHours >= 40 ? "Vast" : `Parttime (${contractHours} uur)`],
            ["Loonschaal", loonschaal || "-"],
            ["Parttime percentage", `${parttime},00 %`],
            ["Contracturen per week", contractHours.toFixed(2)],
            ["Bruto jaarloon", `€ ${yearlyRate.toFixed(2)}`],
            ["Bruto maandloon", `€ ${monthlyRate.toFixed(2)}`],
            ["Bruto dagloon", `€ ${dailyRate.toFixed(2)}`],
            ["Bruto uurloon", `€ ${hourlyRate.toFixed(2)}`],
          ].map(([label, value], i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "6px 20px", color: "#475569" }}>{label}</td>
              <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Variabele kosten */}
      <div style={{ background: "#334155", color: "white", padding: "8px 20px", marginTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
        <span style={{ fontWeight: 600 }}>Variabele kosten loonperiode {periodeDateRange}</span>
        <span style={{ color: "#cbd5e1" }}>Bedragen toelichting</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <tbody>
          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "6px 20px", color: "#475569" }}>Weeknummers in deze periode</td>
            <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>{currentPeriode.weken.join(", ")}</td>
            <td style={{ width: "100px" }}></td>
          </tr>
          {saldoVakantieUren > 0 && (
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "6px 20px", color: "#475569" }}>Saldo uren voor berekening vakantiebijslag en verlofuren</td>
              <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>{fmt(saldoVakantieUren)} uur</td>
              <td></td>
            </tr>
          )}
          {visibleColumns.map(col => {
            const total = periodeTotals[col.key] || 0;
            if (total === 0) return null;
            const isEuro = col.key === "verblijfkosten";
            const isDagen = col.key === "gewerkte_dagen";
            const bedrag = toeslagBedragen[col.key] || null;
            return (
              <tr key={col.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 20px", color: "#475569" }}>{col.label}</td>
                <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>
                  {isEuro ? `€ ${total.toFixed(2)}` : isDagen ? `${fmt(total)} ${total === 1 ? 'dag' : 'dagen'}` : `${fmt(total)} uur`}
                </td>
                <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>
                  {!isEuro && bedrag ? `€ ${bedrag.toFixed(2)}` : ""}
                </td>
              </tr>
            );
          })}
          {periodeTotals.woonwerk > 0 && (
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "6px 20px", color: "#475569" }}>Woon-werk onbelast</td>
              <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>€ {periodeTotals.woonwerk.toFixed(2)}</td>
              <td></td>
            </tr>
          )}
          {meals > 0 && (
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "6px 20px", color: "#475569" }}>Inhoudingen</td>
              <td style={{ padding: "6px 20px", textAlign: "right", fontWeight: 500 }}>€ {meals.toFixed(2)}</td>
              <td></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}