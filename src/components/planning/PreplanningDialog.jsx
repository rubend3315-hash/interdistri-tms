import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, Search } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";

export default function PreplanningDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  employees = []
}) {
  const [fallbackShift, setFallbackShift] = useState("Dag");
  const [shiftOverrides, setShiftOverrides] = useState({});
  const [search, setSearch] = useState("");

  // Reset overrides when dialog opens
  React.useEffect(() => {
    if (open) {
      // Pre-fill with saved default_shift from employee records
      const initial = {};
      employees.forEach(e => {
        if (e.default_shift) {
          initial[e.id] = e.default_shift;
        }
      });
      setShiftOverrides(initial);
      setSearch("");
    }
  }, [open, employees]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e => 
      getFullName(e).toLowerCase().includes(q) || 
      (e.department || '').toLowerCase().includes(q) ||
      (e.employee_number || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  // Group by department
  const grouped = useMemo(() => {
    const groups = {};
    filteredEmployees.forEach(e => {
      const dept = e.department || 'Overig';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    });
    return groups;
  }, [filteredEmployees]);

  const handleSetAll = (shift) => {
    const newOverrides = { ...shiftOverrides };
    employees.forEach(e => {
      newOverrides[e.id] = shift;
    });
    setShiftOverrides(newOverrides);
  };

  const handleSetDepartment = (dept, shift) => {
    const newOverrides = { ...shiftOverrides };
    employees.filter(e => (e.department || 'Overig') === dept).forEach(e => {
      newOverrides[e.id] = shift;
    });
    setShiftOverrides(newOverrides);
  };

  const handleGenerate = () => {
    onGenerate({ fallbackShift, shiftOverrides });
  };

  const getShiftForEmployee = (empId) => shiftOverrides[empId] || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Voorplanning Genereren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <p className="text-sm text-slate-600">
            Wijs per medewerker een shift toe. Dagen die al ingepland zijn worden <strong>niet</strong> overschreven.
          </p>

          {/* Fallback + bulk actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Fallback shift:</Label>
              <Select value={fallbackShift} onValueChange={setFallbackShift}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dag">Dag</SelectItem>
                  <SelectItem value="Avond">Avond</SelectItem>
                  <SelectItem value="Nacht">Nacht</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-l pl-3 flex items-center gap-1">
              <span className="text-xs text-slate-500">Iedereen op:</span>
              {["Dag", "Avond", "Nacht"].map(s => (
                <Button key={s} variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleSetAll(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Zoek medewerker..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Employee list */}
          <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
            {Object.entries(grouped).map(([dept, emps]) => (
              <div key={dept}>
                <div className="sticky top-0 bg-slate-100 px-3 py-1.5 flex items-center justify-between z-10">
                  <span className="text-xs font-semibold text-slate-700">{dept} ({emps.length})</span>
                  <div className="flex items-center gap-1">
                    {["Dag", "Avond", "Nacht"].map(s => (
                      <button
                        key={s}
                        onClick={() => handleSetDepartment(dept, s)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {emps.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between px-3 py-1.5 border-b border-slate-50 hover:bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">{getFullName(emp)}</span>
                      {emp.employee_number && (
                        <span className="text-[10px] text-slate-400">#{emp.employee_number}</span>
                      )}
                    </div>
                    <Select 
                      value={getShiftForEmployee(emp.id) || '_fallback'} 
                      onValueChange={(v) => setShiftOverrides(prev => ({ ...prev, [emp.id]: v === '_fallback' ? '' : v }))}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_fallback">
                          <span className="text-slate-400">Fallback ({fallbackShift})</span>
                        </SelectItem>
                        <SelectItem value="Dag">Dag</SelectItem>
                        <SelectItem value="Avond">Avond</SelectItem>
                        <SelectItem value="Nacht">Nacht</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Annuleren
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1" />
                  Genereer Voorplanning
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}