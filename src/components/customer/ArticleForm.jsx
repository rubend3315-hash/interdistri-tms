import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { parseCSVPriceRules } from "@/components/utils/priceRuleUtils";

export default function ArticleForm({ article, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(article || {
    article_number: "",
    description: "",
    unit: "stuk",
    price_rules: [],
    status: "Actief"
  });

  const [showPriceRuleForm, setShowPriceRuleForm] = useState(false);
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [csvImportError, setCsvImportError] = useState(null);
  const [csvImportSuccess, setCsvImportSuccess] = useState(null);
  const [priceRuleForm, setPriceRuleForm] = useState({
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    price: "",
    notes: ""
  });

  const addPriceRule = () => {
    if (priceRuleForm.start_date && priceRuleForm.price) {
      setFormData({
        ...formData,
        price_rules: [...(formData.price_rules || []), { ...priceRuleForm, price: Number(priceRuleForm.price) }]
      });
      setPriceRuleForm({
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        price: "",
        notes: ""
      });
      setShowPriceRuleForm(false);
    }
  };

  const removePriceRule = (index) => {
    setFormData({
      ...formData,
      price_rules: formData.price_rules.filter((_, i) => i !== index)
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Artikelnummer</Label>
          <Input
            value={formData.article_number}
            onChange={(e) => setFormData({ ...formData, article_number: e.target.value })}
            placeholder="Bijv. ART-001"
            disabled={!!article}
          />
          <p className="text-xs text-slate-500">Wordt automatisch gegenereerd bij opslaan</p>
        </div>

        <div className="space-y-2">
          <Label>Omschrijving *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Omschrijving van het artikel"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Eenheid</Label>
            <Select value={formData.unit || "stuk"} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stuk">Stuk</SelectItem>
                <SelectItem value="doos">Doos</SelectItem>
                <SelectItem value="pallet">Pallet</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="meter">Meter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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

        {/* Prijsregels */}
        <Card className="bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prijsregels</CardTitle>
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              onClick={() => setShowPriceRuleForm(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Regel Toevoegen
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!formData.price_rules || formData.price_rules.length === 0) ? (
              <p className="text-sm text-slate-500">Geen prijsregels toegevoegd</p>
            ) : (
              <div className="space-y-2">
                {formData.price_rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">€ {rule.price?.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">
                        {rule.start_date} {rule.end_date ? `- ${rule.end_date}` : ""}
                      </p>
                      {rule.notes && <p className="text-xs text-slate-500 italic">{rule.notes}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePriceRule(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onSave(formData)}
            disabled={isLoading || !formData.description}
          >
            Opslaan
          </Button>
        </div>
      </div>

      {/* Prijs Regel Dialog */}
      <Dialog open={showPriceRuleForm} onOpenChange={setShowPriceRuleForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prijsregel Toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum *</Label>
                <Input
                  type="date"
                  value={priceRuleForm.start_date}
                  onChange={(e) => setPriceRuleForm({ ...priceRuleForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Einddatum</Label>
                <Input
                  type="date"
                  value={priceRuleForm.end_date}
                  onChange={(e) => setPriceRuleForm({ ...priceRuleForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prijs (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={priceRuleForm.price}
                onChange={(e) => setPriceRuleForm({ ...priceRuleForm, price: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Opmerking</Label>
              <Textarea
                value={priceRuleForm.notes}
                onChange={(e) => setPriceRuleForm({ ...priceRuleForm, notes: e.target.value })}
                placeholder="Bijv. Indexatie 2026"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPriceRuleForm(false)}>
                Annuleren
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={addPriceRule}>
                Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}