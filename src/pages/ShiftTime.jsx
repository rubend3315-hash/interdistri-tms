import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  Calendar,
  MessageSquare,
  Edit,
  Trash2
} from "lucide-react";
import CCRow, { CCZone1, CCZone2, CCZone3, CCZone4, CCId, CCBadge, CCMeta, CCList } from "@/components/control-center/CCRow";

export default function ShiftTime() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const queryClient = useQueryClient();

  const { data: shiftTimes = [], isLoading } = useQuery({
    queryKey: ['shiftTimes'],
    queryFn: () => base44.entities.ShiftTime.list('-date', 100)
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftTime.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTimes'] });
      setIsDialogOpen(false);
      setSelectedShift(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftTime.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTimes'] });
      setIsDialogOpen(false);
      setSelectedShift(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftTime.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTimes'] });
    }
  });

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    department: "PakketDistributie",
    service_start_time: "06:00",
    start_time: "",
    end_time: "",
    message: ""
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      department: "PakketDistributie",
      service_start_time: "06:00",
      start_time: "",
      end_time: "",
      message: ""
    });
  };

  const openEditDialog = (shift) => {
    setSelectedShift(shift);
    setFormData({
      date: shift.date,
      department: shift.department,
      service_start_time: shift.service_start_time || "",
      start_time: shift.start_time || "",
      end_time: shift.end_time || "",
      message: shift.message || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedShift(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      created_by_name: user?.full_name || user?.email
    };

    if (selectedShift) {
      updateMutation.mutate({ id: selectedShift.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Groepeer shifttimes per afdeling
  const shiftsByDepartment = shiftTimes.reduce((acc, shift) => {
    const dept = shift.department || 'Onbekend';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(shift);
    return acc;
  }, {});

  return (
    <div className="max-w-[1400px] mx-auto pb-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-page-gap)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 'var(--d-header-font)' }} className="font-bold text-slate-900">Dienst-Shifttijd</h1>
          <p style={{ fontSize: 'var(--d-meta-font)' }} className="text-slate-500">Communicatie van starttijden voor PakketDistributie</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Shifttijd
        </Button>
      </div>

      {/* Shift List - Grouped by Department */}
      <Card style={{ borderRadius: 'var(--d-card-radius)' }}>
        <CardContent style={{ padding: 'var(--d-card-px)' }}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : shiftTimes.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-slate-900">Nog geen shifttijden</h3>
              <p className="text-xs text-slate-500 mt-1">Voeg een shifttijd toe om te beginnen.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--d-page-gap)' }}>
              {Object.entries(shiftsByDepartment).map(([department, shifts]) => (
                <div key={department}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                      {department}
                    </Badge>
                    <span className="text-xs text-slate-400">({shifts.length})</span>
                  </div>
                  <CCList>
                    {shifts.map(shift => (
                      <CCRow key={shift.id} className={shift.date === todayStr ? '!bg-blue-50/50' : ''}>
                        <CCZone1>
                          <CCId>{shift.service_start_time}</CCId>
                          {shift.date === todayStr && <CCBadge className="bg-blue-600 text-white">Vandaag</CCBadge>}
                          {shift.message && <span className="rail-meta hidden md:inline truncate max-w-[200px]" title={shift.message}>{shift.message}</span>}
                        </CCZone1>
                        <CCZone2>
                          <CCMeta>{format(new Date(shift.date), "EEE d MMM", { locale: nl })}</CCMeta>
                          {shift.start_time && shift.end_time && <CCMeta>{shift.start_time}–{shift.end_time}</CCMeta>}
                        </CCZone2>
                        <CCZone3 />
                        <CCZone4>
                          <button 
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                            onClick={() => openEditDialog(shift)}
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </button>
                          <button 
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                            onClick={() => {
                              if (confirm('Weet je zeker dat je deze shifttijd wilt verwijderen?')) {
                                deleteMutation.mutate(shift.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </CCZone4>
                      </CCRow>
                    ))}
                  </CCList>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedShift ? 'Shifttijd Bewerken' : 'Nieuwe Shifttijd'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Afdeling</Label>
              <Select
                value={formData.department}
                onValueChange={(v) => setFormData({ ...formData, department: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="PakketDistributie">PakketDistributie</SelectItem>
                  <SelectItem value="Charters">Charters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Dienst (HH:MM) *</Label>
              <Input
                type="time"
                value={formData.service_start_time}
                onChange={(e) => setFormData({ ...formData, service_start_time: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shifttijd van (HH:MM)</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>tot (HH:MM)</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bericht (optioneel)</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Extra informatie voor de chauffeurs..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}