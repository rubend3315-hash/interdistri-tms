import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, Search, ChevronDown, ChevronRight, Save, Download } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SHIFTS = ["Dag", "Avond", "Nacht", "Dag en Avond", "Avond en Nacht"];
const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const PAKKET_SHIFTS = ["Shift3", "Shift4", "Shift5"];

function ShiftSelect({ value, onChange, size = "normal" }) {
  const cls = size === "tiny" ? "w-[70px] h-6 text-[10px]" : "w-28 h-7 text-xs";
  return (
    <Select value={value || "_empty"} onValueChange={(v) => onChange(v === "_empty" ? "" : v)}>
      <SelectTrigger className={cls}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_empty"><span className="text-slate-400">—</span></SelectItem>
        {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const DUTCH_DAY_MAP = {
  'maandag': 'monday', 'dinsdag': 'tuesday', 'woensdag': 'wednesday',
  'donderdag': 'thursday', 'vrijdag': 'friday', 'zaterdag': 'saturday', 'zondag': 'sunday'
};

function getWorkingDays(employee, weekNumber) {
  if (!employee.contractregels || employee.contractregels.length === 0) return {};
  const today = new Date();
  let activeContract = employee.contractregels
    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))
    .find(cr => {
      const s = new Date(cr.startdatum);
      const e = cr.einddatum ? new Date(cr.einddatum) : null;
      return s <= today && (!e || e >= today);
    });
  if (!activeContract) activeContract = employee.contractregels.find(cr => cr.week1 || cr.week2);
  if (!activeContract) return {};

  // Even weeknummer = week2, oneven = week1
  const isEvenWeek = weekNumber % 2 === 0;
  let weekSchedule = isEvenWeek ? activeContract.week2 : activeContract.week1;
  // Fallback: als de gekozen week niet bestaat, gebruik de andere
  if (!weekSchedule || typeof weekSchedule !== 'object') {
    weekSchedule = isEvenWeek ? activeContract.week1 : activeContract.week2;
  }
  if (!weekSchedule || typeof weekSchedule !== 'object') return {};

  const result = {};
  Object.entries(DUTCH_DAY_MAP).forEach(([dutchDay, engDay]) => {
    const val = weekSchedule[dutchDay];
    const isWorking = val === true || val === 'true' || (typeof val === 'number' && val > 0) || (typeof val === 'string' && !isNaN(parseFloat(val)) && parseFloat(val) > 0 && val !== '-');
    result[engDay] = isWorking;
  });
  return result;
}

export default function PreplanningDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  employees = [],
  weekNumber = 1,
  year = new Date().getFullYear(),
  periodStart,
  periodEnd
}) {
  const [fallbackShift, setFallbackShift] = useState("Dag");
  // shiftOverrides: { [empId]: { monday: "Dag", tuesday: "Avond en Nacht", ... } }
  const [shiftOverrides, setShiftOverrides] = useState({});
  // pakketShiftOverrides: { [empId]: "Shift3" | "Shift4" | "Shift5" }
  const [pakketShiftOverrides, setPakketShiftOverrides] = useState({});
  const [search, setSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState({});

  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      // Pre-fill: eerst shift_template (opgeslagen), dan default_shift, dan leeg
      const initial = {};
      const initialPakket = {};
      employees.forEach(e => {
        if (e.shift_template && typeof e.shift_template === 'object' && Object.keys(e.shift_template).length > 0) {
          initial[e.id] = { ...e.shift_template };
        } else if (e.default_shift) {
          const days = {};
          DAY_KEYS.forEach(d => { days[d] = e.default_shift; });
          initial[e.id] = days;
        }
        // Default pakket shift voor PakketDistributie medewerkers
        if (e.department === 'PakketDistributie') {
          initialPakket[e.id] = 'Shift3';
        }
      });
      setShiftOverrides(initial);
      setPakketShiftOverrides(initialPakket);
      setSearch("");
      setExpandedDepts({});
    }
  }, [open, employees]);

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    let count = 0;
    for (const emp of employees) {
      const template = shiftOverrides[emp.id] || {};
      const hasValues = Object.values(template).some(v => v);
      // Alleen opslaan als er iets is ingevuld
      if (hasValues) {
        await base44.entities.Employee.update(emp.id, { shift_template: template });
        count++;
      }
    }
    setIsSaving(false);
    toast.success(`Template opgeslagen voor ${count} medewerkers`);
  };

  const handleLoadTemplate = () => {
    const loaded = {};
    let count = 0;
    employees.forEach(e => {
      if (e.shift_template && typeof e.shift_template === 'object' && Object.keys(e.shift_template).length > 0) {
        loaded[e.id] = { ...e.shift_template };
        count++;
      }
    });
    setShiftOverrides(prev => ({ ...prev, ...loaded }));
    toast.success(`Template geladen voor ${count} medewerkers`);
  };

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      getFullName(e).toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.employee_number || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const grouped = useMemo(() => {
    const groups = {};
    filteredEmployees.forEach(e => {
      const dept = e.department || 'Overig';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    });
    return groups;
  }, [filteredEmployees]);

  const setEmployeeDay = (empId, dayKey, shift) => {
    setShiftOverrides(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [dayKey]: shift }
    }));
  };

  const setEmployeeAllDays = (empId, shift) => {
    const days = {};
    DAY_KEYS.forEach(d => { days[d] = shift; });
    setShiftOverrides(prev => ({ ...prev, [empId]: days }));
  };

  const setDeptAllDays = (dept, shift) => {
    const newOverrides = { ...shiftOverrides };
    employees.filter(e => (e.department || 'Overig') === dept).forEach(e => {
      const days = {};
      DAY_KEYS.forEach(d => { days[d] = shift; });
      newOverrides[e.id] = days;
    });
    setShiftOverrides(newOverrides);
  };

  const setAllEmployeesAllDays = (shift) => {
    const newOverrides = {};
    employees.forEach(e => {
      const days = {};
      DAY_KEYS.forEach(d => { days[d] = shift; });
      newOverrides[e.id] = days;
    });
    setShiftOverrides(newOverrides);
  };

  const handleGenerate = () => {
    onGenerate({ fallbackShift, shiftOverrides, pakketShiftOverrides });
  };

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Voorplanning Genereren
            <span className="text-sm font-normal bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              Week {weekNumber} — {year}
              {periodStart && periodEnd && (
                <span className="text-blue-500 ml-1">
                  ({periodStart} t/m {periodEnd})
                </span>
              )}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <p className="text-sm text-slate-600">
            Wijs per medewerker <strong>per dag</strong> een shift toe. Dagen die al ingepland zijn worden niet overschreven.
          </p>

          {/* Template + Fallback + bulk */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoadTemplate}>
                <Download className="w-3.5 h-3.5" />Laad template
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSaveTemplate} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Opslaan als template
              </Button>
            </div>
            <div className="border-l pl-3 flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Fallback:</Label>
              <ShiftSelect value={fallbackShift} onChange={setFallbackShift} />
            </div>
            <div className="border-l pl-3 flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-500">Iedereen:</span>
              {SHIFTS.map(s => (
                <Button key={s} variant="outline" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => setAllEmployeesAllDays(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <Input placeholder="Zoek medewerker..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>

          {/* Employee list with day columns */}
          <div className="flex-1 overflow-auto border rounded-lg min-h-0">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-20 border-b">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600 min-w-[160px]">Medewerker</th>
                  <th className="text-center px-0.5 py-1.5 font-medium text-slate-600 w-[70px]">Shift</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className="text-center px-0.5 py-1.5 font-medium text-slate-600 w-[80px]">{d}</th>
                  ))}
                  <th className="w-[60px] px-1"></th>
                </tr>
                <tr className="bg-slate-50 border-b">
                  <td className="px-2 py-0.5 text-[9px] text-slate-400">
                    Rooster ({weekNumber % 2 === 0 ? 'even' : 'oneven'} week): <span className="text-green-600">●</span> = werkdag
                  </td>
                  <td className="px-0.5 py-0.5 text-[9px] text-slate-400 text-center">PD shift</td>
                  <td colSpan={7} className="px-2 py-0.5 text-[9px] text-slate-400"><span className="text-slate-300">○</span> = vrij</td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([dept, emps]) => (
                  <React.Fragment key={dept}>
                    {/* Department header */}
                    <tr className="bg-slate-100">
                      <td colSpan={3} className="px-2 py-1.5">
                        <button onClick={() => toggleDept(dept)} className="flex items-center gap-1 font-semibold text-slate-700">
                          {expandedDepts[dept] === false ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {dept} ({emps.length})
                        </button>
                      </td>
                      <td colSpan={6} className="px-1 py-1">
                        <div className="flex items-center gap-1 justify-end">
                          {SHIFTS.map(s => (
                            <button key={s} onClick={() => setDeptAllDays(dept, s)}
                              className="text-[9px] px-1 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                              {s}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td></td>
                    </tr>
                    {/* Employee rows */}
                    {expandedDepts[dept] !== false && emps.map(emp => {
                      const empDays = shiftOverrides[emp.id] || {};
                      const workDays = getWorkingDays(emp, weekNumber);
                      return (
                        <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-2 py-1 truncate max-w-[160px]">
                            <span className="text-xs">{getFullName(emp)}</span>
                          </td>
                          <td className="px-0.5 py-0.5 text-center">
                            {emp.department === 'PakketDistributie' ? (
                              <Select
                                value={pakketShiftOverrides[emp.id] || 'Shift3'}
                                onValueChange={(v) => setPakketShiftOverrides(prev => ({ ...prev, [emp.id]: v }))}
                              >
                                <SelectTrigger className="w-[62px] h-5 text-[9px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAKKET_SHIFTS.map(s => <SelectItem key={s} value={s}>{s.replace('Shift', 'S')}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[9px] text-slate-300">—</span>
                            )}
                          </td>
                          {DAY_KEYS.map((dayKey, i) => {
                            const isWorkDay = workDays[dayKey];
                            return (
                              <td key={dayKey} className={`px-0.5 py-0.5 text-center ${isWorkDay === false ? 'bg-slate-50' : ''}`}>
                                <ShiftSelect
                                  value={empDays[dayKey] || ''}
                                  onChange={(v) => setEmployeeDay(emp.id, dayKey, v)}
                                  size="tiny"
                                />
                                <div className={`text-[8px] leading-none mt-0.5 ${isWorkDay ? 'text-green-600' : 'text-slate-300'}`}>
                                  {isWorkDay ? '●' : '○'}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-1">
                            <Select
                              value="_bulk"
                              onValueChange={(v) => { if (v !== "_bulk") setEmployeeAllDays(emp.id, v); }}
                            >
                              <SelectTrigger className="w-[50px] h-5 text-[9px] border-dashed">
                                <span className="text-slate-400">Alle</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_bulk" disabled><span className="text-slate-400">Stel alle dagen in</span></SelectItem>
                                {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Annuleren
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Bezig...</>
              ) : (
                <><Zap className="w-4 h-4 mr-1" />Genereer Voorplanning</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}