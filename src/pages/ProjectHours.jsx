import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getISOWeek, getYear, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Users, Clock, FolderKanban, BarChart3 } from "lucide-react";
import ProjectHoursTable from "@/components/project-hours/ProjectHoursTable";
import ProjectHoursChart from "@/components/project-hours/ProjectHoursChart";

const getWeekRange = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd"), weekNr: getISOWeek(start), year: getYear(start), ref: start };
};

const currentWeek = getWeekRange(new Date());

export default function ProjectHours() {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek.ref);
  const weekInfo = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);
  const [filterProject, setFilterProject] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");

  const qOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

  const { data: employees = [] } = useQuery({
    queryKey: ["ph-employees"], queryFn: () => base44.entities.Employee.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["ph-projects"], queryFn: () => base44.entities.Project.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["ph-customers"], queryFn: () => base44.entities.Customer.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ["ph-timeEntries", weekInfo.from, weekInfo.to],
    queryFn: () => base44.entities.TimeEntry.filter({
      status: "Goedgekeurd",
      date: { $gte: weekInfo.from, $lte: weekInfo.to },
    }),
    ...qOpts,
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["ph-trips", weekInfo.from, weekInfo.to],
    queryFn: () => base44.entities.Trip.filter({
      date: { $gte: weekInfo.from, $lte: weekInfo.to },
    }),
    ...qOpts,
  });

  // Build lookup maps
  const empMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { m[e.id] = e; });
    return m;
  }, [employees]);

  const projMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  const custMap = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[c.id] = c; });
    return m;
  }, [customers]);

  // Aggregate: per employee per project → total hours
  const aggregated = useMemo(() => {
    // Map trips by time_entry_id to get project info
    const tripByTeId = {};
    trips.forEach(t => {
      if (t.time_entry_id && t.project_id) {
        tripByTeId[t.time_entry_id] = t.project_id;
      }
    });

    const rows = {}; // key: emp_proj
    timeEntries.forEach(te => {
      if (!te.employee_id) return;
      // Determine project: from TE itself, or from linked trip
      const projectId = te.project_id || tripByTeId[te.id] || "unknown";
      const key = `${te.employee_id}__${projectId}`;
      if (!rows[key]) {
        rows[key] = { employee_id: te.employee_id, project_id: projectId, hours: 0, entries: 0 };
      }
      rows[key].hours += te.total_hours || 0;
      rows[key].entries += 1;
    });

    let result = Object.values(rows).map(r => ({
      ...r,
      hours: Math.round(r.hours * 100) / 100,
      employee: empMap[r.employee_id],
      project: projMap[r.project_id],
    })).filter(r => r.employee);

    // Apply filters
    if (filterProject !== "all") {
      result = result.filter(r => r.project_id === filterProject);
    }
    if (filterDepartment !== "all") {
      result = result.filter(r => r.employee?.department === filterDepartment);
    }

    // Sort by employee name, then project name
    result.sort((a, b) => {
      const nameA = `${a.employee?.first_name || ""} ${a.employee?.last_name || ""}`;
      const nameB = `${b.employee?.first_name || ""} ${b.employee?.last_name || ""}`;
      const cmp = nameA.localeCompare(nameB);
      if (cmp !== 0) return cmp;
      return (a.project?.name || "Onbekend").localeCompare(b.project?.name || "Onbekend");
    });

    return result;
  }, [timeEntries, trips, empMap, projMap, filterProject, filterDepartment]);

  // Project-level totals for chart
  const projectTotals = useMemo(() => {
    const totals = {};
    aggregated.forEach(r => {
      const pid = r.project_id;
      if (!totals[pid]) {
        totals[pid] = {
          project_id: pid,
          name: r.project?.name || "Onbekend project",
          budget: r.project?.budget || 0,
          hours: 0,
          employeeCount: new Set(),
        };
      }
      totals[pid].hours += r.hours;
      totals[pid].employeeCount.add(r.employee_id);
    });
    return Object.values(totals).map(t => ({
      ...t,
      employeeCount: t.employeeCount.size,
    })).sort((a, b) => b.hours - a.hours);
  }, [aggregated]);

  const stats = useMemo(() => {
    const uniqueEmp = new Set(aggregated.map(r => r.employee_id));
    const uniqueProj = new Set(aggregated.map(r => r.project_id));
    const totalH = aggregated.reduce((s, r) => s + r.hours, 0);
    return { employees: uniqueEmp.size, projects: uniqueProj.size, hours: Math.round(totalH * 100) / 100 };
  }, [aggregated]);

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  const activeProjects = useMemo(() =>
    projects.filter(p => p.status === "Actief").sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  , [projects]);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Uren per Project</h1>
        <p className="text-sm text-slate-500">Overzicht van gewerkte uren per medewerker per project per week</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-[18px] h-[18px] text-blue-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.employees}</p><p className="text-xs text-slate-500">Medewerkers</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center"><Clock className="w-[18px] h-[18px] text-indigo-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.hours}u</p><p className="text-xs text-slate-500">Totaal uren</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center"><FolderKanban className="w-[18px] h-[18px] text-emerald-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.projects}</p><p className="text-xs text-slate-500">Projecten</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Week</Label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSelectedWeek(prev => subWeeks(prev, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="h-9 px-3 flex items-center border rounded-md bg-white text-sm font-medium text-slate-700 min-w-[120px] justify-center">
                  Wk {weekInfo.weekNr} · {weekInfo.year}
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSelectedWeek(prev => addWeeks(prev, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Afdeling</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle afdelingen</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Project</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle projecten</SelectItem>
                  {activeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-slate-400 pb-2">
              {weekInfo.from} t/m {weekInfo.to}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {!isLoading && projectTotals.length > 0 && (
        <ProjectHoursChart projectTotals={projectTotals} />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : aggregated.length === 0 ? (
        <Card className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen uren gevonden</h3>
          <p className="text-slate-500 mt-1">Er zijn geen goedgekeurde uren in deze week.</p>
        </Card>
      ) : (
        <ProjectHoursTable rows={aggregated} projMap={projMap} custMap={custMap} />
      )}
    </div>
  );
}