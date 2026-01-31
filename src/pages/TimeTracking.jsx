import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBreakMinutesForHours } from "../components/utils/breakScheduleUtils";
import { calculateAllHours, validateHourCalculations } from "../components/utils/hourCalculationUtils";
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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
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
    project_id: "",
    customer_id: "",
    travel_allowance_multiplier: 0,
    advanced_costs: 0,
    meals: 0,
    wkr: 0,
    notes: ""
  });

  const [autoBreak, setAutoBreak] = useState(null);
  const [manualBreak, setManualBreak] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState(null);
  const [showHourDetails, setShowHourDetails] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Auto-calculate break and hours whenever times or shift type change
  useEffect(() => {
    const calculateAutoBreak = async () => {
      if (!["Vrij", "Verlof", "Ziek"].includes(formData.shift_type) && formData.start_time && formData.end_time) {
        const hours = calculateHours(formData.start_time, formData.end_time, 0);
        const auto = await getBreakMinutesForHours(hours);
        setAutoBreak(auto || 30);
        if (!manualBreak) {
          setFormData(prev => ({ ...prev, break_minutes: auto || 30 }));
        }
      } else {
        setAutoBreak(null);
      }
    };
    calculateAutoBreak();
  }, [formData.start_time, formData.end_time, formData.shift_type, manualBreak]);

  // Auto-calculate hour types
  useEffect(() => {
    const calculateHourTypes = async () => {
      if (formData.start_time && formData.end_time && formData.date) {
        const hours = await calculateAllHours(
          formData.start_time,
          formData.end_time,
          formData.break_minutes || 0,
          formData.date,
          formData.shift_type
        );
        setCalculatedHours(hours);
        
        const errors = validateHourCalculations(hours);
        setValidationErrors(errors);
      }
    };
    calculateHourTypes();
  }, [formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.shift_type]);

  const activeEmployees = employees.filter(e => 
    e.status === 'Actief' && 
    (filterDepartment === 'all' || e.department === filterDepartment)
  );

  const getEntriesForEmployeeDay = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeEntries.filter(e => e.employee_id === employeeId && e.date === dateStr);
  };

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

  const openEntryDialog = async (employeeId, date) => {
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
        project_id: existing.project_id || "",
        customer_id: existing.customer_id || "",
        travel_allowance_multiplier: existing.travel_allowance_multiplier || 0,
        advanced_costs: existing.advanced_costs || 0,
        meals: existing.meals || 0,
        wkr: existing.wkr || 0,
        notes: existing.notes || ""
      });
      setManualBreak(false);
      setAutoBreak(null);
    } else {
      setSelectedEntry(null);
      setFormData({
        employee_id: employeeId,
        date: dateStr,
        start_time: "",
        end_time: "",
        break_minutes: 30,
        shift_type: "Dag",
        project_id: "",
        customer_id: "",
        travel_allowance_multiplier: 0,
        advanced_costs: 0,
        meals: 0,
        wkr: 0,
        notes: ""
      });
      setManualBreak(false);
      setAutoBreak(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await base44.auth.me();
    const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);

    // Use manual break if checked, otherwise use auto-calculated
    let breakMinutes = Number(formData.break_minutes) || 0;
    if (!manualBreak && !["Vrij", "Verlof", "Ziek"].includes(formData.shift_type)) {
      const autoBreak = await getBreakMinutesForHours(hours);
      breakMinutes = autoBreak || breakMinutes;
    }

    const submitData = {
      ...formData,
      week_number: weekNumber,
      year,
      total_hours: calculatedHours?.total_hours || hours,
      overtime_hours: calculatedHours?.overtime_hours || 0,
      night_hours: calculatedHours?.night_hours || 0,
      weekend_hours: calculatedHours?.weekend_hours || 0,
      holiday_hours: calculatedHours?.holiday_hours || 0,
      break_minutes: breakMinutes,
      status: 'Goedgekeurd',
      approved_by: user?.email,
      approved_date: new Date().toISOString()
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
                        const entries = getEntriesForEmployeeDay(employee.id, day);
                        const dayTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                        return (
                          <TableCell 
                            key={day.toISOString()} 
                            className="text-center p-1"
                          >
                            <button
                              onClick={() => openEntryDialog(employee.id, day)}
                              className="w-full min-h-16 p-2 rounded-lg border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                              {entries.length > 0 ? (
                                <div className="space-y-1">
                                  {entries.map((entry, idx) => (
                                    <div key={idx}>
                                      <Badge className={`text-xs ${getShiftColor(entry.shift_type)}`}>
                                        {entry.shift_type}
                                      </Badge>
                                      {entry.total_hours > 0 && (
                                        <p className="text-sm font-semibold text-slate-900">
                                          {entry.total_hours}u {entry.status === 'Concept' && <span className="text-xs text-slate-500">({entry.status})</span>}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                  {dayTotal > 0 && entries.length > 1 && (
                                    <p className="text-xs font-semibold text-blue-600 border-t pt-1 mt-1">
                                      Totaal: {dayTotal}u
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
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
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
                value={formData.shift_type || "Dag"} 
                onValueChange={(v) => setFormData({ ...formData, shift_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer diensttype" />
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
                   <div className="flex items-center gap-2">
                     <Label>Pauze (minuten)</Label>
                     {autoBreak !== null && !manualBreak && (
                       <span className="text-xs text-slate-500">Auto: {autoBreak}</span>
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     <Input
                       type="number"
                       value={manualBreak ? formData.break_minutes : (autoBreak !== null ? autoBreak : '')}
                       onChange={(e) => {
                         if (manualBreak) {
                           setFormData({ ...formData, break_minutes: e.target.value || 0 });
                         }
                       }}
                       disabled={!manualBreak}
                       className="flex-1"
                     />
                     <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded border border-slate-200">
                       <input
                         type="checkbox"
                         id="manual-break"
                         checked={manualBreak}
                         onChange={(e) => {
                           setManualBreak(e.target.checked);
                           if (!e.target.checked && autoBreak !== null) {
                             setFormData(prev => ({ ...prev, break_minutes: autoBreak }));
                           }
                         }}
                         className="w-4 h-4 cursor-pointer"
                       />
                       <label htmlFor="manual-break" className="text-xs text-slate-600 cursor-pointer">
                         Handmatig
                       </label>
                     </div>
                   </div>
                 </div>

                {calculatedHours && (
                  <>
                    {validationErrors.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        {validationErrors.map((error, idx) => (
                          <p key={idx} className="text-sm text-red-700">⚠ {error}</p>
                        ))}
                      </div>
                    )}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setShowHourDetails(!showHourDetails)}
                        className="text-sm text-blue-700 font-medium hover:underline"
                      >
                        <strong>Berekende uren:</strong> {calculatedHours.total_hours} uur
                        {showHourDetails ? ' ▾' : ' ▸'}
                      </button>
                      {showHourDetails && (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Totaal werkuren:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={calculatedHours.total_hours}
                              onChange={(e) => setCalculatedHours({...calculatedHours, total_hours: Number(e.target.value)})}
                              className="w-20 px-2 py-1 border rounded text-right"
                            />
                          </div>
                          <div className="flex justify-between">
                            <span>Overuren:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={calculatedHours.overtime_hours}
                              onChange={(e) => setCalculatedHours({...calculatedHours, overtime_hours: Number(e.target.value)})}
                              className="w-20 px-2 py-1 border rounded text-right"
                            />
                          </div>
                          <div className="flex justify-between">
                            <span>Nachturen:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={calculatedHours.night_hours}
                              onChange={(e) => setCalculatedHours({...calculatedHours, night_hours: Number(e.target.value)})}
                              className="w-20 px-2 py-1 border rounded text-right"
                            />
                          </div>
                          <div className="flex justify-between">
                            <span>Weekenduren:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={calculatedHours.weekend_hours}
                              onChange={(e) => setCalculatedHours({...calculatedHours, weekend_hours: Number(e.target.value)})}
                              className="w-20 px-2 py-1 border rounded text-right"
                            />
                          </div>
                          <div className="flex justify-between">
                            <span>Feestdaguren:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={calculatedHours.holiday_hours}
                              onChange={(e) => setCalculatedHours({...calculatedHours, holiday_hours: Number(e.target.value)})}
                              className="w-20 px-2 py-1 border rounded text-right"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                        <Label>Project</Label>
                        <Select 
                          value={formData.project_id || "none"} 
                          onValueChange={(v) => setFormData({ ...formData, project_id: v === "none" ? "" : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Geen</SelectItem>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

                 <div className="space-y-2">
                   <Label>Reiskostenvergoeding (enkele reis)</Label>
                   <Select 
                     value={String(formData.travel_allowance_multiplier || 0)} 
                     onValueChange={(v) => setFormData({ ...formData, travel_allowance_multiplier: Number(v) })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecteer vergoeding" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="0">0x</SelectItem>
                       <SelectItem value="1">1x</SelectItem>
                       <SelectItem value="2">2x</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 </>
                 )}

                 <div className="border-t pt-4">
                   <h3 className="font-semibold text-slate-900 mb-4">Inhoudingen & kosten</h3>
                 <div className="space-y-3">
                 <div className="space-y-2">
                 <Label>Voorgeschoten kosten</Label>
                 <Input
                   type="number"
                   min="0"
                   step="0.01"
                   value={formData.advanced_costs || 0}
                   onChange={(e) => setFormData({ ...formData, advanced_costs: Number(e.target.value) })}
                   placeholder="0.00"
                 />
                 </div>
                 <div className="space-y-2">
                   <Label>Inhoudingen</Label>
                   <Input
                     type="number"
                     min="0"
                     step="0.01"
                     value={formData.meals || 0}
                     onChange={(e) => setFormData({ ...formData, meals: Number(e.target.value) })}
                     placeholder="0.00"
                   />
                 </div>
                 <div className="space-y-2">
                 <Label>WKR</Label>
                 <Input
                   type="number"
                   min="0"
                   step="0.01"
                   value={formData.wkr || 0}
                   onChange={(e) => setFormData({ ...formData, wkr: Number(e.target.value) })}
                   placeholder="0.00"
                 />
                 </div>
                 </div>
                 </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => {
                  if (selectedEntry && selectedEntry.status === 'Concept') {
                    if (confirm('Weet je zeker dat je deze concept entry wilt verwijderen?')) {
                      deleteMutation.mutate(selectedEntry.id);
                    }
                  }
                }}
                className={selectedEntry?.status === 'Concept' ? '' : 'hidden'}
                disabled={deleteMutation.isPending}
              >
                Verwijderen
              </Button>
              <div className="flex gap-3">
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
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}