import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, CheckCircle, XCircle, Search, CalendarDays } from "lucide-react";
import LeaveRequestCard from "@/components/leave/LeaveRequestCard";
import LeaveDetailDialog from "@/components/leave/LeaveDetailDialog";
import LeaveRejectDialog from "@/components/leave/LeaveRejectDialog";
import LeaveCreateDialog from "@/components/leave/LeaveCreateDialog";

const qOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: () => base44.entities.LeaveRequest.filter({}, "-created_date", 200),
    ...qOpts,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const empMap = useMemo(() => {
    const map = {};
    employees.forEach(e => { map[e.id] = e; });
    return map;
  }, [employees]);

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      await base44.entities.LeaveRequest.update(req.id, {
        status: "Goedgekeurd",
        approved_by: user?.email,
        approved_date: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaveRequests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ req, reason }) => {
      await base44.entities.LeaveRequest.update(req.id, {
        status: "Afgekeurd",
        approved_by: user?.email,
        approved_date: new Date().toISOString(),
        rejection_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
      setRejectOpen(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.LeaveRequest.create({
        ...data,
        status: "Aangevraagd",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
      setCreateOpen(false);
    },
  });

  const handleApprove = (req) => {
    setApprovingId(req.id);
    approveMutation.mutate(req, { onSettled: () => setApprovingId(null) });
  };

  const handleReject = (reason) => {
    rejectMutation.mutate({ req: selectedRequest, reason });
  };

  const handleView = (req) => {
    setSelectedRequest(req);
    setDetailOpen(true);
  };

  const openReject = (req) => {
    setSelectedRequest(req);
    setRejectOpen(true);
  };

  const applyFilters = (entries) => {
    let result = entries;
    if (filterType !== "all") {
      result = result.filter(e => e.leave_type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => {
        const emp = empMap[e.employee_id];
        const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : "";
        return name.includes(q) || (e.reason || "").toLowerCase().includes(q);
      });
    }
    return result;
  };

  const pending = applyFilters(leaveRequests.filter(r => r.status === "Aangevraagd"));
  const approved = applyFilters(leaveRequests.filter(r => r.status === "Goedgekeurd"));
  const rejected = applyFilters(leaveRequests.filter(r => r.status === "Afgekeurd"));

  const leaveTypes = [...new Set(leaveRequests.map(r => r.leave_type).filter(Boolean))].sort();

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verlof & Ziekte</h1>
          <p className="text-sm text-slate-500">Beheer verlofaanvragen en ziekmeldingen</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nieuwe aanvraag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-[18px] h-[18px] text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-700 leading-tight">{pending.length}</p>
              <p className="text-xs text-amber-600">Openstaand</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-[18px] h-[18px] text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-emerald-700 leading-tight">{approved.length}</p>
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
              <p className="text-xl font-semibold text-red-700 leading-tight">{rejected.length}</p>
              <p className="text-xs text-red-600">Afgekeurd</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek medewerker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Alle types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                {leaveTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" /> Openstaand
            {pending.length > 0 && <Badge className="bg-amber-500 text-white ml-1">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" /> Goedgekeurd
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" /> Afgekeurd
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : pending.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen openstaande aanvragen</h3>
              <p className="text-slate-500 mt-1">Alle verlofaanvragen zijn verwerkt.</p>
            </Card>
          ) : (
            pending.map(r => (
              <LeaveRequestCard
                key={r.id}
                request={r}
                employee={empMap[r.employee_id]}
                showActions
                onApprove={handleApprove}
                onReject={openReject}
                onView={handleView}
                approvingId={approvingId}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen goedgekeurde aanvragen</h3>
            </Card>
          ) : (
            approved.map(r => (
              <LeaveRequestCard key={r.id} request={r} employee={empMap[r.employee_id]} onView={handleView} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejected.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen afgekeurde aanvragen</h3>
            </Card>
          ) : (
            rejected.map(r => (
              <LeaveRequestCard key={r.id} request={r} employee={empMap[r.employee_id]} onView={handleView} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <LeaveDetailDialog open={detailOpen} onOpenChange={setDetailOpen} request={selectedRequest} employee={selectedRequest ? empMap[selectedRequest.employee_id] : null} />
      <LeaveRejectDialog open={rejectOpen} onOpenChange={setRejectOpen} onConfirm={handleReject} isPending={rejectMutation.isPending} />
      <LeaveCreateDialog open={createOpen} onOpenChange={setCreateOpen} employees={employees} onSubmit={(data) => createMutation.mutate(data)} isPending={createMutation.isPending} />
    </div>
  );
}