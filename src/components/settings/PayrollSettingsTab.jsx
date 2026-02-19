import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function PayrollSettingsTab() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });

  const existing = settings[0] || null;

  const [formData, setFormData] = useState({
    payroll_email: "",
    payroll_cc_email: "",
    payroll_subject: "Vertrouwelijk, onboarding en HR gegevens",
  });

  useEffect(() => {
    if (existing) {
      setFormData({
        payroll_email: existing.payroll_email || "",
        payroll_cc_email: existing.payroll_cc_email || "",
        payroll_subject: existing.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existing) {
        return base44.entities.PayrollSettings.update(existing.id, data);
      } else {
        return base44.entities.PayrollSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  });

  const handleSave = () => {
    if (!formData.payroll_email) {
      alert("Vul het e-mailadres van de loonadministratie in.");
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
            <Mail className="w-5 h-5 text-blue-600" />
            E-mailinstellingen Loonadministratie
          </CardTitle>
          <p className="text-sm text-slate-500">
            Stel het e-mailadres in waarnaar stamkaarten worden verstuurd via Gmail.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>E-mailadres loonadministratie *</Label>
            <Input
              type="email"
              value={formData.payroll_email}
              onChange={(e) => setFormData({ ...formData, payroll_email: e.target.value })}
              placeholder="info@salarishuys.nl"
            />
            <p className="text-xs text-slate-500">Het hoofdadres waarnaar de stamkaart wordt verstuurd.</p>
          </div>

          <div className="space-y-2">
            <Label>CC e-mailadres</Label>
            <Input
              type="email"
              value={formData.payroll_cc_email}
              onChange={(e) => setFormData({ ...formData, payroll_cc_email: e.target.value })}
              placeholder="optioneel CC adres"
            />
            <p className="text-xs text-slate-500">Optioneel: kopie van de e-mail wordt ook naar dit adres gestuurd.</p>
          </div>

          <div className="space-y-2">
            <Label>Onderwerp e-mail</Label>
            <Input
              value={formData.payroll_subject}
              onChange={(e) => setFormData({ ...formData, payroll_subject: e.target.value })}
              placeholder="Vertrouwelijk, onboarding en HR gegevens"
            />
            <p className="text-xs text-slate-500">Het onderwerp dat gebruikt wordt bij het versturen. De naam van de medewerker wordt er automatisch aan toegevoegd.</p>
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