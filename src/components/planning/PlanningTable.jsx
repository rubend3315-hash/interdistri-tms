import React, { useState } from "react";
import { format, getWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, GripVertical, AlertCircle, Home, Star } from "lucide-react";
import { shiftTypes } from "./ShiftLegend";
import AddShiftDialog from "./AddShiftDialog";
import DraggableShiftBadge from "./DraggableShiftBadge";
import DroppableCell from "./DroppableCell";
import { toast } from "sonner";

const DUTCH_DAY_MAP = {
  'maandag': 'monday', 'dinsdag': 'tuesday', 'woensdag': 'wednesday',
  'donderdag': 'thursday', 'vrijdag': 'friday', 'zaterdag': 'saturday', 'zondag': 'sunday'
};

function getWorkingDaysForEmployee(employee, weekNumber) {
  if (!employee.contractregels || employee.contractregels.length === 0) return null;
  const today = new Date();
  let activeContract = employee.contractregels
    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))
    .find(cr => {
      const s = new Date(cr.startdatum);
      const e = cr.einddatum ? new Date(cr.einddatum) : null;
      return s <= today && (!e || e >= today);
    });
  if (!activeContract) activeContract = employee.contractregels.find(cr => cr.week1 || cr.week2);
  if (!activeContract) return null;

  const isEvenWeek = weekNumber % 2 === 0;
  let weekSchedule = isEvenWeek ? activeContract.week2 : activeContract.week1;
  if (!weekSchedule || typeof weekSchedule !== 'object') {
    weekSchedule = isEvenWeek ? activeContract.week1 : activeContract.week2;
  }
  if (!weekSchedule || typeof weekSchedule !== 'object') return null;

  const result = {};
  Object.entries(DUTCH_DAY_MAP).forEach(([dutchDay, engDay]) => {
    const val = weekSchedule[dutchDay];
    result[engDay] = val === true || val === 'true' || (typeof val === 'number' && val > 0) || (typeof val === 'string' && !isNaN(parseFloat(val)) && parseFloat(val) > 0 && val !== '-');
  });
  return result;
}

const getShiftColor = (shiftValue) => {
  const shiftType = shiftTypes.find(s => s.value === shiftValue);
  return shiftType?.color || "bg-slate-100 text-slate-600 border-slate-200";
};

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
  tiModelRoutes = [],
  vehicles = [],
  customers = [],
  filterDepartment = 'all',
  getWeekScheduleHours,
  onDragDrop,
  timeEntries = []
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  const [existingShiftData, setExistingShiftData] = useState(null);

  const handleAddShift = (employee, date, dayIndex) => {
    setSelectedEmployee(employee);
    setSelectedDate(date);
    setSelectedDayIndex(dayIndex);

    // Check if there's existing data for this cell
    const schedule = getScheduleForEmployee(employee.id);
    const dayKey = getDayKey(dayIndex);
    const currentValue = schedule?.[dayKey] || "";
    
    if (schedule && currentValue && currentValue !== "-" && currentValue !== "") {
      const plannedDept = schedule[`${dayKey}_planned_department`] || "";
      const isPakketShift = plannedDept.startsWith("PakketDistributie_Shift");
      setExistingShiftData({
        planned_department: isPakketShift ? "PakketDistributie" : (plannedDept || employee.department || ""),
        pakket_shift: isPakketShift ? plannedDept.replace("PakketDistributie_", "") : (plannedDept === "PakketDistributie" ? "Shift3" : ""),
        is_standby: currentValue === "Stand-by",
        is_training: currentValue === "Opleiding",
        time_block_day: currentValue.includes("Dag"),
        time_block_evening: currentValue.includes("Avond"),
        time_block_night: currentValue.includes("Nacht"),
        route_id: schedule[`${dayKey}_route_id`] || "",
        vehicle_id: schedule[`${dayKey}_vehicle_id`] || "",
        notes_1: schedule[`${dayKey}_notes_1`] || "",
        notes_2: schedule[`${dayKey}_notes_2`] || "",
        copy_to_days: []
      });
    } else {
      setExistingShiftData(null);
    }
    
    setDialogOpen(true);
  };

  const handleSaveShift = (formData) => {
    if (selectedEmployee && selectedDayIndex !== null) {
      onShiftChange(selectedEmployee.id, selectedDayIndex, formData);
      if (formData.copy_to_days && formData.copy_to_days.length > 0) {
        formData.copy_to_days.forEach(dayIdx => {
          if (dayIdx !== selectedDayIndex) {
            onShiftChange(selectedEmployee.id, dayIdx, formData);
          }
        });
      }
    }
  };

  const handleCellDrop = (dropData) => {
    if (onDragDrop) {
      onDragDrop(dropData);
    }
  };

  // Build absence lookup: { "employeeId_yyyy-MM-dd": "Ziek" | "Verlof" | ... }
  const ABSENCE_TYPES = new Set(["Ziek", "Verlof", "ATV", "Opleiding"]);
  const absenceLookup = React.useMemo(() => {
    const lookup = {};
    timeEntries.forEach(te => {
      if (te.shift_type && ABSENCE_TYPES.has(te.shift_type) && te.date && te.employee_id) {
        lookup[`${te.employee_id}_${te.date}`] = te.shift_type;
      }
    });
    return lookup;
  }, [timeEntries]);

  const getAbsence = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return absenceLookup[`${employeeId}_${dateStr}`] || null;
  };

  const absenceColors = {
    "Ziek": "bg-red-100 text-red-700 border-red-200",
    "Verlof": "bg-amber-100 text-amber-700 border-amber-200",
    "ATV": "bg-orange-100 text-orange-700 border-orange-200",
    "Opleiding": "bg-indigo-100 text-indigo-700 border-indigo-200",
  };

  const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-96" /></div>;
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
          const dept = emp.department;
          if (!groups[dept]) groups[dept] = [];
          groups[dept].push(emp);

          const schedule = getScheduleForEmployee(emp.id);
          if (schedule) {
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const scheduledDepts = new Set();
            dayNames.forEach(day => {
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

  // Determine weekNumber from first day
  const currentWeekNumber = days.length > 0 ? getWeek(days[0], { weekStartsOn: 1 }) : 1;

  const renderEmployeeRows = (empsToRender, startIndex = 0, currentDepartment = null) => {
    return empsToRender.map((employee, idx) => {
      const schedule = getScheduleForEmployee(employee.id);
      const weekScheduleHours = getWeekScheduleHours ? getWeekScheduleHours(employee) : null;
      const workingDays = getWorkingDaysForEmployee(employee, currentWeekNumber);

      return (
        <TableRow key={employee.id}>
          <TableCell className="font-medium sticky left-0 bg-white z-10">
            <div>
              <p className="text-slate-900">{employee.first_name} {employee.last_name}</p>
              <p className="text-xs text-slate-500">{employee.department}</p>
              {weekScheduleHours && (
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  {parseFloat(Object.values(weekScheduleHours).reduce((a, b) => a + b, 0).toFixed(2))} uur/week
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
            const absence = getAbsence(employee.id, day);
            const currentRoute = routes.find(r => r.id === currentRouteId) || tiModelRoutes.find(r => r.id === currentRouteId);
            const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
            const dayHours = weekScheduleHours ? weekScheduleHours[dayKey] : null;

            const isPakketShiftTab = currentDepartment && currentDepartment.startsWith("PakketDistributie_Shift");
            
            // Determine if this shift belongs to the current tab
            let shouldShowShift = false;
            if (isPakketShiftTab) {
              shouldShowShift = currentPlannedDepartment === currentDepartment;
            } else {
              if (currentPlannedDepartment === currentDepartment) {
                shouldShowShift = true;
              } else if (!currentPlannedDepartment && employee.department === currentDepartment) {
                shouldShowShift = true;
              }
            }
            
            // Check if employee is scheduled elsewhere (show "gepland op afd." message)
            // For shift tabs: show message if planned on a DIFFERENT shift tab
            // For regular tabs: show message if planned on a different department
            const isScheduledElsewhere = currentPlannedDepartment 
              && currentPlannedDepartment !== currentDepartment
              && currentValue && currentValue !== '-' && currentValue !== '';
            const showDetails = shouldShowShift;
            const displayText = shouldShowShift ? (currentValue || "-") : "-";

            return (
              <TableCell key={day.toISOString()} className={`text-center p-1 ${holiday ? 'bg-purple-50' : ''}`}>
                <DroppableCell
                  employeeId={employee.id}
                  dayKey={dayKey}
                  dayIndex={dayIndex}
                  onDrop={handleCellDrop}
                  onClick={() => handleAddShift(employee, day, dayIndex)}
                  className="w-full min-h-20 border border-slate-200 rounded-md px-2 py-2 text-xs flex flex-col gap-0.5 cursor-pointer hover:bg-slate-50"
                >
                  {absence ? (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold w-full justify-center ${absenceColors[absence] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {absence}
                    </div>
                  ) : displayText !== "-" ? (
                    <DraggableShiftBadge
                      shift={currentValue}
                      employeeId={employee.id}
                      dayKey={dayKey}
                      dayIndex={dayIndex}
                    >
                      <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-xs font-medium ${getShiftColor(displayText)} w-full gap-1`}>
                        <GripVertical className="w-3 h-3 opacity-40 flex-shrink-0" />
                        {displayText}
                      </div>
                    </DraggableShiftBadge>
                  ) : (
                    <div className="font-medium text-slate-400 text-center py-1">
                      —
                    </div>
                  )}
                  {dayHours !== null && dayHours !== undefined && dayHours > 0 && (
                    <div className="text-xs text-cyan-600 font-semibold">{parseFloat(dayHours.toFixed(2))}h</div>
                  )}
                  {isScheduledElsewhere && !shouldShowShift && (
                    <div className="text-xs text-blue-600 font-semibold truncate w-full">
                      {currentPlannedDepartment.startsWith("PakketDistributie_Shift")
                        ? `gepland in ${currentPlannedDepartment.replace("PakketDistributie_", "")}`
                        : `gepland op afd. ${currentPlannedDepartment.replace(/_/g, ' ')}`
                      }
                    </div>
                  )}
                  {showDetails && currentRoute && (
                    <div className="text-xs text-slate-600 truncate w-full">{currentRoute.route_code}</div>
                  )}
                  {showDetails && currentVehicle && (
                    <div className="text-xs text-slate-500 truncate w-full">{currentVehicle.license_plate}</div>
                  )}
                  {showDetails && currentNotes1 && (
                    <div className="text-xs text-slate-500 truncate w-full italic">{currentNotes1}</div>
                  )}
                  {showDetails && currentNotes2 && (
                    <div className="text-xs text-slate-500 truncate w-full italic">{currentNotes2}</div>
                  )}
                </DroppableCell>
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
        tiModelRoutes={tiModelRoutes}
        vehicles={vehicles}
        onSave={handleSaveShift}
        onDelete={() => {
          if (selectedEmployee && selectedDayIndex !== null) {
            onShiftChange(selectedEmployee.id, selectedDayIndex, {
              planned_department: '',
              is_standby: false,
              is_training: false,
              time_block_day: false,
              time_block_evening: false,
              time_block_night: false,
              route_id: '',
              vehicle_id: '',
              notes_1: '',
              notes_2: '',
              copy_to_days: []
            });
            setDialogOpen(false);
            toast.success('Dienst verwijderd');
          }
        }}
        existingSchedules={schedules}
        existingShiftData={existingShiftData}
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
                        <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">{holiday.name}</Badge>
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
                    {days.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center min-w-28 py-1">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="text-xs text-slate-500">{format(day, "EEE", { locale: nl })}</div>
                          <div className="text-xs font-medium text-slate-700">{format(day, "d MMM", { locale: nl })}</div>
                        </div>
                      </TableHead>
                    ))}
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