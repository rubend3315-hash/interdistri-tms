import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBreakMinutesForHours } from "../components/utils/breakScheduleUtils";
import { calculateAllHours, validateHourCalculations } from "../components/utils/hourCalculationUtils";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, getWeek, getYear } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

import EmployeeSidebar from "../components/timetracking/EmployeeSidebar";
import WeekCalendar from "../components/timetracking/WeekCalendar";
import WeekOverview from "../components/timetracking/WeekOverview";



export default function TimeTracking() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
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

  const { data: urensoorten = [] } = useQuery({
    queryKey: ['urensoorten'],
    queryFn: () => base44.entities.Urensoort.list()
  });

  // Verlofsoorten uit Urensoort (alles behalve ATV)
  const verlofSoorten = urensoorten
    .filter(u => u.status === 'Actief' && u.name !== 'ATV')
    .filter(u => ['VER', 'BFD', 'BVL', 'PVL', 'OSV70', 'OSV70B', 'PVLW', 'ZWV', 'ZVL'].includes(u.code) || 
                 u.name.toLowerCase().includes('verlof') || 
                 u.name.toLowerCase().includes('feestdag'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeEmployees = employees.filter(e => e.status === 'Actief');
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Auto-select first employee
  useEffect(() => {
    if (!selectedEmployeeId && activeEmployees.length > 0) {
      setSelectedEmployeeId(activeEmployees[0].id);
    }
  }, [activeEmployees, selectedEmployeeId]);

  // Navigate to previous/next employee
  const navigateEmployee = (direction) => {
    const sorted = [...activeEmployees].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
    const currentIdx = sorted.findIndex(e => e.id === selectedEmployeeId);
    if (currentIdx === -1) return;
    const newIdx = direction === 'prev'
      ? (currentIdx - 1 + sorted.length) % sorted.length
      : (currentIdx + 1) % sorted.length;
    setSelectedEmployeeId(sorted[newIdx].id);
  };

  // Mutations
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

  // Form state
  const [dialogCategory, setDialogCategory] = useState("gewerkt");
  const [formData, setFormData] = useState({
    employee_id: "", date: "", end_date: "", start_time: "", end_time: "",
    break_minutes: 30, shift_type: "Gewerkte dag", project_id: "", customer_id: "",
    travel_allowance_multiplier: 0, advanced_costs: 0, meals: 0, wkr: 0, notes: ""
  });
  const [autoBreak, setAutoBreak] = useState(null);
  const [manualBreak, setManualBreak] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState(null);
  const [showHourDetails, setShowHourDetails] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Auto-calculate break
  useEffect(() => {
    const calculateAutoBreak = async () => {
      if (dialogCategory === "gewerkt" && formData.start_time && formData.end_time) {
        const hours = calculateHours(formData.start_time, formData.end_time, 0, formData.date, formData.end_date);
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
          formData.start_time, formData.end_time,
          formData.break_minutes || 0, formData.date, formData.shift_type
        );
        setCalculatedHours(hours);
        setValidationErrors(validateHourCalculations(hours));
      }
    };
    calculateHourTypes();
  }, [formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.shift_type]);

  const calculateHours = (start, end, breakMinutes, startDate, endDate) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    // Als einddatum volgende dag is, of als eindtijd < starttijd
    if (endDate && startDate && endDate > startDate) {
      totalMinutes += 24 * 60;
    } else if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    totalMinutes -= breakMinutes || 0;
    return Math.round(totalMinutes / 60 * 100) / 100;
  };

  const categoryToShiftType = {
    gewerkt: "Gewerkte dag",
    opleiding: "Opleiding",
    atv: "ATV",
    ziek: "Ziek",
  };

  const openEntryDialog = (employeeId, date, categoryKey = "gewerkt") => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setDialogCategory(categoryKey);

    const fixedType = categoryToShiftType[categoryKey];
    const defaultShiftType = fixedType || "Verlof";

    const existing = timeEntries.find(e => e.employee_id === employeeId && e.date === dateStr);

    if (existing) {
      setSelectedEntry(existing);
      setFormData({
        employee_id: existing.employee_id, date: existing.date,
        end_date: existing.end_date || existing.date,
        start_time: existing.start_time || "", end_time: existing.end_time || "",
        break_minutes: existing.break_minutes || 30, shift_type: existing.shift_type || defaultShiftType,
        project_id: existing.project_id || "", customer_id: existing.customer_id || "",
        travel_allowance_multiplier: existing.travel_allowance_multiplier || 0,
        advanced_costs: existing.advanced_costs || 0, meals: existing.meals || 0,
        wkr: existing.wkr || 0, notes: existing.notes || ""
      });
    } else {
      setSelectedEntry(null);
      setFormData({
        employee_id: employeeId, date: dateStr, end_date: dateStr, start_time: "", end_time: "",
        break_minutes: 30, shift_type: defaultShiftType, project_id: "", customer_id: "",
        travel_allowance_multiplier: 0, advanced_costs: 0, meals: 0, wkr: 0, notes: ""
      });
    }
    setManualBreak(false);
    setAutoBreak(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await base44.auth.me();
    const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.end_date);
    let breakMinutes = Number(formData.break_minutes) || 0;
    if (!manualBreak && dialogCategory === "gewerkt") {
      const ab = await getBreakMinutesForHours(hours);
      breakMinutes = ab || breakMinutes;
    }
    const submitData = {
      ...formData, week_number: weekNumber, year,
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

  const isLoading = loadingEmployees || loadingEntries;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekoverzicht week {weekNumber.toString().padStart(2, '0')} - {year}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Vorige week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
            Volgende week <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="flex gap-4">
          {/* Left Sidebar: Calendar + Employee List */}
          <div className="w-64 flex-shrink-0 space-y-4">
            <WeekCalendar currentDate={currentDate} onDateChange={setCurrentDate} />
            <div className="h-[600px]">
              <EmployeeSidebar
                employees={activeEmployees}
                selectedEmployeeId={selectedEmployeeId}
                onSelectEmployee={setSelectedEmployeeId}
              />
            </div>
          </div>

          {/* Main Content: Week Overview */}
          <div className="flex-1 min-w-0">
            <WeekOverview
              employee={selectedEmployee}
              weekDays={weekDays}
              weekNumber={weekNumber}
              year={year}
              timeEntries={timeEntries}
              onOpenEntry={openEntryDialog}
              onPreviousWeek={() => setCurrentDate(subWeeks(currentDate, 1))}
              onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
              onPreviousEmployee={() => navigateEmployee('prev')}
              onNextEmployee={() => navigateEmployee('next')}
              contractregels={selectedEmployee?.contractregels}
            />
          </div>
        </div>
      )}

      {/* Entry Dialog - preserved from original */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEntry ? 'Uren Bewerken' : 'Uren Invoeren'}</DialogTitle>
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
              {dialogCategory === "verlof" ? (
                <Select value={formData.shift_type} onValueChange={(v) => setFormData({ ...formData, shift_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer verlofsoort" /></SelectTrigger>
                  <SelectContent>
                    {verlofSoorten.map(v => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-slate-50 text-sm text-slate-700 font-medium">
                  {categoryToShiftType[dialogCategory] || formData.shift_type}
                </div>
              )}
            </div>

            {dialogCategory === "gewerkt" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startdatum & tijd</Label>
                    <div className="flex gap-2">
                      <Input type="date" value={formData.date} className="flex-1" disabled />
                      <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Einddatum & tijd</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="date" 
                        value={formData.end_date || formData.date} 
                        min={formData.date}
                        max={formData.date ? format(new Date(new Date(formData.date).getTime() + 86400000), 'yyyy-MM-dd') : undefined}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                        className="flex-1" 
                      />
                      <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="flex-1" />
                    </div>
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
                      onChange={(e) => { if (manualBreak) setFormData({ ...formData, break_minutes: e.target.value || 0 }); }}
                      disabled={!manualBreak}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded border border-slate-200">
                      <input
                        type="checkbox" id="manual-break" checked={manualBreak}
                        onChange={(e) => {
                          setManualBreak(e.target.checked);
                          if (!e.target.checked && autoBreak !== null) setFormData(prev => ({ ...prev, break_minutes: autoBreak }));
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="manual-break" className="text-xs text-slate-600 cursor-pointer">Handmatig</label>
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
                      <button type="button" onClick={() => setShowHourDetails(!showHourDetails)} className="text-sm text-blue-700 font-medium hover:underline">
                        <strong>Berekende uren:</strong> {calculatedHours.total_hours} uur {showHourDetails ? ' ▾' : ' ▸'}
                      </button>
                      {showHourDetails && (
                        <div className="mt-3 space-y-2 text-sm">
                          {[
                            ['Totaal werkuren', 'total_hours'],
                            ['Overuren', 'overtime_hours'],
                            ['Nachturen', 'night_hours'],
                            ['Weekenduren', 'weekend_hours'],
                            ['Feestdaguren', 'holiday_hours'],
                          ].map(([label, key]) => (
                            <div key={key} className="flex justify-between">
                              <span>{label}:</span>
                              <input type="number" step="0.01" value={calculatedHours[key]}
                                onChange={(e) => setCalculatedHours({...calculatedHours, [key]: Number(e.target.value)})}
                                className="w-20 px-2 py-1 border rounded text-right" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={formData.project_id || "none"} onValueChange={(v) => setFormData({ ...formData, project_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen</SelectItem>
                        {projects.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Klant</Label>
                    <Select value={formData.customer_id || "none"} onValueChange={(v) => setFormData({ ...formData, customer_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen</SelectItem>
                        {customers.map(c => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reiskostenvergoeding (enkele reis)</Label>
                  <Select value={String(formData.travel_allowance_multiplier || 0)} onValueChange={(v) => setFormData({ ...formData, travel_allowance_multiplier: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="Selecteer vergoeding" /></SelectTrigger>
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
              <h3 className="font-semibold text-slate-900 mb-3">Inhoudingen & kosten</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Voorgeschoten kosten</Label>
                  <Input type="number" min="0" step="0.01" value={formData.advanced_costs || 0}
                    onChange={(e) => setFormData({ ...formData, advanced_costs: Number(e.target.value) })} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inhoudingen</Label>
                  <Input type="number" min="0" step="0.01" value={formData.meals || 0}
                    onChange={(e) => setFormData({ ...formData, meals: Number(e.target.value) })} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WKR</Label>
                  <Input type="number" min="0" step="0.01" value={formData.wkr || 0}
                    onChange={(e) => setFormData({ ...formData, wkr: Number(e.target.value) })} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="destructive"
                onClick={() => { if (selectedEntry && selectedEntry.status === 'Concept' && confirm('Weet je zeker dat je deze concept entry wilt verwijderen?')) deleteMutation.mutate(selectedEntry.id); }}
                className={selectedEntry?.status === 'Concept' ? '' : 'hidden'}
                disabled={deleteMutation.isPending}>
                Verwijderen
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuleren</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Opslaan
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}