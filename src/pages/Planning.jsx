import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, getWeek, getYear, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sunset,
  Home,
  Palmtree,
  Thermometer,
  Star,
  User
} from "lucide-react";

const shiftTypes = [
  { value: "Dag", label: "Dag", icon: Sun, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "Avond", label: "Avond", icon: Sunset, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "Nacht", label: "Nacht", icon: Moon, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "Vrij", label: "Vrij", icon: Home, color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "Verlof", label: "Verlof", icon: Palmtree, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "Ziek", label: "Ziek", icon: Thermometer, color: "bg-red-100 text-red-700 border-red-200" },
  { value: "Feestdag", label: "Feestdag", icon: Star, color: "bg-purple-100 text-purple-700 border-purple-200" },
];

const departments = ["Management", "Transport", "PakketDistributie", "Charters"];

export default function Planning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(currentDate);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', weekNumber, year],
    queryFn: () => base44.entities.Schedule.filter({ week_number: weekNumber, year })
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => base44.entities.Holiday.filter({ year })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const activeEmployees = employees.filter(e => 
    e.status === 'Actief' && 
    (filterDepartment === 'all' || e.department === filterDepartment)
  );

  const getScheduleForEmployee = (employeeId) => {
    return schedules.find(s => s.employee_id === employeeId);
  };

  const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  const getDayKey = (index) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days[index];
  };

  const handleShiftChange = (employeeId, dayIndex, value) => {
    const dayKey = getDayKey(dayIndex);
    const existingSchedule = getScheduleForEmployee(employeeId);

    if (existingSchedule) {
      updateMutation.mutate({
        id: existingSchedule.id,
        data: { [dayKey]: value }
      });
    } else {
      const newSchedule = {
        employee_id: employeeId,
        week_number: weekNumber,
        year,
        [dayKey]: value
      };
      createMutation.mutate(newSchedule);
    }
  };

  const getShiftConfig = (value) => {
    return shiftTypes.find(s => s.value === value) || shiftTypes[3]; // Default to Vrij
  };

  const isLoading = loadingEmployees || loadingSchedules;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Planning</h1>
          <p className="text-slate-500 mt-1">Weekplanning en dienstroosters</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Alle afdelingen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle afdelingen</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {shiftTypes.map(shift => {
              const Icon = shift.icon;
              return (
                <Badge key={shift.value} className={`${shift.color} border gap-1.5`}>
                  <Icon className="w-3.5 h-3.5" />
                  {shift.label}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Vorige week
            </Button>
            <div className="text-center">
              <p className="font-semibold text-slate-900">
                {format(weekStart, "d MMM", { locale: nl })} - {format(weekEnd, "d MMM yyyy", { locale: nl })}
              </p>
              <p className="text-sm text-slate-500">Week {weekNumber}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              Volgende week
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Planning Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-96" />
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen medewerkers gevonden</h3>
              <p className="text-slate-500 mt-1">Selecteer een andere afdeling of voeg medewerkers toe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-48 sticky left-0 bg-slate-50 z-10">Medewerker</TableHead>
                    {weekDays.map((day, index) => {
                      const holiday = isHoliday(day);
                      return (
                        <TableHead key={day.toISOString()} className="text-center min-w-28">
                          <div className="text-xs text-slate-500">{format(day, "EEE", { locale: nl })}</div>
                          <div className="font-semibold">{format(day, "d MMM", { locale: nl })}</div>
                          {holiday && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">
                              {holiday.name}
                            </Badge>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmployees.map(employee => {
                    const schedule = getScheduleForEmployee(employee.id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium sticky left-0 bg-white z-10">
                          <div>
                            <p className="text-slate-900">{employee.first_name} {employee.last_name}</p>
                            <p className="text-xs text-slate-500">{employee.department}</p>
                          </div>
                        </TableCell>
                        {weekDays.map((day, dayIndex) => {
                          const dayKey = getDayKey(dayIndex);
                          const currentValue = schedule?.[dayKey] || "";
                          const holiday = isHoliday(day);
                          const config = currentValue ? getShiftConfig(currentValue) : null;
                          
                          return (
                            <TableCell 
                              key={day.toISOString()} 
                              className={`text-center p-1 ${holiday ? 'bg-purple-50' : ''}`}
                            >
                              <Select 
                                value={currentValue || "none"} 
                                onValueChange={(v) => handleShiftChange(employee.id, dayIndex, v === "none" ? "" : v)}
                              >
                                <SelectTrigger className={`w-full h-12 border-dashed ${config ? config.color : 'border-slate-200'}`}>
                                  {config ? (
                                    <div className="flex items-center gap-1.5">
                                      <config.icon className="w-4 h-4" />
                                      <span className="text-sm">{config.label}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    <span className="text-slate-400">Geen</span>
                                  </SelectItem>
                                  {shiftTypes.map(shift => {
                                    const Icon = shift.icon;
                                    return (
                                      <SelectItem key={shift.value} value={shift.value}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="w-4 h-4" />
                                          {shift.label}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}