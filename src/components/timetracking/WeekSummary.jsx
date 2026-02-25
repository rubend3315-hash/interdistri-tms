import React, { useMemo } from "react";
import { format } from "date-fns";
import { isWeekend } from "../utils/hourCalculationUtils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { calculateSubsistenceAllowance } from "../utils/subsistenceUtils";
import { getLooncomponentLabel } from "../utils/uursoortMapping";

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

  // Types die meetellen voor overwerk (gewerkt + verlof + atv + ziek, NIET opleiding)
  const overwerkTypes = [...gewerktTypes, ...verlofTypes, ...atvTypes, ...ziekTypes];
  const overwerkEntries = empEntries.filter(e => overwerkTypes.includes(e.shift_type));

  // Gewerkte uren
  const totalGewerkt = gewerkt.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalNachturen = gewerkt.reduce((s, e) => s + (e.night_hours || 0), 0);
  const totalWeekenduren = gewerkt.reduce((s, e) => s + (e.weekend_hours || 0), 0);
  const totalFeestdaguren = gewerkt.reduce((s, e) => s + (e.holiday_hours || 0), 0);
  const gewerkeDagen = new Set(gewerkt.map(e => e.date)).size;

  // Oproepkracht detectie
  const activeContracts = (employee.contractregels || [])
    .filter(c => c.status !== "Inactief")
    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum));
  const weekStart = weekDays[0] ? format(weekDays[0], 'yyyy-MM-dd') : null;
  let activeContract = activeContracts[0] || {};
  if (weekStart && activeContracts.length > 1) {
    const ref = new Date(weekStart);
    activeContract = activeContracts.find(c => {
      const s = new Date(c.startdatum);
      const e = c.einddatum ? new Date(c.einddatum) : new Date("2099-12-31");
      return ref >= s && ref <= e;
    }) || activeContracts[0] || {};
  }
  const isOproep = employee.contract_type === "Oproep" ||
    ((activeContract.type_contract || "").toLowerCase().includes("oproep"));

  // Overwerk 130%: oproepkracht = per kalenderdag > 8 uur, regulier = weekbasis ma-vr
  const maVrDays = weekDays.filter(day => {
    const d = new Date(day);
    const dayOfWeek = d.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  });
  const maVrOverwerkTotal = maVrDays.reduce((sum, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEntries = overwerkEntries.filter(e => e.date === dateStr);
    return sum + dayEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
  }, 0);

  let totalOveruren = 0;
  if (isOproep) {
    // Per kalenderdag ma-vr > 8 uur netto → overuren. Za/zo tellen NIET mee voor overwerk.
    const dayMap = {};
    gewerkt.forEach(e => {
      if (!e.date) return;
      const startDate = e.date;
      const endDate = e.end_date || e.date;
      const hours = e.total_hours || 0;
      if (startDate !== endDate && hours > 0 && e.start_time && e.end_time) {
        const [sH, sM] = e.start_time.split(':').map(Number);
        const [eH, eM] = e.end_time.split(':').map(Number);
        const startMin = sH * 60 + sM;
        let endMin = eH * 60 + eM;
        if (endMin <= startMin) endMin += 1440;
        const minutesBefore = 1440 - startMin;
        const minutesAfter = endMin - 1440;
        const breakMin = e.break_minutes || 0;
        const breakBefore = Math.round(breakMin * (minutesBefore / (minutesBefore + minutesAfter)));
        const breakAfter = breakMin - breakBefore;
        dayMap[startDate] = (dayMap[startDate] || 0) + Math.max(0, (minutesBefore - breakBefore) / 60);
        dayMap[endDate] = (dayMap[endDate] || 0) + Math.max(0, (minutesAfter - breakAfter) / 60);
      } else {
        dayMap[startDate] = (dayMap[startDate] || 0) + hours;
      }
    });
    for (const [dateStr, dayHours] of Object.entries(dayMap)) {
      const dow = new Date(dateStr).getDay();
      // Alleen ma(1)-vr(5): overwerk. Za(6)/zo(0) = diensturen, geen overwerk 130%
      if (dow >= 1 && dow <= 5 && dayHours > 8) {
        totalOveruren += dayHours - 8;
      }
    }
  } else {
    totalOveruren = contractWeekTotal > 0
      ? Math.max(0, maVrOverwerkTotal - contractWeekTotal)
      : 0;
  }

  // Totaal niet gewerkt = alle uren behalve gewerkte dag types
  const nietGewerktEntries = empEntries.filter(e => !gewerktTypes.includes(e.shift_type));
  const totalNietGewerkt = nietGewerktEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

  // Oproepkracht: geen aanvulling, compensatie of variabele uren
  let aanvullingContract = 0;
  let compensatie = 0;
  let variabeleUren = 0;

  if (!isOproep) {
    const totalAllesForAanvulling = empEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
    aanvullingContract = contractWeekTotal > 0 && totalAllesForAanvulling < contractWeekTotal
      ? contractWeekTotal - totalAllesForAanvulling : 0;

    const totalAlles = empEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
    compensatie = contractWeekTotal > 0 && totalAlles < contractWeekTotal
      ? contractWeekTotal - totalAlles : 0;

    variabeleUren = totalGewerkt > contractWeekTotal && contractWeekTotal > 0
      ? totalGewerkt - contractWeekTotal : 0;
  }

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

  // Toeslagenmatrix 19%: diensturen ma-zo tussen 21:00 en 05:00
  const toeslagMatrix19 = gewerkt.reduce((sum, entry) => {
    if (!entry.start_time || !entry.end_time) return sum;
    const [sH, sM] = entry.start_time.split(':').map(Number);
    const [eH, eM] = entry.end_time.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;
    const spansNextDay = endMin <= startMin;

    // Nachtvenster: 21:00-05:00 = twee blokken: 21:00-24:00 (1260-1440) en 00:00-05:00 (0-300)
    let nightMinutes = 0;

    if (spansNextDay) {
      // Shift loopt over middernacht
      // Blok 1: start tot 24:00 → overlap met 21:00-24:00
      const overlapStart1 = Math.max(startMin, 21 * 60);
      const overlapEnd1 = 24 * 60;
      if (overlapEnd1 > overlapStart1) nightMinutes += overlapEnd1 - overlapStart1;

      // Blok 2: 00:00 tot eind → overlap met 00:00-05:00
      const overlapEnd2 = Math.min(endMin, 5 * 60);
      if (overlapEnd2 > 0) nightMinutes += overlapEnd2;
    } else {
      // Zelfde dag
      // Overlap met 00:00-05:00
      const overlapEnd_early = Math.min(endMin, 5 * 60);
      const overlapStart_early = Math.min(startMin, 5 * 60);
      if (overlapEnd_early > overlapStart_early) nightMinutes += overlapEnd_early - overlapStart_early;

      // Overlap met 21:00-24:00
      const overlapStart_late = Math.max(startMin, 21 * 60);
      const overlapEnd_late = Math.min(endMin, 24 * 60);
      if (overlapEnd_late > overlapStart_late) nightMinutes += overlapEnd_late - overlapStart_late;
    }

    return sum + nightMinutes / 60;
  }, 0);

  // Toeslagen berekeningen
  const totalVoorgeschoten = empEntries.reduce((s, e) => s + (e.advanced_costs || 0), 0);
  const totalInhoudingen = empEntries.reduce((s, e) => s + (e.meals || 0), 0);
  const totalWkr = empEntries.reduce((s, e) => s + (e.wkr || 0), 0);
  // CAO-regels voor verblijfskosten
  const { data: caoRules = [] } = useQuery({
    queryKey: ['caoRulesVerblijf'],
    queryFn: () => base44.entities.CaoRule.list()
  });

  // Uursoort-mapping uit PayrollSettings
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const uursoortMapping = payrollSettings[0]?.looncomponent_uursoort_mapping || null;
  const codeLabel = (key) => uursoortMapping?.[key] ? ` (${uursoortMapping[key]})` : "";

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

  // Weekend uren berekening
  const zaterdagUrenTotaal = gewerkt.filter(e => {
    const d = new Date(e.date);
    return d.getDay() === 6;
  }).reduce((s, e) => s + (e.total_hours || 0), 0);

  const zondagUren = gewerkt.filter(e => {
    const d = new Date(e.date);
    return d.getDay() === 0;
  }).reduce((s, e) => s + (e.total_hours || 0), 0);

  // Weekend/feestdag toeslag-logica
  let zaterdagDiensturen, zaterdagOverwerk, zondagDiensturen, zondagOverwerk, feestdagDiensturen, feestdagOverwerk;

  if (isOproep) {
    // Oproepkracht: geen contracturenvergelijking, alle za/zo/feestdag uren zijn diensturen met toeslag
    zaterdagDiensturen = zaterdagUrenTotaal;
    zaterdagOverwerk = 0;
    zondagDiensturen = zondagUren;
    zondagOverwerk = 0;
    feestdagDiensturen = totalFeestdaguren;
    feestdagOverwerk = 0;
  } else {
    // Regulier: contracttekort bepaalt verdeling diensturen vs overwerk
    const contractTekort = contractWeekTotal > 0 ? Math.max(0, contractWeekTotal - maVrOverwerkTotal) : 0;
    zaterdagDiensturen = Math.min(zaterdagUrenTotaal, contractTekort);
    zaterdagOverwerk = Math.max(0, zaterdagUrenTotaal - contractTekort);
    const contractTekortNaZaterdag = Math.max(0, contractTekort - zaterdagUrenTotaal);
    zondagDiensturen = Math.min(zondagUren, contractTekortNaZaterdag);
    zondagOverwerk = Math.max(0, zondagUren - contractTekortNaZaterdag);
    const contractTekortNaZondag = Math.max(0, contractTekortNaZaterdag - zondagUren);
    feestdagDiensturen = Math.min(totalFeestdaguren, contractTekortNaZondag);
    feestdagOverwerk = Math.max(0, totalFeestdaguren - contractTekortNaZondag);
  }

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
        {!isOproep && <SummaryRow label="Aanvulling contracturen" value={fmt(aanvullingContract)} />}
        {!isOproep && <SummaryRow label="Compensatieuren" value={
          contractWeekTotal > 0 
            ? <span className={compensatie > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                {compensatie.toFixed(4).replace('.', ',')} uur
              </span>
            : '- uur'
        } />}
        {isOproep && <SummaryRow label="Variabele uren 100%" value={fmt(totalGewerkt)} />}
        {!isOproep && <SummaryRow label="Variabele uren" value={fmt(variabeleUren)} />}
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
        <SummaryRow label="Toeslagenmatrix 19%" value={fmt(toeslagMatrix19)} />
        <SummaryRow label="Overwerk 130%" value={fmt(totalOveruren)} />
        {isOproep ? (
          <>
            <SummaryRow label="Toeslag diensturen zaterdag 150%" value={fmt(zaterdagDiensturen)} />
            <SummaryRow label="Toeslag diensturen zondag 200%" value={fmt(zondagDiensturen)} />
          </>
        ) : (
          <>
            <SummaryRow label="Toeslag diensturen zaterdag 50%" value={fmt(zaterdagDiensturen)} />
            <SummaryRow label="Zaterdag overwerk 150%" value={fmt(zaterdagOverwerk)} />
            <SummaryRow label="Toeslag diensturen zondag 100%" value={fmt(zondagDiensturen)} />
            <SummaryRow label="Zondag overwerk 200%" value={fmt(zondagOverwerk)} />
          </>
        )}
        <SummaryRow label="Toeslag diensturen feestdag 100%" value={fmt(feestdagDiensturen)} />
        <SummaryRow label="Feestdag overwerk 200%" value={fmt(feestdagOverwerk)} />
        <SummaryRow label="Nachturen" value={fmt(totalNachturen)} />
        <SummaryRow label="Voorgeschoten kosten" value={fmtEuro(totalVoorgeschoten)} />
        <SummaryRow label="Inhoudingen" value={fmtEuro(totalInhoudingen)} />
        <SummaryRow label="Reiskostenvergoeding" value={fmtEuro(reiskostenTotal)} />
        <SummaryRow label="WKR" value={fmtEuro(totalWkr)} />
      </div>
    </div>
  );
}