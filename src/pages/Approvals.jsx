import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Car,
  FileText,
  Eye,
  Edit,
  Lock,
  AlertTriangle
} from "lucide-react";
import { getBreakMinutesForHours } from "@/components/utils/breakScheduleUtils";
import { isDateInDefinitiefPeriode } from "@/components/utils/loonperiodeUtils";

export default function Approvals() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState("pending");
  const [isManualBreak, setIsManualBreak] = useState(false);
  const [approvingIds, setApprovingIds] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['timeEntries-all'],
    queryFn: async () => {
      try {
        return await base44.entities.TimeEntry.list();
      } catch (error) {
        console.error('Error loading time entries:', error);
        return [];
      }
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await base44.entities.Employee.list();
      } catch (error) {
        console.error('Error loading employees:', error);
        return [];
      }
    }
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      try {
        return await base44.entities.Vehicle.list();
      } catch (error) {
        console.error('Error loading vehicles:', error);
        return [];
      }
    }
  });

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error loading user:', error);
        return null;
      }
    }
  });

  const { data: loonperiodeStatuses = [] } = useQuery({
    queryKey: ['loonperiodeStatuses'],
    queryFn: () => base44.entities.LoonperiodeStatus.list()
  });

  const approveMutation = useMutation({
    mutationFn: async (entry) => {
      const response = await base44.functions.invoke('approveTimeEntry', { time_entry_id: entry.id });
      if (!response.data?.success) throw new Error(response.data?.message || 'Goedkeuren mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-all'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ entry, reason }) => {
      const response = await base44.functions.invoke('rejectTimeEntry', { time_entry_id: entry.id, rejection_reason: reason });
      if (!response.data?.success) throw new Error(response.data?.message || 'Afkeuren mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-all'] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Admin edit with approve: use approveTimeEntry with edit_data
      const response = await base44.functions.invoke('approveTimeEntry', {
        time_entry_id: selectedEntry.id,
        edit_data: data
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Opslaan mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-all'] });
      setIsDetailDialogOpen(false);
      setIsEditMode(false);
    }
  });

  const handleApprove = (entry) => {
    if (approvingIds.has(entry.id)) return;
    setApprovingIds(prev => new Set(prev).add(entry.id));
    approveMutation.mutate(entry, {
      onSettled: () => setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      })
    });
  };

  const openRejectDialog = (entry) => {
    setSelectedEntry(entry);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedEntry) {
      rejectMutation.mutate({ entry: selectedEntry, reason: rejectionReason });
    }
  };

  const openDetailDialog = async (entry) => {
    setSelectedEntry(entry);
    
    // Calculate automatic break for submitted entries if not already set
    let breakMinutes = entry.break_minutes;
    if (entry.status === 'Ingediend' && entry.start_time && entry.end_time && !entry.break_minutes) {
      try {
        const [startH, startM] = entry.start_time.split(':').map(Number);
        const [endH, endM] = entry.end_time.split(':').map(Number);
        let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const totalHours = totalMinutes / 60;
        breakMinutes = await getBreakMinutesForHours(totalHours);
      } catch (error) {
        console.error('Break berekening mislukt:', error);
        breakMinutes = 0;
      }
    }
    
    setEditData({
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      break_minutes: breakMinutes,
      notes: entry.notes,
      correction_reason: ''
    });
    setIsManualBreak(false);
    setIsEditMode(false);
    setIsDetailDialogOpen(true);
  };

  const handleSaveEdit = () => {
    const hours = calculateHours(editData.start_time, editData.end_time, editData.break_minutes);
    
    // Build edit history
    const editHistory = selectedEntry.edit_history || [];
    const editRecord = {
      edited_at: new Date().toISOString(),
      edited_by: user?.email,
      reason: editData.correction_reason,
      original_data: {
        date: selectedEntry.date,
        start_time: selectedEntry.start_time,
        end_time: selectedEntry.end_time,
        break_minutes: selectedEntry.break_minutes,
        total_hours: selectedEntry.total_hours
      },
      new_data: {
        date: editData.date,
        start_time: editData.start_time,
        end_time: editData.end_time,
        break_minutes: editData.break_minutes,
        total_hours: hours
      }
    };
    
    updateMutation.mutate({
      ...editData,
      total_hours: hours,
      edit_history: [...editHistory, editRecord]
    });
  };

  const calculateHours = (start, end, breakMinutes) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes -= breakMinutes || 0;
    return Math.round(totalMinutes / 60 * 100) / 100;
  };

  const getEmployee = (id) => {
    if (!id || !Array.isArray(employees)) return null;
    return employees.find(e => e?.id === id);
  };
  
  const getVehicle = (id) => {
    if (!id || !Array.isArray(vehicles)) return null;
    return vehicles.find(v => v?.id === id);
  };

  const sortByDateDesc = (entries) => {
    if (!Array.isArray(entries)) return [];
    return [...entries].sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch (error) {
        return 0;
      }
    });
  };

  const pendingEntries = sortByDateDesc(
    Array.isArray(timeEntries) ? timeEntries.filter(e => e?.status === 'Ingediend') : []
  );
  const approvedEntries = sortByDateDesc(
    Array.isArray(timeEntries) ? timeEntries.filter(e => e?.status === 'Goedgekeurd') : []
  );
  const rejectedEntries = sortByDateDesc(
    Array.isArray(timeEntries) ? timeEntries.filter(e => e?.status === 'Afgekeurd') : []
  );

  // Detect overlap between time entries for same employee+date
  const getEntryOverlaps = (entry) => {
    if (!entry.start_time || !entry.end_time || !entry.employee_id || !entry.date) return [];
    const [sH, sM] = entry.start_time.split(':').map(Number);
    const [eH, eM] = entry.end_time.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    return timeEntries.filter((te) => {
      if (te.id === entry.id || te.employee_id !== entry.employee_id || te.date !== entry.date) return false;
      if (!te.start_time || !te.end_time) return false;
      const [s2H, s2M] = te.start_time.split(':').map(Number);
      const [e2H, e2M] = te.end_time.split(':').map(Number);
      const s2 = s2H * 60 + s2M;
      const e2 = e2H * 60 + e2M;
      return startMin < e2 && endMin > s2;
    });
  };

  const renderEntryCard = (entry, showActions = false) => {
    const employee = getEmployee(entry.employee_id);
    const vehicle = getVehicle(entry.vehicle_id);
    const entryYear = entry.date ? new Date(entry.date).getFullYear() : null;
    const entryLocked = entry.date && entryYear && isDateInDefinitiefPeriode(entry.date, entryYear, loonperiodeStatuses);
    const overlaps = getEntryOverlaps(entry);

    return (
      <Card key={entry.id} className="hover:shadow-sm transition-shadow" style={{ borderRadius: 'var(--d-card-radius)' }}>
        <CardContent style={{ padding: 'var(--d-card-py) var(--d-card-px)' }}>
          <div className="flex items-center justify-between" style={{ gap: 'var(--d-card-gap)' }}>
            {/* Left: avatar + info */}
            <div className="flex items-center min-w-0 flex-1" style={{ gap: 'var(--d-card-gap)' }}>
              <div className="bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 'var(--d-avatar)', height: 'var(--d-avatar)' }}>
                <User style={{ width: 'var(--d-icon)', height: 'var(--d-icon)' }} className="text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 truncate" style={{ fontSize: 'var(--d-title-font)' }}>
                    {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                  </h3>
                  <span className="text-xs text-slate-400">{employee?.department}</span>
                  {entry.shift_type && (
                    <Badge className={`text-[11px] px-2 py-0 leading-5 ${
                      entry.shift_type === 'Dag' ? 'bg-amber-100 text-amber-700' :
                      entry.shift_type === 'Avond' ? 'bg-orange-100 text-orange-700' :
                      entry.shift_type === 'Nacht' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {entry.shift_type}
                    </Badge>
                  )}
                  {entryLocked && (
                    <Badge className="text-[11px] px-2 py-0 leading-5 bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Vergrendeld
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-slate-500" style={{ fontSize: 'var(--d-meta-font)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar style={{ width: 'var(--d-icon)', height: 'var(--d-icon)' }} className="text-slate-400" />
                    {entry.date ? (() => {
                      try { return format(new Date(entry.date), "EEE d MMM", { locale: nl }); }
                      catch { return entry.date; }
                    })() : '–'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {entry.start_time || '-'} – {entry.end_time || '-'}
                  </span>
                  {entry.total_hours > 0 && (
                    <span className="font-medium text-slate-700">{entry.total_hours}u</span>
                  )}
                  {vehicle && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      {vehicle.license_plate}
                    </span>
                  )}
                  {entry.travel_allowance_multiplier > 0 && (
                    <span className="text-slate-400">Reis: {entry.travel_allowance_multiplier}x</span>
                  )}
                  {entry.approved_by && (
                    <span className="text-slate-400">door {entry.approved_by}</span>
                  )}
                </div>

                {/* Compact warnings row */}
                {(overlaps.length > 0 || entry.notes || entry.rejection_reason) && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {overlaps.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Overlap ({overlaps.length})
                      </span>
                    )}
                    {entry.notes && (
                      <span className="text-[11px] text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 truncate max-w-[240px]" title={entry.notes}>
                        {entry.notes}
                      </span>
                    )}
                    {entry.rejection_reason && (
                      <span className="text-[11px] text-red-600 bg-red-50 rounded px-1.5 py-0.5 truncate max-w-[240px]" title={entry.rejection_reason}>
                        Afkeuring: {entry.rejection_reason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="px-2.5" style={{ height: 'var(--d-btn-h)', fontSize: 'var(--d-badge-font)' }}
                onClick={() => openDetailDialog(entry)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Bekijk
              </Button>
              {showActions && !entryLocked && (
                <>
                  <Button
                    size="sm"
                    className="px-2.5 bg-emerald-600 hover:bg-emerald-700" style={{ height: 'var(--d-btn-h)', fontSize: 'var(--d-badge-font)' }}
                    onClick={() => handleApprove(entry)}
                    disabled={approvingIds.has(entry.id) || approveMutation.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Goed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-2.5 text-red-600 border-red-200 hover:bg-red-50" style={{ height: 'var(--d-btn-h)', fontSize: 'var(--d-badge-font)' }}
                    onClick={() => openRejectDialog(entry)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Afkeur
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-page-gap)' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--d-header-font)' }} className="font-bold text-slate-900">Goedkeuringen</h1>
        <p style={{ fontSize: 'var(--d-meta-font)' }} className="text-slate-500">Beheer en keur ingediende uren goed of af</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3" style={{ gap: 'var(--d-card-gap)' }}>
        <Card className="bg-amber-50 border-amber-200" style={{ borderRadius: 'var(--d-card-radius)' }}>
          <CardContent className="flex items-center" style={{ padding: 'var(--d-stat-py) var(--d-stat-px)', gap: 'var(--d-card-gap)' }}>
            <div className="bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 'var(--d-stat-icon)', height: 'var(--d-stat-icon)' }}>
              <Clock style={{ width: 'var(--d-icon)', height: 'var(--d-icon)' }} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-700 leading-tight" style={{ fontSize: 'var(--d-stat-num)' }}>{pendingEntries.length}</p>
              <p style={{ fontSize: 'var(--d-badge-font)' }} className="text-amber-600">Ter goedkeuring</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200" style={{ borderRadius: 'var(--d-card-radius)' }}>
          <CardContent className="flex items-center" style={{ padding: 'var(--d-stat-py) var(--d-stat-px)', gap: 'var(--d-card-gap)' }}>
            <div className="bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 'var(--d-stat-icon)', height: 'var(--d-stat-icon)' }}>
              <CheckCircle style={{ width: 'var(--d-icon)', height: 'var(--d-icon)' }} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-700 leading-tight" style={{ fontSize: 'var(--d-stat-num)' }}>{approvedEntries.length}</p>
              <p style={{ fontSize: 'var(--d-badge-font)' }} className="text-emerald-600">Goedgekeurd</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200" style={{ borderRadius: 'var(--d-card-radius)' }}>
          <CardContent className="flex items-center" style={{ padding: 'var(--d-stat-py) var(--d-stat-px)', gap: 'var(--d-card-gap)' }}>
            <div className="bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 'var(--d-stat-icon)', height: 'var(--d-stat-icon)' }}>
              <XCircle style={{ width: 'var(--d-icon)', height: 'var(--d-icon)' }} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700 leading-tight" style={{ fontSize: 'var(--d-stat-num)' }}>{rejectedEntries.length}</p>
              <p style={{ fontSize: 'var(--d-badge-font)' }} className="text-red-600">Afgekeurd</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Ter goedkeuring
            {pendingEntries.length > 0 && (
              <Badge className="bg-amber-500 text-white ml-1">{pendingEntries.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Goedgekeurd
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Afgekeurd
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-list-gap)' }}>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : pendingEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Alles is bijgewerkt!</h3>
              <p className="text-slate-500 mt-1">Er zijn geen uren ter goedkeuring.</p>
            </Card>
          ) : (
            pendingEntries.map(entry => renderEntryCard(entry, true))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-list-gap)' }}>
          {approvedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nog geen goedkeuringen</h3>
            </Card>
          ) : (
            <>
              {approvedEntries.slice(0, 20).map(entry => renderEntryCard(entry, false))}
              {approvedEntries.length > 20 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  Toont 20 van {approvedEntries.length} vermeldingen
                </p>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-list-gap)' }}>
          {rejectedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen afgewezen uren</h3>
            </Card>
          ) : (
            <>
              {rejectedEntries.slice(0, 20).map(entry => renderEntryCard(entry, false))}
              {rejectedEntries.length > 20 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  Toont 20 van {rejectedEntries.length} vermeldingen
                </p>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uren Afkeuren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reden van afkeuring</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Geef een reden op voor de afkeuring..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                Afkeuren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        setIsDetailDialogOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Tijdregistratie Details</span>
              {!isEditMode && selectedEntry?.status === 'Ingediend' && (() => {
                const entryYear = selectedEntry?.date ? new Date(selectedEntry.date).getFullYear() : null;
                const locked = selectedEntry?.date && entryYear && isDateInDefinitiefPeriode(selectedEntry.date, entryYear, loonperiodeStatuses);
                if (locked) return (
                  <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Vergrendeld
                  </Badge>
                );
                return (
                  <Button size="sm" variant="outline" onClick={() => setIsEditMode(true)}>
                    <Edit className="w-4 h-4 mr-1" /> Bewerken
                  </Button>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Medewerker</Label>
                  <p className="font-medium">
                    {(() => {
                      const emp = getEmployee(selectedEntry.employee_id);
                      return emp ? `${emp.first_name} ${emp.last_name}` : 'Onbekend';
                    })()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Badge className={
                    selectedEntry.status === 'Goedgekeurd' ? 'bg-emerald-100 text-emerald-700' :
                    selectedEntry.status === 'Afgekeurd' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {selectedEntry.status}
                  </Badge>
                </div>
              </div>

              {isEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start tijd</Label>
                      <Input
                        type="time"
                        value={editData.start_time}
                        onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Eind tijd</Label>
                      <Input
                        type="time"
                        value={editData.end_time}
                        onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Pauze (minuten)</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="manual-break"
                          checked={isManualBreak}
                          onCheckedChange={setIsManualBreak}
                        />
                        <label htmlFor="manual-break" className="text-sm text-slate-600 cursor-pointer">
                          Handmatig
                        </label>
                      </div>
                    </div>
                    <Input
                      type="number"
                      value={editData.break_minutes}
                      onChange={(e) => setEditData({ ...editData, break_minutes: parseInt(e.target.value, 10) || 0 })}
                      disabled={!isManualBreak}
                      className={!isManualBreak ? 'bg-slate-50 text-slate-500' : ''}
                    />
                  </div>
                  {editData.start_time && editData.end_time && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Totaal uren:</strong> {calculateHours(editData.start_time, editData.end_time, editData.break_minutes)} uur
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Opmerkingen</Label>
                    <Textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reden correctie *</Label>
                    <Textarea
                      value={editData.correction_reason}
                      onChange={(e) => setEditData({ ...editData, correction_reason: e.target.value })}
                      placeholder="Leg uit waarom deze tijdregistratie wordt aangepast..."
                      rows={2}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Datum</Label>
                      <p className="font-medium">
                        {selectedEntry.date ? format(new Date(selectedEntry.date), "EEEE d MMMM yyyy", { locale: nl }) : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Totaal uren</Label>
                      <p className="font-medium">{selectedEntry.total_hours || 0} uur</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Start tijd</Label>
                      <p className="font-medium">{selectedEntry.start_time || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Eind tijd</Label>
                      <p className="font-medium">{selectedEntry.end_time || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Pauze</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedEntry.break_minutes || 0} min</p>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Auto
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedEntry.notes && (
                    <div>
                      <Label className="text-xs text-slate-500">Opmerkingen</Label>
                      <p className="text-sm bg-slate-50 p-3 rounded-lg mt-1">{selectedEntry.notes}</p>
                    </div>
                  )}
                  {selectedEntry.signature_url && (
                    <div>
                      <Label className="text-xs text-slate-500">Handtekening</Label>
                      <img 
                        src={selectedEntry.signature_url} 
                        alt="Handtekening" 
                        className="h-20 border rounded mt-1"
                      />
                    </div>
                  )}
                  {selectedEntry.rejection_reason && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <Label className="text-xs text-slate-500">Reden afkeuring</Label>
                      <p className="text-sm text-red-700 mt-1">{selectedEntry.rejection_reason}</p>
                    </div>
                  )}
                  {selectedEntry.edit_history && selectedEntry.edit_history.length > 0 && (
                    <div>
                      <Label className="text-xs text-slate-500 mb-2 block">Correctie Geschiedenis</Label>
                      <div className="space-y-2">
                        {selectedEntry.edit_history.map((edit, idx) => (
                          <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-xs text-amber-600 font-medium">
                                Correctie {idx + 1} door {edit.edited_by}
                              </p>
                              <p className="text-xs text-amber-600">
                                {format(new Date(edit.edited_at), "d MMM yyyy HH:mm", { locale: nl })}
                              </p>
                            </div>
                            <p className="text-sm text-amber-900 mb-2">
                              <strong>Reden:</strong> {edit.reason}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-amber-600 font-medium">Voor:</p>
                                <p className="text-amber-900">
                                  {edit.original_data.start_time} - {edit.original_data.end_time} 
                                  ({edit.original_data.total_hours}u)
                                </p>
                              </div>
                              <div>
                                <p className="text-amber-600 font-medium">Na:</p>
                                <p className="text-amber-900">
                                  {edit.new_data.start_time} - {edit.new_data.end_time} 
                                  ({edit.new_data.total_hours}u)
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsEditMode(false);
                  }}
                >
                  {isEditMode ? 'Annuleren' : 'Sluiten'}
                </Button>
                {isEditMode && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending || !editData.correction_reason}
                  >
                    Opslaan
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}