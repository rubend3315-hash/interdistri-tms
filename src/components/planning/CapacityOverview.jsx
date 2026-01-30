import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { TrendingUp, Users, CalendarDays, Copy } from "lucide-react";

export default function CapacityOverview({ days, employees, schedules, onCopyDay }) {
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
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Capaciteit & Werkdruk</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
              <Users className="w-4 h-4" />
              Gemiddelde Bezetting
            </div>
            <div className="text-3xl font-bold text-blue-900">{getAverageOccupancy()}%</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <Users className="w-4 h-4" />
              Actieve Chauffeurs
            </div>
            <div className="text-3xl font-bold text-green-900">{getTotalActiveDrivers()}</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
              <CalendarDays className="w-4 h-4" />
              Totaal Diensten
            </div>
            <div className="text-3xl font-bold text-purple-900">{getTotalShifts()}</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Dagelijkse Bezetting</h4>
          <div className="space-y-2">
            {days.map((day, idx) => {
              const { working, total } = getOccupancyForDay(day, idx);
              const percentage = total > 0 ? (working / total) * 100 : 0;
              return (
                <div key={day.toISOString()} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-slate-600">
                    {format(day, "EEE d MMM", { locale: nl })}
                  </div>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${getOccupancyColor(percentage)} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-slate-600 w-24 text-right">
                    {working}/{total} chauffeurs
                  </div>
                  <div className="text-sm text-slate-600 w-20 text-right">
                    {working} diensten
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => onCopyDay(day)}
                  >
                    <Copy className="w-3 h-3" />
                    Kopieer dag
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
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