import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, getWeek, getYear, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Truck as TruckIcon,
  StickyNote,
  AlertCircle,
  Home,
  Star
} from "lucide-react";

const SHIFT_COLORS = {
  "Dag": "bg-amber-100 text-amber-700 border-amber-200",
  "Avond": "bg-orange-100 text-orange-700 border-orange-200",
  "Nacht": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Stand-by": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Opleiding": "bg-blue-100 text-blue-700 border-blue-200",
  "Vrij": "bg-slate-100 text-slate-500 border-slate-200",
};

const ABSENCE_COLORS = {
  "Ziek": "bg-red-100 text-red-700 border-red-200",
  "Verlof": "bg-amber-100 text-amber-700 border-amber-200",
  "ATV": "bg-orange-100 text-orange-700 border-orange-200",
  "Opleiding": "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const ABSENCE_TYPES = new Set(["Ziek", "Verlof", "ATV", "Opleiding"]);

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

export default function MobilePlanningTab({
  schedules = [],
  currentEmployee,
  routes = [],
  tiModelRoutes = [],
  vehicles = []
}) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeek = getWeek(today, { weekStartsOn: 1 });
  const currentYear = getYear(today);

  // Fetch time entries for this week to detect absences
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['mobilePlanningTimeEntries', currentEmployee?.id, currentWeek, currentYear],
    queryFn: () => base44.entities.TimeEntry.filter({
      employee_id: currentEmployee?.id,
      week_number: currentWeek,
      year: currentYear
    }),
    enabled: !!currentEmployee?.id
  });

  // Fetch holidays for this year
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', currentYear],
    queryFn: () => base44.entities.Holiday.filter({ year: currentYear })
  });

  // Build absence lookup
  const absenceLookup = React.useMemo(() => {
    const lookup = {};
    timeEntries.forEach(te => {
      if (te.shift_type && ABSENCE_TYPES.has(te.shift_type) && te.date && te.employee_id) {
        lookup[te.date] = te.shift_type;
      }
    });
    return lookup;
  }, [timeEntries]);

  // Build holiday lookup
  const holidayLookup = React.useMemo(() => {
    const lookup = {};
    holidays.forEach(h => { if (h.date) lookup[h.date] = h.name; });
    return lookup;
  }, [holidays]);

  const schedule = schedules[0];
  const allRoutes = [...routes, ...tiModelRoutes];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          Mijn planning deze week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!schedules || schedules.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Geen planning ingesteld voor deze week
          </p>
        ) : (
          DAY_KEYS.map((day, idx) => {
            const dayDate = addDays(weekStart, idx);
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const shiftValue = schedule?.[day] || '-';
            const plannedDept = schedule?.[`${day}_planned_department`] || '';
            const routeId = schedule?.[`${day}_route_id`] || '';
            const vehicleId = schedule?.[`${day}_vehicle_id`] || '';
            const notes1 = schedule?.[`${day}_notes_1`] || '';
            const notes2 = schedule?.[`${day}_notes_2`] || '';

            const absence = absenceLookup[dateStr];
            const holiday = holidayLookup[dateStr];
            const isToday = dayDate.toDateString() === today.toDateString();
            const isWeekend = idx > 4;

            const route = allRoutes.find(r => r.id === routeId);
            const vehicle = vehicles.find(v => v.id === vehicleId);

            // Determine what to display
            let displayBadge;
            if (absence) {
              displayBadge = (
                <Badge className={`text-xs gap-1 ${ABSENCE_COLORS[absence] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  <AlertCircle className="w-3 h-3" />
                  {absence}
                </Badge>
              );
            } else if (holiday && shiftValue === '-') {
              displayBadge = (
                <Badge className="text-xs gap-1 bg-purple-100 text-purple-700 border-purple-200">
                  <Star className="w-3 h-3" />
                  Feestdag
                </Badge>
              );
            } else if (shiftValue === '-') {
              displayBadge = (
                <Badge className="text-xs gap-1 bg-slate-100 text-slate-500 border-slate-200">
                  <Home className="w-3 h-3" />
                  Vrij
                </Badge>
              );
            } else {
              displayBadge = (
                <Badge className={`text-xs ${SHIFT_COLORS[shiftValue] || "bg-blue-100 text-blue-700 border-blue-200"}`}>
                  {shiftValue}
                </Badge>
              );
            }

            return (
              <div
                key={day}
                className={`p-3 rounded-lg border ${
                  isToday
                    ? 'border-blue-300 bg-blue-50'
                    : absence
                    ? 'border-red-200 bg-red-50/30'
                    : isWeekend
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {DAY_NAMES[idx]}
                      {isToday && <span className="ml-1 text-blue-600 text-xs">(vandaag)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{format(dayDate, 'd MMM', { locale: nl })}</p>
                  </div>
                  <div className="text-right">
                    {displayBadge}
                    {holiday && shiftValue !== '-' && !absence && (
                      <p className="text-xs text-purple-600 mt-0.5">{holiday}</p>
                    )}
                  </div>
                </div>

                {/* Details - only show when there's actual shift data and no absence */}
                {!absence && shiftValue !== '-' && (
                  <div className="mt-2 space-y-1">
                    {plannedDept && (
                      <p className="text-xs text-slate-500">
                        Afd. {plannedDept.replace('PakketDistributie_', 'PD ')}
                      </p>
                    )}
                    {route && (
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {route.route_code || route.route_name}
                      </div>
                    )}
                    {vehicle && (
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <TruckIcon className="w-3 h-3 text-slate-400" />
                        {vehicle.license_plate}
                      </div>
                    )}
                    {(notes1 || notes2) && (
                      <div className="flex items-start gap-1 text-xs text-slate-500 italic">
                        <StickyNote className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{[notes1, notes2].filter(Boolean).join(' · ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}