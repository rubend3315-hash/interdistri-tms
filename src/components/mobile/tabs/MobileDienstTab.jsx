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
    className="h-[40px] text-[14px] bg-white"
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
  calculateHours, isMultiDay, isMultiDayAllowed = false, isSubmitting,
  onSubmit, onSaveDraft, setActiveTab,
  geenRit = false, setGeenRit, geenRitReden = "", setGeenRitReden, v2 = false,
  postNLAuto = false, setPostNLAuto,
  manualBreak = false, setManualBreak
}) {
  // Only show multi-day toggle for authorized employees; default ON for multi_day employees
  const [multiDayEnabled, setMultiDayEnabled] = useState(isMultiDayAllowed);

  const hasRegels = geenRit ? true : dienstRegels.length > 0;
  const hasOpenRit = dienstRegels.some(r => r.openRit && !r.end_time);
  const tripsCount = dienstRegels.filter(r => r.type === "rit").length;
  const standplaatsCount = dienstRegels.filter(r => r.type === "standplaats").length;

  const isSingleDay = !multiDayEnabled || !formData.end_date || formData.end_date === formData.date;
  const validation = useMemo(() =>
    geenRit ? { overlaps: [], gaps: [], margins: [], hasOverlap: false, hasGap: false, hasMarginError: false } :
    validateDienstRegels(dienstRegels, formData.start_time, formData.end_time, isSingleDay),
    [dienstRegels, formData.start_time, formData.end_time, isSingleDay, geenRit]
  );
  const submitBlocked = validation.hasOverlap || validation.hasGap || validation.hasMarginError || hasOpenRit;
  const allErrors = [...validation.overlaps, ...validation.gaps, ...validation.margins];
  const geenRitValid = !geenRit || (geenRitReden && geenRitReden.trim().length >= 5);
  const canSubmit = formData.end_time && hasRegels && !submitBlocked && !isSubmitting && geenRitValid;
  const maxEndDate = formData.date ? format(addDays(new Date(formData.date), 7), 'yyyy-MM-dd') : undefined;

  // Open rit: allow saving draft without end_time, show "end" step but don't block save
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
      <div className="flex-1 px-4 py-2 space-y-2">
        {/* ── BLOK 1: Datum & Start ── */}
        <div className="space-y-1.5">
          {/* Meerdaags toggle — only for authorized employees */}
          {isMultiDayAllowed && (
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[12px] text-slate-600">Meerdaagse dienst</span>
              <Switch checked={multiDayEnabled} onCheckedChange={handleMultiDayToggle} />
            </div>
          )}

          {/* Date fields — side by side when multiday */}
          {multiDayEnabled && isMultiDayAllowed ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-500 mb-0.5">Startdatum</Label>
                  <Input type="date" className="h-[40px] bg-white" value={formData.date} onChange={(e) => {
                    const d = e.target.value;
                    setFormData(prev => ({ ...prev, date: d, end_date: (!prev.end_date || prev.end_date < d) ? d : prev.end_date }));
                  }} />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-500 mb-0.5">Einddatum</Label>
                  <Input type="date" className="h-[40px] bg-white" value={formData.end_date || formData.date} min={formData.date} max={maxEndDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} />
                </div>
              </div>
              {formData.end_date && formData.end_date !== formData.date && (
                <p className="text-[11px] text-amber-700 font-medium">
                  ⚡ {format(new Date(formData.date), "d MMM", { locale: nl })} t/m {format(new Date(formData.end_date), "d MMM", { locale: nl })}
                </p>
              )}
              <div>
                <Label className="text-[11px] text-slate-500 mb-0.5">Start dienst *</Label>
                <TimeInput value={formData.start_time} onChange={(v) => setFormData(prev => ({ ...prev, start_time: v }))} placeholder="08:30" />
              </div>
            </>
          ) : (
            /* Single day: datum + starttijd naast elkaar */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-500 mb-0.5">Datum</Label>
                <Input type="date" className="h-[40px] bg-white" value={formData.date} onChange={(e) => {
                  const d = e.target.value;
                  setFormData(prev => ({ ...prev, date: d, end_date: d }));
                }} />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500 mb-0.5">Start dienst *</Label>
                <TimeInput value={formData.start_time} onChange={(v) => setFormData(prev => ({ ...prev, start_time: v }))} placeholder="08:30" />
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-slate-100" />

        {/* ── PostNL auto-rit checkbox ── */}
        {formData.start_time && v2 && setPostNLAuto && (
          <label className="flex items-center gap-2 py-0.5 cursor-pointer">
            <Checkbox checked={postNLAuto} onCheckedChange={(checked) => setPostNLAuto(!!checked)} />
            <span className="text-[13px] text-slate-700">PostNL – automatische rit aanmaken</span>
          </label>
        )}

        {/* ── BLOK 2: Geen rit + Dienstregels samenvatting ── */}
        {formData.start_time && v2 && (
          <div>
            <label className="flex items-center gap-2 py-0.5 cursor-pointer">
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
          <div>
            <button
              type="button"
              onClick={() => setActiveTab("ritten")}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-slate-900 font-medium">
                  {postNLAuto && dienstRegels.length > 0 ? 'Rit bewerken' : 'Dienstregels'}
                </span>
                {dienstRegels.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {tripsCount > 0 && <span className="flex items-center gap-0.5"><Truck className="w-3 h-3 text-blue-500" />{tripsCount}</span>}
                    {standplaatsCount > 0 && <span className="flex items-center gap-0.5"><Package className="w-3 h-3 text-amber-500" />{standplaatsCount}</span>}
                    {hasOpenRit && <span className="text-[10px] text-amber-600 font-medium">⏳ open</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-blue-600">{dienstRegels.length === 0 ? 'Toevoegen' : 'Bewerken'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
            {hasOpenRit && (
              <p className="text-[10px] text-amber-700 -mt-0.5 mb-0.5">
                🟡 Open rit – eindtijd later invullen
              </p>
            )}
          </div>
        )}

        {formData.start_time && <div className="border-b border-slate-100" />}

        {/* ── BLOK 3: Eind & Pauze ── */}
        {(hasRegels || geenRit) && formData.start_time && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div id="dienst-eindtijd">
                <Label className="text-[11px] text-slate-500 mb-0.5">Eind dienst *</Label>
                <TimeInput value={formData.end_time} onChange={(v) => setFormData(prev => ({ ...prev, end_time: v }))} placeholder="16:30" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500 mb-0.5">Pauze (min)</Label>
                <Input type="number" className={`h-[40px] ${manualBreak ? 'bg-white' : 'bg-slate-50'}`} value={formData.break_minutes}
                  readOnly={!manualBreak}
                  onChange={(e) => { if (manualBreak) setFormData(prev => ({ ...prev, break_minutes: parseInt(e.target.value, 10) || 0 })); }} />
                {!manualBreak && (
                  <p className="text-[10px] text-blue-600 mt-0.5">📋 CAO-staffel</p>
                )}
              </div>
            </div>

            {setManualBreak && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={manualBreak} onCheckedChange={(checked) => setManualBreak(!!checked)} />
                <span className="text-[12px] text-slate-600">Pauze handmatig invullen</span>
              </label>
            )}

            {formData.end_time && (
              <p className="text-[12px] text-blue-700 font-semibold text-center">
                Totaal: {calculateHours(formData.start_time, formData.end_time, formData.break_minutes, formData.date, formData.end_date)} uur
              </p>
            )}
          </div>
        )}

        {/* Validation + notes */}
        {(hasRegels || geenRit) && formData.end_time && (
          <div className="space-y-1.5">
            {submitBlocked && (
              <div className={`px-3 py-2 ${hasOpenRit && allErrors.length === 0 ? 'bg-amber-50 border-l-2 border-amber-400' : 'bg-red-50 border-l-2 border-red-400'} rounded-r-xl`}>
                <div className={`flex items-center gap-1.5 ${hasOpenRit && allErrors.length === 0 ? 'text-amber-700' : 'text-red-700'} font-semibold text-[11px]`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{hasOpenRit && allErrors.length === 0 ? 'Open rit afsluiten om in te dienen' : 'Kan niet indienen:'}</span>
                </div>
                {allErrors.map((msg, i) => (
                  <p key={i} className="text-[10px] text-red-600 ml-5 mt-0.5">• {msg}</p>
                ))}
                {hasOpenRit && allErrors.length === 0 && (
                  <p className="text-[10px] text-amber-600 ml-5 mt-0.5">• Vul eindtijd en eind km in bij je rit</p>
                )}
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
      <div className="sticky bottom-0 left-0 right-0 bg-white pt-1.5 pb-1 px-4 border-t border-slate-100">
        {step === "start" && (
          <button disabled className="w-full h-[44px] rounded-[10px] bg-slate-200 text-slate-400 text-[13px] font-semibold flex items-center justify-center">
            Vul starttijd in om door te gaan
          </button>
        )}
        {step === "regels" && !geenRit && !postNLAuto && (
          <button type="button" onClick={() => setActiveTab("ritten")}
            className="w-full h-[44px] rounded-[10px] bg-blue-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 active:bg-blue-700">
            <Truck className="w-4 h-4" /> Dienstregels toevoegen
          </button>
        )}
        {step === "regels" && !geenRit && postNLAuto && (
          <button disabled className="w-full h-[44px] rounded-[10px] bg-slate-200 text-slate-400 text-[13px] font-semibold flex items-center justify-center">
            Vul eindtijd in voor PostNL rit
          </button>
        )}
        {step === "end" && !hasOpenRit && (
          <button disabled className="w-full h-[44px] rounded-[10px] bg-slate-200 text-slate-400 text-[13px] font-semibold flex items-center justify-center">
            Vul eindtijd in om in te dienen
          </button>
        )}
        {step === "end" && hasOpenRit && (
          <div className="space-y-1">
            <button type="button" onClick={onSaveDraft} disabled={isSubmitting}
              className="w-full h-[44px] rounded-[10px] bg-emerald-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 active:bg-emerald-700">
              <Save className="w-4 h-4" /> Opslaan & naar Home
            </button>
            <p className="text-[10px] text-amber-600 text-center">
              🟡 Kom later terug om af te sluiten
            </p>
          </div>
        )}
        {step === "submit" && (
          <div className="space-y-1">
            {hasOpenRit ? (
              <>
                <button type="button" onClick={onSaveDraft} disabled={isSubmitting}
                  className="w-full h-[44px] rounded-[10px] bg-emerald-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 active:bg-emerald-700">
                  <Save className="w-4 h-4" /> Opslaan & naar Home
                </button>
                <p className="text-[10px] text-amber-600 text-center">
                  🟡 Open rit — sluit eerst af om in te dienen
                </p>
              </>
            ) : (
              <>
                <button type="button" onClick={onSubmit} disabled={!canSubmit}
                  className={`w-full h-[44px] rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${
                    canSubmit
                      ? 'bg-blue-600 text-white active:bg-blue-700 ring-2 ring-blue-300 ring-offset-1'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                  <Send className="w-4 h-4" />
                  {signature ? 'Dienst Indienen' : 'Handtekening & Indienen'}
                </button>
                <button type="button" onClick={onSaveDraft} disabled={isSubmitting}
                  className="w-full text-center text-[11px] text-emerald-700 font-medium py-1">
                  <Save className="w-3 h-3 inline mr-1" />Tussentijds opslaan
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}