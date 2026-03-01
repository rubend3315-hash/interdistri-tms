import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, Pencil } from "lucide-react";

const vehicleTypes = ["Vrachtwagen", "Bestelbus", "Personenauto", "Aanhanger"];
const fuelTypes = ["Diesel", "Benzine", "Elektrisch", "Hybride", "LNG", "CNG"];
const statuses = ["Beschikbaar", "In gebruik", "In onderhoud", "Defect", "Uit dienst"];
const emissionClasses = ["Euro 1", "Euro 2", "Euro 3", "Euro 4", "Euro 5", "Euro 6", "Euro 6d", "Zero Emissie"];

export default function VehicleGegevensForm({
  formData, setFormData, onSubmit, onCancel,
  isEditing, selectedVehicle, niwoPermits,
  isPending, editMode, setEditMode, onCalibrate
}) {
  const readOnly = selectedVehicle && !editMode;

  const Field = ({ label, children, className = "" }) => (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      {children}
    </div>
  );

  const ReadOnlyValue = ({ value, placeholder = "-" }) => (
    <div className="h-10 px-3 flex items-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-900">
      {value || <span className="text-slate-400">{placeholder}</span>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-4">
      {readOnly && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setEditMode(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Bewerken
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Kenteken *">
          {readOnly ? <ReadOnlyValue value={formData.license_plate} /> :
            <Input value={formData.license_plate} onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })} required placeholder="AB-123-CD" />}
        </Field>
        <Field label="Status">
          {readOnly ? <ReadOnlyValue value={formData.status} /> :
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Merk *">
          {readOnly ? <ReadOnlyValue value={formData.brand} /> :
            <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required />}
        </Field>
        <Field label="Model">
          {readOnly ? <ReadOnlyValue value={formData.model} /> :
            <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Type *">
          {readOnly ? <ReadOnlyValue value={formData.type} /> :
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
              <SelectContent>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>}
        </Field>
        <Field label="Brandstof">
          {readOnly ? <ReadOnlyValue value={formData.fuel_type} /> :
            <Select value={formData.fuel_type} onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
              <SelectContent>{fuelTypes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>}
        </Field>
        <Field label="Bouwjaar">
          {readOnly ? <ReadOnlyValue value={formData.year} /> :
            <Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="2024" />}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Chassisnummer (VIN)">
          {readOnly ? <ReadOnlyValue value={formData.chassis_number} /> :
            <Input value={formData.chassis_number} onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value.toUpperCase() })} placeholder="bijv. WF0XXXGCDX1234567" />}
        </Field>
        <Field label="Sleutelkast nr.">
          {readOnly ? <ReadOnlyValue value={formData.key_cabinet_number} /> :
            <Input value={formData.key_cabinet_number} onChange={(e) => setFormData({ ...formData, key_cabinet_number: e.target.value })} placeholder="bijv. 12" />}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Emissieklasse">
          {readOnly ? <ReadOnlyValue value={formData.emission_class} /> :
            <Select value={formData.emission_class || "none"} onValueChange={(v) => setFormData({ ...formData, emission_class: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Geen</SelectItem>{emissionClasses.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>}
        </Field>
        <Field label="Verbruik / 100 km">
          {readOnly ? <ReadOnlyValue value={formData.factory_consumption_per_100km ? `${formData.factory_consumption_per_100km}` : ""} placeholder="L of kWh" /> :
            <Input type="number" step="0.1" value={formData.factory_consumption_per_100km} onChange={(e) => setFormData({ ...formData, factory_consumption_per_100km: e.target.value })} placeholder="L of kWh" />}
        </Field>
        <Field label="Max laadvermogen (kg)">
          {readOnly ? <ReadOnlyValue value={formData.max_weight ? `${Number(formData.max_weight).toLocaleString('nl-NL')}` : ""} /> :
            <Input type="number" value={formData.max_weight} onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })} />}
        </Field>
      </div>

      <Field label="Kilometerstand">
        <div className="flex gap-2">
          {readOnly ? (
            <>
              <ReadOnlyValue value={formData.current_mileage ? `${Number(formData.current_mileage).toLocaleString('nl-NL')} km` : ""} />
              {selectedVehicle && (
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 h-10"
                  onClick={onCalibrate}>
                  <Crosshair className="w-4 h-4" /> IJken
                </Button>
              )}
            </>
          ) : (
            <>
              <Input type="number" value={formData.current_mileage} onChange={(e) => setFormData({ ...formData, current_mileage: e.target.value })} className="flex-1" />
              {selectedVehicle && (
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 h-10"
                  onClick={onCalibrate}>
                  <Crosshair className="w-4 h-4" /> IJken
                </Button>
              )}
            </>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="APK vervaldatum">
          {readOnly ? <ReadOnlyValue value={formData.apk_expiry ? new Date(formData.apk_expiry).toLocaleDateString('nl-NL') : ""} /> :
            <Input type="date" value={formData.apk_expiry} onChange={(e) => setFormData({ ...formData, apk_expiry: e.target.value })} />}
        </Field>
        <Field label="Verzekering vervalt">
          {readOnly ? <ReadOnlyValue value={formData.insurance_expiry ? new Date(formData.insurance_expiry).toLocaleDateString('nl-NL') : ""} /> :
            <Input type="date" value={formData.insurance_expiry} onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })} />}
        </Field>
        <Field label="Tachograaf ijkdatum">
          {readOnly ? <ReadOnlyValue value={formData.tachograph_calibration_date ? new Date(formData.tachograph_calibration_date).toLocaleDateString('nl-NL') : ""} /> :
            <Input type="date" value={formData.tachograph_calibration_date} onChange={(e) => setFormData({ ...formData, tachograph_calibration_date: e.target.value })} />}
        </Field>
      </div>

      <Field label="NIWO Vergunning">
        {readOnly ? (
          <ReadOnlyValue value={(() => {
            const p = (niwoPermits || []).find(p => p.id === formData.niwo_permit_id);
            return p ? `${p.permit_number} - ${p.status}` : "";
          })()} placeholder="Geen vergunning" />
        ) : (
          <Select value={formData.niwo_permit_id || "none"} onValueChange={(v) => setFormData({ ...formData, niwo_permit_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecteer vergunning" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen vergunning</SelectItem>
              {(niwoPermits || []).filter(p => p.status === 'Beschikbaar' || p.id === formData.niwo_permit_id)
                .map(p => <SelectItem key={p.id} value={p.id}>{p.permit_number} - {p.status}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Opmerkingen">
        {readOnly ? (
          <div className="min-h-[60px] px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-900 whitespace-pre-wrap">
            {formData.notes || <span className="text-slate-400">-</span>}
          </div>
        ) : (
          <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
        )}
      </Field>

      {!readOnly && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => selectedVehicle ? setEditMode(false) : onCancel()}>
            {selectedVehicle ? 'Annuleren' : 'Annuleren'}
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isPending}>
            {isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      )}
    </form>
  );
}