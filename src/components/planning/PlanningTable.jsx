import React, { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import { shiftTypes } from "./ShiftLegend";

const getShiftColor = (shiftValue) => {
  const shiftType = shiftTypes.find(s => s.value === shiftValue);
  return shiftType?.color || "bg-slate-100 text-slate-600 border-slate-200";
};
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
  customers = [],
  filterDepartment = 'all',
  getWeekScheduleHours
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
      // Save for the selected day
      onShiftChange(selectedEmployee.id, selectedDayIndex, formData);
      
      // If copy_to_days is selected, save to those days as well
      if (formData.copy_to_days && formData.copy_to_days.length > 0) {
        formData.copy_to_days.forEach(dayIdx => {
          if (dayIdx !== selectedDayIndex) {
            onShiftChange(selectedEmployee.id, dayIdx, formData);
          }
        });
      }
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

  // Group employees by department when showing all departments
  const groupedEmployees = filterDepartment === 'all'
    ? (() => {
        const groups = {};
        employees.forEach(emp => {
          // Add to home department
          const dept = emp.department;
          if (!groups[dept]) groups[dept] = [];
          groups[dept].push(emp);

          // Also add to scheduled departments if different
          const schedule = getScheduleForEmployee(emp.id);
          if (schedule) {
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const scheduledDepts = new Set();
            days.forEach(day => {
              const plannedDept = schedule[`${day}_planned_department`];
              if (plannedDept && plannedDept !== emp.department) {
                scheduledDepts.add(plannedDept);
              }
            });
            scheduledDepts.forEach(scheduledDept => {
              if (!groups[scheduledDept]) groups[scheduledDept] = [];
              if (!groups[scheduledDept].find(e => e.id === emp.id)) {
                groups[scheduledDept].push(emp);
              }
            });
          }
        });
        return groups;
      })()
    : null;

  const renderEmployeeRows = (empsToRender, startIndex = 0, currentDepartment = null) => {
    return empsToRender.map((employee, idx) => {
      const schedule = getScheduleForEmployee(employee.id);
      const employeeColor = getEmployeeColor(startIndex + idx);
      const weekScheduleHours = getWeekScheduleHours ? getWeekScheduleHours(employee) : null;

      return (
        <TableRow key={employee.id}>
          <TableCell className="font-medium sticky left-0 bg-white z-10">
            <div>
              <p className="text-slate-900">{employee.first_name} {employee.last_name}</p>
              <p className="text-xs text-slate-500">{employee.department}</p>
              {weekScheduleHours && (
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  {Object.values(weekScheduleHours).reduce((a, b) => a + b, 0)} uur/week
                </p>
              )}
            </div>
          </TableCell>
          {days.map((day, dayIndex) => {
                    const dayKey = getDayKey(dayIndex);
                    const currentValue = schedule?.[dayKey] || "";
                    const currentRouteId = schedule?.[`${dayKey}_route_id`] || "";
                    const currentVehicleId = schedule?.[`${dayKey}_vehicle_id`] || "";
                    const currentNotes1 = schedule?.[`${dayKey}_notes_1`] || "";
                    const currentNotes2 = schedule?.[`${dayKey}_notes_2`] || "";
                    const currentPlannedDepartment = schedule?.[`${dayKey}_planned_department`] || "";
                    const holiday = isHoliday(day);
                    const currentRoute = routes.find(r => r.id === currentRouteId);
                    const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
                    const dayHours = weekScheduleHours ? weekScheduleHours[dayKey] : null;

                    // Check if employee is scheduled in a different department
                    const isScheduledElsewhere = currentPlannedDepartment && currentPlannedDepartment !== employee.department;
                    // Only show shift if it's scheduled in this department, or no department is specified and this is the home department
                    const shouldShowShift = !currentPlannedDepartment && employee.department === currentDepartment || currentPlannedDepartment === currentDepartment;
                    // Show details only if we're viewing the department where it's scheduled
                    const showDetails = shouldShowShift;
                    // Show shift code only if viewing the scheduled department
                    const displayText = shouldShowShift ? (currentValue || "-") : "-";

            return (
              <TableCell
                key={day.toISOString()}
                className={`text-center p-1 ${holiday ? 'bg-purple-50' : ''}`}
              >
                <div 
                  className="w-full min-h-20 border border-slate-200 rounded-md px-2 py-2 text-xs flex flex-col gap-0.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleAddShift(employee, day, dayIndex)}
                >
                  {displayText !== "-" ? (
                    <div className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getShiftColor(displayText)} w-fit`}>
                      {displayText}
                    </div>
                  ) : (
                    <div className="font-medium text-slate-900">
                      {displayText}
                    </div>
                  )}
                  {dayHours !== null && dayHours !== undefined && dayHours > 0 && (
                    <div className="text-xs text-cyan-600 font-semibold">
                      {dayHours}h
                    </div>
                  )}
                  {isScheduledElsewhere && currentDepartment === employee.department && (
                    <div className="text-xs text-blue-600 font-semibold truncate w-full">
                      gepland op afd. {currentPlannedDepartment}
                    </div>
                  )}
                  {showDetails && currentRoute && (
                    <div className="text-xs text-slate-600 truncate w-full">
                      {currentRoute.route_code}
                    </div>
                  )}
                  {showDetails && currentVehicle && (
                    <div className="text-xs text-slate-500 truncate w-full">
                      {currentVehicle.license_plate}
                    </div>
                  )}
                  {showDetails && currentNotes1 && (
                    <div className="text-xs text-slate-500 truncate w-full italic">
                      {currentNotes1}
                    </div>
                  )}
                  {showDetails && currentNotes2 && (
                    <div className="text-xs text-slate-500 truncate w-full italic">
                      {currentNotes2}
                    </div>
                  )}
                </div>
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };

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
          {groupedEmployees ? (
            Object.entries(groupedEmployees).map(([dept, deptEmployees]) => (
              <React.Fragment key={dept}>
                <TableRow className="bg-slate-100">
                  <TableCell colSpan={days.length + 1} className="font-bold text-slate-900 py-2">
                    Afdeling {dept}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="w-48 sticky left-0 bg-slate-50 z-10 py-1">Medewerker</TableHead>
                  {days.map((day) => {
                    return (
                      <TableHead key={day.toISOString()} className="text-center min-w-28 py-1">
                        <div className="text-xs font-medium text-slate-700">{format(day, "EEE", { locale: nl })}</div>
                      </TableHead>
                    );
                  })}
                </TableRow>
                {renderEmployeeRows(deptEmployees, 0, dept)}
              </React.Fragment>
            ))
          ) : (
            renderEmployeeRows(employees, 0, filterDepartment)
          )}
        </TableBody>
      </Table>
    </div>
    </>
  );
}