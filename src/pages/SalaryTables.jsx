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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  DollarSign,
  Calendar,
  Trash2,
  Euro
} from "lucide-react";

const tableTypes = ["CAO Beroepsgoederenvervoer", "Bijzondere loontabel"];

export default function SalaryTables() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("CAO Beroepsgoederenvervoer");
  const queryClient = useQueryClient();

  const { data: salaryEntries = [], isLoading } = useQuery({
    queryKey: ['salaryTables'],
    queryFn: () => base44.entities.SalaryTable.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SalaryTable.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryTables'] });
      setIsDialogOpen(false);
      setSelectedEntry(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalaryTable.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryTables'] });
      setIsDialogOpen(false);
      setSelectedEntry(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalaryTable.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryTables'] });
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    table_type: "CAO Beroepsgoederenvervoer",
    scale: "",
    step: "",
    hourly_rate: "",
    monthly_salary: "",
    start_date: "",
    end_date: "",
    status: "Actief"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      table_type: activeTab,
      scale: "",
      step: "",
      hourly_rate: "",
      monthly_salary: "",
      start_date: "",
      end_date: "",
      status: "Actief"
    });
  };

  const openEditDialog = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      ...entry,
      step: entry.step || "",
      hourly_rate: entry.hourly_rate || "",
      monthly_salary: entry.monthly_salary || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedEntry(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      step: formData.step ? Number(formData.step) : null,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
      monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null
    };

    if (selectedEntry) {
      updateMutation.mutate({ id: selectedEntry.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredEntries = salaryEntries.filter(e => e.table_type === activeTab);

  // Group by scale
  const scales = [...new Set(filteredEntries.map(e => e.scale))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Loontabellen</h1>
          <p className="text-slate-500 mt-1">CAO en bijzondere loontabellen beheer</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Invoer
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tableTypes.map(type => (
            <TabsTrigger key={type} value={type}>
              {type}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : filteredEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Geen loontabel gegevens</h3>
              <p className="text-slate-500 mt-1">Voeg loonschalen en tarieven toe.</p>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Schaal</TableHead>
                        <TableHead>Trede</TableHead>
                        <TableHead>Uurloon</TableHead>
                        <TableHead>Maandloon</TableHead>
                        <TableHead>Geldig vanaf</TableHead>
                        <TableHead>Geldig tot</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries
                        .sort((a, b) => {
                          if (a.scale !== b.scale) return a.scale.localeCompare(b.scale);
                          return (a.step || 0) - (b.step || 0);
                        })
                        .map(entry => (
                          <TableRow 
                            key={entry.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openEditDialog(entry)}
                          >
                            <TableCell className="font-semibold">{entry.scale}</TableCell>
                            <TableCell>{entry.step || '-'}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Euro className="w-3.5 h-3.5 text-slate-400" />
                                {entry.hourly_rate?.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {entry.monthly_salary ? (
                                <span className="flex items-center gap-1">
                                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                                  {entry.monthly_salary.toLocaleString()}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {entry.start_date 
                                ? format(new Date(entry.start_date), "d MMM yyyy", { locale: nl })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {entry.end_date 
                                ? format(new Date(entry.end_date), "d MMM yyyy", { locale: nl })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.status === 'Actief' ? 'success' : 'secondary'}>
                                {entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Weet je zeker dat je deze invoer wilt verwijderen?')) {
                                    deleteMutation.mutate(entry.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? 'Loontabel Bewerken' : 'Nieuwe Loontabel Invoer'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type tabel *</Label>
              <Select 
                value={formData.table_type} 
                onValueChange={(v) => setFormData({ ...formData, table_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tableTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loonschaal *</Label>
                <Input
                  value={formData.scale}
                  onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                  required
                  placeholder="bijv. A, B, C of 1, 2, 3"
                />
              </div>
              <div className="space-y-2">
                <Label>Trede</Label>
                <Input
                  type="number"
                  value={formData.step}
                  onChange={(e) => setFormData({ ...formData, step: e.target.value })}
                  placeholder="bijv. 0, 1, 2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Uurloon (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Maandloon (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Geldig vanaf *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Geldig tot</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actief">Actief</SelectItem>
                  <SelectItem value="Inactief">Inactief</SelectItem>
                </SelectContent>
              </Select>
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