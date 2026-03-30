import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Clock } from "lucide-react";
import RitTijdTimeline from "./RitTijdTimeline";

export default function RitTijdEmployeeCard({ group, vehicles, customers, projects, activiteiten, getTripFuelCost }) {
  const { employee, date, timeEntries, trips, spws, gps } = group;
  const te = timeEntries[0]; // Primary time entry for this day

  const empName = employee ? `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}` : 'Onbekend';

  const shiftTypeColor = {
    'Dag': 'bg-amber-100 text-amber-700',
    'Avond': 'bg-orange-100 text-orange-700',
    'Nacht': 'bg-indigo-100 text-indigo-700',
    'Nachtdienst': 'bg-indigo-100 text-indigo-700',
  };

  let dateFormatted = date;
  try { dateFormatted = format(new Date(date), "EEE d MMM.", { locale: nl }); } catch { /* keep raw */ }

  return (
    <div>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-4.5 h-4.5 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900">{empName}</h3>
                {employee?.department && (
                  <span className="text-xs text-slate-400">{employee.department}</span>
                )}
                {te?.shift_type && (
                  <Badge className={`text-[11px] px-2 py-0 leading-5 ${shiftTypeColor[te.shift_type] || 'bg-slate-100 text-slate-700'}`}>
                    {te.shift_type}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {dateFormatted}
                </span>
                {te && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {te.start_time || '-'} – {te.end_time || '-'}
                  </span>
                )}
                {te?.total_hours > 0 && (
                  <span className="font-medium text-slate-700">{te.total_hours}u</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {(trips.length > 0 || spws.length > 0 || gps.length > 0) && (
        <RitTijdTimeline
          trips={trips}
          spws={spws}
          gps={gps}
          vehicles={vehicles}
          customers={customers}
          projects={projects}
          activiteiten={activiteiten}
          getTripFuelCost={getTripFuelCost}
        />
      )}
    </div>
  );
}