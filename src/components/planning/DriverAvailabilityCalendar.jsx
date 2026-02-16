import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, eachDayOfInterval, startOfWeek, addWeeks, subWeeks, getWeek, getYear, isWeekend } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDay } from "date-fns";
import { ChevronLeft, ChevronRight, Briefcase, Palmtree, Thermometer, CalendarPlus, Loader2 } from "lucide-react";
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
  const [numWeeks, setNumWeeks] = useState(6);
  const [editingCell, setEditingCell] = useState(null);
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const periodEnd = addWeeks(weekStart, numWeeks);
  const days = eachDayOfInterval({ start: weekStart, end: new Date(periodEnd.getTime() - 86400000) }); // 6 weeks = 42 days
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(currentDate);

  const dateFrom = format(weekStart, "yyyy-MM-dd");
  const dateTo = format(days[days.length - 1], "yyyy-MM-dd");

  // Group days by week for header rendering
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < numWeeks; i++) {
      const wStart = addWeeks(weekStart, i);
      const wDays = days.filter(d => {
        const dWeek = getWeek(d, { weekStartsOn: 1 });
        const dYear = getYear(d);
        const wWeek = getWeek(wStart, { weekStartsOn: 1 });
        const wYear = getYear(wStart);
        return dWeek === wWeek && dYear === wYear;
      });
      w.push({ weekNum: getWeek(wStart, { weekStartsOn: 1 }), year: getYear(wStart), days: wDays });
    }
    return w;
  }, [weekStart, days, numWeeks]);

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
      .filter(e => {
        // Must have at least one active contractregel that overlaps with the visible period
        if (!e.contractregels?.length) return false;
        return e.contractregels.some(cr => {
          if (cr.status !== 'Actief') return false;
          if (cr.einddatum && cr.einddatum < dateFrom) return false;
          if (cr.startdatum && cr.startdatum > dateTo) return false;
          return true;
        });
      })
      .sort((a, b) => `${a.last_name}`.localeCompare(`${b.last_name}`));
  }, [employees, filterDepartment, dateFrom, dateTo]);

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

  const [fillingSchedule, setFillingSchedule] = useState(false);

  // Map JS day (0=Sun) to contractregel day key
  const dayKeyMap = { 1: 'maandag', 2: 'dinsdag', 3: 'woensdag', 4: 'donderdag', 5: 'vrijdag', 6: 'zaterdag', 0: 'zondag' };

  const getActiveContractregel = (driver, dateStr) => {
    if (!driver.contractregels?.length) return null;
    return driver.contractregels.find(cr => {
      if (cr.status !== 'Actief') return false;
      if (cr.startdatum && dateStr < cr.startdatum) return false;
      if (cr.einddatum && dateStr > cr.einddatum) return false;
      return true;
    });
  };

  const isScheduledDay = (driver, day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const cr = getActiveContractregel(driver, dateStr);
    if (!cr) return false;
    const jsDay = getDay(day);
    const dayName = dayKeyMap[jsDay];
    const wk = getWeek(day, { weekStartsOn: 1 });
    const schedule = wk % 2 === 1 ? cr.week1 : cr.week2;
    return schedule?.[dayName] === true;
  };

  // Calculate scheduled hours per day for a driver
  const getScheduledHours = (driver, day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const cr = getActiveContractregel(driver, dateStr);
    if (!cr) return 0;
    const jsDay = getDay(day);
    const dayName = dayKeyMap[jsDay];
    const wk = getWeek(day, { weekStartsOn: 1 });
    const schedule = wk % 2 === 1 ? cr.week1 : cr.week2;
    if (!schedule?.[dayName]) return 0;
    // Count scheduled days in the two-week cycle to calculate hours per day
    const scheduledDaysCount = [cr.week1, cr.week2].reduce((total, wSched) => {
      if (!wSched) return total;
      return total + Object.values(wSched).filter(v => v === true).length;
    }, 0);
    if (scheduledDaysCount === 0) return 0;
    // uren_per_week is for 1 week, so total for 2 weeks = uren_per_week * 2
    const totalHours2Weeks = (cr.uren_per_week || 0) * 2;
    return Math.round((totalHours2Weeks / scheduledDaysCount) * 10) / 10;
  };

  const handleFillSchedule = async () => {
    setFillingSchedule(true);
    const toCreate = [];
    for (const driver of activeDrivers) {
      for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd");
        const existing = getAvailability(driver.id, dateStr);
        if (existing) continue; // don't overwrite existing entries
        if (isScheduledDay(driver, day)) {
          toCreate.push({ employee_id: driver.id, date: dateStr, status: "weekrooster" });
        }
      }
    }
    if (toCreate.length === 0) {
      toast.info("Geen nieuwe weekrooster-dagen gevonden om in te vullen");
      setFillingSchedule(false);
      return;
    }
    // Bulk create in one call
    await base44.entities.DriverAvailability.bulkCreate(toCreate);
    queryClient.invalidateQueries({ queryKey: ['driverAvailability'] });
    toast.success(`${toCreate.length} weekrooster-dagen ingevuld`);
    setFillingSchedule(false);
  };

  // Summary counts per day - filtered by active drivers (respects department filter)
  const daySummary = useMemo(() => {
    const driverIds = new Set(activeDrivers.map(d => d.id));
    const driverMap = Object.fromEntries(activeDrivers.map(d => [d.id, d]));
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayAvails = availabilities.filter(a => a.date === dateStr && driverIds.has(a.employee_id));
      const weekroosterAvails = dayAvails.filter(a => a.status === "weekrooster");
      const totalHours = weekroosterAvails.reduce((sum, a) => {
        const driver = driverMap[a.employee_id];
        return sum + (driver ? getScheduledHours(driver, day) : 0);
      }, 0);
      return {
        date: dateStr,
        weekrooster: weekroosterAvails.length,
        verlof: dayAvails.filter(a => a.status === "verlof").length,
        ziek: dayAvails.filter(a => a.status === "ziek").length,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    });
  }, [days, availabilities, activeDrivers]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Chauffeur Beschikbaarheid</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
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
            <div className="flex items-center border rounded-md overflow-hidden">
              <button onClick={() => setNumWeeks(1)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", numWeeks === 1 ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>1 week</button>
              <button onClick={() => setNumWeeks(6)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors border-l", numWeeks === 6 ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>6 weken</button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {numWeeks === 1 ? `Week ${weekNumber} — ${year}` : `Week ${weekNumber} t/m ${getWeek(addWeeks(weekStart, numWeeks - 1), { weekStartsOn: 1 })} — ${year}`}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Actions + Legend */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFillSchedule}
            disabled={fillingSchedule}
            className="gap-1"
          >
            {fillingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            Vul weekrooster in
          </Button>
        </div>
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
              {/* Week number header row */}
              <tr className="border-b bg-slate-100">
                <th rowSpan={2} className="text-left p-3 font-medium text-slate-600 min-w-[180px] sticky left-0 bg-slate-100 z-10">Chauffeur</th>
                {weeks.map((w) => (
                  <th key={`wk-${w.weekNum}-${w.year}`} colSpan={w.days.length} className="p-1 text-center font-semibold text-xs text-blue-700 border-l border-slate-200">
                    Wk {w.weekNum}
                  </th>
                ))}
              </tr>
              {/* Day headers */}
              <tr className="border-b bg-slate-50">
                {days.map((day, i) => (
                  <th key={i} className={cn("p-1 text-center min-w-[56px] font-medium", isWeekend(day) && "bg-slate-100")}>
                    <div className="text-slate-600 text-xs">{format(day, "EEE", { locale: nl })}</div>
                    <div className="text-[10px] text-slate-400">{format(day, "d/M")}</div>
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
                          {summary.weekrooster} ({summary.totalHours}u)
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
                <tr><td colSpan={days.length + 1} className="p-8 text-center text-slate-400">Laden...</td></tr>
              ) : activeDrivers.length === 0 ? (
                <tr><td colSpan={days.length + 1} className="p-8 text-center text-slate-400">Geen chauffeurs gevonden</td></tr>
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
                              <div className={cn("inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold", cfg.color)} title={cfg.label}>
                                {avail.status === "weekrooster" ? (getScheduledHours(driver, day) || "✓") : cfg.label.charAt(0)}
                              </div>
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