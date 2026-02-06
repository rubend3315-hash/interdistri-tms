import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import WeekSummary from "./WeekSummary";

const urensoortCategories = [
  { key: "gewerkt", label: "Gewerkt", shiftTypes: ["Gewerkte dag", "Dag", "Avond", "Nacht"] },
  { key: "verlof", label: "Verlof", shiftTypes: ["Verlof", "Betaalde feestdag", "Bijzonder verlof", "Partner verlof", "Ouderschapsverlof onbetaald", "Ouderschapsverlof betaald 70%", "Partnerverlof", "Zwangerschapsverlof", "Zorgverlof"] },
  { key: "atv", label: "ATV", shiftTypes: ["ATV"] },
  { key: "ziek", label: "Ziek", shiftTypes: ["Ziek"] },
  { key: "opleiding", label: "Opleiding", shiftTypes: ["Opleiding"] },
];

export default function WeekOverview({
  employee,
  weekDays,
  weekNumber,
  year,
  timeEntries,
  onOpenEntry, // (employeeId, day, categoryKey)
  onPreviousWeek,
  onNextWeek,
  onPreviousEmployee,
  onNextEmployee,
  contractregels,
  onDeleteDay,
  onDeleteWeek,
}) {
  if (!employee) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        Selecteer een medewerker om het weekoverzicht te bekijken
      </div>
    );
  }

  // Get active contract rule for schedule hours
  const getContractHours = () => {
    if (!contractregels || contractregels.length === 0) return null;
    const today = new Date();
    let active = contractregels
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))
      .find(cr => {
        const start = new Date(cr.startdatum);
        const end = cr.einddatum ? new Date(cr.einddatum) : null;
        return start <= today && (!end || end >= today);
      });
    if (!active) active = contractregels.find(cr => cr.week1 || cr.week2);
    if (!active) return null;

    const weekSchedule = (weekNumber % 2 === 1) ? active.week1 : active.week2;
    if (!weekSchedule || typeof weekSchedule !== 'object') return null;

    const dutchDayMap = {
      'maandag': 0, 'dinsdag': 1, 'woensdag': 2,
      'donderdag': 3, 'vrijdag': 4, 'zaterdag': 5, 'zondag': 6
    };

    const hours = Array(7).fill(0);
    const hasBooleansOrStrings = Object.values(weekSchedule).some(v => typeof v === 'boolean' || (typeof v === 'string' && v !== '-'));

    if (hasBooleansOrStrings) {
      const workingDays = Object.entries(weekSchedule).filter(([, val]) =>
        (typeof val === 'boolean' && val) || (typeof val === 'string' && val === 'true')
      ).length;
      const hoursPerDay = workingDays > 0 ? (active.uren_per_week || 0) / workingDays : 0;
      Object.entries(dutchDayMap).forEach(([dutchDay, idx]) => {
        const isWorking = weekSchedule[dutchDay];
        hours[idx] = (isWorking === true || isWorking === 'true') ? Math.round(hoursPerDay * 100) / 100 : 0;
      });
    } else {
      Object.entries(dutchDayMap).forEach(([dutchDay, idx]) => {
        const value = weekSchedule[dutchDay];
        hours[idx] = typeof value === 'number' ? value : (typeof value === 'string' && value !== '-' ? parseFloat(value) || 0 : 0);
      });
    }
    return hours;
  };

  const contractHours = getContractHours();

  const getEntryForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries.find(e => e.employee_id === employee.id && e.date === dateStr);
  };

  const getEntriesByCategory = (category, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entries = timeEntries.filter(e => e.employee_id === employee.id && e.date === dateStr);
    if (category.shiftTypes.length === 0) return [];
    return entries.filter(e => category.shiftTypes.includes(e.shift_type));
  };

  const getCategoryTotal = (category) => {
    let total = 0;
    weekDays.forEach(day => {
      const entries = getEntriesByCategory(category, day);
      entries.forEach(e => { total += e.total_hours || 0; });
    });
    return total;
  };

  // Totals per day
  const getDayTotal = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries
      .filter(e => e.employee_id === employee.id && e.date === dateStr)
      .reduce((sum, e) => sum + (e.total_hours || 0), 0);
  };

  const weekTotal = weekDays.reduce((sum, day) => sum + getDayTotal(day), 0);
  const contractWeekTotal = contractHours ? contractHours.reduce((a, b) => a + b, 0) : 0;

  // Reiskosten per dag
  const getReiskosten = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entries = timeEntries.filter(e => e.employee_id === employee.id && e.date === dateStr);
    return entries.reduce((sum, e) => sum + (e.travel_allowance_multiplier || 0), 0);
  };

  const reiskostenTotal = weekDays.reduce((sum, day) => sum + getReiskosten(day), 0);

  return (
    <div className="space-y-4">
      {/* Employee Header with Navigation */}
      <div className="bg-slate-800 text-white rounded-xl p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={onPreviousEmployee}>
          <ChevronLeft className="w-5 h-5" />
          <ChevronLeft className="w-5 h-5 -ml-3" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold">
            ({employee.employee_number || '-'}) {employee.first_name} {employee.last_name}
          </h2>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={onNextEmployee}>
          <ChevronRight className="w-5 h-5" />
          <ChevronRight className="w-5 h-5 -ml-3" />
        </Button>
      </div>

      {/* Week Table */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-700 w-40">Weekrooster</th>
              {weekDays.map((day, idx) => (
                <th key={idx} className="text-center px-2 py-3 min-w-[100px]">
                  <div className="font-semibold text-slate-700">{format(day, "EEEE", { locale: nl })}</div>
                  <div className="text-xs text-slate-500">{format(day, "dd-MM-yyyy")}</div>
                  {contractHours && contractHours[idx] > 0 && (
                    <div className="text-xs text-orange-600 font-medium">{contractHours[idx].toFixed(2).replace('.', ',')}</div>
                  )}
                </th>
              ))}
              <th className="text-center px-2 py-3 min-w-[80px] font-semibold text-slate-700">
                <div>Totaal</div>
                {contractWeekTotal > 0 && (
                  <div className="text-xs text-orange-600 font-medium">{contractWeekTotal.toFixed(2).replace('.', ',')}</div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Category rows */}
            {urensoortCategories.map(cat => {
              const catTotal = getCategoryTotal(cat);
              return (
                <tr key={cat.key} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{cat.label}</td>
                  {weekDays.map((day, idx) => {
                    const entries = getEntriesByCategory(cat, day);
                    const dayTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                    return (
                      <td key={idx} className="text-center px-2 py-2">
                        <button
                            onClick={() => onOpenEntry(employee.id, day, cat.key)}
                            className="w-full min-h-[32px] rounded hover:bg-blue-50 transition-colors flex items-center justify-center"
                          >
                            {dayTotal > 0 ? (
                              <span className="font-semibold text-slate-900">{dayTotal.toFixed(4).replace('.', ',')}</span>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </button>
                      </td>
                    );
                  })}
                  <td className="text-center px-2 py-2 font-semibold">
                    {catTotal > 0 ? catTotal.toFixed(4).replace('.', ',') : ''}
                  </td>
                </tr>
              );
            })}

            {/* Totalen row */}
            <tr className="border-b bg-slate-50 font-semibold">
              <td className="px-4 py-2 text-slate-700">Totalen</td>
              {weekDays.map((day, idx) => {
                const dayTotal = getDayTotal(day);
                return (
                  <td key={idx} className="text-center px-2 py-2">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      contractHours && dayTotal >= contractHours[idx] && contractHours[idx] > 0 ? 'bg-green-500 text-white' : dayTotal > 0 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {dayTotal > 0 ? dayTotal.toFixed(2).replace('.', ',') : '0'}
                    </div>
                  </td>
                );
              })}
              <td className="text-center px-2 py-2">
                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                  contractWeekTotal > 0 && weekTotal >= contractWeekTotal ? 'bg-green-500 text-white' : weekTotal > 0 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                }`}>
                  {weekTotal.toFixed(2).replace('.', ',')}
                </div>
              </td>
            </tr>

            {/* Compensatieuren row */}
            {contractWeekTotal > 0 && (
              <tr className="border-b bg-slate-50">
                <td className="px-4 py-2 font-medium text-blue-700">Compensatieuren</td>
                {weekDays.map((day, idx) => {
                  const dayTotal = getDayTotal(day);
                  const scheduled = contractHours ? contractHours[idx] : 0;
                  const comp = dayTotal - scheduled;
                  return (
                    <td key={idx} className="text-center px-2 py-2 text-sm">
                      {scheduled > 0 || dayTotal > 0 ? (
                        <span className={comp >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                          {comp > 0 ? '+' : ''}{comp.toFixed(2).replace('.', ',')}
                        </span>
                      ) : ''}
                    </td>
                  );
                })}
                <td className="text-center px-2 py-2 font-semibold">
                  <span className={(weekTotal - contractWeekTotal) >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {(weekTotal - contractWeekTotal) > 0 ? '+' : ''}{(weekTotal - contractWeekTotal).toFixed(2).replace('.', ',')}
                  </span>
                </td>
              </tr>
            )}

            {/* Wis dag row */}
            <tr className="border-b bg-slate-50">
              <td className="px-4 py-2 text-slate-500 text-xs"></td>
              {weekDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasEntries = timeEntries.some(e => e.employee_id === employee.id && e.date === dateStr);
                return (
                  <td key={idx} className="text-center px-2 py-1">
                    <button
                      onClick={() => {
                        if (hasEntries && confirm(`Alle tijdregistraties van ${format(day, "EEEE d MMMM", { locale: nl })} wissen?`)) {
                          onDeleteDay?.(employee.id, day);
                        }
                      }}
                      disabled={!hasEntries}
                      className={`text-xs ${hasEntries ? 'text-red-500 hover:text-red-700 hover:underline cursor-pointer' : 'text-slate-300 cursor-default'}`}
                    >
                      Wis dag
                    </button>
                  </td>
                );
              })}
              <td className="text-center px-2 py-1">
                <button
                  onClick={() => {
                    const hasAny = weekDays.some(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      return timeEntries.some(e => e.employee_id === employee.id && e.date === dateStr);
                    });
                    if (hasAny && confirm('Alle tijdregistraties van deze week wissen?')) {
                      onDeleteWeek?.(employee.id, weekDays);
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Wis week
                </button>
              </td>
            </tr>

            {/* Reiskosten row */}
            <tr className="border-b">
              <td className="px-4 py-2 font-medium text-slate-700">Reiskostenvergoeding (enkele reis)</td>
              {weekDays.map((day, idx) => {
                const rk = getReiskosten(day);
                return (
                  <td key={idx} className="text-center px-2 py-2">
                    {rk}
                  </td>
                );
              })}
              <td className="text-center px-2 py-2 font-semibold">{reiskostenTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tijdregels per week */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-slate-700">
          Tijdregels per week
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-2 text-slate-600 font-medium w-8"></th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Start registratie</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Einde registratie</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Uursoort</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Uren</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Voorgeschoten kosten</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Inhoudingen</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">WKR</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries
                .filter(e => e.employee_id === employee.id)
                .sort((a, b) => a.date?.localeCompare(b.date))
                .map((entry, idx) => (
                  <tr key={entry.id || idx} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => {
                    const day = weekDays.find(d => format(d, 'yyyy-MM-dd') === entry.date);
                    if (day) onOpenEntry(employee.id, day);
                  }}>
                    <td className="px-4 py-2 text-slate-400">▸</td>
                    <td className="px-4 py-2">
                      {entry.date && entry.start_time
                        ? `${format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: nl })} ${entry.start_time}`
                        : entry.date ? format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: nl }) : '-'
                      }
                    </td>
                    <td className="px-4 py-2">
                      {entry.date && entry.end_time
                        ? `${format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: nl })} ${entry.end_time}`
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.shift_type === 'Dag' ? 'gewerkte dag' : entry.shift_type?.toLowerCase() || '-'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">{entry.total_hours != null ? entry.total_hours.toFixed(2).replace('.', ',') : '-'}</td>
                    <td className="px-4 py-2">{entry.advanced_costs || ''}</td>
                    <td className="px-4 py-2">{entry.meals || ''}</td>
                    <td className="px-4 py-2">{entry.wkr || ''}</td>
                  </tr>
                ))
              }
              {timeEntries.filter(e => e.employee_id === employee.id).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    Geen tijdregels deze week
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Week Summary */}
      <WeekSummary
        employee={employee}
        weekDays={weekDays}
        timeEntries={timeEntries}
        contractHours={contractHours}
        contractWeekTotal={contractWeekTotal}
      />
    </div>
  );
}