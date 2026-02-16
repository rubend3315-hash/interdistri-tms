import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, MapPin } from "lucide-react";

export default function RouteHistorie({ employees = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  const { data: allSchedules = [], isLoading } = useQuery({
    queryKey: ['allSchedulesForHistory'],
    queryFn: () => base44.entities.Schedule.list('-created_date', 500)
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routesHistory'],
    queryFn: () => base44.entities.Route.list()
  });

  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['tiModelRoutesHistory'],
    queryFn: () => base44.entities.TIModelRoute.list()
  });

  const allRoutes = useMemo(() => [...routes, ...tiModelRoutes], [routes, tiModelRoutes]);

  const routeHistory = useMemo(() => {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const history = {};

    allSchedules.forEach(schedule => {
      const empId = schedule.employee_id;
      if (!history[empId]) history[empId] = {};

      dayKeys.forEach(day => {
        const routeId = schedule[`${day}_route_id`];
        if (!routeId) return;

        if (!history[empId][routeId]) {
          history[empId][routeId] = { count: 0, weeks: new Set() };
        }
        history[empId][routeId].count += 1;
        history[empId][routeId].weeks.add(`${schedule.year}-W${schedule.week_number}`);
      });
    });

    return history;
  }, [allSchedules]);

  const employeeRouteData = useMemo(() => {
    return employees
      .filter(e => e.status === 'Actief')
      .filter(e => filterDepartment === 'all' || e.department === filterDepartment)
      .filter(e => {
        if (!searchTerm) return true;
        const name = `${e.first_name} ${e.last_name}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase());
      })
      .map(emp => {
        const empRoutes = routeHistory[emp.id] || {};
        const routeEntries = Object.entries(empRoutes)
          .map(([routeId, data]) => {
            const route = allRoutes.find(r => r.id === routeId);
            return {
              routeId,
              routeCode: route?.route_code || '?',
              routeName: route?.route_name || 'Onbekend',
              count: data.count,
              uniqueWeeks: data.weeks.size
            };
          })
          .sort((a, b) => b.count - a.count);

        return { employee: emp, routes: routeEntries, totalAssignments: routeEntries.reduce((s, r) => s + r.count, 0) };
      })
      .filter(d => d.routes.length > 0)
      .sort((a, b) => b.totalAssignments - a.totalAssignments);
  }, [employees, routeHistory, allRoutes, filterDepartment, searchTerm]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Zoek chauffeur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afdelingen</SelectItem>
            <SelectItem value="Transport">Transport</SelectItem>
            <SelectItem value="PakketDistributie">PakketDistributie</SelectItem>
            <SelectItem value="Charters">Charters</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employeeRouteData.length}</p>
              <p className="text-xs text-slate-500">Chauffeurs met routes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(employeeRouteData.flatMap(d => d.routes.map(r => r.routeId))).size}
              </p>
              <p className="text-xs text-slate-500">Unieke routes toegewezen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {employeeRouteData.reduce((s, d) => s + d.totalAssignments, 0)}
              </p>
              <p className="text-xs text-slate-500">Totaal toewijzingen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {employeeRouteData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            Geen routehistorie gevonden.
          </CardContent>
        </Card>
      ) : (
        employeeRouteData.map(({ employee, routes: empRoutes, totalAssignments }) => (
          <Card key={employee.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {employee.first_name} {employee.prefix ? `${employee.prefix} ` : ''}{employee.last_name}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">{employee.department} · {totalAssignments} toewijzingen</p>
                </div>
                <Badge variant="outline">{empRoutes.length} routes</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Route</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="text-center">Keer ingepland</TableHead>
                    <TableHead className="text-center">Unieke weken</TableHead>
                    <TableHead className="text-right">Frequentie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empRoutes.map((route, idx) => {
                    const pct = Math.round((route.count / totalAssignments) * 100);
                    return (
                      <TableRow key={route.routeId}>
                        <TableCell className="font-medium">{route.routeCode}</TableCell>
                        <TableCell className="text-slate-600">{route.routeName}</TableCell>
                        <TableCell className="text-center">{route.count}x</TableCell>
                        <TableCell className="text-center">{route.uniqueWeeks}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}