import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Smartphone, Info } from "lucide-react";

export default function Step5MobileAccess({ employeeData, onEmployeeChange, onboardingData, onChange, onNext, onBack }) {
  const updateEmployee = (field, value) => {
    onEmployeeChange({ ...employeeData, [field]: value });
  };

  const updateOnboarding = (field, value) => {
    onChange({ ...onboardingData, [field]: value });
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      {/* Mobile Entry Type */}
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-500" /> Mijn Interdistri App — Configuratie
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            Stel hier in welk type mobiele app de medewerker gebruikt en welk welkomstbericht wordt meegestuurd bij de uitnodiging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Type mobiele app</Label>
            <Select value={employeeData.mobile_entry_type || "single_day"} onValueChange={(v) => updateEmployee("mobile_entry_type", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_day">Standaard (enkele dag)</SelectItem>
                <SelectItem value="multi_day">Meerdaagse diensten</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {employeeData.mobile_entry_type === "multi_day"
                ? "Geschikt voor chauffeurs met ritten over meerdere dagen (nationaal/internationaal)."
                : "Geschikt voor dagdiensten: pakketdistributie, standplaatswerk, regulier transport."
              }
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Afdeling voor shift-tijden</Label>
            <Select
              value={employeeData.mobile_shift_department || employeeData.department || ""}
              onValueChange={(v) => updateEmployee("mobile_shift_department", v)}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Standaard: zelfde als afdeling" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Management">Management</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="PakketDistributie">Pakket Distributie</SelectItem>
                <SelectItem value="Charters">Charters</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Overschrijft de primaire afdeling voor shifttijden in de mobiele app.
            </p>
          </div>
        </div>
      </section>

      {/* Welkomstbericht */}
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Welkomstbericht bij uitnodiging</h3>
        <p className="text-xs text-slate-500 mb-3">
          Dit bericht wordt opgenomen in de welkomstmail als de uitnodiging in de volgende stap wordt verstuurd.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Persoonlijk welkomstbericht (optioneel)</Label>
          <Input
            className="h-10"
            value={onboardingData.mobile_welcome_message || ""}
            onChange={(e) => updateOnboarding("mobile_welcome_message", e.target.value)}
            placeholder="Bijv. Welkom bij het team! Op je eerste dag meld je je om 07:00 bij de receptie."
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Checkbox
            checked={onboardingData.mobile_send_shift_info || false}
            onCheckedChange={(v) => updateOnboarding("mobile_send_shift_info", v)}
          />
          <Label className="text-sm">Standaard shifttijden meesturen in welkomstmail</Label>
        </div>
      </section>

      {/* Samenvatting */}
      <section className="border rounded-lg p-3 bg-slate-50">
        <h4 className="text-xs font-semibold text-slate-600 mb-2">Configuratie overzicht</h4>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="bg-white">
            App: {employeeData.mobile_entry_type === "multi_day" ? "Meerdaagse diensten" : "Standaard"}
          </Badge>
          <Badge variant="outline" className="bg-white">
            Shift-afdeling: {employeeData.mobile_shift_department || employeeData.department || "—"}
          </Badge>
          {onboardingData.mobile_welcome_message && (
            <Badge variant="outline" className="bg-white">Welkomstbericht ✓</Badge>
          )}
          {onboardingData.mobile_send_shift_info && (
            <Badge variant="outline" className="bg-white">Shifttijden meesturen ✓</Badge>
          )}
        </div>
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Volgende: Uitnodiging <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}