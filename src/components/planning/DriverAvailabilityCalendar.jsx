import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, eachDayOfInterval, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, getYear, isWeekend } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Briefcase, Palmtree, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusConfig = {
  weekrooster: { label: "Weekrooster", color: "bg-green-100 text-green-800 border-green-300", icon: Briefcase, dotColor: "bg-green-500" },
  verlof: { label: "Verlof", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Palmtree, dotColor: "bg-amber-500" },
  ziek: { label: "Ziek", color: "bg-red-100 text-red-800 border-red-300", icon: Thermometer, dotColor: "bg-red-500" },
};

export default function DriverAvailabilityCalendar({ employees }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [editingCell, setEditingCell] = useState(null);
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(currentDate);

  const dateFrom = format(weekStart, "yyyy-MM-dd");
  const dateTo = format(weekEnd, "yyyy-MM-dd");

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['driverAvailability', dateFrom, dateTo],
    queryFn: async () => {
      const all = await base44.entities.DriverAvailability.list();
      return all.filter(a => a.date >= dateFrom && a.date <= dateTo);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DriverAvailability.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverAvailability'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DriverAvailability.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverAvailability'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverAvailability.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driverAvailability'] }),
  });

  const activeDrivers = useMemo(() => {
    return employees
      .filter(e => e.status === "Actief" && e.is_chauffeur !== false)
      .filter(e => filterDepartment === "all" || e.department === filterDepartment)
      .sort((a, b) => `${a.last_name}`.localeCompare(`${b.last_name}`));
  }, [employees, filterDepartment]);

  const getAvailability = (employeeId, dateStr) => {
    return availabilities.find(a => a.employee_id === employeeId && a.date === dateStr);
  };

  const handleCellClick = (employeeId, dateStr) => {
    setEditingCell({ employeeId, date: dateStr });
  };

  const handleStatusChange = async (employeeId, dateStr, newStatus) => {
    const existing = getAvailability(employeeId, dateStr);
    if (existing) {
      if (newStatus === "__delete__") {
        deleteMutation.mutate(existing.id);
        toast.success("Beschikbaarheid verwijderd");
      } else {
        updateMutation.mutate({ id: existing.id, data: { status: newStatus } });
        toast.success("Beschikbaarheid bijgewerkt");
      }
    } else if (newStatus !== "__delete__") {
      createMutation.mutate({ employee_id: employeeId, date: dateStr, status: newStatus });
      toast.success("Beschikbaarheid ingesteld");
    }
    setEditingCell(null);
  };

  const departments = [...new Set(employees.filter(e => e.status === "Actief").map(e => e.department).filter(Boolean))];

  // Summary counts per day
  const daySummary = useMemo(() => {
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayAvails = availabilities.filter(a => a.date === dateStr);
      return {
        date: dateStr,
        weekrooster: dayAvails.filter(a => a.status === "weekrooster").length,
        verlof: dayAvails.filter(a => a.status === "verlof").length,
        ziek: dayAvails.filter(a => a.status === "ziek").length,
      };
    });
  }, [days, availabilities]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Chauffeur Beschikbaarheid</CardTitle>
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
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                Week {weekNumber} — {year}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-3 mt-2">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <Badge key={key} variant="outline" className={cn("gap-1", cfg.color)}>
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-3 font-medium text-slate-600 min-w-[180px] sticky left-0 bg-slate-50 z-10">Chauffeur</th>
                {days.map((day, i) => (
                  <th key={i} className={cn("p-2 text-center min-w-[100px] font-medium", isWeekend(day) && "bg-slate-100")}>
                    <div className="text-slate-600">{format(day, "EEE", { locale: nl })}</div>
                    <div className="text-xs text-slate-400">{format(day, "d MMM", { locale: nl })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Summary row */}
              <tr className="border-b bg-blue-50/50">
                <td className="p-3 font-medium text-slate-500 sticky left-0 bg-blue-50/50 z-10">Samenvatting</td>
                {daySummary.map((summary, i) => (
                  <td key={i} className="p-2 text-center">
                    <div className="flex flex-col items-center gap-0.5 text-xs">
                      {summary.weekrooster > 0 && (
                        <span className="flex items-center gap-1 text-green-700">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {summary.weekrooster}
                        </span>
                      )}
                      {summary.verlof > 0 && (
                        <span className="flex items-center gap-1 text-amber-700">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {summary.verlof}
                        </span>
                      )}
                      {summary.ziek > 0 && (
                        <span className="flex items-center gap-1 text-red-700">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {summary.ziek}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Laden...</td></tr>
              ) : activeDrivers.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Geen chauffeurs gevonden</td></tr>
              ) : (
                activeDrivers.map(driver => {
                  const prefix = driver.prefix ? `${driver.prefix} ` : '';
                  const name = `${driver.first_name} ${prefix}${driver.last_name}`;
                  return (
                    <tr key={driver.id} className="border-b hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-700 sticky left-0 bg-white z-10">
                        <div>{name}</div>
                        <div className="text-xs text-slate-400">{driver.department}</div>
                      </td>
                      {days.map((day, dayIndex) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const avail = getAvailability(driver.id, dateStr);
                        const isEditing = editingCell?.employeeId === driver.id && editingCell?.date === dateStr;
                        const cfg = avail ? statusConfig[avail.status] : null;

                        return (
                          <td
                            key={dayIndex}
                            className={cn(
                              "p-1 text-center cursor-pointer transition-colors",
                              isWeekend(day) && "bg-slate-50",
                              !isEditing && "hover:bg-blue-50"
                            )}
                            onClick={() => !isEditing && handleCellClick(driver.id, dateStr)}
                          >
                            {isEditing ? (
                              <div className="flex flex-col gap-1 p-1">
                                {Object.entries(statusConfig).map(([key, sc]) => (
                                  <button
                                    key={key}
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(driver.id, dateStr, key); }}
                                    className={cn("text-xs px-2 py-1 rounded border transition-colors", sc.color, avail?.status === key && "ring-2 ring-offset-1 ring-blue-400")}
                                  >
                                    {sc.label}
                                  </button>
                                ))}
                                {avail && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(driver.id, dateStr, "__delete__"); }}
                                    className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                                  >
                                    Wissen
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingCell(null); }}
                                  className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                  Annuleren
                                </button>
                              </div>
                            ) : cfg ? (
                              <Badge variant="outline" className={cn("text-xs gap-1", cfg.color)}>
                                <cfg.icon className="w-3 h-3" />
                                {cfg.label}
                              </Badge>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}