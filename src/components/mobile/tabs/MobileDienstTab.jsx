import React, { useMemo } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Send, Save, AlertTriangle, Truck, Package } from "lucide-react";
import ProgressSteps from "@/components/mobile/ProgressSteps";
import AutoSaveIndicator from "@/components/mobile/AutoSaveIndicator";
import { validateDienstRegels } from "@/components/utils/mobile/dienstRegelValidation";

const TimeInput = ({ value, onChange, placeholder }) => (
  <Input
    type="text" inputMode="numeric" maxLength="5" value={value}
    className="h-[44px] text-[15px]"
    onChange={(e) => {
      let v = e.target.value.replace(/[^0-9]/g, '');
      if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
      onChange(v);
    }}
    placeholder={placeholder}
  />
);

export default function MobileDienstTab({
  formData, setFormData, dienstRegels = [], signature,
  submittedTodayEntries, progressStep, lastSavedAt, isSaving,
  calculateHours, isMultiDay, isSubmitting,
  onSubmit, onSaveDraft, setActiveTab
}) {
  const hasRegels = dienstRegels.length > 0;
  const tripsCount = dienstRegels.filter(r => r.type === "rit").length;
  const standplaatsCount = dienstRegels.filter(r => r.type === "standplaats").length;

  const isSingleDay = !isMultiDay || !formData.end_date || formData.end_date === formData.date;
  const validation = useMemo(() =>
    validateDienstRegels(dienstRegels, formData.start_time, formData.end_time, isSingleDay),
    [dienstRegels, formData.start_time, formData.end_time, isSingleDay]
  );
  const submitBlocked = validation.hasOverlap || validation.hasGap;
  const canSubmit = formData.end_time && hasRegels && !submitBlocked && !isSubmitting;

  const maxEndDate = formData.date ? format(addDays(new Date(formData.date), 7), 'yyyy-MM-dd') : undefined;

  return (
    <div className="space-y-2.5">
      {/* Submitted entries warning */}
      {submittedTodayEntries.length > 0 && (
        <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800 font-medium">ℹ️ Al ingediend vandaag:</p>
          {submittedTodayEntries.map((entry, idx) => (
            <div key={entry.id} className="flex items-center gap-2 text-[11px] text-blue-700 mt-0.5">
              <span className="font-semibold">#{idx + 1}</span>
              <span>{entry.start_time || '?'} — {entry.end_time || '?'}</span>
              <Badge className="bg-blue-100 text-blue-700 text-[10px] py-0 px-1">{entry.status}</Badge>
            </div>
          ))}
        </div>
      )}

      <ProgressSteps steps={["Start dienst", "Dienstregels", "Eindtijd", "Indienen"]} currentStep={progressStep} />
      <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />

      {/* Date + Start time — flat layout */}
      <div className="bg-white rounded-lg border p-3 space-y-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-[13px] font-semibold text-slate-900">
            {isMultiDay ? 'Diensttijd (meerdaags)' : 'Diensttijd'}
          </span>
        </div>

        {/* Date fields inline */}
        {isMultiDay ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-slate-500">Startdatum</Label>
              <Input type="date" className="h-[44px] mt-0.5" value={formData.date} onChange={(e) => {
                const d = e.target.value;
                setFormData({ ...formData, date: d, end_date: (formData.end_date < d ? d : formData.end_date) });
              }} />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">Einddatum</Label>
              <Input type="date" className="h-[44px] mt-0.5" value={formData.end_date} min={formData.date} max={maxEndDate}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-[11px] text-slate-500">Datum</Label>
            <Input type="date" className="h-[44px] mt-0.5" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
        )}

        {isMultiDay && formData.date !== formData.end_date && (
          <p className="text-[11px] text-amber-700 font-medium">
            ⚡ {format(new Date(formData.date), "d MMM", { locale: nl })} t/m {format(new Date(formData.end_date), "d MMM", { locale: nl })}
          </p>
        )}

        {/* Start time */}
        <div>
          <Label className="text-[11px] text-slate-500">Start dienst *</Label>
          <TimeInput value={formData.start_time} onChange={(v) => setFormData({ ...formData, start_time: v })} placeholder="08:30" />
        </div>

        <Button className="w-full h-[44px] bg-emerald-600 hover:bg-emerald-700 text-[13px]" onClick={() => setActiveTab("ritten")} disabled={!formData.start_time}>
          Volgende → Dienstregels
        </Button>
      </div>

      {/* End time + submit section */}
      {hasRegels && (
        <div className="bg-white rounded-lg border p-3 space-y-2.5">
          {/* Regels summary */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            {tripsCount > 0 && <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-blue-500" />{tripsCount} rit(ten)</span>}
            {standplaatsCount > 0 && <span className="flex items-center gap-1"><Package className="w-3 h-3 text-amber-500" />{standplaatsCount} standplaats</span>}
            <span className="text-slate-400">·</span>
            <button type="button" onClick={() => setActiveTab("ritten")} className="text-blue-600 underline">bewerken</button>
          </div>

          {/* End time + break inline */}
          {isMultiDay && (
            <div>
              <Label className="text-[11px] text-slate-500">Einddatum dienst</Label>
              <Input type="date" className="h-[44px] mt-0.5" value={formData.end_date} min={formData.date} max={maxEndDate}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-slate-500">Eind dienst *</Label>
              <TimeInput value={formData.end_time} onChange={(v) => setFormData({ ...formData, end_time: v })} placeholder="16:30" />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">Pauze (min)</Label>
              <Input type="number" className="h-[44px] mt-0.5" value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value, 10) || 0 })} />
            </div>
          </div>

          {/* Total hours */}
          {formData.end_time && (
            <div className="text-center py-1.5 bg-blue-50 rounded-lg">
              <span className="text-[13px] text-blue-700 font-semibold">
                Totaal: {calculateHours(formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.end_date)} uur
              </span>
            </div>
          )}

          {/* Validation errors */}
          {submitBlocked && (
            <div className="px-2.5 py-2 bg-red-50 border border-red-300 rounded-lg">
              <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Kan niet indienen:</span>
              </div>
              {[...validation.overlaps, ...validation.gaps].map((msg, i) => (
                <p key={i} className="text-[10px] text-red-600 ml-5 mt-0.5">• {msg}</p>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-[11px] text-slate-500">Opmerkingen</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Extra informatie..." className="text-sm mt-0.5" />
          </div>

          {/* Signature indicator (compact, no inline image) */}
          {signature && (
            <p className="text-[11px] text-emerald-700 font-medium">✓ Handtekening vastgelegd</p>
          )}

          {/* Submit */}
          <Button
            className={`w-full h-[48px] text-[14px] font-semibold transition-all ${
              canSubmit ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300 ring-offset-1' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            <Send className="w-4 h-4 mr-2" />
            {signature ? 'Dienst Indienen' : 'Handtekening & Indienen'}
          </Button>

          <Button variant="outline" className="w-full h-[40px] text-[12px] border-emerald-300 bg-emerald-50" onClick={onSaveDraft} disabled={isSubmitting}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Tussentijds Opslaan
          </Button>
        </div>
      )}
    </div>
  );
}