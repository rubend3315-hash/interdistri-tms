import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Copy } from "lucide-react";
import { shiftTypes } from "./ShiftLegend";

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
  onCopyDay
}) {
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
                    <div className="flex items-center gap-1">
                      <div className="text-xs text-slate-500">{format(day, "EEE", { locale: nl })}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => onCopyDay?.(day)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
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
                  const currentValue = schedule?.[dayKey] || "";
                  const holiday = isHoliday(day);
                  const config = currentValue ? getShiftConfig(currentValue) : null;
                  const cellColor = colorMode === "employee" && config ? employeeColor : (config?.color || "");

                  return (
                    <TableCell
                      key={day.toISOString()}
                      className={`text-center p-1 ${holiday ? 'bg-purple-50' : ''}`}
                    >
                      <Select
                        value={currentValue || "none"}
                        onValueChange={(v) => onShiftChange(employee.id, dayIndex, v === "none" ? "" : v)}
                      >
                        <SelectTrigger className={`w-full h-12 border-dashed ${cellColor}`}>
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
  );
}