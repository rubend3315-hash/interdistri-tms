import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { TrendingUp, Users, CalendarDays, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp } from "lucide-react";

export default function CapacityOverview({ days, employees, schedules, expectedStaffPerDay }) {
  // Default expected staff: all employees should work Mon-Fri
  const defaultExpected = expectedStaffPerDay || {};

  const getOccupancyForDay = (day, dayIndex) => {
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex % 7];
    let working = 0;
    let absent = 0;
    let total = employees.length;

    employees.forEach(emp => {
      const schedule = schedules.find(s => s.employee_id === emp.id);
      const shift = schedule?.[dayKey];
      if (shift && shift !== '-' && shift !== 'Vrij' && shift !== 'Verlof' && shift !== 'Ziek') {
        working++;
      }
      if (shift === 'Ziek' || shift === 'Verlof') {
        absent++;
      }
    });

    // Expected = total minus weekends (sat/sun default 0)
    const isWeekend = dayIndex % 7 >= 5;
    const expected = defaultExpected[dayIndex] ?? (isWeekend ? Math.round(total * 0.1) : Math.round(total * 0.7));
    const diff = working - expected;

    return { working, absent, total, expected, diff };
  };

  const getTotalShifts = () => {
    let total = 0;
    days.forEach((day, idx) => {
      const { working } = getOccupancyForDay(day, idx);
      total += working;
    });
    return total;
  };

  const getAverageOccupancy = () => {
    if (employees.length === 0 || days.length === 0) return 0;
    const totalShifts = getTotalShifts();
    const maxPossible = employees.length * days.length;
    return Math.round((totalShifts / maxPossible) * 100);
  };

  const getStaffingStatus = (diff) => {
    if (diff > 2) return { label: "Overbezet", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: ArrowUp };
    if (diff < -2) return { label: "Onderbezet", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: ArrowDown };
    return { label: "Op schema", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 };
  };

  const getBarColor = (diff) => {
    if (diff > 2) return "bg-amber-500";
    if (diff < -2) return "bg-red-500";
    return "bg-emerald-500";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          <h3 className="font-medium text-sm text-slate-900">Capaciteit & Bezetting</h3>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
            <div className="flex items-center gap-1.5 text-xs mb-0.5">
              <Users className="w-3 h-3 text-blue-600" />
              <span className="text-slate-600">Gem. Bezetting</span>
            </div>
            <div className="text-xl font-bold text-blue-900">{getAverageOccupancy()}%</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-2">
            <div className="flex items-center gap-1.5 text-xs mb-0.5">
              <Users className="w-3 h-3 text-green-600" />
              <span className="text-slate-600">Actieve Chauffeurs</span>
            </div>
            <div className="text-xl font-bold text-green-900">{employees.length}</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
            <div className="flex items-center gap-1.5 text-xs mb-0.5">
              <CalendarDays className="w-3 h-3 text-purple-600" />
              <span className="text-slate-600">Totaal Diensten</span>
            </div>
            <div className="text-xl font-bold text-purple-900">{getTotalShifts()}</div>
          </div>
        </div>

        {/* Per-day staffing indicators */}
        <div className="space-y-1.5">
          {days.map((day, idx) => {
            const { working, absent, total, expected, diff } = getOccupancyForDay(day, idx);
            const percentage = total > 0 ? (working / total) * 100 : 0;
            const status = getStaffingStatus(diff);
            const StatusIcon = status.icon;

            return (
              <div key={day.toISOString()} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border ${status.bg}`}>
                <div className="text-slate-700 flex-shrink-0 w-20 font-medium">
                  {format(day, "EEE d MMM", { locale: nl })}
                </div>
                
                {/* Progress bar */}
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBarColor(diff)} transition-all rounded-full`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* Working count */}
                <div className="text-slate-700 font-semibold w-20 text-right">
                  {working}/{expected} nodig
                </div>

                {/* Status badge */}
                <div className={`flex items-center gap-1 w-28 ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span className="font-medium">{status.label}</span>
                  {diff !== 0 && (
                    <span className="font-bold">({diff > 0 ? '+' : ''}{diff})</span>
                  )}
                </div>

                {/* Absent indicator */}
                {absent > 0 && (
                  <Badge variant="outline" className="text-xs border-red-200 text-red-600 px-1.5">
                    <AlertTriangle className="w-3 h-3 mr-0.5" />
                    {absent} afwezig
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs border-t pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
            <span className="text-slate-600">Op schema</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-500 rounded-sm" />
            <span className="text-slate-600">Overbezet (+3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span className="text-slate-600">Onderbezet (-3)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}