import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Truck, ArrowRight, Users, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, getWeek, getYear, eachDayOfInterval } from "date-fns";
import { nl } from "date-fns/locale";

export default function CharterOverview() {
  const today = new Date();
  const weekNumber = getWeek(today, { weekStartsOn: 1 });
  const year = getYear(today);
  const periodStart = startOfWeek(today, { weekStartsOn: 1 });
  const periodEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const cacheOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

  const { data: charterEmployees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ['charterDashEmp'],
    queryFn: () => base44.entities.Employee.filter({ department: "Charters", status: "Actief" }),
    ...cacheOpts
  });

  const { data: schedules = [], isLoading: loadingSched } = useQuery({
    queryKey: ['charterDashSchedules', weekNumber, year],
    queryFn: () => base44.entities.Schedule.filter({ week_number: weekNumber, year }),
    ...cacheOpts
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['charterDashVehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    ...cacheOpts
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['charterDashAllEmp'],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }),
    ...cacheOpts
  });

  const getDayKey = (index) => {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index];
  };

  // Find today's day index (0=monday)
  const todayDayIndex = (today.getDay() + 6) % 7; // convert 0=sunday to 0=monday
  const todayKey = getDayKey(todayDayIndex);

  // Get all employees scheduled for Charters today
  const todayCharterSchedules = schedules.filter(s => {
    const plannedDept = s[`${todayKey}_planned_department`];
    const shiftValue = s[todayKey];
    const emp = allEmployees.find(e => e.id === s.employee_id);
    const isCharterEmp = emp?.department === 'Charters';
    return (plannedDept === 'Charters' || (isCharterEmp && !plannedDept)) && shiftValue && shiftValue !== '-';
  });

  const isLoading = loadingEmp || loadingSched;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Charters Overzicht
          </CardTitle>
          <Link to={createPageUrl("Charters")}>
            <Button variant="ghost" size="sm" className="text-blue-600">
              Bekijk alles
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-900">{charterEmployees.length}</p>
                <p className="text-xs text-slate-500">Chauffeurs</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <Calendar className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-900">{todayCharterSchedules.length}</p>
                <p className="text-xs text-slate-500">Vandaag ingepland</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <Truck className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-900">Week {weekNumber}</p>
                <p className="text-xs text-slate-500">Huidige week</p>
              </div>
            </div>

            {/* Vandaag ingepland */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Vandaag ingepland ({format(today, "EEEE d MMMM", { locale: nl })})
              </p>
              {todayCharterSchedules.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">Geen chauffeurs ingepland vandaag</p>
              ) : (
                <div className="space-y-2">
                  {todayCharterSchedules.map(schedule => {
                    const emp = allEmployees.find(e => e.id === schedule.employee_id);
                    const vehicleId = schedule[`${todayKey}_vehicle_id`];
                    const vehicle = vehicles.find(v => v.id === vehicleId);
                    const shiftValue = schedule[todayKey];
                    const notes = schedule[`${todayKey}_notes_1`];

                    return (
                      <div key={schedule.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">
                              {emp?.first_name?.charAt(0)}{emp?.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {emp ? `${emp.first_name} ${emp.last_name}` : 'Onbekend'}
                            </p>
                            {vehicle && (
                              <p className="text-xs text-slate-500">{vehicle.license_plate}</p>
                            )}
                            {notes && (
                              <p className="text-xs text-slate-400 italic">{notes}</p>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">{shiftValue}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Charter medewerkers */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Charter medewerkers</p>
              <div className="flex flex-wrap gap-2">
                {charterEmployees.map(emp => (
                  <Badge key={emp.id} variant="outline" className="text-xs">
                    {emp.first_name} {emp.last_name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}