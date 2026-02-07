import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Save, Copy, Trash2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const KPI_DOEL_FIELDS = [
  { key: "tvi_dag_doel", label: "TVI Dag" },
  { key: "tvi_avond_doel", label: "TVI Avond" },
  { key: "uitreiklocatie_doel", label: "Uitreiklocatie" },
  { key: "vr_distributie_doel", label: "Vr Distributie" },
  { key: "scankwaliteit_doel", label: "Scankwaliteit" },
  { key: "pba_bezorgers_doel", label: "PBA Bezorgers" },
  { key: "hitrate_doel", label: "Hitrate" },
];

function pctInput(val) {
  if (val == null || val === "") return "";
  return (val * 100).toFixed(1);
}

function parsePctInput(str) {
  if (!str || str.trim() === "") return null;
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return num / 100;
}

export default function KPIDoelEditor({ year, week }) {
  const queryClient = useQueryClient();
  const yearNum = parseInt(year);
  const weekNum = parseInt(week);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [formValues, setFormValues] = useState({});
  const [bulkValues, setBulkValues] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch active PD employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["pd-employees-doelen"],
    queryFn: () => base44.entities.Employee.filter({ department: "PakketDistributie", status: "Actief" }),
  });

  // Fetch existing doelen for this week
  const { data: doelen = [], isLoading: loadingDoelen } = useQuery({
    queryKey: ["kpi-doelen-editor", weekNum, yearNum],
    queryFn: () => base44.entities.KPIDoel.filter({ week: weekNum, jaar: yearNum }),
  });

  // Build form values from existing doelen
  useEffect(() => {
    const values = {};
    employees.forEach((emp) => {
      const existing = doelen.find((d) => d.employee_id === emp.id);
      values[emp.id] = {};
      KPI_DOEL_FIELDS.forEach((f) => {
        values[emp.id][f.key] = existing ? pctInput(existing[f.key]) : "";
      });
      values[emp.id]._doelId = existing?.id || null;
    });
    setFormValues(values);
  }, [employees, doelen]);

  const handleFieldChange = (empId, field, val) => {
    setFormValues((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: val },
    }));
  };

  const handleBulkChange = (field, val) => {
    setBulkValues((prev) => ({ ...prev, [field]: val }));
  };

  const applyBulkToAll = () => {
    setFormValues((prev) => {
      const updated = { ...prev };
      employees.forEach((emp) => {
        if (!updated[emp.id]) updated[emp.id] = {};
        KPI_DOEL_FIELDS.forEach((f) => {
          if (bulkValues[f.key] && bulkValues[f.key].trim() !== "") {
            updated[emp.id] = { ...updated[emp.id], [f.key]: bulkValues[f.key] };
          }
        });
      });
      return updated;
    });
    toast.success("Doelen toegepast op alle medewerkers");
  };

  const copyFromPreviousWeek = async () => {
    const prevWeek = weekNum > 1 ? weekNum - 1 : 52;
    const prevYear = weekNum > 1 ? yearNum : yearNum - 1;
    const prevDoelen = await base44.entities.KPIDoel.filter({ week: prevWeek, jaar: prevYear });
    if (prevDoelen.length === 0) {
      toast.error(`Geen doelen gevonden voor week ${prevWeek} (${prevYear})`);
      return;
    }
    setFormValues((prev) => {
      const updated = { ...prev };
      prevDoelen.forEach((d) => {
        if (updated[d.employee_id]) {
          KPI_DOEL_FIELDS.forEach((f) => {
            if (d[f.key] != null) {
              updated[d.employee_id] = { ...updated[d.employee_id], [f.key]: pctInput(d[f.key]) };
            }
          });
        }
      });
      return updated;
    });
    toast.success(`Doelen gekopieerd van week ${prevWeek}`);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    let created = 0, updated = 0;
    for (const emp of employees) {
      const vals = formValues[emp.id];
      if (!vals) continue;

      const data = {
        employee_id: emp.id,
        jaar: yearNum,
        week: weekNum,
        zmedcid: "8196531",
      };
      let hasValue = false;
      KPI_DOEL_FIELDS.forEach((f) => {
        const parsed = parsePctInput(vals[f.key]);
        data[f.key] = parsed;
        if (parsed != null) hasValue = true;
      });

      if (!hasValue && !vals._doelId) continue;

      if (vals._doelId) {
        await base44.entities.KPIDoel.update(vals._doelId, data);
        updated++;
      } else if (hasValue) {
        await base44.entities.KPIDoel.create(data);
        created++;
      }
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["kpi-doelen"] });
    queryClient.invalidateQueries({ queryKey: ["kpi-doelen-editor"] });
    queryClient.invalidateQueries({ queryKey: ["kpi-doelen-year"] });
    toast.success(`${created} aangemaakt, ${updated} bijgewerkt`);
  };

  const handleDelete = async (empId) => {
    const doelId = formValues[empId]?._doelId;
    if (!doelId) return;
    await base44.entities.KPIDoel.delete(doelId);
    queryClient.invalidateQueries({ queryKey: ["kpi-doelen"] });
    queryClient.invalidateQueries({ queryKey: ["kpi-doelen-editor"] });
    toast.success("Doel verwijderd");
  };

  const filteredEmployees = useMemo(() => {
    if (selectedEmployeeId === "all") return employees;
    return employees.filter((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  if (loadingEmployees || loadingDoelen) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (employees.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen actieve PakketDistributie medewerkers gevonden.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Alle medewerkers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle medewerkers</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.first_name} {e.prefix ? e.prefix + " " : ""}{e.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={copyFromPreviousWeek} className="gap-1.5">
          <Copy className="w-3.5 h-3.5" /> Kopieer vorige week
        </Button>

        <div className="ml-auto">
          <Button onClick={handleSaveAll} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Save className="w-4 h-4" /> {saving ? "Opslaan..." : "Alles opslaan"}
          </Button>
        </div>
      </div>

      {/* Bulk set */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-amber-800 mb-2">Snel instellen voor iedereen (in %)</p>
        <div className="flex flex-wrap items-end gap-3">
          {KPI_DOEL_FIELDS.map((f) => (
            <div key={f.key} className="w-24">
              <Label className="text-xs text-amber-700">{f.label}</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="%"
                value={bulkValues[f.key] || ""}
                onChange={(e) => handleBulkChange(f.key, e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={applyBulkToAll} className="gap-1 border-amber-300 text-amber-800 hover:bg-amber-100">
            <Check className="w-3.5 h-3.5" /> Toepassen
          </Button>
        </div>
      </div>

      {/* Per-employee table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left py-2.5 px-3 font-medium text-slate-600">Medewerker</th>
              {KPI_DOEL_FIELDS.map((f) => (
                <th key={f.key} className="text-center py-2.5 px-2 font-medium text-slate-600 min-w-[80px]">
                  {f.label} (%)
                </th>
              ))}
              <th className="text-center py-2.5 px-2 font-medium text-slate-600">Status</th>
              <th className="py-2.5 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, idx) => {
              const vals = formValues[emp.id] || {};
              const hasExisting = !!vals._doelId;
              return (
                <tr key={emp.id} className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                  <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {emp.first_name} {emp.prefix ? emp.prefix + " " : ""}{emp.last_name}
                  </td>
                  {KPI_DOEL_FIELDS.map((f) => (
                    <td key={f.key} className="py-1.5 px-1.5">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="-"
                        value={vals[f.key] ?? ""}
                        onChange={(e) => handleFieldChange(emp.id, f.key, e.target.value)}
                        className="h-7 text-xs text-center w-full"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center">
                    {hasExisting ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Ingesteld</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 text-xs">Nieuw</Badge>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {hasExisting && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(emp.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Voer doelen in als percentage (bijv. 95.0 voor 95%). Klik op "Alles opslaan" om op te slaan.
      </p>
    </div>
  );
}