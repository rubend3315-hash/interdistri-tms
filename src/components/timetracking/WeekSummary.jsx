import React from "react";
import { format } from "date-fns";

export default function WeekSummary({ employee, weekDays, timeEntries, contractHours, contractWeekTotal }) {
  const empEntries = timeEntries.filter(e => e.employee_id === employee.id);

  const gewerktTypes = ["Gewerkte dag", "Dag", "Avond", "Nacht"];
  const verlofTypes = ["Verlof", "Betaalde feestdag", "Bijzonder verlof", "Partner verlof", "Ouderschapsverlof onbetaald", "Ouderschapsverlof betaald 70%", "Partnerverlof", "Zwangerschapsverlof", "Zorgverlof"];
  const atvTypes = ["ATV"];
  const ziekTypes = ["Ziek"];
  const opleidingTypes = ["Opleiding"];

  const gewerkt = empEntries.filter(e => gewerktTypes.includes(e.shift_type));
  const verlof = empEntries.filter(e => verlofTypes.includes(e.shift_type));
  const atv = empEntries.filter(e => atvTypes.includes(e.shift_type));
  const ziek = empEntries.filter(e => ziekTypes.includes(e.shift_type));
  const opleiding = empEntries.filter(e => opleidingTypes.includes(e.shift_type));

  const totalGewerkt = gewerkt.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalOveruren = gewerkt.reduce((s, e) => s + (e.overtime_hours || 0), 0);
  const totalNachturen = gewerkt.reduce((s, e) => s + (e.night_hours || 0), 0);
  const totalWeekenduren = gewerkt.reduce((s, e) => s + (e.weekend_hours || 0), 0);
  const totalFeestdaguren = gewerkt.reduce((s, e) => s + (e.holiday_hours || 0), 0);
  const totalVerlof = verlof.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalAtv = atv.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalZiek = ziek.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalOpleiding = opleiding.reduce((s, e) => s + (e.total_hours || 0), 0);

  const gewerkeDagen = new Set(gewerkt.map(e => e.date)).size;
  const totalAlles = totalGewerkt + totalVerlof + totalAtv + totalZiek + totalOpleiding;
  const compensatie = contractWeekTotal > 0 ? totalAlles - contractWeekTotal : 0;

  const totalVoorgeschoten = empEntries.reduce((s, e) => s + (e.advanced_costs || 0), 0);
  const totalInhoudingen = empEntries.reduce((s, e) => s + (e.meals || 0), 0);
  const totalWkr = empEntries.reduce((s, e) => s + (e.wkr || 0), 0);

  const fmt = (val) => val > 0 ? `${val.toFixed(4).replace('.', ',')} uur` : '- uur';

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-slate-700">
        Weeksamenvatting
      </div>
      <div className="p-4 space-y-6">
        {/* Gewerkte uren */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">Gewerkte uren</h4>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-600">Gewerkt</span>
            <span>{fmt(totalGewerkt)}</span>
            <span className="text-slate-600">Overuren</span>
            <span>{fmt(totalOveruren)}</span>
            <span className="text-slate-600">Nachturen</span>
            <span>{fmt(totalNachturen)}</span>
            <span className="text-slate-600">Weekenduren</span>
            <span>{fmt(totalWeekenduren)}</span>
            <span className="text-slate-600">Feestdaguren</span>
            <span>{fmt(totalFeestdaguren)}</span>
            <span className="text-slate-600">Gewerkte dagen</span>
            <span>{gewerkeDagen} dag(en)</span>
          </div>
        </div>

        {/* Verlof, ATV, Ziek, Opleiding */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">Verlof, ATV, Ziek & Opleiding</h4>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-600">Verlof</span>
            <span>{fmt(totalVerlof)}</span>
            <span className="text-slate-600">ATV</span>
            <span>{fmt(totalAtv)}</span>
            <span className="text-slate-600">Ziek</span>
            <span>{fmt(totalZiek)}</span>
            <span className="text-slate-600">Opleiding</span>
            <span>{fmt(totalOpleiding)}</span>
          </div>
        </div>

        {/* Totalen & Compensatie */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">Totalen</h4>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-600 font-semibold">Totaal uren</span>
            <span className="font-semibold">{fmt(totalAlles)}</span>
            {contractWeekTotal > 0 && (
              <>
                <span className="text-slate-600">Contracturen</span>
                <span>{contractWeekTotal.toFixed(2).replace('.', ',')} uur</span>
                <span className="text-slate-600 font-semibold">Compensatieuren</span>
                <span className={`font-semibold ${compensatie >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {compensatie > 0 ? '+' : ''}{compensatie.toFixed(2).replace('.', ',')} uur
                </span>
              </>
            )}
          </div>
        </div>

        {/* Kosten */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">Kosten & Inhoudingen</h4>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-600">Voorgeschoten kosten</span>
            <span>€ {totalVoorgeschoten.toFixed(2).replace('.', ',')}</span>
            <span className="text-slate-600">Inhoudingen</span>
            <span>€ {totalInhoudingen.toFixed(2).replace('.', ',')}</span>
            <span className="text-slate-600">WKR</span>
            <span>€ {totalWkr.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}