import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";

export default function FuelSurchargeFilters({
  periodType, setPeriodType,
  selectedDate, setSelectedDate,
  weekStart, setWeekStart,
  rangeFrom, setRangeFrom,
  rangeTo, setRangeTo,
  customerFilter, setCustomerFilter,
  customers
}) {
  const navigateWeek = (dir) => {
    setWeekStart(prev => dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `Week ${getISOWeek(weekStart)} — ${format(weekStart, 'd MMM', { locale: nl })} t/m ${format(weekEnd, 'd MMM yyyy', { locale: nl })}`;

  return (
    <Card className="print:hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Periode</Label>
            <Tabs value={periodType} onValueChange={setPeriodType}>
              <TabsList>
                <TabsTrigger value="day">Dag</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="range">Vrije range</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {periodType === "day" && (
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Datum</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>Vandaag</Button>
            </div>
          )}

          {periodType === "week" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white min-w-[260px] justify-center">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">{weekLabel}</span>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Deze week</Button>
            </div>
          )}

          {periodType === "range" && (
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Van</Label>
                <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-44" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Tot</Label>
                <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-44" />
              </div>
            </div>
          )}

          <div className="ml-auto space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Klant</Label>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecteer klant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle klanten</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}