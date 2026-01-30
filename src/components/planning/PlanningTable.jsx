import React, { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import { shiftTypes } from "./ShiftLegend";
import AddShiftDialog from "./AddShiftDialog";

const employeeColors = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-yellow-100 text-yellow-700 border-yellow-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-violet-100 text-violet-700 border-violet-200",
];

export default function PlanningTable({
  isLoading,
  employees,
  days,
  schedules,
  holidays,
  colorMode,
  onShiftChange,
  getDayKey,
  getScheduleForEmployee,
  uurcodes = [],
  routes = [],
  vehicles = [],
  customers = []
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  const handleAddShift = (employee, date, dayIndex) => {
    setSelectedEmployee(employee);
    setSelectedDate(date);
    setSelectedDayIndex(dayIndex);
    setDialogOpen(true);
  };

  const handleSaveShift = (formData) => {
    if (selectedEmployee && selectedDayIndex !== null) {
      onShiftChange(selectedEmployee.id, selectedDayIndex, formData.uurcode, formData.route_id);
    }
  };
  const getShiftConfig = (value) => {
    return shiftTypes.find(s => s.value === value) || shiftTypes[3];
  };

  const getEmployeeColor = (index) => {
    return employeeColors[index % employeeColors.length];
  };

  const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="p-12 text-center">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Geen medewerkers gevonden</h3>
        <p className="text-slate-500 mt-1">Selecteer een andere afdeling of voeg medewerkers toe.</p>
      </div>
    );
  }

  return (
    <>
      <AddShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmployee}
        date={selectedDate}
        routes={routes}
        vehicles={vehicles}
        onSave={handleSaveShift}
      />
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-48 sticky left-0 bg-slate-50 z-10">Medewerker</TableHead>
            {days.map((day) => {
              const holiday = isHoliday(day);
              return (
                <TableHead key={day.toISOString()} className="text-center min-w-28">
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-xs text-slate-500">{format(day, "EEE", { locale: nl })}</div>
                    <div className="font-semibold">{format(day, "d MMM", { locale: nl })}</div>
                    {holiday && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">
                        {holiday.name}
                      </Badge>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee, empIndex) => {
            const schedule = getScheduleForEmployee(employee.id);
            const employeeColor = getEmployeeColor(empIndex);

            return (
              <TableRow key={employee.id}>
                <TableCell className="font-medium sticky left-0 bg-white z-10">
                  <div>
                    <p className="text-slate-900">{employee.first_name} {employee.last_name}</p>
                    <p className="text-xs text-slate-500">{employee.department}</p>
                  </div>
                </TableCell>
                {days.map((day, dayIndex) => {
                  const dayKey = getDayKey(dayIndex);
                  const routeKey = `${dayKey}_route_id`;
                  const currentValue = schedule?.[dayKey] || "";
                  const currentRouteId = schedule?.[routeKey] || "";
                  const holiday = isHoliday(day);
                  const currentUurcode = uurcodes.find(u => u.code === currentValue);
                  const currentRoute = routes.find(r => r.id === currentRouteId);
                  
                  // Determine display text
                  const displayText = currentUurcode?.name || currentValue || "-";
                  const hasData = currentValue || currentRouteId;

                  return (
                    <TableCell
                      key={day.toISOString()}
                      className={`text-center p-1 ${holiday ? 'bg-purple-50' : ''}`}
                    >
                      <div 
                        className="w-full min-h-16 border border-slate-200 rounded-md px-2 py-2 text-xs flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => handleAddShift(employee, day, dayIndex)}
                      >
                        <div className="font-medium text-slate-900">
                          {displayText}
                        </div>
                        {currentRoute && (
                          <div className="text-xs text-slate-500 truncate w-full text-center">
                            {currentRoute.route_code}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </>
  );
}