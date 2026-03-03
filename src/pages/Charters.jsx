import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, Users, Calendar, MapPin, Plus, Building2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, getWeek, getYear, eachDayOfInterval, addWeeks, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CharterCompanyCard from "../components/charters/CharterCompanyCard";
import CharterCompanyDialog from "../components/charters/CharterCompanyDialog";

export default function Charters() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const queryClient = useQueryClient();

  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(currentDate);
  const periodStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const periodEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const cOpts = { staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false };

  const { data: charterCompanies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['charterCompanies'],
    queryFn: () => base44.entities.CharterCompany.list(),
    ...cOpts,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['charterEmployees'],
    queryFn: () => base44.entities.Employee.filter({ department: "Charters", status: "Actief" }),
    ...cOpts,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployeesCharters'],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }),
    ...cOpts,
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['charterSchedules', weekNumber, year],
    queryFn: () => base44.entities.Schedule.filter({ week_number: weekNumber, year }),
    ...cOpts,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['charterVehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    ...cOpts,
  });

  const startStr = format(periodStart, 'yyyy-MM-dd');
  const endStr = format(periodEnd, 'yyyy-MM-dd');
  const { data: trips = [] } = useQuery({
    queryKey: ['charterTrips', startStr, endStr],
    queryFn: () => base44.entities.Trip.filter({ date: { $gte: startStr, $lte: endStr } }, '-date'),
    ...cOpts,
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.CharterCompany.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charterCompanies'] });
      setShowCompanyDialog(false);
      setEditingCompany(null);
      toast.success("Charterbedrijf aangemaakt");
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CharterCompany.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charterCompanies'] });
      setShowCompanyDialog(false);
      setEditingCompany(null);
      toast.success("Charterbedrijf bijgewerkt");
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => base44.entities.CharterCompany.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charterCompanies'] });
      toast.success("Charterbedrijf verwijderd");
    }
  });

  const assignEmployeeMutation = useMutation({
    mutationFn: ({ empId, companyId }) => base44.entities.Employee.update(empId, { charter_company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charterEmployees'] });
      queryClient.invalidateQueries({ queryKey: ['allEmployeesCharters'] });
      setAssignEmployeeId("");
      setAssignCompanyId("");
      toast.success("Chauffeur gekoppeld aan bedrijf");
    }
  });

  const handleSaveCompany = (formData) => {
    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id, data: formData });
    } else {
      createCompanyMutation.mutate(formData);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setShowCompanyDialog(true);
  };

  const handleDeleteCompany = (company) => {
    if (confirm(`Weet je zeker dat je "${company.company_name}" wilt verwijderen?`)) {
      deleteCompanyMutation.mutate(company.id);
    }
  };

  // Get employees scheduled for Charters department
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

  const isLoading = loadingEmployees || loadingSchedules || loadingCompanies;

  const charterTrips = trips.filter(t => {
    return charterScheduledEmployees.find(e => e.id === t.employee_id);
  });

  const unassignedEmployees = employees.filter(e => !e.charter_company_id);
  const activeCompanies = charterCompanies.filter(c => c.status === "Actief");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Charters</h1>
          <p className="text-slate-500 mt-1">Overzicht charterbedrijven, chauffeurs en planning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setEditingCompany(null); setShowCompanyDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuw bedrijf
          </Button>
          <Button variant="outline" asChild>
            <Link to={createPageUrl("Planning") + "?department=Charters"}>
              <Calendar className="w-4 h-4 mr-2" />
              Naar Planning
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bedrijven">
        <TabsList>
          <TabsTrigger value="bedrijven">
            <Building2 className="w-4 h-4 mr-2" />
            Charterbedrijven
          </TabsTrigger>
          <TabsTrigger value="planning">
            <Calendar className="w-4 h-4 mr-2" />
            Weekplanning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bedrijven" className="space-y-6 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Charterbedrijven</p>
                    <p className="text-2xl font-bold text-slate-900">{activeCompanies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Charter chauffeurs</p>
                    <p className="text-2xl font-bold text-slate-900">{employees.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Niet gekoppeld</p>
                    <p className="text-2xl font-bold text-slate-900">{unassignedEmployees.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assign employee to company */}
          {unassignedEmployees.length > 0 && activeCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chauffeur koppelen aan bedrijf</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-48">
                    <label className="text-sm text-slate-600 mb-1 block">Chauffeur</label>
                    <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                      <SelectTrigger><SelectValue placeholder="Selecteer chauffeur" /></SelectTrigger>
                      <SelectContent>
                        {unassignedEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="text-sm text-slate-600 mb-1 block">Charterbedrijf</label>
                    <Select value={assignCompanyId} onValueChange={setAssignCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Selecteer bedrijf" /></SelectTrigger>
                      <SelectContent>
                        {activeCompanies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => assignEmployeeMutation.mutate({ empId: assignEmployeeId, companyId: assignCompanyId })}
                    disabled={!assignEmployeeId || !assignCompanyId}
                  >
                    Koppelen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company cards */}
          {loadingCompanies ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : charterCompanies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">Nog geen charterbedrijven aangemaakt</p>
                <Button className="mt-4" onClick={() => { setEditingCompany(null); setShowCompanyDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Eerste bedrijf toevoegen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {charterCompanies.map(company => (
                <CharterCompanyCard
                  key={company.id}
                  company={company}
                  employees={employees}
                  onEdit={handleEditCompany}
                  onDelete={handleDeleteCompany}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="planning" className="space-y-6 mt-4">
          {/* Week navigation */}
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Chauffeurs deze week</p>
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
          </div>

          {/* Week planning table */}
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
                        <th className="text-left p-3 font-medium text-slate-700">Bedrijf</th>
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
                        const company = charterCompanies.find(c => c.id === emp.charter_company_id);
                        return (
                          <tr key={emp.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</div>
                              <div className="text-xs text-slate-500">{emp.department}</div>
                            </td>
                            <td className="p-3">
                              {company ? (
                                <Badge variant="outline" className="text-xs">{company.company_name}</Badge>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            {days.map((day, idx) => {
                              const dayKey = getDayKey(idx);
                              const plannedDept = schedule?.[`${dayKey}_planned_department`] || '';
                              const shiftValue = schedule?.[dayKey] || '-';
                              const isCharter = plannedDept === 'Charters' || (emp.department === 'Charters' && !plannedDept);
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
        </TabsContent>
      </Tabs>

      <CharterCompanyDialog
        open={showCompanyDialog}
        onOpenChange={setShowCompanyDialog}
        company={editingCompany}
        onSave={handleSaveCompany}
      />
    </div>
  );
}