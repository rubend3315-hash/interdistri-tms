import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Check, X, Clock, ArrowRight, Search } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getFullName } from "@/components/utils/employeeUtils";
import { toast } from "sonner";

const statusColors = {
  Aangevraagd: "bg-blue-100 text-blue-700",
  "In behandeling": "bg-amber-100 text-amber-700",
  Goedgekeurd: "bg-emerald-100 text-emerald-700",
  Afgekeurd: "bg-red-100 text-red-700",
  Doorgevoerd: "bg-purple-100 text-purple-700",
};

const priorityColors = {
  Normaal: "bg-slate-100 text-slate-600",
  Hoog: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

export default function ContractWijzigingen() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWijziging, setSelectedWijziging] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: wijzigingen = [], isLoading } = useQuery({
    queryKey: ["contractwijzigingen"],
    queryFn: () => base44.entities.ContractWijziging.list("-created_date"),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractWijziging.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractwijzigingen"] });
      setShowDialog(false);
      toast.success("Contractwijziging aangevraagd");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContractWijziging.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractwijzigingen"] });
      setSelectedWijziging(null);
      toast.success("Status bijgewerkt");
    },
  });

  const filtered = wijzigingen.filter((w) => {
    const matchSearch = !searchTerm || 
      w.employee_naam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.type_wijziging?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCount = wijzigingen.filter(w => w.status === "Aangevraagd" || w.status === "In behandeling").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contractwijzigingen</h1>
          <p className="text-slate-500 mt-1">Beheer aanvragen voor contractwijzigingen</p>
        </div>
        <div className="flex gap-2">
          {openCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 px-3 py-1.5">
              {openCount} openstaand
            </Badge>
          )}
          <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Aanvraag
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op naam of type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="Aangevraagd">Aangevraagd</SelectItem>
                <SelectItem value="In behandeling">In behandeling</SelectItem>
                <SelectItem value="Goedgekeurd">Goedgekeurd</SelectItem>
                <SelectItem value="Afgekeurd">Afgekeurd</SelectItem>
                <SelectItem value="Doorgevoerd">Doorgevoerd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabel */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Geen contractwijzigingen gevonden</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Datum</TableHead>
                  <TableHead>Medewerker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Huidige → Nieuw</TableHead>
                  <TableHead>Ingangsdatum</TableHead>
                  <TableHead>Prioriteit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedWijziging(w)}>
                    <TableCell className="text-sm text-slate-500">
                      {w.created_date ? format(new Date(w.created_date), "dd-MM-yyyy", { locale: nl }) : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{w.employee_naam || "-"}</TableCell>
                    <TableCell className="text-sm">{w.type_wijziging}</TableCell>
                    <TableCell className="text-sm">
                      <span className="text-slate-500">{w.huidige_waarde || "-"}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />
                      <span className="font-medium">{w.nieuwe_waarde}</span>
                    </TableCell>
                    <TableCell className="text-sm">{w.ingangsdatum || "-"}</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[w.prioriteit] || priorityColors.Normaal}>
                        {w.prioriteit || "Normaal"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[w.status] || statusColors.Aangevraagd}>
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(w.status === "Aangevraagd" || w.status === "In behandeling") && (
                        <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateMutation.mutate({ id: w.id, data: { status: "Goedgekeurd", beoordeeld_door: currentUser?.email, beoordeeld_datum: new Date().toISOString() } })}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const reden = prompt("Reden van afkeuring:");
                              if (reden) {
                                updateMutation.mutate({ id: w.id, data: { status: "Afgekeurd", beoordeeld_door: currentUser?.email, beoordeeld_datum: new Date().toISOString(), afkeur_reden: reden } });
                              }
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Nieuwe aanvraag dialog */}
      <NieuweAanvraagDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        employees={employees}
        currentUser={currentUser}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />

      {/* Detail dialog */}
      <DetailDialog
        wijziging={selectedWijziging}
        onClose={() => setSelectedWijziging(null)}
        currentUser={currentUser}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
      />
    </div>
  );
}

function NieuweAanvraagDialog({ open, onOpenChange, employees, currentUser, onSubmit, isSubmitting }) {
  const activeEmployees = employees.filter((e) => e.status === "Actief").sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
  const [form, setForm] = useState({
    employee_id: "",
    type_wijziging: "",
    huidige_waarde: "",
    nieuwe_waarde: "",
    ingangsdatum: "",
    toelichting: "",
    prioriteit: "Normaal",
  });

  const selectedEmp = employees.find((e) => e.id === form.employee_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      employee_naam: selectedEmp ? getFullName(selectedEmp) : "",
      aangevraagd_door: currentUser?.email,
      aangevraagd_datum: new Date().toISOString(),
      status: "Aangevraagd",
    });
    setForm({ employee_id: "", type_wijziging: "", huidige_waarde: "", nieuwe_waarde: "", ingangsdatum: "", toelichting: "", prioriteit: "Normaal" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nieuwe Contractwijziging Aanvragen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Medewerker *</Label>
            <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
              <SelectContent>
                {activeEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{getFullName(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type wijziging *</Label>
            <Select value={form.type_wijziging} onValueChange={(v) => setForm({ ...form, type_wijziging: v })}>
              <SelectTrigger><SelectValue placeholder="Selecteer type" /></SelectTrigger>
              <SelectContent>
                {["Contractverlenging", "Functiewijziging", "Uren wijziging", "Loonschaal wijziging", "Afdeling wijziging", "Overig"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Huidige waarde</Label>
              <Input value={form.huidige_waarde} onChange={(e) => setForm({ ...form, huidige_waarde: e.target.value })} placeholder="Bijv. 32 uur/week" />
            </div>
            <div className="space-y-2">
              <Label>Nieuwe waarde *</Label>
              <Input value={form.nieuwe_waarde} onChange={(e) => setForm({ ...form, nieuwe_waarde: e.target.value })} placeholder="Bijv. 40 uur/week" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ingangsdatum *</Label>
              <Input type="date" value={form.ingangsdatum} onChange={(e) => setForm({ ...form, ingangsdatum: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Prioriteit</Label>
              <Select value={form.prioriteit} onValueChange={(v) => setForm({ ...form, prioriteit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normaal">Normaal</SelectItem>
                  <SelectItem value="Hoog">Hoog</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Toelichting</Label>
            <Textarea value={form.toelichting} onChange={(e) => setForm({ ...form, toelichting: e.target.value })} rows={3} placeholder="Eventuele toelichting..." />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" className="flex-1 bg-blue-900" disabled={!form.employee_id || !form.type_wijziging || !form.nieuwe_waarde || !form.ingangsdatum || isSubmitting}>
              Aanvragen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ wijziging, onClose, currentUser, onUpdate }) {
  if (!wijziging) return null;

  const canApprove = currentUser?.role === "admin" && (wijziging.status === "Aangevraagd" || wijziging.status === "In behandeling");
  const canMarkDone = currentUser?.role === "admin" && wijziging.status === "Goedgekeurd";

  return (
    <Dialog open={!!wijziging} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Contractwijziging Detail
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge className={statusColors[wijziging.status]}>{wijziging.status}</Badge>
            <Badge className={priorityColors[wijziging.prioriteit] || priorityColors.Normaal}>{wijziging.prioriteit || "Normaal"}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Medewerker:</span><p className="font-medium">{wijziging.employee_naam}</p></div>
            <div><span className="text-slate-500">Type:</span><p className="font-medium">{wijziging.type_wijziging}</p></div>
            <div><span className="text-slate-500">Huidige waarde:</span><p>{wijziging.huidige_waarde || "-"}</p></div>
            <div><span className="text-slate-500">Nieuwe waarde:</span><p className="font-medium">{wijziging.nieuwe_waarde}</p></div>
            <div><span className="text-slate-500">Ingangsdatum:</span><p>{wijziging.ingangsdatum}</p></div>
            <div><span className="text-slate-500">Aangevraagd door:</span><p>{wijziging.aangevraagd_door || "-"}</p></div>
          </div>

          {wijziging.toelichting && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <span className="text-slate-500">Toelichting:</span>
              <p className="mt-1">{wijziging.toelichting}</p>
            </div>
          )}

          {wijziging.beoordeeld_door && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <span className="text-slate-500">Beoordeeld door:</span>
              <p>{wijziging.beoordeeld_door} op {wijziging.beoordeeld_datum ? format(new Date(wijziging.beoordeeld_datum), "dd-MM-yyyy HH:mm") : "-"}</p>
            </div>
          )}

          {wijziging.afkeur_reden && (
            <div className="p-3 bg-red-50 rounded-lg text-sm border border-red-200">
              <span className="text-red-600 font-medium">Reden afkeuring:</span>
              <p className="text-red-700 mt-1">{wijziging.afkeur_reden}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {canApprove && (
              <>
                {wijziging.status === "Aangevraagd" && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onUpdate(wijziging.id, { status: "In behandeling", beoordeeld_door: currentUser?.email })}
                  >
                    <Clock className="w-4 h-4 mr-1" /> In behandeling nemen
                  </Button>
                )}
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onUpdate(wijziging.id, { status: "Goedgekeurd", beoordeeld_door: currentUser?.email, beoordeeld_datum: new Date().toISOString() })}
                >
                  <Check className="w-4 h-4 mr-1" /> Goedkeuren
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    const reden = prompt("Reden van afkeuring:");
                    if (reden) {
                      onUpdate(wijziging.id, { status: "Afgekeurd", beoordeeld_door: currentUser?.email, beoordeeld_datum: new Date().toISOString(), afkeur_reden: reden });
                    }
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Afkeuren
                </Button>
              </>
            )}
            {canMarkDone && (
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => onUpdate(wijziging.id, { status: "Doorgevoerd", doorgevoerd_datum: new Date().toISOString() })}
              >
                Markeer als doorgevoerd
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}