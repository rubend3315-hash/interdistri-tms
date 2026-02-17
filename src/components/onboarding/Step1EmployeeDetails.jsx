import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Persoonsgegevens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
            <div>
              {employeeData.photo_url ? (
                <img src={employeeData.photo_url} alt="Foto" className="w-16 h-16 rounded-full object-cover border-2 border-slate-300" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label className="text-sm">Pasfoto</Label>
              <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-white text-sm">
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-500" />}
                Foto uploaden
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Voorletters</Label>
              <Input value={employeeData.initials || ""} onChange={(e) => update("initials", e.target.value)} placeholder="R.J." />
            </div>
            <div className="space-y-2">
              <Label>Voornaam *</Label>
              <Input value={employeeData.first_name || ""} onChange={(e) => update("first_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tussenvoegsel</Label>
              <Input value={employeeData.prefix || ""} onChange={(e) => update("prefix", e.target.value)} placeholder="van, de" />
            </div>
            <div className="space-y-2">
              <Label>Achternaam *</Label>
              <Input value={employeeData.last_name || ""} onChange={(e) => update("last_name", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={employeeData.email || ""} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Telefoon</Label>
              <Input type="tel" value={employeeData.phone || ""} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Geboortedatum</Label>
              <Input type="date" value={employeeData.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>BSN</Label>
              <Input value={employeeData.bsn || ""} onChange={(e) => update("bsn", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={employeeData.bank_account || ""} onChange={(e) => update("bank_account", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input value={employeeData.address || ""} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Postcode</Label>
              <Input value={employeeData.postal_code || ""} onChange={(e) => update("postal_code", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Woonplaats</Label>
              <Input value={employeeData.city || ""} onChange={(e) => update("city", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dienstverband</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Afdeling *</Label>
              <Select value={employeeData.department || ""} onValueChange={(v) => update("department", v)}>
                <SelectTrigger><SelectValue placeholder="Kies afdeling" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Functie</Label>
              <Select value={employeeData.function || ""} onValueChange={(v) => update("function", v)}>
                <SelectTrigger><SelectValue placeholder="Kies functie" /></SelectTrigger>
                <SelectContent>
                  {functionOptions.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Datum in dienst</Label>
              <Input type="date" value={employeeData.in_service_since || ""} onChange={(e) => update("in_service_since", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Personeelsnummer</Label>
              <Input value={employeeData.employee_number || ""} onChange={(e) => update("employee_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type mobiele app</Label>
              <Select value={employeeData.mobile_entry_type || "single_day"} onValueChange={(v) => update("mobile_entry_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_day">Standaard (enkele dag)</SelectItem>
                  <SelectItem value="multi_day">Meerdaagse diensten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Noodcontact naam</Label>
              <Input value={employeeData.emergency_contact_name || ""} onChange={(e) => update("emergency_contact_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Noodcontact telefoon</Label>
              <Input value={employeeData.emergency_contact_phone || ""} onChange={(e) => update("emergency_contact_phone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid} className="bg-blue-600 hover:bg-blue-700">
          Volgende: Stamkaart <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}