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
  Euro,
  Copy,
  Info
} from "lucide-react";

const tableTypes = ["CAO Beroepsgoederenvervoer", "Bijzondere loontabel"];
const scaleTypes = ["Reguliere Schalen (C-H)", "Speciale Schalen"];

export default function SalaryTables() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("CAO Beroepsgoederenvervoer");
  const [activeScaleTab, setActiveScaleTab] = useState("Reguliere Schalen (C-H)");
  const [selectedPeriod, setSelectedPeriod] = useState("2026-01-01");
  const [copyPercentage, setCopyPercentage] = useState(0);
  const [copyTargetDate, setCopyTargetDate] = useState("");
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

  // Get unique periods
  const periods = [...new Set(salaryEntries
    .filter(e => e.start_date)
    .map(e => e.start_date)
  )].sort().reverse();

  // Filter entries
  const filteredEntries = salaryEntries.filter(e => {
    const matchesType = e.table_type === activeTab;
    const matchesPeriod = e.start_date === selectedPeriod;
    
    if (activeTab === "CAO Beroepsgoederenvervoer") {
      const regularScales = ['C', 'D', 'E', 'F', 'G', 'H'];
      // Min Trede entries (step < 0) should be in Special Scales
      const isMinTrede = e.step != null && e.step < 0;
      const isRegular = regularScales.includes(e.scale) && !isMinTrede;
      if (activeScaleTab === "Reguliere Schalen (C-H)") {
        return matchesType && matchesPeriod && isRegular;
      } else {
        return matchesType && matchesPeriod && !isRegular;
      }
    }
    return matchesType && matchesPeriod;
  });

  const getScaleColor = (scale) => {
    const colors = {
      'C': 'bg-blue-100 text-blue-800',
      'D': 'bg-green-100 text-green-800',
      'E': 'bg-purple-100 text-purple-800',
      'F': 'bg-amber-100 text-amber-800',
      'G': 'bg-pink-100 text-pink-800',
      'H': 'bg-indigo-100 text-indigo-800',
      'Jeugdloon': 'bg-rose-100 text-rose-800',
      'A': 'bg-slate-100 text-slate-800',
      'B': 'bg-slate-100 text-slate-800',
      'Individueel': 'bg-cyan-100 text-cyan-800'
    };
    return colors[scale] || 'bg-slate-100 text-slate-800';
  };

  const handleCopyPeriod = () => {
    if (!copyTargetDate) return;
    
    const entriesToCopy = salaryEntries.filter(e => 
      e.start_date === selectedPeriod && e.table_type === activeTab
    );

    const multiplier = 1 + (copyPercentage / 100);
    
    entriesToCopy.forEach(entry => {
      const newEntry = {
        ...entry,
        start_date: copyTargetDate,
        end_date: null,
        hourly_rate: entry.hourly_rate ? Number((entry.hourly_rate * multiplier).toFixed(2)) : null,
        monthly_salary: entry.monthly_salary ? Number((entry.monthly_salary * multiplier).toFixed(2)) : null
      };
      delete newEntry.id;
      delete newEntry.created_date;
      delete newEntry.updated_date;
      delete newEntry.created_by;
      
      createMutation.mutate(newEntry);
    });

    setIsCopyDialogOpen(false);
    setCopyPercentage(0);
    setCopyTargetDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Euro className="w-8 h-8" />
            Loontabel Beheer
          </h1>
          <p className="text-slate-500 mt-1">CAO en bijzondere loontabellen beheer</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p} value={p}>
                  {format(new Date(p), "d MMMM yyyy", { locale: nl })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setIsCopyDialogOpen(true)}
            disabled={!selectedPeriod}
          >
            <Copy className="w-4 h-4 mr-2" />
            Kopieer periode
          </Button>
          <Button onClick={openNewDialog} className="bg-blue-900 hover:bg-blue-800">
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Loonschaal
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">Periode-gebonden loonschalen</p>
              <p className="text-xs text-blue-700 mt-1">
                Loonschalen zijn historisch bewaard per ingangsdatum. Reguliere schalen (C-H) en speciale schalen (Jeugdloon/Minimumloon) hebben verschillende update-frequenties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {activeTab === "CAO Beroepsgoederenvervoer" && (
            <Tabs value={activeScaleTab} onValueChange={setActiveScaleTab} className="mb-4">
              <TabsList>
                {scaleTypes.map(type => {
                  const count = salaryEntries.filter(e => {
                    const regularScales = ['C', 'D', 'E', 'F', 'G', 'H'];
                    const isMinTrede = e.step != null && e.step < 0;
                    const isRegular = regularScales.includes(e.scale) && !isMinTrede;
                    const matches = e.table_type === activeTab && e.start_date === selectedPeriod;
                    return type === "Reguliere Schalen (C-H)" 
                      ? matches && isRegular 
                      : matches && !isRegular;
                  }).length;
                  
                  return (
                    <TabsTrigger key={type} value={type}>
                      {type} <Badge className="ml-2">{count}</Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          )}
          
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
                        <TableHead>Ingangsdatum</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Trede</TableHead>
                        <TableHead>Maandloon</TableHead>
                        <TableHead>Uurloon 100%</TableHead>
                        <TableHead>Uurloon 130%</TableHead>
                        <TableHead>Uurloon 150%</TableHead>
                        <TableHead className="w-20">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries
                        .sort((a, b) => {
                          if (a.scale !== b.scale) return a.scale.localeCompare(b.scale);
                          return (a.step || 0) - (b.step || 0);
                        })
                        .map(entry => {
                          const hourly100 = entry.hourly_rate || 0;
                          const hourly130 = hourly100 * 1.3;
                          const hourly150 = hourly100 * 1.5;
                          
                          return (
                            <TableRow 
                              key={entry.id}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => openEditDialog(entry)}
                            >
                              <TableCell>
                                {entry.start_date 
                                  ? format(new Date(entry.start_date), "d MMM yyyy", { locale: nl })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge className={getScaleColor(entry.scale)}>
                                  Schaal {entry.scale}
                                </Badge>
                              </TableCell>
                              <TableCell>{entry.scale} Trede {entry.step || '-'}</TableCell>
                              <TableCell>
                                {entry.monthly_salary ? (
                                  <span>€ {entry.monthly_salary.toFixed(2)}</span>
                                ) : '-'}
                              </TableCell>
                              <TableCell>€ {hourly100.toFixed(2)}</TableCell>
                              <TableCell>€ {hourly130.toFixed(2)}</TableCell>
                              <TableCell>€ {hourly150.toFixed(2)}</TableCell>
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
                          );
                        })}
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

      {/* Copy Period Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Periode Kopiëren met Opslag</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700">Huidige periode</p>
              <p className="text-lg font-semibold text-slate-900">
                {selectedPeriod && format(new Date(selectedPeriod), "d MMMM yyyy", { locale: nl })}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {filteredEntries.length} loonschaal invoeren
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nieuwe ingangsdatum *</Label>
              <Input
                type="date"
                value={copyTargetDate}
                onChange={(e) => setCopyTargetDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Percentage opslag (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={copyPercentage}
                onChange={(e) => setCopyPercentage(Number(e.target.value))}
                placeholder="bijv. 2.5 voor 2.5%"
              />
              <p className="text-xs text-slate-500">
                Laat 0 voor exacte kopie zonder opslag
              </p>
            </div>

            {copyPercentage > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900">
                  Alle bedragen worden verhoogd met <strong>{copyPercentage}%</strong>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCopyDialogOpen(false);
                  setCopyPercentage(0);
                  setCopyTargetDate("");
                }}
              >
                Annuleren
              </Button>
              <Button 
                onClick={handleCopyPeriod}
                className="bg-blue-900 hover:bg-blue-800"
                disabled={!copyTargetDate}
              >
                <Copy className="w-4 h-4 mr-2" />
                Kopiëren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}