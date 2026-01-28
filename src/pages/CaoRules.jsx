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
  BookOpen,
  Percent,
  Euro,
  Clock,
  Calendar,
  Trash2,
  Edit
} from "lucide-react";

const ruleTypes = ["Toeslag", "Vergoeding", "Werktijd", "Pauze", "Overig"];

export default function CaoRules() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['caoRules'],
    queryFn: () => base44.entities.CaoRule.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CaoRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caoRules'] });
      setIsDialogOpen(false);
      setSelectedRule(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CaoRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caoRules'] });
      setIsDialogOpen(false);
      setSelectedRule(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CaoRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caoRules'] });
    }
  });

  const salaryScales = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Jeugdloon', 'Individueel'].sort();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule_type: "Toeslag",
    salary_scale: "",
    percentage: "",
    fixed_amount: "",
    start_time: "",
    end_time: "",
    applies_to_days: [],
    start_date: "",
    end_date: "",
    status: "Actief"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rule_type: "Toeslag",
      salary_scale: "",
      percentage: "",
      fixed_amount: "",
      start_time: "",
      end_time: "",
      applies_to_days: [],
      start_date: "",
      end_date: "",
      status: "Actief"
    });
  };

  const openEditDialog = (rule) => {
    setSelectedRule(rule);
    setFormData({
      ...rule,
      applies_to_days: rule.applies_to_days || [],
      salary_scale: rule.salary_scale || "",
      percentage: rule.percentage || "",
      fixed_amount: rule.fixed_amount || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedRule(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      percentage: formData.percentage ? Number(formData.percentage) : null,
      fixed_amount: formData.fixed_amount ? Number(formData.fixed_amount) : null
    };

    if (selectedRule) {
      updateMutation.mutate({ id: selectedRule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const days = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

  const toggleDay = (day) => {
    const current = formData.applies_to_days || [];
    if (current.includes(day)) {
      setFormData({ ...formData, applies_to_days: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, applies_to_days: [...current, day] });
    }
  };

  const getRuleTypeColor = (type) => {
    switch (type) {
      case "Toeslag": return "bg-purple-100 text-purple-700";
      case "Vergoeding": return "bg-emerald-100 text-emerald-700";
      case "Werktijd": return "bg-blue-100 text-blue-700";
      case "Pauze": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const groupedRules = ruleTypes.reduce((acc, type) => {
    acc[type] = rules.filter(r => r.rule_type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CAO-regels</h1>
          <p className="text-slate-500 mt-1">Beroepsgoederenvervoer regelgeving</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Regel
        </Button>
      </div>

      {/* Rules by Type */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {ruleTypes.map(type => {
            const typeRules = groupedRules[type] || [];
            if (typeRules.length === 0) return null;

            return (
              <Card key={type}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={getRuleTypeColor(type)}>{type}</Badge>
                    <span className="text-slate-500 text-sm font-normal">
                      ({typeRules.length} regels)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {typeRules.map(rule => (
                      <div 
                        key={rule.id}
                        className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => openEditDialog(rule)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                              <Badge variant={rule.status === 'Actief' ? 'success' : 'secondary'}>
                                {rule.status}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-3 text-sm">
                              {rule.salary_scale && (
                                <span className="flex items-center gap-1">
                                  <Badge variant="outline">Schaal {rule.salary_scale}</Badge>
                                </span>
                              )}
                              {rule.percentage && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Percent className="w-4 h-4 text-slate-400" />
                                  {rule.percentage}%
                                </span>
                              )}
                              {rule.fixed_amount && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Euro className="w-4 h-4 text-slate-400" />
                                  €{rule.fixed_amount.toFixed(2)}
                                </span>
                              )}
                              {rule.start_time && rule.end_time && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  {rule.start_time} - {rule.end_time}
                                </span>
                              )}
                              {rule.applies_to_days?.length > 0 && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  {rule.applies_to_days.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {rules.length === 0 && (
            <Card className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nog geen CAO-regels</h3>
              <p className="text-slate-500 mt-1">Voeg CAO-regels toe om toeslagen en vergoedingen te berekenen.</p>
            </Card>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedRule ? 'Regel Bewerken' : 'Nieuwe Regel'}</span>
              {selectedRule && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je deze regel wilt verwijderen?')) {
                      deleteMutation.mutate(selectedRule.id);
                      setIsDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="bijv. Nachttoeslag"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select 
                  value={formData.rule_type} 
                  onValueChange={(v) => setFormData({ ...formData, rule_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>

            <div className="space-y-2">
              <Label>Omschrijving</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Loonschaal</Label>
              <Select 
                value={formData.salary_scale} 
                onValueChange={(v) => setFormData({ ...formData, salary_scale: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer schaal" />
                </SelectTrigger>
                <SelectContent>
                  {salaryScales.map(scale => (
                    <SelectItem key={scale} value={scale}>Schaal {scale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentage (%)</Label>
                <Input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="bijv. 150"
                />
              </div>
              <div className="space-y-2">
                <Label>Vast bedrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fixed_amount}
                  onChange={(e) => setFormData({ ...formData, fixed_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starttijd</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eindtijd</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Van toepassing op dagen</Label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <Badge
                    key={day}
                    variant={formData.applies_to_days?.includes(day) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 2)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Geldig vanaf</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
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