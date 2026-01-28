import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, getWeek, getYear } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar,
  Save,
  User
} from "lucide-react";

const shiftTypes = ["Dag", "Avond", "Nacht", "Vrij", "Verlof", "Ziek"];
const departments = ["Management", "Transport", "PakketDistributie", "Charters"];

export default function TimeTracking() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const { data: timeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['timeEntries', weekNumber, year],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: weekNumber, year })
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setIsDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setIsDialogOpen(false);
    }
  });

  const [formData, setFormData] = useState({
    employee_id: "",
    date: "",
    start_time: "",
    end_time: "",
    break_minutes: 30,
    shift_type: "Dag",
    vehicle_id: "",
    customer_id: "",
    travel_allowance_multiplier: 0,
    notes: ""
  });

  const activeEmployees = employees.filter(e => 
    e.status === 'Actief' && 
    (filterDepartment === 'all' || e.department === filterDepartment)
  );

  const getEntryForEmployeeDay = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries.find(e => e.employee_id === employeeId && e.date === dateStr);
  };

  const calculateHours = (start, end, breakMinutes) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // overnight
    totalMinutes -= breakMinutes || 0;
    return Math.round(totalMinutes / 60 * 100) / 100;
  };

  const openEntryDialog = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = getEntryForEmployeeDay(employeeId, date);
    
    if (existing) {
      setSelectedEntry(existing);
      setFormData({
        employee_id: existing.employee_id,
        date: existing.date,
        start_time: existing.start_time || "",
        end_time: existing.end_time || "",
        break_minutes: existing.break_minutes || 30,
        shift_type: existing.shift_type || "Dag",
        vehicle_id: existing.vehicle_id || "",
        customer_id: existing.customer_id || "",
        travel_allowance_multiplier: existing.travel_allowance_multiplier || 0,
        notes: existing.notes || ""
      });
    } else {
      setSelectedEntry(null);
      setFormData({
        employee_id: employeeId,
        date: dateStr,
        start_time: "",
        end_time: "",
        break_minutes: 30,
        shift_type: "Dag",
        vehicle_id: "",
        customer_id: "",
        travel_allowance_multiplier: 0,
        notes: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);
    
    const submitData = {
      ...formData,
      week_number: weekNumber,
      year,
      total_hours: hours,
      break_minutes: Number(formData.break_minutes) || 0,
      status: 'Concept'
    };

    if (selectedEntry) {
      updateMutation.mutate({ id: selectedEntry.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getEmployeeWeekTotal = (employeeId) => {
    return timeEntries
      .filter(e => e.employee_id === employeeId)
      .reduce((sum, e) => sum + (e.total_hours || 0), 0);
  };

  const getShiftColor = (type) => {
    switch (type) {
      case "Dag": return "bg-emerald-100 text-emerald-700";
      case "Avond": return "bg-blue-100 text-blue-700";
      case "Nacht": return "bg-purple-100 text-purple-700";
      case "Vrij": return "bg-slate-100 text-slate-700";
      case "Verlof": return "bg-amber-100 text-amber-700";
      case "Ziek": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const isLoading = loadingEmployees || loadingEntries;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tijdregistratie</h1>
          <p className="text-slate-500 mt-1">Week {weekNumber} - {year}</p>
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

      {/* Time Entry Table */}
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
                    {weekDays.map(day => (
                      <TableHead key={day.toISOString()} className="text-center min-w-24">
                        <div className="text-xs text-slate-500">{format(day, "EEE", { locale: nl })}</div>
                        <div className="font-semibold">{format(day, "d")}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-20">Totaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmployees.map(employee => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10">
                        <div>
                          <p className="text-slate-900">{employee.first_name} {employee.last_name}</p>
                          <p className="text-xs text-slate-500">{employee.department}</p>
                        </div>
                      </TableCell>
                      {weekDays.map(day => {
                        const entry = getEntryForEmployeeDay(employee.id, day);
                        return (
                          <TableCell 
                            key={day.toISOString()} 
                            className="text-center p-1"
                          >
                            <button
                              onClick={() => openEntryDialog(employee.id, day)}
                              className="w-full min-h-16 p-2 rounded-lg border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                              {entry ? (
                                <div className="space-y-1">
                                  <Badge className={`text-xs ${getShiftColor(entry.shift_type)}`}>
                                    {entry.shift_type}
                                  </Badge>
                                  {entry.total_hours > 0 && (
                                    <p className="text-sm font-semibold text-slate-900">
                                      {entry.total_hours}u
                                    </p>
                                  )}
                                  {entry.start_time && entry.end_time && (
                                    <p className="text-xs text-slate-500">
                                      {entry.start_time}-{entry.end_time}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Plus className="w-4 h-4 text-slate-400 mx-auto" />
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <div className="font-bold text-slate-900">
                          {getEmployeeWeekTotal(employee.id).toFixed(1)}u
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? 'Uren Bewerken' : 'Uren Invoeren'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-900">
                {employees.find(e => e.id === formData.employee_id)?.first_name}{' '}
                {employees.find(e => e.id === formData.employee_id)?.last_name}
              </p>
              <p className="text-sm text-slate-500">
                {formData.date && format(new Date(formData.date), "EEEE d MMMM yyyy", { locale: nl })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Diensttype</Label>
              <Select 
                value={formData.shift_type} 
                onValueChange={(v) => setFormData({ ...formData, shift_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shiftTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!["Vrij", "Verlof", "Ziek"].includes(formData.shift_type) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Starttijd</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Eindtijd</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pauze (minuten)</Label>
                  <Input
                    type="number"
                    value={formData.break_minutes}
                    onChange={(e) => setFormData({ ...formData, break_minutes: e.target.value })}
                  />
                </div>

                {formData.start_time && formData.end_time && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Berekende uren:</strong>{' '}
                      {calculateHours(formData.start_time, formData.end_time, formData.break_minutes)} uur
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Voertuig</Label>
                    <Select 
                      value={formData.vehicle_id || "none"} 
                      onValueChange={(v) => setFormData({ ...formData, vehicle_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen</SelectItem>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Klant</Label>
                    <Select 
                      value={formData.customer_id || "none"} 
                      onValueChange={(v) => setFormData({ ...formData, customer_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen</SelectItem>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}