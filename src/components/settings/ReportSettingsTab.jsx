import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, FileText, CheckCircle2 } from "lucide-react";

export default function ReportSettingsTab() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });

  const existing = settings[0] || null;

  const [formData, setFormData] = useState({
    primaryEmail: "",
    ccEmails: "",
    subject: "Dagrapport Interdistri TMS",
    sendTime: "10:00",
    autoSendEnabled: false,
  });

  useEffect(() => {
    if (existing?.payroll_report_settings) {
      const s = existing.payroll_report_settings;
      setFormData({
        primaryEmail: s.primaryEmail || "",
        ccEmails: s.ccEmails || "",
        subject: s.subject || "Dagrapport Interdistri TMS",
        sendTime: s.sendTime || "10:00",
        autoSendEnabled: s.autoSendEnabled || false,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { payroll_report_settings: data };
      if (existing) {
        return base44.entities.PayrollSettings.update(existing.id, payload);
      } else {
        return base44.entities.PayrollSettings.create({
          payroll_email: "",
          ...payload,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  });

  const handleSave = () => {
    if (!formData.primaryEmail) {
      alert("Vul het hoofd e-mailadres in.");
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) return <p className="text-slate-500">Laden...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            E-mailinstellingen Dagrapport
          </CardTitle>
          <p className="text-sm text-slate-500">
            Configureer de instellingen voor automatische en handmatige dagrapporten per e-mail.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hoofd e-mailadres rapport *</Label>
            <Input
              type="email"
              value={formData.primaryEmail}
              onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
              placeholder="rapport@bedrijf.nl"
            />
            <p className="text-xs text-slate-500">Het hoofdadres waarnaar het dagrapport wordt verstuurd.</p>
          </div>

          <div className="space-y-2">
            <Label>CC e-mailadressen</Label>
            <Input
              value={formData.ccEmails}
              onChange={(e) => setFormData({ ...formData, ccEmails: e.target.value })}
              placeholder="cc1@bedrijf.nl, cc2@bedrijf.nl"
            />
            <p className="text-xs text-slate-500">Optioneel: meerdere adressen gescheiden door komma's.</p>
          </div>

          <div className="space-y-2">
            <Label>Onderwerp e-mail</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Dagrapport Interdistri TMS"
            />
            <p className="text-xs text-slate-500">Het onderwerp dat gebruikt wordt bij het versturen van het dagrapport.</p>
          </div>

          <div className="space-y-2">
            <Label>Verzendingstijd</Label>
            <Input
              type="time"
              value={formData.sendTime}
              onChange={(e) => setFormData({ ...formData, sendTime: e.target.value })}
            />
            <p className="text-xs text-slate-500">Tijdstip waarop het dagrapport automatisch wordt verstuurd.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Automatische verzending inschakelen</Label>
              <p className="text-xs text-slate-500">Het dagrapport wordt dagelijks automatisch verstuurd op het ingestelde tijdstip.</p>
            </div>
            <Switch
              checked={formData.autoSendEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, autoSendEnabled: checked })}
            />
          </div>

          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-200" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saved ? "Opgeslagen ✓" : "Instellingen opslaan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}