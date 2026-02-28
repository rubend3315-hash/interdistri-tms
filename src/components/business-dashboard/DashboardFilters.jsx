import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MONTHS = [
  { value: "all", label: "Alle maanden" },
  { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
  { value: "3", label: "Maart" }, { value: "4", label: "April" },
  { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
  { value: "7", label: "Juli" }, { value: "8", label: "Augustus" },
  { value: "9", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export default function DashboardFilters({
  filters, onFilterChange, customers, employees, years
}) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1 min-w-[130px]">
        <Label className="text-xs text-muted-foreground">Jaar</Label>
        <Select value={String(filters.year)} onValueChange={(v) => handleChange("year", Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 min-w-[140px]">
        <Label className="text-xs text-muted-foreground">Weergave</Label>
        <Select value={filters.viewMode} onValueChange={(v) => handleChange("viewMode", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Wekelijks</SelectItem>
            <SelectItem value="monthly">Maandelijks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filters.viewMode === "monthly" && (
        <div className="space-y-1 min-w-[160px]">
          <Label className="text-xs text-muted-foreground">Maand</Label>
          <Select value={String(filters.month)} onValueChange={(v) => handleChange("month", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Klant</Label>
        <Select value={filters.customerId} onValueChange={(v) => handleChange("customerId", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle klanten</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Medewerker</Label>
        <Select value={filters.employeeId} onValueChange={(v) => handleChange("employeeId", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle medewerkers</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.first_name} {e.prefix ? e.prefix + " " : ""}{e.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}