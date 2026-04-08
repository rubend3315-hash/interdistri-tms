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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Clock,
  Calendar,
  MessageSquare,
  Edit,
  Trash2
} from "lucide-react";

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

  const [activeTab, setActiveTab] = useState("PakketDistributie");
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const DEPARTMENTS = ["PakketDistributie", "Dagspecial Netwerk", "Transport", "Charters", "Management"];
  
  // Groepeer shifttimes per afdeling
  const shiftsByDepartment = shiftTimes.reduce((acc, shift) => {
    const dept = shift.department || 'Onbekend';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(shift);
    return acc;
  }, {});

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dienst-Shifttijd</h1>
          <p className="text-sm text-slate-500">Communicatie van starttijden voor PakketDistributie</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Shifttijd
        </Button>
      </div>

      {/* Shift List - Tabs per Department */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-3">
          {DEPARTMENTS.map(dept => (
            <TabsTrigger key={dept} value={dept} className="text-xs">
              {dept}
              {(shiftsByDepartment[dept]?.length || 0) > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0">
                  {shiftsByDepartment[dept].length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {DEPARTMENTS.map(dept => {
          const shifts = shiftsByDepartment[dept] || [];
          return (
            <TabsContent key={dept} value={dept}>
              <Card>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : shifts.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-slate-900">Geen shifttijden voor {dept}</h3>
                      <p className="text-xs text-slate-500 mt-1">Voeg een shifttijd toe om te beginnen.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shifts.map(shift => (
                        <div 
                          key={shift.id}
                          className={`px-4 py-3 rounded-xl border transition-colors ${
                            shift.date === todayStr 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                shift.date === todayStr ? 'bg-blue-100' : 'bg-slate-100'
                              }`}>
                                <Clock className={`w-[18px] h-[18px] ${
                                  shift.date === todayStr ? 'text-blue-600' : 'text-slate-600'
                                }`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg leading-tight text-slate-900">
                                    {shift.service_start_time}
                                  </span>
                                  {shift.date === todayStr && (
                                    <Badge className="bg-blue-600 text-[11px] px-2 py-0 leading-5">Vandaag</Badge>
                                  )}
                                  {shift.start_time && shift.end_time && (
                                    <span className="text-xs text-slate-400">({shift.start_time}–{shift.end_time})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {format(new Date(shift.date), "EEE d MMM", { locale: nl })}
                                  </span>
                                  {shift.message && (
                                    <span className="hidden md:flex items-center gap-1 truncate max-w-[280px]" title={shift.message}>
                                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      {shift.message}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
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
                            </div>
                          </div>
                          
                          {shift.message && (
                            <p className="md:hidden text-[11px] text-slate-500 mt-1.5 bg-slate-50 rounded px-2 py-1 truncate">
                              {shift.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

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
                  <SelectItem value="Dagspecial Netwerk">Dagspecial Netwerk</SelectItem>
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