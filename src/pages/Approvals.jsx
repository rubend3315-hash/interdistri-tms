import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
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
import Pagination, { usePagination } from "@/components/ui/Pagination";
import ApprovalsFilters from "@/components/approvals/ApprovalsFilters";
import LinkedActivitiesPanel from "@/components/approvals/LinkedActivitiesPanel";

const DEFAULT_FROM = format(subDays(new Date(), 14), 'yyyy-MM-dd');
const TODAY = format(new Date(), 'yyyy-MM-dd');

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
  const pendingPage = usePagination(20);
  const approvedPage = usePagination(20);
  const rejectedPage = usePagination(20);

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState(DEFAULT_FROM);
  const [filterDateTo, setFilterDateTo] = useState(TODAY);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterShiftType, setFilterShiftType] = useState("all");

  const resetFilters = () => {
    setFilterDateFrom(DEFAULT_FROM);
    setFilterDateTo(TODAY);
    setFilterEmployee("all");
    setFilterSearch("");
    setFilterShiftType("all");
    pendingPage.resetPage();
    approvedPage.resetPage();
    rejectedPage.resetPage();
  };

  // Server-side filtered query: pending always ALL (workflow), history by date range
  const qOpts = { staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false };

  const { data: pendingRaw = [], isLoading: loadingPending } = useQuery({
    queryKey: ['timeEntries-pending'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'Ingediend' }),
    ...qOpts,
  });

  const { data: historyRaw = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['timeEntries-history', filterDateFrom, filterDateTo],
    queryFn: () => {
      const filter = {};
      if (filterDateFrom) filter.date = { ...(filter.date || {}), $gte: filterDateFrom };
      if (filterDateTo) filter.date = { ...(filter.date || {}), $lte: filterDateTo };
      return base44.entities.TimeEntry.filter(filter);
    },
    enabled: activeTab !== 'pending', // only load history when viewing those tabs
    ...qOpts,
  });

  // Combine for overlap detection (pending + visible history)
  const allLoadedEntries = useMemo(() => {
    const map = new Map();
    pendingRaw.forEach(e => map.set(e.id, e));
    historyRaw.forEach(e => map.set(e.id, e));
    return Array.from(map.values());
  }, [pendingRaw, historyRaw]);

  const isLoading = loadingPending || (activeTab !== 'pending' && loadingHistory);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: loonperiodeStatuses = [] } = useQuery({
    queryKey: ['loonperiodeStatuses'],
    queryFn: () => base44.entities.LoonperiodeStatus.list(),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false,
  });

  const { data: activiteiten = [] } = useQuery({
    queryKey: ['activiteiten'],
    queryFn: () => base44.entities.Activiteit.list(),
    staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false,
  });

  // Fetch linked trips and standplaatswerk for pending entries
  const pendingIds = useMemo(() => pendingRaw.map(e => e.id), [pendingRaw]);

  const { data: linkedTrips = [] } = useQuery({
    queryKey: ['linkedTrips', pendingIds],
    queryFn: () => base44.entities.Trip.filter({ time_entry_id: { $in: pendingIds } }),
    enabled: pendingIds.length > 0,
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const { data: linkedSpw = [] } = useQuery({
    queryKey: ['linkedSpw', pendingIds],
    queryFn: () => base44.entities.StandplaatsWerk.filter({ time_entry_id: { $in: pendingIds } }),
    enabled: pendingIds.length > 0,
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  // Fetch TripRecords (GPS Buddy) for pending entries via employee_id + date matching
  const pendingDates = useMemo(() => {
    const dates = new Set();
    pendingRaw.forEach(e => {
      if (e.date) dates.add(e.date);
      if (e.end_date && e.end_date !== e.date) dates.add(e.end_date);
    });
    return Array.from(dates);
  }, [pendingRaw]);

  const pendingEmployeeIds = useMemo(() => {
    const ids = new Set();
    pendingRaw.forEach(e => { if (e.employee_id) ids.add(e.employee_id); });
    return Array.from(ids);
  }, [pendingRaw]);

  const { data: tripRecordLinks = [] } = useQuery({
    queryKey: ['tripRecordLinks', pendingEmployeeIds, pendingDates],
    queryFn: () => base44.entities.TripRecordLink.filter({
      employee_id: { $in: pendingEmployeeIds },
      date: { $in: pendingDates },
    }),
    enabled: pendingEmployeeIds.length > 0 && pendingDates.length > 0,
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const tripRecordIds = useMemo(() => tripRecordLinks.map(l => l.trip_record_id).filter(Boolean), [tripRecordLinks]);

  const { data: tripRecords = [] } = useQuery({
    queryKey: ['tripRecords-approvals', tripRecordIds],
    queryFn: () => base44.entities.TripRecord.filter({ id: { $in: tripRecordIds } }),
    enabled: tripRecordIds.length > 0,
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  // Map TripRecords per employee+date for quick lookup
  const tripRecordsByEmployeeDate = useMemo(() => {
    const linkMap = {};
    tripRecordLinks.forEach(l => {
      if (!l.employee_id || !l.date || !l.trip_record_id) return;
      const key = `${l.employee_id}_${l.date}`;
      if (!linkMap[key]) linkMap[key] = [];
      linkMap[key].push(l.trip_record_id);
    });
    const recordMap = {};
    tripRecords.forEach(r => { recordMap[r.id] = r; });
    const result = {};
    for (const [key, ids] of Object.entries(linkMap)) {
      result[key] = ids.map(id => recordMap[id]).filter(Boolean);
    }
    return result;
  }, [tripRecordLinks, tripRecords]);

  const tripsByTimeEntry = useMemo(() => {
    const map = {};
    linkedTrips.forEach(t => {
      if (!t.time_entry_id) return;
      if (!map[t.time_entry_id]) map[t.time_entry_id] = [];
      map[t.time_entry_id].push(t);
    });
    return map;
  }, [linkedTrips]);

  const spwByTimeEntry = useMemo(() => {
    const map = {};
    linkedSpw.forEach(s => {
      if (!s.time_entry_id) return;
      if (!map[s.time_entry_id]) map[s.time_entry_id] = [];
      map[s.time_entry_id].push(s);
    });
    return map;
  }, [linkedSpw]);

  const approveMutation = useMutation({
    mutationFn: async (entry) => {
      const response = await base44.functions.invoke('approveTimeEntry', { time_entry_id: entry.id });
      if (!response.data?.success) throw new Error(response.data?.message || 'Goedkeuren mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-pending'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries-history'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ entry, reason }) => {
      const response = await base44.functions.invoke('rejectTimeEntry', { time_entry_id: entry.id, rejection_reason: reason });
      if (!response.data?.success) throw new Error(response.data?.message || 'Afkeuren mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-pending'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries-history'] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Admin edit with overlap validation + approve via adminUpdateTimeEntry
      const response = await base44.functions.invoke('adminUpdateTimeEntry', {
        time_entry_id: selectedEntry.id,
        data: { ...data, status: 'Goedgekeurd' }
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Opslaan mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-pending'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries-history'] });
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

  // Client-side filter function (employee + search + shift type)
  const applyClientFilters = (entries) => {
    let result = entries;
    if (filterEmployee !== "all") {
      result = result.filter(e => e.employee_id === filterEmployee);
    }
    if (filterShiftType !== "all") {
      result = result.filter(e => e.shift_type === filterShiftType);
    }
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      result = result.filter(e => {
        const emp = getEmployee(e.employee_id);
        const empName = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
        return empName.includes(q) || (e.notes || '').toLowerCase().includes(q);
      });
    }
    return result;
  };

  const pendingEntries = sortByDateDesc(applyClientFilters(pendingRaw));
  const approvedEntries = sortByDateDesc(
    applyClientFilters(historyRaw.filter(e => e?.status === 'Goedgekeurd'))
  );
  const rejectedEntries = sortByDateDesc(
    applyClientFilters(historyRaw.filter(e => e?.status === 'Afgekeurd'))
  );

  // Detect overlap between time entries for same employee+date
  const getEntryOverlaps = (entry) => {
    if (!entry.start_time || !entry.end_time || !entry.employee_id || !entry.date) return [];
    const [sH, sM] = entry.start_time.split(':').map(Number);
    const [eH, eM] = entry.end_time.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    return allLoadedEntries.filter((te) => {
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
    const entryTrips = showActions ? (tripsByTimeEntry[entry.id] || []) : [];
    const entrySpw = showActions ? (spwByTimeEntry[entry.id] || []) : [];
    const entryTripRecords = showActions ? (() => {
      const allRecords = [
        ...(tripRecordsByEmployeeDate[`${entry.employee_id}_${entry.date}`] || []),
        ...(entry.end_date && entry.end_date !== entry.date ? (tripRecordsByEmployeeDate[`${entry.employee_id}_${entry.end_date}`] || []) : []),
      ];
      // Filter GPS records: only those whose start_time falls within the shift window
      // Use absolute datetime comparison (not just HH:MM) to avoid cross-night ambiguity
      if (!entry.start_time || !entry.end_time || !entry.date || allRecords.length === 0) return allRecords;
      const [sH, sM] = entry.start_time.split(':').map(Number);
      const [eH, eM] = entry.end_time.split(':').map(Number);
      // Build absolute shift start/end as Date objects
      const shiftStartDate = new Date(`${entry.date}T${entry.start_time}:00`);
      const isOvernight = eH < sH || (eH === sH && eM <= sM);
      const endDateStr = isOvernight ? (entry.end_date || entry.date) : entry.date;
      const shiftEndDate = new Date(`${endDateStr}T${entry.end_time}:00`);
      // If overnight and no end_date, add 1 day to end
      if (isOvernight && !entry.end_date) shiftEndDate.setDate(shiftEndDate.getDate() + 1);
      const tolerance = 15 * 60 * 1000; // 15 min in ms
      return allRecords.filter(r => {
        if (!r.start_time) return true;
        try {
          const rStart = new Date(r.start_time);
          return rStart >= new Date(shiftStartDate.getTime() - tolerance) &&
                 rStart <= new Date(shiftEndDate.getTime() + tolerance);
        } catch { return true; }
      });
    })() : [];
    const hasLinked = entryTrips.length > 0 || entrySpw.length > 0 || entryTripRecords.length > 0;

    return (
      <div key={entry.id}>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: avatar + info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
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
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                  className="h-8 px-2.5 text-xs"
                  onClick={() => openDetailDialog(entry)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Bekijk
                </Button>
                {showActions && !entryLocked && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(entry)}
                      disabled={approvingIds.has(entry.id) || approveMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Goed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
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
        {showActions && hasLinked && (
          <LinkedActivitiesPanel
            trips={entryTrips}
            standplaatsWerk={entrySpw}
            tripRecords={entryTripRecords}
            vehicles={vehicles}
            customers={customers}
            projects={projects}
            activiteiten={activiteiten}
            employees={employees}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Goedkeuringen</h1>
        <p className="text-sm text-slate-500">Beheer en keur ingediende uren goed of af</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-[18px] h-[18px] text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-700 leading-tight">{pendingEntries.length}</p>
              <p className="text-xs text-amber-600">Ter goedkeuring</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-[18px] h-[18px] text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-emerald-700 leading-tight">{approvedEntries.length}</p>
              <p className="text-xs text-emerald-600">Goedgekeurd</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <XCircle className="w-[18px] h-[18px] text-red-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-red-700 leading-tight">{rejectedEntries.length}</p>
              <p className="text-xs text-red-600">Afgekeurd</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <ApprovalsFilters
            dateFrom={filterDateFrom}
            dateTo={filterDateTo}
            selectedEmployee={filterEmployee}
            searchQuery={filterSearch}
            filterShiftType={filterShiftType}
            onDateFromChange={(v) => { setFilterDateFrom(v); pendingPage.resetPage(); approvedPage.resetPage(); rejectedPage.resetPage(); }}
            onDateToChange={(v) => { setFilterDateTo(v); pendingPage.resetPage(); approvedPage.resetPage(); rejectedPage.resetPage(); }}
            onEmployeeChange={(v) => { setFilterEmployee(v); pendingPage.resetPage(); approvedPage.resetPage(); rejectedPage.resetPage(); }}
            onSearchChange={(v) => { setFilterSearch(v); pendingPage.resetPage(); approvedPage.resetPage(); rejectedPage.resetPage(); }}
            onShiftTypeChange={(v) => { setFilterShiftType(v); pendingPage.resetPage(); approvedPage.resetPage(); rejectedPage.resetPage(); }}
            employees={employees}
            onReset={resetFilters}
          />
        </CardContent>
      </Card>

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

        <TabsContent value="pending" className="mt-4 space-y-3">
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
            <>
              {pendingPage.paginateItems(pendingEntries).map(entry => renderEntryCard(entry, true))}
              <Pagination
                totalItems={pendingEntries.length}
                currentPage={pendingPage.currentPage}
                pageSize={pendingPage.pageSize}
                onPageChange={pendingPage.setCurrentPage}
                onPageSizeChange={pendingPage.handlePageSizeChange}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approvedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nog geen goedkeuringen</h3>
            </Card>
          ) : (
            <>
              {approvedPage.paginateItems(approvedEntries).map(entry => renderEntryCard(entry, false))}
              <Pagination
                totalItems={approvedEntries.length}
                currentPage={approvedPage.currentPage}
                pageSize={approvedPage.pageSize}
                onPageChange={approvedPage.setCurrentPage}
                onPageSizeChange={approvedPage.handlePageSizeChange}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejectedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen afgewezen uren</h3>
            </Card>
          ) : (
            <>
              {rejectedPage.paginateItems(rejectedEntries).map(entry => renderEntryCard(entry, false))}
              <Pagination
                totalItems={rejectedEntries.length}
                currentPage={rejectedPage.currentPage}
                pageSize={rejectedPage.pageSize}
                onPageChange={rejectedPage.setCurrentPage}
                onPageSizeChange={rejectedPage.handlePageSizeChange}
              />
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
                  {/* Herindiening context: show previous rejection if this is a resubmission */}
                  {selectedEntry.status === 'Ingediend' && (() => {
                    const previousRejected = allLoadedEntries.find(e =>
                      e.id !== selectedEntry.id &&
                      e.employee_id === selectedEntry.employee_id &&
                      e.date === selectedEntry.date &&
                      e.status === 'Afgekeurd' &&
                      e.rejection_reason
                    );
                    if (!previousRejected) return null;
                    return (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Label className="text-xs text-blue-600 font-medium mb-2 block">Herindiening na afkeuring</Label>
                        <div className="p-2 bg-red-50 border border-red-100 rounded mb-2">
                          <p className="text-xs text-red-600 font-medium">Afkeuringsreden:</p>
                          <p className="text-sm text-red-700">{previousRejected.rejection_reason}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-blue-600 font-medium">Vorige indiening:</p>
                            <p className="text-blue-900">
                              {previousRejected.start_time} - {previousRejected.end_time} ({previousRejected.total_hours}u)
                            </p>
                          </div>
                          <div>
                            <p className="text-blue-600 font-medium">Nieuwe indiening:</p>
                            <p className="text-blue-900">
                              {selectedEntry.start_time} - {selectedEntry.end_time} ({selectedEntry.total_hours}u)
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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