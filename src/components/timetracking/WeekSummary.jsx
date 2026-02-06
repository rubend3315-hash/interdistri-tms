import React from "react";
import { format } from "date-fns";

export default function WeekSummary({ employee, weekDays, timeEntries, contractHours, contractWeekTotal }) {
  const empEntries = timeEntries.filter(e => e.employee_id === employee.id);

  const gewerkt = empEntries.filter(e => ["Dag", "Avond", "Nacht"].includes(e.shift_type));
  const verlof = empEntries.filter(e => e.shift_type === "Verlof");
  const ziek = empEntries.filter(e => e.shift_type === "Ziek");

  const totalGewerkt = gewerkt.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalOveruren = gewerkt.reduce((s, e) => s + (e.overtime_hours || 0), 0);
  const totalNachturen = gewerkt.reduce((s, e) => s + (e.night_hours || 0), 0);
  const totalWeekenduren = gewerkt.reduce((s, e) => s + (e.weekend_hours || 0), 0);
  const totalFeestdaguren = gewerkt.reduce((s, e) => s + (e.holiday_hours || 0), 0);
  const totalVerlof = verlof.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalZiek = ziek.reduce((s, e) => s + (e.total_hours || 0), 0);

  const gewerkeDagen = new Set(gewerkt.map(e => e.date)).size;
  const totalAlles = totalGewerkt + totalVerlof + totalZiek;
  const saldo = contractWeekTotal > 0 ? totalAlles - contractWeekTotal : 0;

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
            <span className="text-slate-600">Compensatieuren</span>
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
            <span className="text-slate-600 font-semibold">Totaal gewerkt</span>
            <span className="font-semibold">{fmt(totalGewerkt)}</span>
            <span className="text-slate-600">Totaal niet gewerkt</span>
            <span>{fmt(totalVerlof + totalZiek)}</span>
            <span className="text-slate-600">Saldo meeruren</span>
            <span>{saldo !== 0 ? `${saldo.toFixed(4).replace('.', ',')} uur` : '- uur'}</span>
          </div>
        </div>

        {/* Verlof en ATV */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">Verlof en ATV</h4>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-600">Verlof</span>
            <span>{fmt(totalVerlof)}</span>
            <span className="text-slate-600">Ziek</span>
            <span>{fmt(totalZiek)}</span>
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