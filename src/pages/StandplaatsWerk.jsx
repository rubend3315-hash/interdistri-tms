import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Package,
  User,
  Calendar,
  Clock,
  Trash2,
  Building2,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { isDateInDefinitiefPeriode } from "@/components/utils/loonperiodeUtils";
import { checkEmployeeActiveRules } from "@/components/utils/employeeContractCheck";
import ConfirmDialog from "../components/ConfirmDialog";

export default function StandplaatsWerk() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["standplaatswerk"],
    queryFn: () => base44.entities.StandplaatsWerk.list("-created_date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: activiteiten = [] } = useQuery({
    queryKey: ["activiteiten"],
    queryFn: () => base44.entities.Activiteit.list(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntriesForStandplaats"],
    queryFn: () => base44.entities.TimeEntry.list("-date", 500),
  });

  const { data: loonperiodeStatuses = [] } = useQuery({
    queryKey: ["loonperiodeStatuses"],
    queryFn: () => base44.entities.LoonperiodeStatus.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StandplaatsWerk.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standplaatswerk"] });
      setIsDialogOpen(false);
      setSelectedRecord(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StandplaatsWerk.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standplaatswerk"] });
      setIsDialogOpen(false);
      setSelectedRecord(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StandplaatsWerk.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standplaatswerk"] });
    },
  });

  const [formData, setFormData] = useState({
    employee_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    end_time: "",
    customer_id: "",
    project_id: "",
    activity_id: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      employee_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_time: "",
      end_time: "",
      customer_id: "",
      project_id: "",
      activity_id: "",
      notes: "",
    });
  };

  // Normalize a time relative to an anchor using modulo arithmetic.
  const normalizeToAnchor = (anchor, timeMin) => {
    const offset = ((timeMin - anchor) % 1440 + 1440) % 1440;
    return anchor + offset;
  };

  // Validate standplaatswerk times against time entries
  const validateAgainstTimeEntry = (record) => {
    if (!record.start_time || !record.end_time || !record.employee_id || !record.date) {
      return { valid: null, message: "Geen tijden ingevuld" };
    }
    const matchingEntries = timeEntries.filter(
      (te) => te.employee_id === record.employee_id && 
      (te.date === record.date || te.end_date === record.date)
    );
    if (matchingEntries.length === 0) {
      return { valid: false, message: "Geen tijdregistratie gevonden voor deze datum" };
    }
    const [swStartH, swStartM] = record.start_time.split(":").map(Number);
    const [swEndH, swEndM] = record.end_time.split(":").map(Number);
    const swStartMin = swStartH * 60 + swStartM;
    const swEndMin = swEndH * 60 + swEndM;

    for (const te of matchingEntries) {
      if (!te.start_time || !te.end_time) continue;
      const [teStartH, teStartM] = te.start_time.split(":").map(Number);
      const [teEndH, teEndM] = te.end_time.split(":").map(Number);
      const teStart = teStartH * 60 + teStartM;
      const teEnd = teEndH * 60 + teEndM;

      // Normalize all times relative to dienst-start anchor
      const anchor = teStart;
      const svcEndN = normalizeToAnchor(anchor, teEnd);
      const swStartN = normalizeToAnchor(anchor, swStartMin);
      const swEndN = normalizeToAnchor(anchor, swEndMin);
      const swEndFinal = swEndN <= swStartN ? swEndN + 1440 : swEndN;

      const startOk = swStartN >= anchor && swStartN <= svcEndN;
      const endOk = swEndFinal <= svcEndN;

      if (startOk && endOk) {
        return { valid: true, message: `Binnen tijdregistratie (${te.start_time} - ${te.end_time})` };
      }
    }
    const te = matchingEntries[0];
    return { valid: false, message: `Buiten tijdregistratie (${te.start_time || "?"} - ${te.end_time || "?"})` };
  };

  const openEditDialog = (record) => {
    // Check of record in definitieve periode valt
    if (record.date) {
      const recYear = new Date(record.date).getFullYear();
      if (isDateInDefinitiefPeriode(record.date, recYear, loonperiodeStatuses)) return;
    }
    setSelectedRecord(record);
    setFormData({
      employee_id: record.employee_id || "",
      date: record.date || "",
      start_time: record.start_time || "",
      end_time: record.end_time || "",
      customer_id: record.customer_id || "",
      project_id: record.project_id || "",
      activity_id: record.activity_id || "",
      notes: record.notes || "",
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedRecord(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check active contract for the selected employee
    if (formData.employee_id && formData.date) {
      const emp = employees.find((em) => em.id === formData.employee_id);
      const ruleCheck = checkEmployeeActiveRules(emp, formData.date);
      if (!ruleCheck.hasActiveContract) {
        alert(ruleCheck.warnings.join("\n"));
        return;
      }
    }

    // Check of datum in vergrendelde loonperiode valt
    if (formData.date) {
      const year = new Date(formData.date).getFullYear();
      if (isDateInDefinitiefPeriode(formData.date, year, loonperiodeStatuses)) {
        alert("Deze datum valt in een vergrendelde loonperiode en kan niet worden gewijzigd.");
        return;
      }
    }

    const submitData = { ...formData };
    Object.keys(submitData).forEach((key) => {
      if (typeof submitData[key] === "string" && submitData[key].trim() === "") {
        submitData[key] = null;
      }
    });

    if (selectedRecord) {
      updateMutation.mutate({ id: selectedRecord.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getEmployee = (id) => employees.find((e) => e.id === id);
  const getCustomerName = (id) => customers.find((c) => c.id === id)?.company_name || "-";
  const getProjectName = (id) => projects.find((p) => p.id === id)?.name || "-";
  const getActiviteitName = (id) => activiteiten.find((a) => a.id === id)?.name || "-";

  const filteredProjects = formData.customer_id
    ? projects.filter((p) => p.customer_id === formData.customer_id && p.status === "Actief")
    : [];

  const activeActiviteiten = activiteiten.filter((a) => a.status !== "Inactief");

  const filtered = records.filter((r) => {
    if (filterDate && r.date !== filterDate) return false;
    if (filterEmployee !== "all" && r.employee_id !== filterEmployee) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const emp = getEmployee(r.employee_id);
      const empName = emp ? getFullName(emp).toLowerCase() : "";
      const custName = getCustomerName(r.customer_id).toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      if (!empName.includes(term) && !custName.includes(term) && !notes.includes(term)) return false;
    }
    return true;
  });

  // Detect overlap between standplaatswerk records for same employee+date
  const getOverlaps = (record) => {
    if (!record.start_time || !record.end_time || !record.employee_id || !record.date) return [];
    const [sH, sM] = record.start_time.split(':').map(Number);
    const [eH, eM] = record.end_time.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    const siblings = records.filter(
      (r) => r.id !== record.id && r.employee_id === record.employee_id && r.date === record.date && r.start_time && r.end_time
    );
    const overlapping = [];
    for (const sib of siblings) {
      const [s2H, s2M] = sib.start_time.split(':').map(Number);
      const [e2H, e2M] = sib.end_time.split(':').map(Number);
      const s2 = s2H * 60 + s2M;
      const e2 = e2H * 60 + e2M;
      if (startMin < e2 && endMin > s2) {
        overlapping.push(sib);
      }
    }
    return overlapping;
  };

  const uniqueEmployees = [...new Set(records.map((r) => r.employee_id).filter(Boolean))];

  return (
    <div className="max-w-[1400px] mx-auto pb-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-page-gap)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 'var(--d-header-font)' }} className="font-bold text-slate-900">Standplaatswerk</h1>
          <p style={{ fontSize: 'var(--d-meta-font)' }} className="text-slate-500">Registratie van werk op de standplaats (loodswerk)</p>
        </div>
        <Button onClick={openNewDialog} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Standplaatswerk
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ borderRadius: 'var(--d-card-radius)' }}>
        <CardContent style={{ padding: 'var(--d-card-py) var(--d-card-px)' }}>
          <div className="flex flex-col md:flex-row" style={{ gap: 'var(--d-card-gap)' }}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op medewerker, klant of opmerking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full md:w-44"
            />
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Medewerker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle medewerkers</SelectItem>
                {uniqueEmployees.map((id) => {
                  const emp = getEmployee(id);
                  return (
                    <SelectItem key={id} value={id}>
                      {emp ? getFullName(emp) : id}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setFilterDate(""); setFilterEmployee("all"); setSearchTerm(""); }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen standplaatswerk gevonden</h3>
          <p className="text-slate-500 mt-1">Er zijn nog geen registraties of de filters leveren geen resultaat.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-list-gap)' }}>
          {filtered.map((record) => {
            const employee = getEmployee(record.employee_id);
            const recYear = record.date ? new Date(record.date).getFullYear() : null;
            const isLocked = record.date && recYear && isDateInDefinitiefPeriode(record.date, recYear, loonperiodeStatuses);
            const validation = validateAgainstTimeEntry(record);
            const overlaps = getOverlaps(record);
            return (
              <Card
                key={record.id}
                className={`transition-shadow ${isLocked ? "opacity-75" : "hover:shadow-sm cursor-pointer"}`}
                style={{ borderRadius: 'var(--d-card-radius)' }}
                onClick={() => !isLocked && openEditDialog(record)}
              >
                <CardContent style={{ padding: 'var(--d-card-py) var(--d-card-px)' }}>
                  <div className="flex items-center" style={{ gap: 'var(--d-card-gap)' }}>
                    <div className="bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 'var(--d-stat-icon)', height: 'var(--d-stat-icon)' }}>
                      <Package style={{ width: 'var(--d-icon)', height: 'var(--d-icon)' }} className="text-amber-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate" style={{ fontSize: 'var(--d-title-font)' }}>
                          {record.activity_id ? getActiviteitName(record.activity_id) : "Standplaatswerk"}
                        </h3>
                        <Badge className="text-[11px] px-2 py-0 leading-5 bg-amber-100 text-amber-700">Loodswerk</Badge>
                        {isLocked && (
                          <Badge className="text-[11px] px-2 py-0 leading-5 bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Vergrendeld
                          </Badge>
                        )}
                        {validation.valid === true && <CheckCircle2 className="w-4 h-4 text-green-500" title={validation.message} />}
                        {validation.valid === false && <XCircle className="w-4 h-4 text-red-500" title={validation.message} />}
                        {overlaps.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" title={`Overlap met ${overlaps.length} record(s)`} />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {record.date ? format(new Date(record.date), "d MMM", { locale: nl }) : "-"}
                        </span>
                        {employee && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {getFullName(employee)}
                          </span>
                        )}
                        {record.customer_id && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {getCustomerName(record.customer_id)}
                          </span>
                        )}
                        {(record.start_time || record.end_time) && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {record.start_time || "?"} – {record.end_time || "?"}
                          </span>
                        )}
                        {record.project_id && (
                          <span className="text-slate-400">{getProjectName(record.project_id)}</span>
                        )}
                      </div>
                      {overlaps.length > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          <AlertTriangle className="w-3 h-3" /> Overlap ({overlaps.length})
                        </span>
                      )}
                      {record.notes && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[300px] mt-0.5">{record.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedRecord ? "Standplaatswerk Bewerken" : "Nieuw Standplaatswerk"}</span>
              {selectedRecord && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmDelete({ id: selectedRecord.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Medewerker *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.status === "Actief").map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {getFullName(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Begintijd</Label>
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
              <Label>Klant</Label>
              <Select
                value={formData.customer_id || "none"}
                onValueChange={(v) =>
                  setFormData({ ...formData, customer_id: v === "none" ? "" : v, project_id: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer klant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredProjects.length > 0 && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(v) => setFormData({ ...formData, project_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Activiteit</Label>
              <Select
                value={formData.activity_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, activity_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer activiteit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {activeActiviteiten.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Bijzonderheden..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title="Standplaatswerk verwijderen"
        description="Weet je zeker dat je dit standplaatswerk wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
        onConfirm={() => {
          if (confirmDelete?.id) deleteMutation.mutate(confirmDelete.id);
          setConfirmDelete(null);
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}