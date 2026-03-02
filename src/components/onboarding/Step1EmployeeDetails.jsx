import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, ChevronRight, Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Step1EmployeeDetails({ employeeData, onChange, onNext }) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter({ status: 'Actief' }, 'sort_order')
  });

  const { data: functionOptions = [] } = useQuery({
    queryKey: ['functions_list'],
    queryFn: () => base44.entities.Function.filter({ status: 'Actief' }, 'sort_order')
  });

  const update = (field, value) => {
    onChange({ ...employeeData, [field]: value });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("photo_url", file_url);
    setUploadingPhoto(false);
  };

  const isValid = employeeData.first_name && employeeData.last_name && employeeData.department && employeeData.email;

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      {/* Persoonsgegevens */}
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-500" /> Persoonsgegevens
        </h3>

        {/* Photo */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
          {employeeData.photo_url ? (
            <img src={employeeData.photo_url} alt="Foto" className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-lg cursor-pointer hover:bg-white text-sm">
            {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-500" />}
            Foto uploaden
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Voorletters</Label>
            <Input className="h-10" value={employeeData.initials || ""} onChange={(e) => update("initials", e.target.value)} placeholder="R.J." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Voornaam *</Label>
            <Input className="h-10" value={employeeData.first_name || ""} onChange={(e) => update("first_name", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tussenvoegsel</Label>
            <Input className="h-10" value={employeeData.prefix || ""} onChange={(e) => update("prefix", e.target.value)} placeholder="van, de" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Achternaam *</Label>
            <Input className="h-10" value={employeeData.last_name || ""} onChange={(e) => update("last_name", e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input className="h-10" type="email" value={employeeData.email || ""} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Telefoon</Label>
            <Input className="h-10" type="tel" value={employeeData.phone || ""} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">Geboortedatum</Label>
            <Input className="h-10" type="date" value={employeeData.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">BSN</Label>
            <Input className="h-10" value={employeeData.bsn || ""} onChange={(e) => update("bsn", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">IBAN</Label>
            <Input className="h-10" value={employeeData.bank_account || ""} onChange={(e) => update("bank_account", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">Adres</Label>
            <Input className="h-10" value={employeeData.address || ""} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Postcode</Label>
            <Input className="h-10" value={employeeData.postal_code || ""} onChange={(e) => update("postal_code", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Woonplaats</Label>
            <Input className="h-10" value={employeeData.city || ""} onChange={(e) => update("city", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Dienstverband */}
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Dienstverband</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Afdeling *</Label>
            <Select value={employeeData.department || ""} onValueChange={(v) => update("department", v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Kies afdeling" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Functie</Label>
            <Select value={employeeData.function || ""} onValueChange={(v) => update("function", v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Kies functie" /></SelectTrigger>
              <SelectContent>
                {functionOptions.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Datum in dienst</Label>
            <Input className="h-10" type="date" value={employeeData.in_service_since || ""} onChange={(e) => update("in_service_since", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">Personeelsnummer</Label>
            <Input className="h-10" value={employeeData.employee_number || ""} onChange={(e) => update("employee_number", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contracttype</Label>
            <Select value={employeeData.contract_type || "Tijdelijk"} onValueChange={(v) => update("contract_type", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Vast">Vast</SelectItem>
                <SelectItem value="Vast Nul Uren">Vast Nul Uren</SelectItem>
                <SelectItem value="Tijdelijk">Tijdelijk</SelectItem>
                <SelectItem value="Tijdelijk Nul Uren">Tijdelijk Nul Uren</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Uren per week</Label>
            <Input className="h-10" type="number" min={0} max={60} value={employeeData.contract_hours ?? 40} onChange={(e) => update("contract_hours", Number(e.target.value))} disabled={employeeData.contract_type === "Tijdelijk Nul Uren" || employeeData.contract_type === "Vast Nul Uren"} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">Type mobiele app</Label>
            <Select value={employeeData.mobile_entry_type || "single_day"} onValueChange={(v) => update("mobile_entry_type", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_day">Standaard (enkele dag)</SelectItem>
                <SelectItem value="multi_day">Meerdaagse diensten</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <Label className="text-xs">Noodcontact naam</Label>
            <Input className="h-10" value={employeeData.emergency_contact_name || ""} onChange={(e) => update("emergency_contact_name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Noodcontact telefoon</Label>
            <Input className="h-10" value={employeeData.emergency_contact_phone || ""} onChange={(e) => update("emergency_contact_phone", e.target.value)} />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid} className="bg-blue-600 hover:bg-blue-700">
          Volgende: Stamkaart <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}