import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApprovalsFilters({
  dateFrom,
  dateTo,
  selectedEmployee,
  searchQuery,
  filterShiftType = "all",
  onDateFromChange,
  onDateToChange,
  onEmployeeChange,
  onSearchChange,
  onShiftTypeChange,
  employees = [],
  onReset,
}) {
  const activeEmployees = employees.filter(e => e.status === 'Actief');
  const hasFilters = searchQuery || selectedEmployee !== "all" || filterShiftType !== "all" || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px] max-w-[280px]">
        <Label className="text-xs text-slate-500 mb-1 block">Zoeken</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Naam, notities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>
      <div className="min-w-[160px]">
        <Label className="text-xs text-slate-500 mb-1 block">Medewerker</Label>
        <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle medewerkers</SelectItem>
            {activeEmployees.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {onShiftTypeChange && (
        <div className="min-w-[140px]">
          <Label className="text-xs text-slate-500 mb-1 block">Diensttype</Label>
          <Select value={filterShiftType} onValueChange={onShiftTypeChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              <SelectItem value="Dag">Dag</SelectItem>
              <SelectItem value="Avond">Avond</SelectItem>
              <SelectItem value="Nacht">Nacht</SelectItem>
              <SelectItem value="Dag en Avond">Dag en Avond</SelectItem>
              <SelectItem value="Avond en Nacht">Avond en Nacht</SelectItem>
              <SelectItem value="Gewerkte dag">Gewerkte dag</SelectItem>
              <SelectItem value="Ziek">Ziek</SelectItem>
              <SelectItem value="Opleiding">Opleiding</SelectItem>
              <SelectItem value="ATV">ATV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="min-w-[140px]">
        <Label className="text-xs text-slate-500 mb-1 block">Datum van</Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
      <div className="min-w-[140px]">
        <Label className="text-xs text-slate-500 mb-1 block">Datum tot</Label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500" onClick={onReset}>
          <X className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
      )}
    </div>
  );
}