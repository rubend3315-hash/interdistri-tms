import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, getYear } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar,
  Star,
  Trash2
} from "lucide-react";

export default function Holidays() {
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const queryClient = useQueryClient();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', selectedYear],
    queryFn: () => base44.entities.Holiday.filter({ year: selectedYear })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setIsDialogOpen(false);
      setSelectedHoliday(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setIsDialogOpen(false);
      setSelectedHoliday(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    year: selectedYear,
    is_national: true
  });

  const resetForm = () => {
    setFormData({
      name: "",
      date: "",
      year: selectedYear,
      is_national: true
    });
  };

  const openEditDialog = (holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      year: holiday.year,
      is_national: holiday.is_national !== false
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedHoliday(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      year: formData.date ? getYear(new Date(formData.date)) : selectedYear
    };

    if (selectedHoliday) {
      updateMutation.mutate({ id: selectedHoliday.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const sortedHolidays = [...holidays].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  // Standard Dutch holidays template
  const standardHolidays = [
    { name: "Nieuwjaarsdag", date: `${selectedYear}-01-01` },
    { name: "Goede Vrijdag", date: "" }, // Date varies
    { name: "Eerste Paasdag", date: "" }, // Date varies
    { name: "Tweede Paasdag", date: "" }, // Date varies
    { name: "Koningsdag", date: `${selectedYear}-04-27` },
    { name: "Bevrijdingsdag", date: `${selectedYear}-05-05` },
    { name: "Hemelvaartsdag", date: "" }, // Date varies
    { name: "Eerste Pinksterdag", date: "" }, // Date varies
    { name: "Tweede Pinksterdag", date: "" }, // Date varies
    { name: "Eerste Kerstdag", date: `${selectedYear}-12-25` },
    { name: "Tweede Kerstdag", date: `${selectedYear}-12-26` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Feestdagen</h1>
          <p className="text-slate-500 mt-1">Beheer feestdagen voor planning en toeslagen</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Feestdag
          </Button>
        </div>
      </div>

      {/* Holidays List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Feestdagen {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : sortedHolidays.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen feestdagen voor {selectedYear}</h3>
              <p className="text-slate-500 mt-1">Voeg feestdagen toe voor dit jaar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHolidays.map(holiday => (
                <div 
                  key={holiday.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => openEditDialog(holiday)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{holiday.name}</h3>
                      <p className="text-sm text-slate-500">
                        {holiday.date && format(new Date(holiday.date), "EEEE d MMMM yyyy", { locale: nl })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {holiday.is_national && (
                      <Badge className="bg-purple-100 text-purple-700">Nationaal</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Weet je zeker dat je deze feestdag wilt verwijderen?')) {
                          deleteMutation.mutate(holiday.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Template */}
      {holidays.length < 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standaard Nederlandse feestdagen toevoegen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              Klik op een feestdag om deze toe te voegen aan {selectedYear}.
            </p>
            <div className="flex flex-wrap gap-2">
              {standardHolidays.map(h => {
                const exists = holidays.some(hol => hol.name === h.name);
                return (
                  <Button
                    key={h.name}
                    variant="outline"
                    size="sm"
                    disabled={exists}
                    onClick={() => {
                      setFormData({
                        name: h.name,
                        date: h.date,
                        year: selectedYear,
                        is_national: true
                      });
                      setSelectedHoliday(null);
                      setIsDialogOpen(true);
                    }}
                    className={exists ? "opacity-50" : ""}
                  >
                    {h.name}
                    {exists && " ✓"}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedHoliday ? 'Feestdag Bewerken' : 'Nieuwe Feestdag'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="bijv. Koningsdag"
              />
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

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_national}
                onCheckedChange={(v) => setFormData({ ...formData, is_national: v })}
              />
              <Label>Nationale feestdag</Label>
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