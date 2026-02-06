import React, { useMemo } from "react";
import { format } from "date-fns";
import { isWeekend } from "../utils/hourCalculationUtils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { calculateSubsistenceAllowance } from "../utils/subsistenceUtils";

export default function WeekSummary({ employee, weekDays, timeEntries, contractHours, contractWeekTotal, trips = [], reiskostenTotal = 0 }) {
  const empEntries = timeEntries.filter(e => e.employee_id === employee.id);

  const gewerktTypes = ["Gewerkte dag", "Dag", "Avond", "Nacht"];
  const verlofTypes = ["Verlof", "Betaalde feestdag", "Bijzonder verlof", "Partner verlof", 
    "Ouderschapsverlof betaald 70%", "Ouderschapsverlof onbetaald", "Onbetaald verlof",
    "Calamiteit/kort verzuimverlof (100% doorbetaald)", "Kortdurend zorgverlof (70% doorbetaald)",
    "Langdurend zorgverlof (onbetaald)", "Zwangerschapsverlof (70% doorbetaald door UWV)",
    "Partnerverlof", "Zwangerschapsverlof", "Zorgverlof"];
  const atvTypes = ["ATV"];
  const ziekTypes = ["Ziek"];
  const opleidingTypes = ["Opleiding"];

  const gewerkt = empEntries.filter(e => gewerktTypes.includes(e.shift_type));
  const verlofEntries = empEntries.filter(e => verlofTypes.includes(e.shift_type));
  const atvEntries = empEntries.filter(e => atvTypes.includes(e.shift_type));
  const ziekEntries = empEntries.filter(e => ziekTypes.includes(e.shift_type));
  const opleidingEntries = empEntries.filter(e => opleidingTypes.includes(e.shift_type));

  // Gewerkte uren
  const totalGewerkt = gewerkt.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalOveruren = gewerkt.reduce((s, e) => s + (e.overtime_hours || 0), 0);
  const totalNachturen = gewerkt.reduce((s, e) => s + (e.night_hours || 0), 0);
  const totalWeekenduren = gewerkt.reduce((s, e) => s + (e.weekend_hours || 0), 0);
  const totalFeestdaguren = gewerkt.reduce((s, e) => s + (e.holiday_hours || 0), 0);
  const gewerkeDagen = new Set(gewerkt.map(e => e.date)).size;

  // Aanvulling contracturen = contracturen - gewerkte uren (als positief)
  const aanvullingContract = contractWeekTotal > 0 && totalGewerkt < contractWeekTotal 
    ? contractWeekTotal - totalGewerkt : 0;
  
  // Compensatieuren = alleen gewerkte uren - contracturen (niet-gewerkt telt niet mee)
  const compensatie = contractWeekTotal > 0 ? totalGewerkt - (contractWeekTotal - totalNietGewerkt) : 0;

  // Variabele uren (overuren boven contract)
  const variabeleUren = totalGewerkt > contractWeekTotal && contractWeekTotal > 0 
    ? totalGewerkt - contractWeekTotal : 0;

  // Totaal niet gewerkt = alle uren behalve gewerkte dag types
  const nietGewerktEntries = empEntries.filter(e => !gewerktTypes.includes(e.shift_type));
  const totalNietGewerkt = nietGewerktEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

  // Verlof per type
  const getVerlofByType = (type) => verlofEntries.filter(e => e.shift_type === type).reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalAtv = atvEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalZiek = ziekEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalOpleiding = opleidingEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

  // Wachtdag (ziekdag op een dag met 0 roosteruren)
  const hasWachtdag = ziekEntries.some(e => {
    if (!contractHours) return false;
    const day = weekDays.find(d => format(d, 'yyyy-MM-dd') === e.date);
    if (!day) return false;
    const idx = weekDays.indexOf(day);
    return contractHours[idx] === 0;
  });

  // Toeslagen berekeningen
  const totalVoorgeschoten = empEntries.reduce((s, e) => s + (e.advanced_costs || 0), 0);
  const totalInhoudingen = empEntries.reduce((s, e) => s + (e.meals || 0), 0);
  const totalWkr = empEntries.reduce((s, e) => s + (e.wkr || 0), 0);
  // CAO-regels voor verblijfskosten
  const { data: caoRules = [] } = useQuery({
    queryKey: ['caoRulesVerblijf'],
    queryFn: () => base44.entities.CaoRule.list()
  });

  // Filter alleen verblijfkosten regels
  const verblijfRules = caoRules.filter(r => r.category === 'Verblijfkosten' && r.status === 'Actief');

  // Verblijfkosten berekenen uit ritten - uitgesplitst per soort
  let subsistenceBasis = 0;    // Basisbedrag (uren × basistarief, excl. avonduren)
  let subsistence1800 = 0;     // Avonduren × avondtarief (18:00-24:00)
  let subsistenceLangeDag = 0; // Toeslag 12+ uur

  if (verblijfRules.length > 0 && trips.length > 0) {
    // Zoek eendaagse regels
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
      const arrMinutes = arrH * 60 + arrM;
      const departsBefore14 = depMinutes < 14 * 60;

      if (!departsBefore14 || !basisRule) continue;

      // Bereken avonduren overlap (18:00-24:00)
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

      // Basisuren = totale uren minus avonduren
      const basisHours = tripHours - avondHours;
      subsistenceBasis += basisHours * basisRate;

      // Avond apart
      subsistence1800 += avondHours * avondRate;

      // Lange dag toeslag (12+ uur)
      if (tripHours >= 12 && toeslagRule) {
        subsistenceLangeDag += toeslagRule.value || toeslagRule.fixed_amount || 0;
      }
    }
  }

  // Weekend uren split (za 150%, zo 200%)
  const zaterdagUren = gewerkt.filter(e => {
    const d = new Date(e.date);
    return d.getDay() === 6;
  }).reduce((s, e) => s + (e.total_hours || 0), 0);

  const zondagUren = gewerkt.filter(e => {
    const d = new Date(e.date);
    return d.getDay() === 0;
  }).reduce((s, e) => s + (e.total_hours || 0), 0);

  // Overwerk op za/zo
  const zaterdagOverwerk = gewerkt.filter(e => {
    const d = new Date(e.date);
    return d.getDay() === 6;
  }).reduce((s, e) => s + (e.overtime_hours || 0), 0);

  const zondagOverwerk = gewerkt.filter(e => {
    const d = new Date(e.date);
    return d.getDay() === 0;
  }).reduce((s, e) => s + (e.overtime_hours || 0), 0);

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
      <div className="px-4 py-3 bg-slate-800 text-white font-semibold">
        Weeksamenvatting
      </div>
      <div className="p-4 space-y-1">

        {/* Gewerkte uren */}
        <SectionHeader title="Gewerkte uren" />
        <SummaryRow label="Aanvulling contracturen" value={fmt(aanvullingContract)} />
        <SummaryRow label="Compensatieuren" value={
          contractWeekTotal > 0 
            ? <span className={compensatie >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                {compensatie.toFixed(4).replace('.', ',')} uur
              </span>
            : '- uur'
        } />
        <SummaryRow label="Variabele uren" value={fmt(variabeleUren)} />
        <SummaryRow label="Gewerkte dagen" value={`${gewerkeDagen} dag(en)`} />
        <SummaryRow label="Totaal gewerkt" value={fmt(totalGewerkt)} bold />
        <SummaryRow label="Totaal niet gewerkt" value={fmt(totalNietGewerkt)} />

        {/* Algemene uren */}
        <SectionHeader title="Algemene uren" />
        <SummaryRow label="Opleiding" value={fmt(totalOpleiding)} />

        {/* Verlof en ATV */}
        <SectionHeader title="Verlof en ATV" />
        <SummaryRow label="Verlof" value={fmt(getVerlofByType("Verlof"))} />
        <SummaryRow label="Betaalde feestdag" value={fmt(getVerlofByType("Betaalde feestdag"))} />
        <SummaryRow label="ATV" value={fmt(totalAtv)} />
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
        <SummaryRow label="Ziek" value={fmt(totalZiek)} />

        {/* Toeslagen en inhoudingen */}
        <SectionHeader title="Toeslagen en inhoudingen" />
        <SummaryRow label="Verblijfskosten ééndaags basis" value={fmtEuro(subsistenceBasis)} />
        <SummaryRow label="Verblijfskosten ééndaags 18:00 - 24:00" value={fmtEuro(subsistence1800)} />
        <SummaryRow label="Verblijfskosten ééndaags lange dag toeslag" value={fmtEuro(subsistenceLangeDag)} />
        <SummaryRow label="Verblijfskosten meerdaags" value={fmtEuro(0)} />
        <SummaryRow label="Toeslagenmatrix 19%" value={fmt(0)} />
        <SummaryRow label="Overwerk 130%" value={fmt(totalOveruren)} />
        <SummaryRow label="Diensturen zaterdag 150%" value={fmt(zaterdagUren)} />
        <SummaryRow label="Toeslag diensturen zaterdag 50%" value={fmt(zaterdagUren > 0 ? zaterdagUren : 0)} />
        <SummaryRow label="Zaterdag overwerk 150%" value={fmt(zaterdagOverwerk)} />
        <SummaryRow label="Diensturen zondag 200%" value={fmt(zondagUren)} />
        <SummaryRow label="Toeslag diensturen zondag 100%" value={fmt(zondagUren > 0 ? zondagUren : 0)} />
        <SummaryRow label="Zondag overwerk 200%" value={fmt(zondagOverwerk)} />
        <SummaryRow label="Diensturen feestdag 200%" value={fmt(totalFeestdaguren)} />
        <SummaryRow label="Toeslag diensturen feestdag 100%" value={fmt(totalFeestdaguren)} />
        <SummaryRow label="Nachturen" value={fmt(totalNachturen)} />
        <SummaryRow label="Voorgeschoten kosten" value={fmtEuro(totalVoorgeschoten)} />
        <SummaryRow label="Inhoudingen" value={fmtEuro(totalInhoudingen)} />
        <SummaryRow label="Reiskostenvergoeding" value={fmtEuro(reiskostenTotal)} />
        <SummaryRow label="WKR" value={fmtEuro(totalWkr)} />
      </div>
    </div>
  );
}