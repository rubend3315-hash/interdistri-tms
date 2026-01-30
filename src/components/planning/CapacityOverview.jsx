import React from "react";
import { Card, CardContent } from "@/components/ui/card";

import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { TrendingUp, Users, CalendarDays } from "lucide-react";

export default function CapacityOverview({ days, employees, schedules }) {
  const getOccupancyForDay = (day, dayIndex) => {
    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex % 7];
    let working = 0;
    let total = employees.length;

    employees.forEach(emp => {
      const schedule = schedules.find(s => s.employee_id === emp.id);
      const shift = schedule?.[dayKey];
      if (shift && shift !== 'Vrij' && shift !== 'Verlof' && shift !== 'Ziek') {
        working++;
      }
    });

    return { working, total };
  };

  const getTotalActiveDrivers = () => {
    return employees.length;
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

  const getOccupancyColor = (percentage) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          <h3 className="font-medium text-sm text-slate-900">Capaciteit & Werkdruk</h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-slate-600">Gemiddelde Bezetting</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{getAverageOccupancy()}%</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-slate-600">Actieve Chauffeurs</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{getTotalActiveDrivers()}</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="text-slate-600">Totaal Diensten</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{getTotalShifts()}</div>
          </div>
        </div>

        <div>
          <div className="space-y-1">
            {days.map((day, idx) => {
              const { working, total } = getOccupancyForDay(day, idx);
              const percentage = total > 0 ? (working / total) * 100 : 0;
              return (
                <div key={day.toISOString()} className="flex items-center gap-3 text-xs">
                  <div className="text-slate-600 flex-shrink-0 whitespace-nowrap">
                    {format(day, "EEE d MMM", { locale: nl })}
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
                  <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getOccupancyColor(percentage)} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-slate-600 text-right">
                    {working}/{total} chauffeurs
                  </div>
                  <div className="text-slate-600 text-right w-14">
                    {working} diensten
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-slate-600">&lt; 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span className="text-slate-600">50-70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span className="text-slate-600">&gt; 70%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}