import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, RefreshCw } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"
];

export default function MaandcontroleFilters({ year, month, onYearChange, onMonthChange, isLocked, onRecalculate, recalculating }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={String(year)} onValueChange={v => onYearChange(Number(v))}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(month)} onValueChange={v => onMonthChange(Number(v))}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLocked && (
        <Badge className="bg-amber-100 text-amber-700 gap-1">
          <Lock className="w-3 h-3" />
          Vergrendeld
        </Badge>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onRecalculate}
        disabled={recalculating || isLocked}
        className="ml-auto"
      >
        <RefreshCw className={`w-4 h-4 mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
        {recalculating ? 'Berekenen...' : 'Herbereken'}
      </Button>
    </div>
  );
}