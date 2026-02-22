import React, { useState, useMemo, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { KeyRound, Eye, EyeOff, RefreshCw, Edit, Search, Shield, AlertTriangle } from "lucide-react";

const FORBIDDEN_PINS = ["0000", "1234", "4321", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"];

function generatePin() {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (FORBIDDEN_PINS.includes(pin));
  return pin;
}

function validatePin(pin, existingPins, currentEmployeeId) {
  if (!/^\d{4}$/.test(pin)) return "Pincode moet exact 4 cijfers zijn.";
  if (FORBIDDEN_PINS.includes(pin)) return "Deze pincode is niet toegestaan (te eenvoudig).";
  const duplicate = existingPins.find(p => p.pincode === pin && p.active && p.employee_id !== currentEmployeeId);
  if (duplicate) return `Deze pincode is al in gebruik door ${duplicate.employee_name || 'een andere medewerker'}.`;
  return null;
}

export default function PincodeBeheerTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editDialog, setEditDialog] = useState(null); // { employee, pinRecord }
  const [viewConfirm, setViewConfirm] = useState(null); // pinRecord to view
  const [visiblePins, setVisiblePins] = useState({}); // { [recordId]: true }
  const timerRefs = useRef({});

  const { data: pincodes = [], isLoading: loadingPins } = useQuery({
    queryKey: ['keylocker_pincodes'],
    queryFn: () => base44.entities.KeylockerPincode.list('-created_date', 500),
  });

  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ['employees_pincode'],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }, 'last_name', 500),
  });

  // Build a map: employee_id -> active pincode record
  const activePinMap = useMemo(() => {
    const map = {};
    pincodes.filter(p => p.active).forEach(p => { map[p.employee_id] = p; });
    return map;
  }, [pincodes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const name = `${e.first_name} ${e.prefix || ''} ${e.last_name}`.toLowerCase();
      return !q || name.includes(q) || (e.employee_number || '').toLowerCase().includes(q);
    });
  }, [employees, search]);

  // Auto-hide pin after 30 seconds
  const showPin = (recordId) => {
    setVisiblePins(prev => ({ ...prev, [recordId]: true }));
    if (timerRefs.current[recordId]) clearTimeout(timerRefs.current[recordId]);
    timerRefs.current[recordId] = setTimeout(() => {
      setVisiblePins(prev => ({ ...prev, [recordId]: false }));
    }, 30000);
  };

  useEffect(() => {
    return () => Object.values(timerRefs.current).forEach(clearTimeout);
  }, []);

  const handleViewConfirm = async () => {
    const rec = viewConfirm;
    setViewConfirm(null);
    showPin(rec.id);
    // Audit log
    try {
      await base44.functions.invoke('auditService', {
        entity_type: 'KeylockerPincode', entity_id: rec.id,
        action_type: 'read', category: 'Security',
        description: `Pincode bekeken voor ${rec.employee_name}`,
        metadata: { type: 'pincode_viewed', employee_id: rec.employee_id },
      });
    } catch (_) {}
  };

  const getStatusBadge = (emp) => {
    const rec = activePinMap[emp.id];
    if (!rec) return <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">Geen pincode</Badge>;
    return <Badge className="text-[10px] bg-green-100 text-green-700 border-0">Actief</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><KeyRound className="w-5 h-5 text-slate-500" /> Sleutelkast Pincodebeheer</h3>
          <p className="text-xs text-slate-500 mt-0.5">Beheer en wijzig pincodes voor de sleutelkast per medewerker.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Zoek medewerker..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {(loadingPins || loadingEmps) ? (
        <p className="text-sm text-slate-500">Laden...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Medewerker</th>
                <th className="text-left px-3 py-2 font-medium">Nr.</th>
                <th className="text-left px-3 py-2 font-medium">Pincode</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Laatst gewijzigd</th>
                <th className="text-left px-3 py-2 font-medium">Door</th>
                <th className="text-right px-3 py-2 font-medium">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(emp => {
                const rec = activePinMap[emp.id];
                const pinVisible = rec && visiblePins[rec.id];
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {emp.first_name} {emp.prefix ? emp.prefix + ' ' : ''}{emp.last_name}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{emp.employee_number || '—'}</td>
                    <td className="px-3 py-2">
                      {rec ? (
                        <span className="font-mono text-sm tracking-widest">{pinVisible ? rec.pincode : '••••'}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{getStatusBadge(emp)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {rec?.updated_date ? new Date(rec.updated_date).toLocaleDateString('nl-NL') : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{rec?.changed_by_name || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {rec && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pincode bekijken"
                            onClick={() => pinVisible ? setVisiblePins(prev => ({ ...prev, [rec.id]: false })) : setViewConfirm(rec)}>
                            {pinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={rec ? "Pincode wijzigen" : "Pincode instellen"}
                          onClick={() => setEditDialog({ employee: emp, pinRecord: rec || null })}>
                          {rec ? <Edit className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-sm text-slate-400">Geen medewerkers gevonden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View confirmation dialog */}
      <AlertDialog open={!!viewConfirm} onOpenChange={() => setViewConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" /> Pincode bekijken</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u de pincode van <strong>{viewConfirm?.employee_name}</strong> wilt bekijken?
              <br />Deze actie wordt gelogd. De pincode is 30 seconden zichtbaar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleViewConfirm}>Toon pincode</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit/Create dialog */}
      {editDialog && (
        <PincodeEditDialog
          employee={editDialog.employee}
          pinRecord={editDialog.pinRecord}
          allPincodes={pincodes}
          onClose={() => setEditDialog(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['keylocker_pincodes'] });
            setEditDialog(null);
          }}
        />
      )}
    </div>
  );
}

function PincodeEditDialog({ employee, pinRecord, allPincodes, onClose, onSaved }) {
  const [mode, setMode] = useState("generate"); // "generate" | "manual"
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const empName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;

  const handleGenerate = () => {
    const newPin = generatePin();
    setPin(newPin);
    setError(null);
  };

  const handleSave = async () => {
    const validationError = validatePin(pin, allPincodes, employee.id);
    if (validationError) { setError(validationError); return; }
    if (pinRecord && pin === pinRecord.pincode) { setError("Nieuwe pincode mag niet gelijk zijn aan de huidige."); return; }

    setSaving(true);
    const user = await base44.auth.me();

    // Deactivate old record if exists
    if (pinRecord) {
      await base44.entities.KeylockerPincode.update(pinRecord.id, { active: false });
    }

    // Create new record
    await base44.entities.KeylockerPincode.create({
      employee_id: employee.id,
      employee_name: empName,
      pincode: pin,
      active: true,
      change_reason: reason || (pinRecord ? "Gewijzigd door HR" : "Ingesteld door HR"),
      changed_by: user.email,
      changed_by_name: user.full_name,
      source: "hr_manual",
    });

    // Also update OnboardingProcess if exists
    const obs = await base44.entities.OnboardingProcess.filter({ employee_id: employee.id });
    if (obs.length > 0) {
      await base44.entities.OnboardingProcess.update(obs[0].id, { pincode_sleutelkast: pin });
    }

    // Audit log
    await base44.functions.invoke('auditService', {
      entity_type: 'KeylockerPincode', entity_id: employee.id,
      action_type: pinRecord ? 'update' : 'create', category: 'Security',
      description: pinRecord ? `Pincode gewijzigd voor ${empName}` : `Pincode ingesteld voor ${empName}`,
      metadata: { type: pinRecord ? 'pincode_changed' : 'pincode_generated', employee_id: employee.id },
    });

    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{pinRecord ? 'Pincode wijzigen' : 'Pincode instellen'} — {empName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {pinRecord && (
            <div className="bg-slate-50 p-2 rounded text-xs text-slate-500">
              Huidige pincode: <span className="font-mono">••••</span> (actief sinds {new Date(pinRecord.created_date).toLocaleDateString('nl-NL')})
            </div>
          )}

          <div className="flex gap-2">
            <Button variant={mode === "generate" ? "default" : "outline"} size="sm" onClick={() => { setMode("generate"); handleGenerate(); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Genereren
            </Button>
            <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => { setMode("manual"); setPin(""); setError(null); }}>
              <Edit className="w-3.5 h-3.5 mr-1" /> Handmatig
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nieuwe pincode</Label>
            {mode === "generate" ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl tracking-widest font-bold text-slate-800">{pin || '----'}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleGenerate}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Input
                value={pin} maxLength={4} placeholder="4 cijfers"
                className="font-mono text-lg tracking-widest w-32"
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
              />
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Reden (optioneel)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="bijv. Vergeten pincode" />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 p-2 rounded">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Annuleren</Button>
            <Button className="flex-1 bg-blue-900" disabled={!pin || pin.length !== 4 || saving} onClick={handleSave}>
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}