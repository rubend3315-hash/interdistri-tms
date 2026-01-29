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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Car,
  FileText
} from "lucide-react";

export default function Approvals() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const queryClient = useQueryClient();

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['timeEntries-all'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const approveMutation = useMutation({
    mutationFn: (entry) => base44.entities.TimeEntry.update(entry.id, {
      status: 'Goedgekeurd',
      approved_by: user?.email,
      approved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-all'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ entry, reason }) => base44.entities.TimeEntry.update(entry.id, {
      status: 'Afgekeurd',
      rejection_reason: reason,
      approved_by: user?.email,
      approved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries-all'] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
    }
  });

  const handleApprove = (entry) => {
    approveMutation.mutate(entry);
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

  const getEmployee = (id) => employees.find(e => e.id === id);
  const getVehicle = (id) => vehicles.find(v => v.id === id);

  const sortByDateDesc = (entries) => 
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  const pendingEntries = sortByDateDesc(timeEntries.filter(e => e.status === 'Ingediend'));
  const approvedEntries = sortByDateDesc(timeEntries.filter(e => e.status === 'Goedgekeurd'));
  const rejectedEntries = sortByDateDesc(timeEntries.filter(e => e.status === 'Afgekeurd'));

  const EntryCard = ({ entry, showActions = false }) => {
    const employee = getEmployee(entry.employee_id);
    const vehicle = getVehicle(entry.vehicle_id);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                </h3>
                <p className="text-sm text-slate-500">{employee?.department}</p>
                
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {entry.date && format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: nl })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {entry.start_time} - {entry.end_time} ({entry.total_hours} uur)
                  </div>
                  {vehicle && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Car className="w-4 h-4 text-slate-400" />
                      {vehicle.license_plate}
                    </div>
                  )}
                  {entry.travel_allowance_multiplier > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Reiskosten: {entry.travel_allowance_multiplier}x
                    </div>
                  )}
                </div>

                {entry.notes && (
                  <p className="mt-3 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                    {entry.notes}
                  </p>
                )}

                {entry.rejection_reason && (
                  <div className="mt-3 p-2 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Reden afkeuring:</strong> {entry.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge className={`${
                entry.shift_type === 'Dag' ? 'bg-amber-100 text-amber-700' :
                entry.shift_type === 'Avond' ? 'bg-orange-100 text-orange-700' :
                entry.shift_type === 'Nacht' ? 'bg-indigo-100 text-indigo-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {entry.shift_type}
              </Badge>

              {showActions && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(entry)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Goedkeuren
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => openRejectDialog(entry)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Afkeuren
                  </Button>
                </div>
              )}

              {entry.approved_by && (
                <p className="text-xs text-slate-500 mt-2">
                  Door {entry.approved_by}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Goedkeuringen</h1>
        <p className="text-slate-500 mt-1">Beheer en keur ingediende uren goed of af</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{pendingEntries.length}</p>
              <p className="text-sm text-amber-600">Ter goedkeuring</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{approvedEntries.length}</p>
              <p className="text-sm text-emerald-600">Goedgekeurd</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{rejectedEntries.length}</p>
              <p className="text-sm text-red-600">Afgekeurd</p>
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

        <TabsContent value="pending" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : pendingEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Alles is bijgewerkt!</h3>
              <p className="text-slate-500 mt-1">Er zijn geen uren ter goedkeuring.</p>
            </Card>
          ) : (
            pendingEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} showActions />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6 space-y-4">
          {approvedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nog geen goedkeuringen</h3>
            </Card>
          ) : (
            approvedEntries.slice(0, 20).map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6 space-y-4">
          {rejectedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen afgewezen uren</h3>
            </Card>
          ) : (
            rejectedEntries.slice(0, 20).map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))
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
    </div>
  );
}