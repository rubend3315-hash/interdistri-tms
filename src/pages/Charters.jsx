import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Truck, Users, Calendar, MapPin } from "lucide-react";
import { format, startOfWeek, endOfWeek, getWeek, getYear, eachDayOfInterval, addWeeks, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function Charters() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(currentDate);
  const periodStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const periodEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['charterEmployees'],
    queryFn: () => base44.entities.Employee.filter({ department: "Charters", status: "Actief" })
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployeesCharters'],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" })
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['charterSchedules', weekNumber, year],
    queryFn: () => base44.entities.Schedule.filter({ week_number: weekNumber, year })
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['charterVehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['charterCustomers'],
    queryFn: () => base44.entities.Customer.filter({ status: "Actief" })
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['charterTrips', weekNumber, year],
    queryFn: async () => {
      const allTrips = await base44.entities.Trip.list('-date', 200);
      return allTrips.filter(t => {
        const tripDate = new Date(t.date);
        return tripDate >= periodStart && tripDate <= periodEnd;
      });
    }
  });

  // Get employees scheduled for Charters department (including from other depts)
  const charterScheduledEmployees = React.useMemo(() => {
    const charterEmpIds = new Set(employees.map(e => e.id));
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    schedules.forEach(s => {
      dayKeys.forEach(day => {
        if (s[`${day}_planned_department`] === 'Charters') {
          charterEmpIds.add(s.employee_id);
        }
      });
    });

    return allEmployees.filter(e => charterEmpIds.has(e.id));
  }, [employees, allEmployees, schedules]);

  const getDayKey = (index) => {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return dayKeys[index];
  };

  const isLoading = loadingEmployees || loadingSchedules;

  // Charter trips for this week
  const charterTrips = trips.filter(t => {
    const emp = charterScheduledEmployees.find(e => e.id === t.employee_id);
    return emp;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Charters</h1>
          <p className="text-slate-500 mt-1">Overzicht charterritten en planning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={createPageUrl("Planning") + "?department=Charters"}>
              <Calendar className="w-4 h-4 mr-2" />
              Naar Planning
            </Link>
          </Button>
        </div>
      </div>

      {/* Week navigatie */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
          Vorige week
        </Button>
        <div className="text-center">
          <p className="font-semibold text-slate-900">
            {format(periodStart, "d MMM", { locale: nl })} - {format(periodEnd, "d MMM yyyy", { locale: nl })}
          </p>
          <p className="text-sm text-slate-500">Week {weekNumber}</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
          Volgende week
        </Button>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Chauffeurs</p>
                <p className="text-2xl font-bold text-slate-900">{charterScheduledEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ritten deze week</p>
                <p className="text-2xl font-bold text-slate-900">{charterTrips.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ingeplande dagen</p>
                <p className="text-2xl font-bold text-slate-900">
                  {schedules.filter(s => {
                    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    return dayKeys.some(d => s[`${d}_planned_department`] === 'Charters' && s[d] && s[d] !== '-');
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Klanten</p>
                <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekplanning Charters */}
      <Card>
        <CardHeader>
          <CardTitle>Weekplanning Charters - Week {weekNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : charterScheduledEmployees.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Geen medewerkers ingepland voor Charters deze week</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 font-medium text-slate-700">Medewerker</th>
                    {days.map(day => (
                      <th key={day.toISOString()} className="text-center p-3 font-medium text-slate-700 min-w-24">
                        <div>{format(day, "EEE", { locale: nl })}</div>
                        <div className="text-xs text-slate-500">{format(day, "d MMM", { locale: nl })}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {charterScheduledEmployees.map(emp => {
                    const schedule = schedules.find(s => s.employee_id === emp.id);
                    return (
                      <tr key={emp.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-slate-500">{emp.department}</div>
                        </td>
                        {days.map((day, idx) => {
                          const dayKey = getDayKey(idx);
                          const plannedDept = schedule?.[`${dayKey}_planned_department`] || '';
                          const shiftValue = schedule?.[dayKey] || '-';
                          const isCharter = plannedDept === 'Charters' || (emp.department === 'Charters' && !plannedDept);
                          const routeId = schedule?.[`${dayKey}_route_id`] || '';
                          const vehicleId = schedule?.[`${dayKey}_vehicle_id`] || '';
                          const vehicle = vehicles.find(v => v.id === vehicleId);
                          const notes1 = schedule?.[`${dayKey}_notes_1`] || '';

                          return (
                            <td key={day.toISOString()} className="text-center p-2">
                              {isCharter && shiftValue && shiftValue !== '-' ? (
                                <div className="space-y-1">
                                  <Badge className="bg-blue-100 text-blue-700">{shiftValue}</Badge>
                                  {vehicle && (
                                    <div className="text-xs text-slate-500">{vehicle.license_plate}</div>
                                  )}
                                  {notes1 && (
                                    <div className="text-xs text-slate-400 italic">{notes1}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charter medewerkers */}
      <Card>
        <CardHeader>
          <CardTitle>Charter medewerkers</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Geen medewerkers in afdeling Charters</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                <div key={emp.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-600">
                        {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">{emp.function}</p>
                    </div>
                  </div>
                  {emp.phone && (
                    <p className="text-xs text-slate-500 mt-2">{emp.phone}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}