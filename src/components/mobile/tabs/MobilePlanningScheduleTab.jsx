import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

export default function MobilePlanningScheduleTab({ schedules }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Mijn planning deze week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!schedules || schedules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Geen planning ingesteld voor deze week</p>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, idx) => {
                const dayDate = new Date();
                dayDate.setDate(dayDate.getDate() - dayDate.getDay() + 1 + idx);
                const schedule = schedules[0];
                const shiftValue = schedule?.[day] || '-';
                const plannedDept = schedule?.[`${day}_planned_department`] || '';
                const isWeekend = idx > 4;
                const isToday = dayDate.toDateString() === new Date().toDateString();

                return (
                  <div key={day} className={`p-3 rounded-lg border ${isToday ? 'border-blue-300 bg-blue-50' : isWeekend ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{DAY_NAMES[idx]}</p>
                        <p className="text-xs text-slate-500">{format(dayDate, 'd MMM', { locale: nl })}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-xs ${shiftValue === '-' ? 'bg-slate-100 text-slate-600' : shiftValue === 'Vrij' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {shiftValue}
                        </Badge>
                        {plannedDept && shiftValue !== '-' && <p className="text-xs text-slate-500 mt-1">Afd. {plannedDept}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}