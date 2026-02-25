import React, { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getFullName } from "@/components/utils/employeeUtils";
import { getWeek, format } from "date-fns";
import { calculateWeekData, VARIABELE_KOLOMMEN } from "@/components/salary/LoonrapportOverzicht";
import { getDefaultPeriodes } from "@/components/salary/LoonperiodeConfig";

const printCSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: white; }
  .no-print { display: none !important; }
  .a4-page {
    width: 210mm; min-height: 297mm; max-height: 297mm;
    padding: 14mm 16mm 12mm 16mm;
    display: flex; flex-direction: column;
    background: white; overflow: hidden;
    page-break-after: always;
  }
  @media screen {
    .a4-page {
      margin: 0 auto;
      box-shadow: 0 0 10px rgba(0,0,0,0.15);
    }
  }
`;

export default function LoonstrookPrint() {
  const params = new URLSearchParams(window.location.search);
  const year = Number(params.get("year"));
  const periode = Number(params.get("periode"));
  const employeeId = params.get("employeeId");

  const { data: employees = [], isLoading: le } = useQuery({
    queryKey: ["employees"], queryFn: () => base44.entities.Employee.list(),
  });
  const { data: timeEntries = [], isLoading: lt } = useQuery({
    queryKey: ["timeEntries-all"], queryFn: () => base44.entities.TimeEntry.list(),
  });
  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays-all"], queryFn: () => base44.entities.Holiday.list(),
  });
  const { data: salaryTables = [] } = useQuery({
    queryKey: ["salaryTables"], queryFn: () => base44.entities.SalaryTable.list(),
  });
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ["payrollSettings"], queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const { data: loonperiodeStatuses = [] } = useQuery({
    queryKey: ["loonperiodeStatuses"], queryFn: () => base44.entities.LoonperiodeStatus.list(),
  });

  const isLoading = le || lt;
  const employee = employees.find(e => e.id === employeeId);
  const periodes = getDefaultPeriodes();
  const currentPeriode = periodes.find(p => p.periode === periode);
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;

  const isDefinitief = loonperiodeStatuses.some(
    s => s.year === year && s.periode === periode && s.status === "Definitief"
  );

  // Contract
  const contract = useMemo(() => {
    if (!employee) return {};
    return (employee.contractregels || [])
      .filter(c => c.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  }, [employee]);

  const reiskosten = useMemo(() => {
    if (!employee) return {};
    return (employee.reiskostenregels || [])
      .filter(r => r.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  }, [employee]);

  const loonschaal = contract.loonschaal || employee?.salary_scale || "";
  const contractHours = contract.uren_per_week || employee?.contract_hours || 0;
  const isOproepkracht = employee?.contract_type === "Oproep" ||
    (contract.type_contract || "").toLowerCase().includes("oproep");

  const hourlyRate = useMemo(() => {
    if (!employee) return 0;
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

  const oproepUurloonInclVB = isOproepkracht ? Math.round(hourlyRate * 1.08 * 100) / 100 : 0;
  const yearlyRate = monthlyRate * 12;
  const dailyRate = monthlyRate / 21.75;
  const parttime = contractHours >= 40 ? 100 : Math.round((contractHours / 40) * 100);

  const inServiceDate = employee?.in_service_since || employee?.contract_start_date ||
    ((employee?.contractregels || []).filter(c => c.startdatum).sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0]?.startdatum || "");

  // Calculate week data
  const wekenDetail = useMemo(() => {
    if (!employee || !currentPeriode) return [];
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

  const hiddenKeys = isOproepkracht
    ? new Set(["toeslag_za_50", "toeslag_zo_100"])
    : new Set(["diensttoeslag_za_150", "diensttoeslag_zo_200"]);

  const visibleColumns = useMemo(() => {
    return VARIABELE_KOLOMMEN.filter(col => {
      if (hiddenKeys.has(col.key)) return false;
      return (periodeTotals[col.key] || 0) !== 0;
    });
  }, [periodeTotals, isOproepkracht]);

  const toeslagBedragen = useMemo(() => {
    const basisLoon = isOproepkracht ? oproepUurloonInclVB : hourlyRate;
    const calc = (key, pct) => Math.round((periodeTotals[key] || 0) * basisLoon * pct * 100) / 100;
    return {
      toeslagenmatrix_19: calc("toeslagenmatrix_19", 0.19),
      toeslag_za_50: calc("toeslag_za_50", 0.50),
      za_overwerk_150: calc("za_overwerk_150", 0.50),
      toeslag_zo_100: calc("toeslag_zo_100", 1.00),
      zo_overwerk_200: calc("zo_overwerk_200", 1.00),
      toeslag_feestdag_100: calc("toeslag_feestdag_100", 1.00),
      feestdag_overwerk_200: calc("feestdag_overwerk_200", 1.00),
      overwerk_130: calc("overwerk_130", 0.30),
      variabele_uren_100: isOproepkracht ? Math.round((periodeTotals.variabele_uren_100 || 0) * (isOproepkracht ? oproepUurloonInclVB : hourlyRate) * 100) / 100 : 0,
    };
  }, [periodeTotals, hourlyRate, isOproepkracht, oproepUurloonInclVB]);

  // Inhoudingen
  const meals = useMemo(() => {
    if (!employee) return 0;
    return wekenDetail.reduce((s, w) => {
      const weekEntries = timeEntries.filter(e => {
        if (!e.date || e.employee_id !== employee.id) return false;
        const d = new Date(e.date);
        const wk = e.week_number || getWeek(d, { weekStartsOn: 1 });
        return wk === w.weekNr;
      });
      return s + weekEntries.reduce((ms, e) => ms + (e.meals || 0), 0);
    }, 0);
  }, [wekenDetail, timeEntries, employee]);

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

  const getCode = (colKey) => {
    const code = uursoortMapping?.[getMappingKey(colKey)];
    return code ? ` (${code})` : "";
  };

  // Auto-print
  useEffect(() => {
    if (!isLoading && employee) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading, employee]);

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return "-";
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(4).replace(/\.?0+$/, "");
  };

  // Date range
  const dateRange = useMemo(() => {
    if (!currentPeriode || currentPeriode.weken.length === 0) return "";
    const jan4 = new Date(year, 0, 4);
    const first = new Date(jan4);
    first.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (currentPeriode.weken[0] - 1) * 7);
    const last = new Date(jan4);
    last.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (currentPeriode.weken[currentPeriode.weken.length - 1] - 1) * 7);
    last.setDate(last.getDate() + 6);
    return `${format(first, "dd-MM-yyyy")} t/m ${format(last, "dd-MM-yyyy")}`;
  }, [year, currentPeriode]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#64748b", fontSize: 14 }}>Laden...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="a4-page" style={{ justifyContent: "center", alignItems: "center" }}>
        <style>{printCSS}</style>
        <p style={{ color: "#dc2626", fontSize: 14 }}>Medewerker niet gevonden (ID: {employeeId})</p>
      </div>
    );
  }

  if (!currentPeriode || currentPeriode.weken.length === 0) {
    return (
      <div className="a4-page" style={{ justifyContent: "center", alignItems: "center" }}>
        <style>{printCSS}</style>
        <p style={{ color: "#dc2626", fontSize: 14 }}>
          Geen weekmapping ingesteld voor Periode {periode} van {year}.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{printCSS}</style>
      <div className="a4-page" style={{
        width: "210mm", minHeight: "297mm", maxHeight: "297mm",
        padding: "14mm 16mm 12mm 16mm", display: "flex", flexDirection: "column",
        background: "white", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        {/* === HEADER === */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, borderBottom: "2px solid #1e293b", paddingBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Interdistri B.V.</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>CAO Beroepsgoederenvervoer</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              Loonstrook Periode {periode} – {year}
            </div>
            <div style={{ fontSize: 9, color: "#64748b" }}>
              {dateRange} · Weken {currentPeriode.weken.join(", ")}
            </div>
            {!isDefinitief && (
              <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 2, background: "#f1f5f9", display: "inline-block", padding: "1px 6px", borderRadius: 2 }}>
                CONCEPT
              </div>
            )}
          </div>
        </div>

        {/* === WERKNEMER GEGEVENS === */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10, padding: "6px 8px", background: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>
              {employee.initials ? `(${employee.initials}) ` : ""}{getFullName(employee)}
            </div>
            <div style={{ fontSize: 9, color: "#64748b" }}>Nr: {employee.employee_number || "-"}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#64748b" }}>Functie: <span style={{ color: "#334155", fontWeight: 500 }}>{employee.function || "-"}</span></div>
            <div style={{ fontSize: 9, color: "#64748b" }}>Afdeling: <span style={{ color: "#334155", fontWeight: 500 }}>{employee.department || "-"}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#64748b" }}>In dienst: <span style={{ color: "#334155", fontWeight: 500 }}>{inServiceDate ? format(new Date(inServiceDate), "dd-MM-yyyy") : "-"}</span></div>
            {employee.out_of_service_date && (
              <div style={{ fontSize: 9, color: "#64748b" }}>Uit dienst: <span style={{ color: "#334155", fontWeight: 500 }}>{format(new Date(employee.out_of_service_date), "dd-MM-yyyy")}</span></div>
            )}
          </div>
        </div>

        {/* === BASIS LOONGEGEVENS === */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, borderBottom: "1px solid #cbd5e1", paddingBottom: 2 }}>
            Basis loongegevens
          </div>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <tbody>
              <LoonRow label="Contract" value={isOproepkracht ? "Oproep (variabel)" : contractHours >= 40 ? "Vast" : `Parttime (${contractHours} uur/wk)`} />
              <LoonRow label="Loonschaal" value={loonschaal || "-"} />
              {!isOproepkracht && <LoonRow label="Parttime %" value={`${parttime},00%`} />}
              {!isOproepkracht && <LoonRow label="Contracturen/week" value={contractHours.toFixed(2)} />}
              <LoonRow label="Bruto uurloon" value={`€ ${hourlyRate.toFixed(2)}`} bold />
              {isOproepkracht && <LoonRow label="Uurloon incl. 8% VB" value={`€ ${oproepUurloonInclVB.toFixed(2)}`} bold />}
              {!isOproepkracht && <LoonRow label="Bruto maandloon" value={`€ ${monthlyRate.toFixed(2)}`} />}
            </tbody>
          </table>
        </div>

        {/* === VARIABELE KOSTEN === */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, borderBottom: "1px solid #cbd5e1", paddingBottom: 2 }}>
            Variabele kosten loonperiode
          </div>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "2px 0", fontSize: 9, color: "#64748b", fontWeight: 600 }}>Component</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontSize: 9, color: "#64748b", fontWeight: 600, width: 80 }}>Aantal</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontSize: 9, color: "#64748b", fontWeight: 600, width: 80 }}>Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {visibleColumns.map(col => {
                const total = periodeTotals[col.key] || 0;
                if (total === 0) return null;
                const isEuro = col.key === "verblijfkosten";
                const isDagen = col.key === "gewerkte_dagen";
                const bedrag = toeslagBedragen[col.key] || null;
                return (
                  <tr key={col.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "2px 0", color: "#334155" }}>{col.label}{getCode(col.key)}</td>
                    <td style={{ padding: "2px 0", textAlign: "right", color: "#0f172a", fontWeight: 500 }}>
                      {isEuro ? `€ ${total.toFixed(2)}` : isDagen ? `${fmt(total)} d` : `${fmt(total)} u`}
                    </td>
                    <td style={{ padding: "2px 0", textAlign: "right", color: "#0f172a" }}>
                      {!isEuro && bedrag ? `€ ${bedrag.toFixed(2)}` : isEuro ? "" : "-"}
                    </td>
                  </tr>
                );
              })}
              {periodeTotals.woonwerk > 0 && (
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "2px 0", color: "#334155" }}>Woon-werk onbelast</td>
                  <td style={{ padding: "2px 0", textAlign: "right" }}></td>
                  <td style={{ padding: "2px 0", textAlign: "right", color: "#0f172a", fontWeight: 500 }}>€ {periodeTotals.woonwerk.toFixed(2)}</td>
                </tr>
              )}
              {meals > 0 && (
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "2px 0", color: "#334155" }}>Inhoudingen</td>
                  <td style={{ padding: "2px 0", textAlign: "right" }}></td>
                  <td style={{ padding: "2px 0", textAlign: "right", color: "#dc2626", fontWeight: 500 }}>-€ {meals.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* === TOTALEN === */}
        <div style={{ borderTop: "2px solid #1e293b", paddingTop: 6, marginTop: 6 }}>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>Totaal gewerkte uren</td>
                <td style={{ fontWeight: 700, color: "#0f172a", padding: "2px 0", textAlign: "right", width: 80 }}>{fmt(periodeTotals.uren_100)} uur</td>
                <td style={{ width: 80 }}></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>Gewerkte dagen</td>
                <td style={{ fontWeight: 700, color: "#0f172a", padding: "2px 0", textAlign: "right" }}>{periodeTotals.gewerkte_dagen || 0}</td>
                <td></td>
              </tr>
              {(() => {
                const totalToeslagen = Object.values(toeslagBedragen).reduce((s, v) => s + v, 0);
                if (totalToeslagen > 0) {
                  return (
                    <tr>
                      <td style={{ fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>Totaal toeslagen</td>
                      <td></td>
                      <td style={{ fontWeight: 700, color: "#0f172a", padding: "2px 0", textAlign: "right" }}>€ {totalToeslagen.toFixed(2)}</td>
                    </tr>
                  );
                }
                return null;
              })()}
            </tbody>
          </table>
        </div>

        {/* === FOOTER === */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 4, marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 8, color: "#94a3b8" }}>
          <span>Interdistri B.V. · Loonstrook {year}-{String(periode).padStart(2, "0")}</span>
          <span>Gegenereerd: {format(new Date(), "dd-MM-yyyy HH:mm")}</span>
        </div>
      </div>
    </>
  );
}

function LoonRow({ label, value, bold }) {
  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "2px 0", color: "#475569" }}>{label}</td>
      <td style={{ padding: "2px 0", textAlign: "right", color: "#0f172a", fontWeight: bold ? 600 : 400 }}>{value}</td>
    </tr>
  );
}