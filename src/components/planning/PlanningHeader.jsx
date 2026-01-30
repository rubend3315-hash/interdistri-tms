import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Copy, Calendar, Plus } from "lucide-react";

export default function PlanningHeader({
  viewMode,
  setViewMode,
  currentDate,
  onPreviousPeriod,
  onNextPeriod,
  periodStart,
  periodEnd,
  periodLabel,
  filterDepartment,
  setFilterDepartment,
  departments,
  colorMode,
  setColorMode,
  onExportPDF,
  onCopyWeek,
  onAddShift
}) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Planning</h1>
          <p className="text-slate-500 mt-1">Weekplanning en dienstroosters</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={colorMode} onValueChange={setColorMode}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shift">Shift type</SelectItem>
              <SelectItem value="employee">Medewerker</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Alle afdelingen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle afdelingen</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Maand
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={onAddShift}>
            <Plus className="w-4 h-4 mr-1" />
            Nieuwe Dienst
          </Button>
          <Button variant="outline" size="sm" onClick={onCopyWeek}>
            <Copy className="w-4 h-4 mr-1" />
            Kopieer week
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <Download className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onPreviousPeriod}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {viewMode === "week" ? "Vorige week" : "Vorige maand"}
        </Button>
        <div className="text-center">
          <p className="font-semibold text-slate-900">
            {format(periodStart, "d MMM", { locale: nl })} - {format(periodEnd, "d MMM yyyy", { locale: nl })}
          </p>
          <p className="text-sm text-slate-500">{periodLabel}</p>
        </div>
        <Button variant="outline" onClick={onNextPeriod}>
          {viewMode === "week" ? "Volgende week" : "Volgende maand"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </>
  );
}