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

export default function ShiftTime() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const queryClient = useQueryClient();

  const { data: shiftTimes = [], isLoading } = useQuery({
    queryKey: ['shiftTimes'],
    queryFn: () => base44.entities.ShiftTime.list('-date', 50)
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
    start_time: "06:00",
    end_time: "",
    message: ""
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      department: "PakketDistributie",
      start_time: "06:00",
      end_time: "",
      message: ""
    });
  };

  const openEditDialog = (shift) => {
    setSelectedShift(shift);
    setFormData({
      date: shift.date,
      department: shift.department,
      start_time: shift.start_time,
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
  const todayShift = shiftTimes.find(s => s.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dienst-Shifttijd</h1>
          <p className="text-slate-500 mt-1">Communicatie van starttijden voor PakketDistributie</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Shifttijd
        </Button>
      </div>

      {/* Today's Shift */}
      {todayShift && (
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Vandaag - {format(new Date(), "EEEE d MMMM", { locale: nl })}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Clock className="w-8 h-8" />
                  <span className="text-4xl font-bold">
                    {todayShift.start_time}
                    {todayShift.end_time && ` - ${todayShift.end_time}`}
                  </span>
                </div>
                {todayShift.message && (
                  <p className="mt-4 text-blue-100 bg-blue-500/30 p-3 rounded-lg">
                    {todayShift.message}
                  </p>
                )}
              </div>
              <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                {todayShift.department}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift List */}
      <Card>
        <CardHeader>
          <CardTitle>Shifttijden Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : shiftTimes.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nog geen shifttijden</h3>
              <p className="text-slate-500 mt-1">Voeg een shifttijd toe om te beginnen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shiftTimes.map(shift => (
                <div 
                  key={shift.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    shift.date === todayStr 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        shift.date === todayStr ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        <Clock className={`w-6 h-6 ${
                          shift.date === todayStr ? 'text-blue-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-2xl text-slate-900">
                            {shift.start_time}
                            {shift.end_time && ` - ${shift.end_time}`}
                          </span>
                          {shift.date === todayStr && (
                            <Badge className="bg-blue-600">Vandaag</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          {format(new Date(shift.date), "EEEE d MMMM yyyy", { locale: nl })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {shift.message && (
                        <div className="hidden md:block max-w-xs">
                          <p className="text-sm text-slate-600 truncate">
                            <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                            {shift.message}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(shift)}
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm('Weet je zeker dat je deze shifttijd wilt verwijderen?')) {
                              deleteMutation.mutate(shift.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {shift.message && (
                    <div className="md:hidden mt-3 p-2 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">{shift.message}</p>
                    </div>
                  )}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shifttijd van</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Shifttijd tot</Label>
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