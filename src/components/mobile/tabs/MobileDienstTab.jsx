import React from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Send, Save } from "lucide-react";
import ProgressSteps from "@/components/mobile/ProgressSteps";
import AutoSaveIndicator from "@/components/mobile/AutoSaveIndicator";

const timeToMinutes = (time) => {
  if (!time || time.length < 5) return null;
  const [h, m] = time.split(':').map(Number);
  return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
};

export default function MobileDienstTab({
  formData, setFormData, trips, signature,
  submittedTodayEntries, progressStep, lastSavedAt, isSaving,
  calculateHours, isMultiDay, isSubmitting,
  onSubmit, onSaveDraft, setActiveTab
}) {
  const timeInput = (value, onChange, placeholder) => (
    <Input
      type="text" inputMode="numeric" maxLength="5"
      value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
        onChange(v);
      }}
      placeholder={placeholder}
    />
  );

  const maxEndDate = formData.date ? format(addDays(new Date(formData.date), 7), 'yyyy-MM-dd') : undefined;

  return (
    <div className="space-y-4">
      {submittedTodayEntries.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
          <p className="text-sm text-blue-800 font-medium">ℹ️ Al ingediende diensten vandaag:</p>
          {submittedTodayEntries.map((entry, idx) => (
            <div key={entry.id} className="flex items-center gap-2 text-xs text-blue-700">
              <span className="font-semibold">Dienst {idx + 1}:</span>
              <span>{entry.start_time || '?'} — {entry.end_time || '?'}</span>
              <Badge className="bg-blue-100 text-blue-700 text-xs py-0">{entry.status}</Badge>
            </div>
          ))}
          <p className="text-xs text-blue-600 mt-1">Let op: vermijd overlap met bovenstaande tijden.</p>
        </div>
      )}

      <ProgressSteps steps={["Start dienst", "Ritten", "Eindtijd", "Indienen"]} currentStep={progressStep} />
      <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            {isMultiDay ? 'Diensttijd (meerdaagse dienst)' : 'Diensttijd'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMultiDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Startdatum</Label>
                <Input type="date" value={formData.date} onChange={(e) => {
                  const d = e.target.value;
                  setFormData({ ...formData, date: d, end_date: (formData.end_date < d ? d : formData.end_date) });
                }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Einddatum</Label>
                <Input type="date" value={formData.end_date} min={formData.date} max={maxEndDate}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">Datum</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          )}

          {isMultiDay && formData.date !== formData.end_date && (
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">
                ⚡ Meerdaagse dienst: {format(new Date(formData.date), "d MMM", { locale: nl })} t/m {format(new Date(formData.end_date), "d MMM yyyy", { locale: nl })}
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Stap 1: Voer starttijd in</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Start dienst *</Label>
            {timeInput(formData.start_time, (v) => setFormData({ ...formData, start_time: v }), "08:30")}
            <p className="text-xs text-slate-500 mt-1">Typ tijd in formaat UU:MM (bijv. 08:30)</p>
          </div>

          {formData.start_time && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">✓ Starttijd: {formData.start_time}</p>
            </div>
          )}

          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setActiveTab("ritten")} disabled={!formData.start_time}>
            Volgende → Ritten invoeren
          </Button>

          {trips.length > 0 && (
            <>
              <div className="border-t my-4" />
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Stap 2: Voer eindtijd in</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">✓ {trips.length} rit(ten) toegevoegd</p>
              </div>

              <div className="space-y-3">
                {isMultiDay && (
                  <div className="space-y-1">
                    <Label className="text-xs">Einddatum dienst</Label>
                    <Input type="date" value={formData.end_date} min={formData.date} max={maxEndDate}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                    <p className="text-xs text-slate-500 mt-1">Op welke dag eindigt de dienst?</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Eind dienst *</Label>
                  {timeInput(formData.end_time, (v) => setFormData({ ...formData, end_time: v }), "16:30")}
                  <p className="text-xs text-slate-500 mt-1">Typ tijd in formaat UU:MM (bijv. 16:30)</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pauze (minuten)</Label>
                  <Input type="number" value={formData.break_minutes}
                    onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value, 10) || 0 })} />
                </div>
              </div>

              {formData.end_time && (
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-blue-700">
                    <strong>Totaal uren:</strong> {calculateHours(formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.end_date)} uur
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Opmerkingen</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Extra informatie..." />
              </div>

              {signature && (
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-700 mb-1">Handtekening toegevoegd ✓</p>
                  <img src={signature} alt="Handtekening" className="h-12 border rounded" />
                </div>
              )}

              <Button
                className={`w-full py-4 text-base font-semibold transition-all duration-300 ${
                  formData.end_time && trips.length > 0 ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300 ring-offset-2' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                <Send className="w-5 h-5 mr-2" />
                {signature ? 'Dienst Indienen' : 'Met Handtekening Indienen'}
              </Button>

              <Button variant="outline" className="w-full border-emerald-300 bg-emerald-50" onClick={onSaveDraft} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                Tussentijds Opslaan
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}