import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Pencil, Save, X, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function formatTime(val) {
  if (!val || val === '' || val === '-') return '';
  return String(val);
}

// Editable cell component
function EditableCell({ value, field, rowId, isEditing, editValues, onEditChange, isNumeric = false, isTime = false }) {
  const displayVal = isNumeric ? (Number(value) || 0) : (isTime ? formatTime(value) : (value || '-'));
  if (!isEditing) {
    return displayVal;
  }
  const editVal = editValues[rowId]?.[field];
  const originalVal = isNumeric ? (Number(value) || 0) : (value || '');
  const currentVal = editVal !== undefined ? editVal : originalVal;
  const hasChanged = editVal !== undefined && String(editVal) !== String(originalVal);
  
  return (
    <input
      type={isNumeric ? "number" : "text"}
      value={currentVal}
      onChange={(e) => onEditChange(rowId, field, isNumeric ? Number(e.target.value) : e.target.value)}
      className={`w-full border rounded px-1 py-0.5 text-xs ${hasChanged ? 'bg-yellow-50 border-yellow-400' : 'border-slate-300'}`}
      style={{ minWidth: isNumeric ? '50px' : '70px' }}
      placeholder={isTime ? 'HH:MM:SS' : ''}
    />
  );
}

export default function ActiviteitenReport({ weekData, onDataUpdated }) {
  const [dayFilter, setDayFilter] = useState("auto");
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({}); // { importId: { field: value } }
  const [saving, setSaving] = useState(false);

  // Editable fields: the numeric fields users are most likely to correct
  const EDITABLE_NUMERIC_FIELDS = [
    'Aantal tijdens route - stuks',
    'Aantal tijdens route - stops',
    'Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)',
    'Aantal stops waarvoor geen aanbiedpoging is uitgevoerd',
    'Aantal bij terugkomst - stops',
    'Aantal afgeleverd - stuks',
    'Aantal afgeleverd - stops',
    'Legitimatiecheck aan de deur',
    'Aantal PBA-pakketten bezorgd',
    'Aantal stuks afgehaald/gecollecteerd',
    'Aantal periodes >15 min geen scan',
  ];

  const handleEditChange = useCallback((rowId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [field]: value }
    }));
  }, []);

  const changedCount = useMemo(() => {
    return Object.values(editValues).reduce((sum, fields) => sum + Object.keys(fields).length, 0);
  }, [editValues]);

  const handleSave = async () => {
    setSaving(true);
    const entries = Object.entries(editValues);
    let savedCount = 0;
    for (const [importId, fields] of entries) {
      if (Object.keys(fields).length === 0) continue;
      
      // Find the original weekData row to reconstruct the full data object
      const originalRow = weekData.find(r => r._importId === importId);
      if (!originalRow) continue;
      
      // Build the updated fields
      const updatedFields = {};
      for (const [field, val] of Object.entries(fields)) {
        updatedFields[field] = val;
      }
      
      // Reconstruct data object: copy all original fields except internal ones, apply updates
      const cleanOriginal = {};
      for (const [key, val] of Object.entries(originalRow)) {
        if (key.startsWith('_')) continue; // skip internal fields
        cleanOriginal[key] = val;
      }
      const newInnerData = { ...cleanOriginal, ...updatedFields };
      
      await base44.entities.PostNLImportResult.update(importId, { data: { data: newInnerData } });
      savedCount++;
    }
    
    toast.success(`${savedCount} rit(ten) bijgewerkt`);
    setEditValues({});
    setIsEditing(false);
    setSaving(false);
    if (onDataUpdated) onDataUpdated();
  };

  const handleCancel = () => {
    setEditValues({});
    setIsEditing(false);
  };

  // Find available days and the latest import date
  const availableDays = useMemo(() => {
    if (!weekData || weekData.length === 0) return [];
    const dayMap = {};
    weekData.forEach(r => {
      const datum = r['Datum'];
      if (datum && !dayMap[datum]) {
        dayMap[datum] = r._dayName || datum;
      }
    });
    // Sort by parsed date
    return Object.entries(dayMap).sort((a, b) => {
      const pa = a[0].split('-');
      const pb = b[0].split('-');
      const da = new Date(parseInt(pa[2]), parseInt(pa[1]) - 1, parseInt(pa[0]));
      const db = new Date(parseInt(pb[2]), parseInt(pb[1]) - 1, parseInt(pb[0]));
      return da - db;
    }).map(([datum, dayName]) => ({ datum, dayName }));
  }, [weekData]);

  // Auto-select: last import date
  const latestDatum = useMemo(() => {
    if (availableDays.length === 0) return null;
    return availableDays[availableDays.length - 1].datum;
  }, [availableDays]);

  // Determine effective filter
  const effectiveFilter = dayFilter === "auto" ? latestDatum : dayFilter;

  const currentDayIndex = useMemo(() => {
    if (!effectiveFilter || effectiveFilter === "all") return -1;
    return availableDays.findIndex(d => d.datum === effectiveFilter);
  }, [effectiveFilter, availableDays]);

  const goToPrevDay = () => {
    if (currentDayIndex > 0) {
      setDayFilter(availableDays[currentDayIndex - 1].datum);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex >= 0 && currentDayIndex < availableDays.length - 1) {
      setDayFilter(availableDays[currentDayIndex + 1].datum);
    }
  };

  // Build rows from raw import data, filtered and sorted by Ritnaam
  const rows = useMemo(() => {
    if (!weekData || weekData.length === 0) return [];
    let filtered = weekData;
    if (effectiveFilter && effectiveFilter !== "all") {
      filtered = weekData.filter(r => r['Datum'] === effectiveFilter);
    }
    return [...filtered].sort((a, b) => (a['Ritnaam'] || '').localeCompare(b['Ritnaam'] || ''));
  }, [weekData, effectiveFilter]);

  // Totals
  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return rows.reduce((acc, r) => ({
      aantalPeriodesGeenScan: acc.aantalPeriodesGeenScan + (Number(r['Aantal periodes >15 min geen scan']) || 0),
      aantalTijdensRouteStuds: acc.aantalTijdensRouteStuds + (Number(r['Aantal tijdens route - stuks']) || 0),
      aantalTijdensRouteStops: acc.aantalTijdensRouteStops + (Number(r['Aantal tijdens route - stops']) || 0),
      aantalStopsGeenAanbiedpoging: acc.aantalStopsGeenAanbiedpoging + (Number(r['Aantal stops waarvoor geen aanbiedpoging is uitgevoerd']) || 0),
      aantalStopsAangeboden: acc.aantalStopsAangeboden + (Number(r['Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0),
      aantalBijTerugkomstStops: acc.aantalBijTerugkomstStops + (Number(r['Aantal bij terugkomst - stops']) || 0),
      aantalAfgeleverdStuks: acc.aantalAfgeleverdStuks + (Number(r['Aantal afgeleverd - stuks']) || 0),
      aantalAfgeleverdStops: acc.aantalAfgeleverdStops + (Number(r['Aantal afgeleverd - stops']) || 0),
      bml: acc.bml + (Number(r['Legitimatiecheck aan de deur']) || 0),
      pba: acc.pba + (Number(r['Aantal PBA-pakketten bezorgd']) || 0),
      collectie: acc.collectie + (Number(r['Aantal stuks afgehaald/gecollecteerd']) || 0),
    }), {
      aantalPeriodesGeenScan: 0,
      aantalTijdensRouteStuds: 0,
      aantalTijdensRouteStops: 0,
      aantalStopsGeenAanbiedpoging: 0,
      aantalStopsAangeboden: 0,
      aantalBijTerugkomstStops: 0,
      aantalAfgeleverdStuks: 0,
      aantalAfgeleverdStops: 0,
      bml: 0,
      pba: 0,
      collectie: 0,
    });
  }, [rows]);

  const totalStops = useMemo(() => {
    if (!rows || rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + (Number(r['Aantal tijdens route - stops']) || 0), 0);
  }, [rows]);

  const rittenBerekening = totalStops / 150;

  if (!rows || rows.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen activiteiten data beschikbaar.</p>;
  }

  const currentDayLabel = effectiveFilter && effectiveFilter !== "all"
    ? availableDays.find(d => d.datum === effectiveFilter)?.dayName + ' ' + effectiveFilter
    : 'Hele week';

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Rendabiliteit berekening</p>
            <p className="text-lg font-bold text-blue-900">
              {totalStops} stops / 150 = <span className="text-2xl">{rittenBerekening.toFixed(1)}</span> ritten
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Stopverdeling over 11 contractritten</p>
            <p className="text-lg font-bold text-blue-900">
              {totalStops} / 11 = <span className="text-2xl">{(totalStops / 11).toFixed(0)}</span> stops per rit
              <span className={`ml-2 text-sm font-semibold ${(totalStops / 11) >= 150 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(totalStops / 11) >= 150 ? '✓ rendabel' : '✗ niet rendabel'}
              </span>
            </p>
          </div>
          <div className="text-xs text-blue-700 bg-blue-100 rounded px-3 py-2">
            💡 Er moeten 150 stops in een rit zitten om rendabel te kunnen rijden.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800">Activiteitenrapport{effectiveFilter && effectiveFilter !== "all" ? ` - ${currentDayLabel}` : ''}</h3>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 print:hidden">
              <Pencil className="w-3.5 h-3.5" /> Correcties aanbrengen
            </Button>
          ) : (
            <div className="flex items-center gap-2 print:hidden">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                Bewerkmodus actief {changedCount > 0 && `· ${changedCount} wijziging(en)`}
              </Badge>
              <Button size="sm" onClick={handleSave} disabled={changedCount === 0 || saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Opslaan...' : 'Opslaan'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> Annuleren
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={currentDayIndex <= 0}
            onClick={goToPrevDay}
            title="Vorige dag"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Laatste importdag</SelectItem>
              <SelectItem value="all">Hele week</SelectItem>
              {availableDays.map(d => (
                <SelectItem key={d.datum} value={d.datum}>{d.dayName} {d.datum}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={currentDayIndex < 0 || currentDayIndex >= availableDays.length - 1}
            onClick={goToNextDay}
            title="Volgende dag"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {dayFilter !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setDayFilter("all")}>
              Toon hele week
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b align-bottom">
            <tr>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Dag</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Ritnaam</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Starttijd shift</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Vrijgave</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">debrief</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">1ste stop</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">15 min geen scan</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Laatste stop</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[40px] align-bottom">X 15 min geen scan</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Bestel tijd Norm</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Bestel tijd Bruto</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Bestel tijd Netto</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[55px] align-bottom">Laden aan-/afrijtijd debrief</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Totaal rit</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal tijdens route - stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal tijdens route - stops</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal stops waarvoor geen aanbiedpoging is uitgevoerd</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[40px] align-bottom">Stops bij terug komst</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Aantal afgeleverd - stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[25px] align-bottom">BML</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal PBA- pakketten bezorgd</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal stuks afgehaald/<wbr/>gecollecteerd</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Geleverde stops</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const rowId = r._importId || `row-${idx}`;
              const hasEdits = editValues[rowId] && Object.keys(editValues[rowId]).length > 0;
              return (
              <tr key={idx} className={`border-b hover:bg-slate-50 ${hasEdits ? 'bg-yellow-50/50' : ''}`}>
                <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">{r._dayName || '-'}</td>
                <td className="py-1.5 px-2 font-medium text-slate-800">{r['Ritnaam'] || '-'}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r._starttijdShift)}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Vrijgegeven'])}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Afgehandeld'])}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Eerste stop'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{formatTime(r['>15 min geen scan'])}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Laatste stop'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal periodes >15 min geen scan']} field="Aantal periodes >15 min geen scan" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Besteltijd Norm']} field="Besteltijd Norm" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isTime />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Besteltijd Bruto']} field="Besteltijd Bruto" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isTime />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Besteltijd Netto']} field="Besteltijd Netto" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isTime />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Voorbereiding, aan-/afrijtijd en afhandeling']} field="Voorbereiding, aan-/afrijtijd en afhandeling" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isTime />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Totaal rit']} field="Totaal rit" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isTime />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal tijdens route - stuks']} field="Aantal tijdens route - stuks" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className={`py-1.5 px-2 text-right font-medium ${(Number(r['Aantal tijdens route - stops']) || 0) >= 150 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <EditableCell value={r['Aantal tijdens route - stops']} field="Aantal tijdens route - stops" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']} field="Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal stops waarvoor geen aanbiedpoging is uitgevoerd']} field="Aantal stops waarvoor geen aanbiedpoging is uitgevoerd" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal bij terugkomst - stops']} field="Aantal bij terugkomst - stops" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal afgeleverd - stuks']} field="Aantal afgeleverd - stuks" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Legitimatiecheck aan de deur']} field="Legitimatiecheck aan de deur" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal PBA-pakketten bezorgd']} field="Aantal PBA-pakketten bezorgd" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  <EditableCell value={r['Aantal stuks afgehaald/gecollecteerd']} field="Aantal stuks afgehaald/gecollecteerd" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-800">
                  <EditableCell value={r['Aantal afgeleverd - stops']} field="Aantal afgeleverd - stops" rowId={rowId} isEditing={isEditing} editValues={editValues} onEditChange={handleEditChange} isNumeric />
                </td>
              </tr>
              );
            })}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                <td className="py-2 px-2 text-slate-800" colSpan={3}>Totaal</td>
                <td className="py-2 px-2" colSpan={5}></td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalPeriodesGeenScan}</td>
                <td className="py-2 px-2" colSpan={4}></td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalTijdensRouteStuds}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalTijdensRouteStops}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalStopsAangeboden}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalStopsGeenAanbiedpoging}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalBijTerugkomstStops}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalAfgeleverdStuks}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.bml}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.pba}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.collectie}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">{totals.aantalAfgeleverdStops}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}