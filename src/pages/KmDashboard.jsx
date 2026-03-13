import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Gauge } from "lucide-react";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";

import KmDashboardFilters from "@/components/km-dashboard/KmDashboardFilters";
import KmSummaryCards from "@/components/km-dashboard/KmSummaryCards";
import KmTripTable from "@/components/km-dashboard/KmTripTable";
import KmVehicleSummary from "@/components/km-dashboard/KmVehicleSummary";
import KmRouteSummary from "@/components/km-dashboard/KmRouteSummary";

export default function KmDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [periodType, setPeriodType] = useState("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const cOpts = { staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false };

  // Compute date range (must be before queries that use it)
  const dateRange = useMemo(() => {
    if (periodType === "day") {
      return { from: selectedDate, to: selectedDate };
    }
    if (periodType === "week") {
      const we = endOfWeek(weekStart, { weekStartsOn: 1 });
      return { from: format(weekStart, 'yyyy-MM-dd'), to: format(we, 'yyyy-MM-dd') };
    }
    return { from: rangeFrom, to: rangeTo };
  }, [periodType, selectedDate, weekStart, rangeFrom, rangeTo]);

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['km-trips', dateRange.from, dateRange.to],
    queryFn: () => base44.entities.Trip.filter({
      date: { $gte: dateRange.from, $lte: dateRange.to }
    }, '-date', 500),
    ...cOpts,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    ...cOpts,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    ...cOpts,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    ...cOpts,
  });

  const vehicleMap = useMemo(() => {
    const m = {};
    vehicles.forEach(v => { m[v.id] = v; });
    return m;
  }, [vehicles]);

  const employeeMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { m[e.id] = e; });
    return m;
  }, [employees]);

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[c.id] = c; });
    return m;
  }, [customers]);

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      if (!t.date) return false;
      if (vehicleFilter !== "all" && t.vehicle_id !== vehicleFilter) return false;
      if (employeeFilter !== "all" && t.employee_id !== employeeFilter) return false;
      return true;
    });
  }, [trips, vehicleFilter, employeeFilter]);

  // Period label for print header
  const periodLabel = useMemo(() => {
    if (periodType === "day") {
      return format(parseISO(selectedDate), 'd MMMM yyyy');
    }
    if (periodType === "week") {
      const we = endOfWeek(weekStart, { weekStartsOn: 1 });
      return `Week ${format(weekStart, 'I')} — ${format(weekStart, 'd MMM')} t/m ${format(we, 'd MMM yyyy')}`;
    }
    return `${format(parseISO(rangeFrom), 'd MMM yyyy')} — ${format(parseISO(rangeTo), 'd MMM yyyy')}`;
  }, [periodType, selectedDate, weekStart, rangeFrom, rangeTo]);

  const activeVehicles = vehicles.filter(v => v.status !== "Uit dienst");

  return (
    <div className="space-y-6">
      {/* Print header (hidden on screen) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">KM Dashboard — {periodLabel}</h1>
        {vehicleFilter !== "all" && <p className="text-sm text-slate-600">Voertuig: {vehicleMap[vehicleFilter]?.license_plate}</p>}
        {employeeFilter !== "all" && (
          <p className="text-sm text-slate-600">
            Chauffeur: {(() => { const e = employeeMap[employeeFilter]; return e ? `${e.first_name} ${e.prefix ? e.prefix + ' ' : ''}${e.last_name}` : ''; })()}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">Afgedrukt op {format(new Date(), 'd MMMM yyyy HH:mm')}</p>
      </div>

      {/* Screen header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-8 h-8 text-blue-600" />
            KM Dashboard
          </h1>
          <p className="text-slate-500 mt-1">{periodLabel}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Printen
        </Button>
      </div>

      {/* Filters */}
      <KmDashboardFilters
        periodType={periodType} setPeriodType={setPeriodType}
        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
        weekStart={weekStart} setWeekStart={setWeekStart}
        rangeFrom={rangeFrom} setRangeFrom={setRangeFrom}
        rangeTo={rangeTo} setRangeTo={setRangeTo}
        vehicleFilter={vehicleFilter} setVehicleFilter={setVehicleFilter}
        employeeFilter={employeeFilter} setEmployeeFilter={setEmployeeFilter}
        vehicles={activeVehicles} employees={employees.filter(e => e.status === 'Actief')}
      />

      {/* Content */}
      {loadingTrips ? (
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <KmSummaryCards trips={filteredTrips} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KmVehicleSummary trips={filteredTrips} vehicleMap={vehicleMap} />
            <KmRouteSummary trips={filteredTrips} />
          </div>

          <KmTripTable
            trips={filteredTrips}
            vehicleMap={vehicleMap}
            employeeMap={employeeMap}
            customerMap={customerMap}
          />
        </>
      )}
    </div>
  );
}