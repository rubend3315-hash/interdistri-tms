import React, { useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Send, Save, AlertTriangle, Truck, Package, ChevronRight, Clock } from "lucide-react";
import AutoSaveIndicator from "@/components/mobile/AutoSaveIndicator";
import { validateDienstRegels } from "@/components/utils/mobile/dienstRegelValidation";
import MobileStepIndicator from "@/components/mobile/MobileStepIndicator";

const TimeInput = ({ value, onChange, placeholder }) => (
  <Input
    type="text" inputMode="numeric" maxLength="5" value={value}
    className="h-[44px] text-[15px] bg-white"
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
  onSubmit, onSaveDraft, setActiveTab,
  geenRit = false, setGeenRit, geenRitReden = "", setGeenRitReden, v2 = false,
  postNLAuto = false, setPostNLAuto
}) {
  const [multiDayEnabled, setMultiDayEnabled] = useState(
    isMultiDay || (formData.end_date && formData.end_date !== formData.date)
  );

  const hasRegels = geenRit ? true : dienstRegels.length > 0;
  const tripsCount = dienstRegels.filter(r => r.type === "rit").length;
  const standplaatsCount = dienstRegels.filter(r => r.type === "standplaats").length;

  const isSingleDay = !multiDayEnabled || !formData.end_date || formData.end_date === formData.date;
  const validation = useMemo(() =>
    geenRit ? { overlaps: [], gaps: [], margins: [], hasOverlap: false, hasGap: false, hasMarginError: false } :
    validateDienstRegels(dienstRegels, formData.start_time, formData.end_time, isSingleDay),
    [dienstRegels, formData.start_time, formData.end_time, isSingleDay, geenRit]
  );
  const submitBlocked = validation.hasOverlap || validation.hasGap || validation.hasMarginError;
  const allErrors = [...validation.overlaps, ...validation.gaps, ...validation.margins];
  const geenRitValid = !geenRit || (geenRitReden && geenRitReden.trim().length >= 5);
  const canSubmit = formData.end_time && hasRegels && !submitBlocked && !isSubmitting && geenRitValid;
  const maxEndDate = formData.date ? format(addDays(new Date(formData.date), 7), 'yyyy-MM-dd') : undefined;

  const step = !formData.start_time ? "start" : (!hasRegels && !geenRit) ? "regels" : !formData.end_time ? "end" : "submit";

  const handleMultiDayToggle = (enabled) => {
    setMultiDayEnabled(enabled);
    if (!enabled) {
      setFormData(prev => ({ ...prev, end_date: prev.date }));
    } else if (!formData.end_date || formData.end_date === formData.date) {
      setFormData(prev => ({ ...prev, end_date: prev.date }));
    }
  };

  return (
    <div className="-mx-4 flex flex-col min-h-[calc(100vh-160px)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <MobileStepIndicator steps={["Start", "Regels", "Eind", "Indienen"]} currentStep={progressStep} />
        </div>
        <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />
      </div>

      {/* Submitted entries warning */}
      {submittedTodayEntries.length > 0 && (
        <div className="mx-4 mt-2 px-3 py-2 bg-blue-50/80 rounded-xl">
          <p className="text-[11px] text-blue-800 font-medium">ℹ️ Al ingediend:</p>
          {submittedTodayEntries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 text-[11px] text-blue-700">
              <span>{entry.start_time || '?'} — {entry.end_time || '?'}</span>
              <Badge className="bg-blue-100 text-blue-700 text-[9px] py-0 px-1">{entry.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-3 space-y-4">
        {/* ── BLOK 1: Datum & Start ── */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold text-slate-900">Datum & starttijd</h3>

          {/* Meerdaags toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[12px] text-slate-600">Meerdaagse dienst</span>
            <Switch checked={multiDayEnabled} onCheckedChange={handleMultiDayToggle} />
          </div>

          {/* Date fields — side by side when multiday */}
          {multiDayEnabled ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-500">Startdatum</Label>
                <Input type="date" className="h-[44px] mt-0.5 bg-white" value={formData.date} onChange={(e) => {
                  const d = e.target.value;
                  setFormData(prev => ({ ...prev, date: d, end_date: (!prev.end_date || prev.end_date < d) ? d : prev.end_date }));
                }} />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500">Einddatum</Label>
                <Input type="date" className="h-[44px] mt-0.5 bg-white" value={formData.end_date || formData.date} min={formData.date} max={maxEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-[11px] text-slate-500">Datum</Label>
              <Input type="date" className="h-[44px] mt-0.5 bg-white" value={formData.date} onChange={(e) => {
                const d = e.target.value;
                setFormData(prev => ({ ...prev, date: d, end_date: d }));
              }} />
            </div>
          )}

          {multiDayEnabled && formData.end_date && formData.end_date !== formData.date && (
            <p className="text-[11px] text-amber-700 font-medium">
              ⚡ {format(new Date(formData.date), "d MMM", { locale: nl })} t/m {format(new Date(formData.end_date), "d MMM", { locale: nl })}
            </p>
          )}

          <div>
            <Label className="text-[11px] text-slate-500">Start dienst *</Label>
            <TimeInput value={formData.start_time} onChange={(v) => setFormData(prev => ({ ...prev, start_time: v }))} placeholder="08:30" />
          </div>
        </div>

        <div className="border-b border-slate-100" />

        {/* ── PostNL auto-rit checkbox ── */}
        {formData.start_time && v2 && setPostNLAuto && (
          <label className="flex items-center gap-3 py-1 cursor-pointer">
            <Checkbox checked={postNLAuto} onCheckedChange={(checked) => setPostNLAuto(!!checked)} />
            <span className="text-[13px] text-slate-700">PostNL – automatische rit aanmaken</span>
          </label>
        )}

        {/* ── BLOK 2: Geen rit + Dienstregels samenvatting ── */}
        {formData.start_time && v2 && (
          <div>
            <label className="flex items-center gap-3 py-2 cursor-pointer">
              <Checkbox checked={geenRit} onCheckedChange={(checked) => setGeenRit(!!checked)} />
              <span className="text-[13px] text-slate-700">Geen rit / standplaats (kantoor, opleiding, etc.)</span>
            </label>
            {geenRit && (
              <div className="mt-2">
                <Label className="text-[11px] text-slate-500">Reden werkzaamheden *</Label>
                <Textarea
                  value={geenRitReden}
                  onChange={(e) => setGeenRitReden(e.target.value)}
                  rows={2}
                  placeholder="Beschrijf je werkzaamheden (min. 5 tekens)..."
                  className="text-sm mt-0.5 bg-white"
                />
                {geenRitReden.length > 0 && geenRitReden.trim().length < 5 && (
                  <p className="text-[10px] text-red-500 mt-0.5">Minimaal 5 tekens vereist</p>
                )}
              </div>
            )}
          </div>
        )}

        {formData.start_time && !geenRit && (
          <button
            type="button"
            onClick={() => setActiveTab("ritten")}
            className="w-full flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-slate-900 font-medium">
                {postNLAuto && dienstRegels.length > 0 ? 'Rit bewerken' : 'Dienstregels'}
              </span>
              {dienstRegels.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  {tripsCount > 0 && <span className="flex items-center gap-0.5"><Truck className="w-3 h-3 text-blue-500" />{tripsCount}</span>}
                  {standplaatsCount > 0 && <span className="flex items-center gap-0.5"><Package className="w-3 h-3 text-amber-500" />{standplaatsCount}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-blue-600">{dienstRegels.length === 0 ? 'Toevoegen' : 'Bewerken'}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        )}

        {formData.start_time && <div className="border-b border-slate-100" />}

        {/* ── BLOK 3: Eind & Pauze ── */}
        {(hasRegels || geenRit) && formData.start_time && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-slate-900">Eindtijd & pauze</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-500">Eind dienst *</Label>
                <TimeInput value={formData.end_time} onChange={(v) => setFormData(prev => ({ ...prev, end_time: v }))} placeholder="16:30" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500">Pauze (min)</Label>
                <Input type="number" className="h-[44px] mt-0.5 bg-white" value={formData.break_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, break_minutes: parseInt(e.target.value, 10) || 0 }))} />
              </div>
            </div>

            {formData.end_time && (
              <div className="text-center py-1">
                <span className="text-[13px] text-blue-700 font-semibold">
                  Totaal: {calculateHours(formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.end_date)} uur
                </span>
              </div>
            )}
          </div>
        )}

        {/* Validation + notes */}
        {(hasRegels || geenRit) && formData.end_time && (
          <div className="space-y-2">
            {submitBlocked && (
              <div className="px-3 py-2 bg-red-50 border-l-2 border-red-400 rounded-r-xl">
                <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Kan niet indienen:</span>
                </div>
                {allErrors.map((msg, i) => (
                  <p key={i} className="text-[10px] text-red-600 ml-5 mt-0.5">• {msg}</p>
                ))}
              </div>
            )}

            <div>
              <Label className="text-[11px] text-slate-500">Opmerkingen</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Extra informatie..." className="text-sm mt-0.5 bg-white" />
            </div>

            {signature && (
              <p className="text-[11px] text-emerald-700 font-medium">✓ Handtekening vastgelegd</p>
            )}
          </div>
        )}
      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 pb-1 px-4 border-t border-slate-100">
        {step === "start" && (
          <button disabled className="w-full h-[48px] rounded-xl bg-slate-200 text-slate-400 text-[14px] font-semibold flex items-center justify-center">
            Vul starttijd in om door te gaan
          </button>
        )}
        {step === "regels" && !geenRit && !postNLAuto && (
          <button type="button" onClick={() => setActiveTab("ritten")}
            className="w-full h-[48px] rounded-xl bg-blue-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:bg-blue-700">
            <Truck className="w-4 h-4" /> Dienstregels toevoegen
          </button>
        )}
        {step === "regels" && !geenRit && postNLAuto && (
          <button disabled className="w-full h-[48px] rounded-xl bg-slate-200 text-slate-400 text-[14px] font-semibold flex items-center justify-center">
            Vul eindtijd in voor PostNL rit
          </button>
        )}
        {step === "end" && (
          <button disabled className="w-full h-[48px] rounded-xl bg-slate-200 text-slate-400 text-[14px] font-semibold flex items-center justify-center">
            Vul eindtijd in om in te dienen
          </button>
        )}
        {step === "submit" && (
          <div className="space-y-1.5">
            <button type="button" onClick={onSubmit} disabled={!canSubmit}
              className={`w-full h-[48px] rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all ${
                canSubmit
                  ? 'bg-blue-600 text-white active:bg-blue-700 ring-2 ring-blue-300 ring-offset-1'
                  : 'bg-slate-200 text-slate-400'
              }`}>
              <Send className="w-4 h-4" />
              {signature ? 'Dienst Indienen' : 'Handtekening & Indienen'}
            </button>
            <button type="button" onClick={onSaveDraft} disabled={isSubmitting}
              className="w-full text-center text-[12px] text-emerald-700 font-medium py-1.5">
              <Save className="w-3 h-3 inline mr-1" />Tussentijds opslaan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}