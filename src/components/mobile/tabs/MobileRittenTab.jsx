import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, MapPin, Plus, Trash2, Save, Clock } from "lucide-react";
import ProgressSteps from "@/components/mobile/ProgressSteps";
import AutoSaveIndicator from "@/components/mobile/AutoSaveIndicator";
import StandplaatsWerkSection from "@/components/mobile/StandplaatsWerkSection";

const EMPTY_TRIP = {
  start_time: "", end_time: "", departure_location: "Standplaats",
  vehicle_id: "", damage_occurred: "Nee",
  start_km: "", end_km: "", fuel_liters: "", adblue_liters: "",
  fuel_km: "", charging_kwh: "", customer_id: "", route_name: "",
  planned_stops: "", notes: ""
};

export default function MobileRittenTab({
  trips, setTrips, standplaatsWerk, setStandplaatsWerk,
  vehicles, customers, routes, tiModelRoutes, projects, activiteiten,
  progressStep, lastSavedAt, isSaving, isSubmitting,
  storageKey, onSaveDraft, setActiveTab
}) {

  const updateTrip = (index, field, value) => {
    const newTrips = [...trips];
    newTrips[index] = { ...newTrips[index], [field]: value };
    setTrips(newTrips);
  };

  const removeTrip = (index) => {
    const updated = trips.filter((_, i) => i !== index);
    setTrips(updated);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (draft.trips) { draft.trips = updated; localStorage.setItem(storageKey, JSON.stringify(draft)); }
    } catch {}
  };

  const timeInput = (value, onChange, placeholder) => (
    <Input
      type="text" inputMode="numeric" maxLength="5" value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
        onChange(v);
      }}
      placeholder={placeholder}
    />
  );

  return (
    <div className="space-y-4">
      <ProgressSteps steps={["Start dienst", "Ritten", "Eindtijd", "Indienen"]} currentStep={progressStep} />
      <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />

      <StandplaatsWerkSection
        standplaatsWerk={standplaatsWerk}
        setStandplaatsWerk={setStandplaatsWerk}
        customers={customers}
        projects={projects}
        activiteiten={activiteiten}
      />

      <Card className="bg-blue-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Truck className="w-5 h-5" /> Rit Informatie</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-blue-100">Ritten (Verblijfskosten art. 40 CAO)</p></CardContent>
      </Card>

      {trips.map((trip, index) => (
        <Card key={index} className="border-2 border-slate-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Rit {index + 1}</h3>
              <Button variant="ghost" size="icon" onClick={() => removeTrip(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Rit</Label>
                {timeInput(trip.start_time, (v) => updateTrip(index, 'start_time', v), "09:00")}
                <p className="text-xs text-slate-500">Typ tijd UU:MM</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Einde Rit</Label>
                {timeInput(trip.end_time, (v) => updateTrip(index, 'end_time', v), "15:00")}
                <p className="text-xs text-slate-500">Typ tijd UU:MM</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vertreklocatie</Label>
              <Input value={trip.departure_location} onChange={(e) => updateTrip(index, 'departure_location', e.target.value)} placeholder="bijv. Standplaats" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kenteken *</Label>
              <Select value={trip.vehicle_id} onValueChange={(v) => updateTrip(index, 'vehicle_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecteer voertuig" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Schade gereden?</Label>
              <Select value={trip.damage_occurred || "Nee"} onValueChange={(v) => updateTrip(index, 'damage_occurred', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nee">Nee</SelectItem>
                  <SelectItem value="Ja">Ja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Begin km *</Label>
                <Input type="number" value={trip.start_km} onChange={(e) => updateTrip(index, 'start_km', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eind km</Label>
                <Input type="number" value={trip.end_km} onChange={(e) => updateTrip(index, 'end_km', e.target.value)} />
              </div>
            </div>
            {(() => {
              const sk = Number(trip.start_km), ek = Number(trip.end_km);
              if (sk > 0 && ek > 0 && ek > sk) {
                const km = ek - sk;
                if (km > 400) return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs">
                    <span className="font-bold">⚠️ {km} km</span> — Zeer ongebruikelijk. Controleer begin- en eindstand!
                  </div>
                );
                if (km > 250) return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs">
                    <span className="font-bold">⚠️ {km} km</span> — Meer dan gebruikelijk. Klopt dit?
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Brandstof (liter)</Label>
                <Input type="number" step="0.01" value={trip.fuel_liters || ""} onChange={(e) => updateTrip(index, 'fuel_liters', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AdBlue (liter)</Label>
                <Input type="number" step="0.01" value={trip.adblue_liters || ""} onChange={(e) => updateTrip(index, 'adblue_liters', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Km-stand van tanken</Label>
                <Input type="number" value={trip.fuel_km || ""} onChange={(e) => updateTrip(index, 'fuel_km', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-laden (kWh)</Label>
                <Input type="number" step="0.01" value={trip.charging_kwh || ""} onChange={(e) => updateTrip(index, 'charging_kwh', e.target.value)} placeholder="Als aan laadpaal" />
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="bg-emerald-600 text-white p-2 rounded-lg mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /><span className="text-sm font-semibold">Route Details</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Klant (verplicht om te voltooien)</Label>
                  <Select value={trip.customer_id || "none"} onValueChange={(v) => updateTrip(index, 'customer_id', v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecteer klant</SelectItem>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Selecteer route</Label>
                    <Select value={trip.route_name || "none"} onValueChange={(v) => {
                      const newTrips = [...trips];
                      if (v === "__custom__") {
                        newTrips[index] = { ...trip, route_name: "", _showCustomRoute: true };
                      } else {
                        newTrips[index] = { ...trip, route_name: v === "none" ? "" : v, _showCustomRoute: false };
                      }
                      setTrips(newTrips);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecteer route" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecteer route</SelectItem>
                        {[...tiModelRoutes].filter(r => !trip.customer_id || r.customer_id === trip.customer_id)
                          .sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true }))
                          .map(r => <SelectItem key={`ti-${r.id}`} value={r.route_code || r.route_name}>{r.route_code} - {r.route_name}</SelectItem>)}
                        <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
                        {[...routes].filter(r => !trip.customer_id || r.customer_id === trip.customer_id)
                          .sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true }))
                          .map(r => <SelectItem key={`rt-${r.id}`} value={r.route_code || r.route_name}>{r.route_code} - {r.route_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {trip._showCustomRoute && (
                      <Input className="mt-1" value={trip.route_name}
                        onChange={(e) => { const nt = [...trips]; nt[index] = { ...trip, route_name: e.target.value, _showCustomRoute: true }; setTrips(nt); }}
                        placeholder="Typ routenaam..." autoFocus />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bestelde stops</Label>
                    <Input type="number" value={trip.planned_stops} onChange={(e) => updateTrip(index, 'planned_stops', e.target.value)} placeholder="bijv. 85" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Opmerkingen</Label>
                  <Textarea value={trip.notes} onChange={(e) => updateTrip(index, 'notes', e.target.value)} rows={2} placeholder="Bijzonderheden..." />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full border-dashed border-2 py-6" onClick={() => {
        setTrips([...trips, { ...EMPTY_TRIP }]);
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
      }}>
        <Plus className="w-5 h-5 mr-2" /> Regel Toevoegen
      </Button>

      {(trips.length > 0 || standplaatsWerk.length > 0) && (
        <div className="space-y-2 pt-4 border-t mt-4">
          <Button variant="outline" className="w-full py-3 border-emerald-300 bg-emerald-50" onClick={onSaveDraft} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> Tussentijds Opslaan & Terug naar Home
          </Button>
          {trips.length > 0 && (
            <Button className="w-full py-3 bg-blue-600 hover:bg-blue-700" onClick={async () => { await onSaveDraft(); setActiveTab("dienst"); }} disabled={isSubmitting}>
              <Clock className="w-4 h-4 mr-2" /> Volgende → Einde diensttijd invoeren
            </Button>
          )}
        </div>
      )}
    </div>
  );
}