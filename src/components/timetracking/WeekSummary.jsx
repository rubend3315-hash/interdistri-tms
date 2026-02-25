/**
 * WeekSummary — Presentatiecomponent voor de weeksamenvatting.
 *
 * Alle loonberekeningen worden gedelegeerd aan calculateWeekData()
 * (Single Source of Truth voor loonberekening).
 *
 * Deze component mag GEEN eigen berekeningen uitvoeren voor:
 * overwerk, weekend-/feestdagtoeslagen, aanvulling, compensatie,
 * variabele uren of 100%-uren. Alleen renderen van het resultaat.
 */
import React from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { calculateWeekData } from "../salary/LoonrapportOverzicht";
import { AlertTriangle } from "lucide-react";

export default function WeekSummary({ employee, weekDays, timeEntries, contractHours, contractWeekTotal, trips = [], reiskostenTotal = 0 }) {
  const empEntries = timeEntries.filter(e => e.employee_id === employee.id);

  // Holidays ophalen voor calculateWeekData
  const weekYear = weekDays[0] ? weekDays[0].getFullYear() : new Date().getFullYear();
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', weekYear],
    queryFn: () => base44.entities.Holiday.filter({ year: weekYear }),
  });

  // Uursoort-mapping uit PayrollSettings
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;
  const codeLabel = (key) => uursoortMapping?.[key] ? ` (${uursoortMapping[key]})` : "";

  // CAO-regels voor verblijfskosten
  const { data: caoRules = [] } = useQuery({
    queryKey: ['caoRulesVerblijf'],
    queryFn: () => base44.entities.CaoRule.list()
  });

  // ─── Single Source of Truth: calculateWeekData() ───
  const weekStartStr = weekDays[0] ? format(weekDays[0], 'yyyy-MM-dd') : null;
  const result = calculateWeekData(employee, empEntries, holidays, weekStartStr);

  // Oproepkracht detectie (zelfde logica als engine, puur voor UI-branching)
  const activeContracts = (employee.contractregels || [])
    .filter(c => c.status !== "Inactief")
    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum));
  let activeContract = activeContracts[0] || {};
  if (weekStartStr && activeContracts.length > 1) {
    const ref = new Date(weekStartStr);
    activeContract = activeContracts.find(c => {
      const s = new Date(c.startdatum);
      const e = c.einddatum ? new Date(c.einddatum) : new Date("2099-12-31");
      return ref >= s && ref <= e;
    }) || activeContracts[0] || {};
  }
  const isOproep = employee.contract_type === "Oproep" ||
    ((activeContract.type_contract || "").toLowerCase().includes("oproep"));

  // ─── Presentatie-only berekeningen (niet-loon) ───

  // Verlof per type (puur display, geen looncomponent)
  const gewerktTypes = ["Gewerkte dag", "Dag", "Avond", "Nacht"];
  const verlofTypes = ["Verlof", "Betaalde feestdag", "Bijzonder verlof", "Partner verlof",
    "Ouderschapsverlof betaald 70%", "Ouderschapsverlof onbetaald", "Onbetaald verlof",
    "Calamiteit/kort verzuimverlof (100% doorbetaald)", "Kortdurend zorgverlof (70% doorbetaald)",
    "Langdurend zorgverlof (onbetaald)", "Zwangerschapsverlof (70% doorbetaald door UWV)",
    "Partnerverlof", "Zwangerschapsverlof", "Zorgverlof"];
  const verlofEntries = empEntries.filter(e => verlofTypes.includes(e.shift_type));
  const getVerlofByType = (type) => verlofEntries.filter(e => e.shift_type === type).reduce((s, e) => s + (e.total_hours || 0), 0);

  const totalOpleiding = empEntries.filter(e => e.shift_type === "Opleiding").reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalGewerkt = empEntries.filter(e => gewerktTypes.includes(e.shift_type)).reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalNietGewerkt = empEntries.filter(e => !gewerktTypes.includes(e.shift_type)).reduce((s, e) => s + (e.total_hours || 0), 0);

  // Kosten (niet in engine)
  const totalVoorgeschoten = empEntries.reduce((s, e) => s + (e.advanced_costs || 0), 0);
  const totalInhoudingen = empEntries.reduce((s, e) => s + (e.meals || 0), 0);
  const totalWkr = empEntries.reduce((s, e) => s + (e.wkr || 0), 0);

  // Verblijfskosten berekenen uit ritten
  let subsistenceBasis = 0;
  let subsistence1800 = 0;
  let subsistenceLangeDag = 0;
  const verblijfRules = caoRules.filter(r => r.category === 'Verblijfkosten' && r.status === 'Actief');

  if (verblijfRules.length > 0 && trips.length > 0) {
    const eendaagsRules = verblijfRules.filter(r => {
      const n = (r.name || '').toLowerCase();
      const isMeerdaags = n.includes('meerdaags');
      const isEendaags = (n.includes('ndaagse') || n.includes('eendaagse')) && !isMeerdaags;
      return (n.includes('verblijfskosten') || n.includes('verblijfkosten')) && isEendaags;
    });
    const basisRule = eendaagsRules.find(r => !r.start_time && !r.end_time && !(r.name || '').toLowerCase().includes('toeslag'));
    const basisRate = basisRule?.value || 0;
    const avondRule = eendaagsRules.find(r => r.start_time && parseInt(r.start_time) >= 17);
    const avondRate = avondRule?.value || 0;
    const toeslagRule = eendaagsRules.find(r => {
      const n = (r.name || '').toLowerCase();
      const d = (r.description || '').toLowerCase();
      return (n.includes('toeslag') || d.includes('toeslag')) && (d.includes('12 uur') || d.includes('12uur'));
    });

    for (const trip of trips) {
      if (!trip.departure_time || !trip.arrival_time) continue;
      const [depH, depM] = trip.departure_time.split(':').map(Number);
      const [arrH, arrM] = trip.arrival_time.split(':').map(Number);
      let totalMin = (arrH * 60 + arrM) - (depH * 60 + depM);
      const spansNextDay = totalMin < 0;
      if (spansNextDay) totalMin += 24 * 60;
      const tripHours = totalMin / 60;
      if (tripHours <= 4) continue;
      const depMinutes = depH * 60 + depM;
      const departsBefore14 = depMinutes < 14 * 60;
      if (!departsBefore14 || !basisRule) continue;

      let avondHours = 0;
      if (avondRule) {
        const ruleStart = 18 * 60;
        const ruleEnd = 24 * 60;
        if (spansNextDay) {
          const overlapStart = Math.max(depMinutes, ruleStart);
          const overlapEnd = Math.min(24 * 60, ruleEnd);
          if (overlapEnd > overlapStart) avondHours += (overlapEnd - overlapStart) / 60;
        } else {
          const overlapStart = Math.max(depMinutes, ruleStart);
          const overlapEnd = Math.min(depMinutes + totalMin, ruleEnd);
          if (overlapEnd > overlapStart) avondHours = (overlapEnd - overlapStart) / 60;
        }
      }
      const basisHours = tripHours - avondHours;
      subsistenceBasis += basisHours * basisRate;
      subsistence1800 += avondHours * avondRate;
      if (tripHours >= 12 && toeslagRule) {
        subsistenceLangeDag += toeslagRule.value || toeslagRule.fixed_amount || 0;
      }
    }
  }

  // ─── Safeguard: detecteer ontbrekende looncomponenten ───
  const requiredKeys = [
    'uren_100', 'compensatie_uren', 'aanvulling_contract', 'overwerk_130',
    'toeslag_za_50', 'za_overwerk_150', 'toeslag_zo_100', 'zo_overwerk_200',
    'toeslag_feestdag_100', 'feestdag_overwerk_200', 'toeslagenmatrix_19',
    'variabele_uren_100', 'gewerkte_dagen', 'diensttoeslag_za_150', 'diensttoeslag_zo_200'
  ];
  const missingKeys = requiredKeys.filter(k => result[k] === undefined);

  if (missingKeys.length > 0) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
          <AlertTriangle className="w-5 h-5" />
          Fout: looncomponenten ontbreken in calculateWeekData
        </div>
        <p className="text-red-600 text-sm">
          De volgende velden zijn undefined: <strong>{missingKeys.join(', ')}</strong>
        </p>
        <p className="text-red-500 text-xs mt-1">
          Geen fallback-berekeningen. Neem contact op met de beheerder.
        </p>
      </div>
    );
  }

  // ─── Formatters ───
  const fmt = (val) => val > 0 ? `${val.toFixed(4).replace('.', ',')} uur` : '- uur';
  const fmtEuro = (val) => `€ ${val.toFixed(2).replace('.', ',')}`;

  const SummaryRow = ({ label, value, bold, indent, className }) => (
    <div className={`grid grid-cols-2 gap-y-0 text-sm ${bold ? 'font-semibold' : ''} ${className || ''}`}>
      <span className={`text-slate-600 ${indent ? 'pl-4' : ''}`}>{label}</span>
      <span>{value}</span>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <h4 className="font-bold text-slate-900 mb-1 mt-4 first:mt-0">{title}</h4>
  );

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-800 text-white font-semibold flex items-center justify-between">
        <span>Weeksamenvatting</span>
        {isOproep && (
          <span className="text-[10px] font-bold tracking-wider uppercase bg-orange-500 text-white px-2 py-0.5 rounded">
            Oproepkracht
          </span>
        )}
      </div>
      <div className="p-4 space-y-1">

        {/* Gewerkte uren — uit engine */}
        <SectionHeader title="Gewerkte uren" />
        {!isOproep && <SummaryRow label="Aanvulling contracturen" value={fmt(result.aanvulling_contract)} />}
        {!isOproep && <SummaryRow label="Compensatieuren" value={
          contractWeekTotal > 0
            ? <span className={result.compensatie_uren > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                {result.compensatie_uren.toFixed(4).replace('.', ',')} uur
              </span>
            : '- uur'
        } />}
        {isOproep && <SummaryRow label="Variabele uren 100%" value={fmt(result.variabele_uren_100)} />}
        {!isOproep && <SummaryRow label="Variabele uren" value={fmt(result.variabele_uren_100)} />}
        <SummaryRow label="Gewerkte dagen" value={`${result.gewerkte_dagen} dag(en)`} />
        <SummaryRow label="Totaal gewerkt" value={fmt(totalGewerkt)} bold />
        <SummaryRow label="Totaal niet gewerkt" value={fmt(totalNietGewerkt)} />

        {/* Algemene uren */}
        <SectionHeader title="Algemene uren" />
        <SummaryRow label="Opleiding" value={fmt(totalOpleiding)} />

        {/* Verlof en ATV */}
        <SectionHeader title="Verlof en ATV" />
        <SummaryRow label="Verlof" value={fmt(getVerlofByType("Verlof"))} />
        <SummaryRow label="Betaalde feestdag" value={fmt(getVerlofByType("Betaalde feestdag"))} />
        <SummaryRow label="ATV" value={fmt(result.atv)} />
        <SummaryRow label="Bijzonder verlof" value={fmt(getVerlofByType("Bijzonder verlof"))} />
        <SummaryRow label="Partner verlof" value={fmt(getVerlofByType("Partner verlof") + getVerlofByType("Partnerverlof"))} />
        <SummaryRow label="Ouderschapsverlof (70% doorbetaald)" value={fmt(getVerlofByType("Ouderschapsverlof betaald 70%"))} />
        <SummaryRow label="Ouderschapsverlof (onbetaald)" value={fmt(getVerlofByType("Ouderschapsverlof onbetaald"))} />
        <SummaryRow label="Onbetaald verlof" value={fmt(getVerlofByType("Onbetaald verlof"))} />
        <SummaryRow label="Calamiteit/kort verzuimverlof (100% doorbetaald)" value={fmt(getVerlofByType("Calamiteit/kort verzuimverlof (100% doorbetaald)"))} />
        <SummaryRow label="Kortdurend zorgverlof (70% doorbetaald)" value={fmt(getVerlofByType("Kortdurend zorgverlof (70% doorbetaald)"))} />
        <SummaryRow label="Langdurend zorgverlof (onbetaald)" value={fmt(getVerlofByType("Langdurend zorgverlof (onbetaald)"))} />
        <SummaryRow label="Zwangerschapsverlof (70% doorbetaald door UWV)" value={fmt(getVerlofByType("Zwangerschapsverlof (70% doorbetaald door UWV)") + getVerlofByType("Zwangerschapsverlof"))} />

        {/* Ziek */}
        <SectionHeader title="Ziek" />
        <SummaryRow label="Ziek" value={fmt(result.ziek)} />

        {/* Toeslagen en inhoudingen — uit engine */}
        <SectionHeader title="Toeslagen en inhoudingen" />
        <SummaryRow label="Verblijfskosten ééndaags basis" value={fmtEuro(subsistenceBasis)} />
        <SummaryRow label="Verblijfskosten ééndaags 18:00 - 24:00" value={fmtEuro(subsistence1800)} />
        <SummaryRow label="Verblijfskosten ééndaags lange dag toeslag" value={fmtEuro(subsistenceLangeDag)} />
        <SummaryRow label="Verblijfskosten meerdaags" value={fmtEuro(0)} />
        <SummaryRow label={`Toeslagenmatrix 19%${codeLabel("toeslagenmatrix_19")}`} value={fmt(result.toeslagenmatrix_19)} />
        <SummaryRow label={`Overwerk 130%${codeLabel("overwerk_130")}`} value={fmt(result.overwerk_130)} />
        {isOproep ? (
          <>
            <SummaryRow label={`Diensturen zaterdag 150%${codeLabel("diensturen_zaterdag_150")}`} value={fmt(result.diensttoeslag_za_150)} />
            <SummaryRow label={`Diensturen zondag 200%${codeLabel("diensturen_zondag_200")}`} value={fmt(result.diensttoeslag_zo_200)} />
          </>
        ) : (
          <>
            <SummaryRow label={`Toeslag diensturen zaterdag 50%${codeLabel("toeslag_za_50")}`} value={fmt(result.toeslag_za_50)} />
            <SummaryRow label={`Zaterdag overwerk 150%${codeLabel("overwerk_zaterdag_150")}`} value={fmt(result.za_overwerk_150)} />
            <SummaryRow label={`Toeslag diensturen zondag 100%${codeLabel("toeslag_zo_100")}`} value={fmt(result.toeslag_zo_100)} />
            <SummaryRow label={`Zondag overwerk 200%${codeLabel("overwerk_zondag_200")}`} value={fmt(result.zo_overwerk_200)} />
          </>
        )}
        <SummaryRow label={`Toeslag diensturen feestdag 100%${codeLabel("toeslag_feestdag_100")}`} value={fmt(result.toeslag_feestdag_100)} />
        <SummaryRow label={`Feestdag overwerk 200%${codeLabel("feestdag_overwerk_200")}`} value={fmt(result.feestdag_overwerk_200)} />
        <SummaryRow label="Nachturen" value={fmt(result.toeslagenmatrix_19)} />
        <SummaryRow label="Voorgeschoten kosten" value={fmtEuro(totalVoorgeschoten)} />
        <SummaryRow label="Inhoudingen" value={fmtEuro(totalInhoudingen)} />
        <SummaryRow label="Reiskostenvergoeding" value={fmtEuro(reiskostenTotal)} />
        <SummaryRow label="WKR" value={fmtEuro(totalWkr)} />
      </div>
    </div>
  );
}