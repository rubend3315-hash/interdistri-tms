import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, RotateCcw, Users, Clock, Truck, Download } from "lucide-react";
import Pagination, { usePagination } from "@/components/ui/Pagination";
import RitTijdEmployeeCard from "@/components/rit-tijd-rapportage/RitTijdEmployeeCard";
import { useTripFuelCost } from "@/components/tripsync/useTripFuelCost";

const DEFAULT_FROM = format(subDays(new Date(), 7), 'yyyy-MM-dd');
const TODAY = format(new Date(), 'yyyy-MM-dd');

export default function RitTijdRapportage() {
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(TODAY);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const page = usePagination(20);

  const qOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false };

  // Fetch all reference data
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'], queryFn: () => base44.entities.Employee.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'], queryFn: () => base44.entities.Customer.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'], queryFn: () => base44.entities.Project.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: activiteiten = [] } = useQuery({
    queryKey: ['activiteiten'], queryFn: () => base44.entities.Activiteit.list(), ...qOpts, staleTime: 24 * 60 * 60 * 1000,
  });

  // Fuel cost data
  const { data: fuelSettings = [] } = useQuery({
    queryKey: ['fuelSettings-rtr'], queryFn: () => base44.entities.CustomerFuelSettings.filter({ is_active: true }), ...qOpts,
  });
  const { data: dieselPrices = [] } = useQuery({
    queryKey: ['dieselPrices-rtr'], queryFn: () => base44.entities.DieselPrice.filter({}, '-date', 500), ...qOpts,
  });
  const { data: cbsPrices = [] } = useQuery({
    queryKey: ['cbsPrices-rtr'], queryFn: () => base44.entities.CbsDieselPrice.filter({}, '-date', 500), ...qOpts,
  });
  const getTripFuelCost = useTripFuelCost({ vehicles, fuelSettings, dieselPrices, cbsPrices });

  // Fetch time entries (approved only)
  const { data: timeEntries = [], isLoading: loadingTE } = useQuery({
    queryKey: ['rtr-timeEntries', dateFrom, dateTo],
    queryFn: () => base44.entities.TimeEntry.filter({
      status: 'Goedgekeurd',
      date: { $gte: dateFrom, $lte: dateTo },
    }),
    ...qOpts,
  });

  // Fetch trips
  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['rtr-trips', dateFrom, dateTo],
    queryFn: () => base44.entities.Trip.filter({
      date: { $gte: dateFrom, $lte: dateTo },
    }),
    ...qOpts,
  });

  // Fetch standplaatswerk
  const { data: spws = [], isLoading: loadingSpw } = useQuery({
    queryKey: ['rtr-spw', dateFrom, dateTo],
    queryFn: () => base44.entities.StandplaatsWerk.filter({
      date: { $gte: dateFrom, $lte: dateTo },
    }),
    ...qOpts,
  });

  // Fetch GPS TripRecords
  const { data: tripRecords = [], isLoading: loadingGps } = useQuery({
    queryKey: ['rtr-tripRecords', dateFrom, dateTo],
    queryFn: () => base44.entities.TripRecord.filter({
      date: { $gte: dateFrom, $lte: dateTo },
    }),
    ...qOpts,
  });

  // Fetch TripRecordLinks for driver matching
  const { data: tripRecordLinks = [] } = useQuery({
    queryKey: ['rtr-tripRecordLinks', dateFrom, dateTo],
    queryFn: () => base44.entities.TripRecordLink.filter({
      date: { $gte: dateFrom, $lte: dateTo },
    }),
    ...qOpts,
  });

  const isLoading = loadingTE || loadingTrips || loadingSpw || loadingGps;

  // Build GPS records by employee+date (same logic as Approvals)
  const tripRecordsByEmpDate = useMemo(() => {
    const linkMap = {};
    tripRecordLinks.forEach(l => { if (l.trip_record_id && l.employee_id) linkMap[l.trip_record_id] = l.employee_id; });

    const nameToEmpId = {};
    const lastNameIndex = {};
    employees.forEach(emp => {
      const fn = (emp.first_name || '').trim().toLowerCase();
      const pf = (emp.prefix || '').trim().toLowerCase();
      const ln = (emp.last_name || '').trim().toLowerCase();
      const full = `${fn} ${pf ? pf + ' ' : ''}${ln}`.trim();
      nameToEmpId[full] = emp.id;
      const simple = `${fn} ${ln}`.trim();
      if (!nameToEmpId[simple]) nameToEmpId[simple] = emp.id;
      if (ln) {
        if (!lastNameIndex[ln]) lastNameIndex[ln] = [];
        lastNameIndex[ln].push({ id: emp.id, firstName: fn });
      }
    });

    const matchDriver = (name) => {
      if (!name) return null;
      const clean = name.replace(/\s*\(\d+\)\s*$/, '').trim().toLowerCase();
      if (nameToEmpId[clean]) return nameToEmpId[clean];
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) {
        const dFirst = parts[0], dLast = parts[parts.length - 1];
        const cands = lastNameIndex[dLast];
        if (cands) {
          const m = cands.find(c => c.firstName.startsWith(dFirst) || dFirst.startsWith(c.firstName));
          if (m) return m.id;
        }
      }
      return null;
    };

    const result = {};
    tripRecords.forEach(r => {
      let empId = linkMap[r.id];
      if (!empId && r.driver) empId = matchDriver(r.driver);
      if (!empId || !r.date) return;
      const key = `${empId}_${r.date}`;
      if (!result[key]) result[key] = [];
      if (!result[key].some(x => x.id === r.id)) result[key].push(r);
    });
    return result;
  }, [tripRecordLinks, tripRecords, employees]);

  // Group data per employee+date
  const groupedData = useMemo(() => {
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    // Group time entries by employee+date
    const groups = {};
    timeEntries.forEach(te => {
      if (!te.employee_id) return;
      const key = `${te.employee_id}_${te.date}`;
      if (!groups[key]) groups[key] = { employee_id: te.employee_id, date: te.date, timeEntries: [], trips: [], spws: [], gps: [] };
      groups[key].timeEntries.push(te);
    });

    // Map trips by time_entry_id
    trips.forEach(t => {
      if (t.time_entry_id) {
        const te = timeEntries.find(e => e.id === t.time_entry_id);
        if (te) {
          const key = `${te.employee_id}_${te.date}`;
          if (groups[key]) groups[key].trips.push(t);
        }
      } else if (t.employee_id && t.date) {
        const key = `${t.employee_id}_${t.date}`;
        if (groups[key]) groups[key].trips.push(t);
      }
    });

    // Map SPW by time_entry_id
    spws.forEach(s => {
      if (s.time_entry_id) {
        const te = timeEntries.find(e => e.id === s.time_entry_id);
        if (te) {
          const key = `${te.employee_id}_${te.date}`;
          if (groups[key]) groups[key].spws.push(s);
        }
      } else if (s.employee_id && s.date) {
        const key = `${s.employee_id}_${s.date}`;
        if (groups[key]) groups[key].spws.push(s);
      }
    });

    // GPS records
    Object.entries(tripRecordsByEmpDate).forEach(([key, records]) => {
      if (groups[key]) {
        groups[key].gps = records;
      }
    });

    // Convert to array and sort
    let result = Object.values(groups).map(g => ({
      ...g,
      employee: empMap[g.employee_id],
    })).filter(g => g.employee);

    // Sort by date desc, then employee name
    result.sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      const nameA = `${a.employee.first_name} ${a.employee.last_name}`;
      const nameB = `${b.employee.first_name} ${b.employee.last_name}`;
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [timeEntries, trips, spws, tripRecordsByEmpDate, employees]);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = groupedData;
    if (filterEmployee !== "all") {
      result = result.filter(g => g.employee_id === filterEmployee);
    }
    if (filterDepartment !== "all") {
      result = result.filter(g => g.employee?.department === filterDepartment);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(g => {
        const name = `${g.employee.first_name} ${g.employee.last_name}`.toLowerCase();
        return name.includes(q);
      });
    }
    return result;
  }, [groupedData, filterEmployee, filterDepartment, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const uniqueEmployees = new Set(filteredData.map(g => g.employee_id));
    const totalHours = filteredData.reduce((sum, g) => sum + g.timeEntries.reduce((s, te) => s + (te.total_hours || 0), 0), 0);
    const totalTrips = filteredData.reduce((sum, g) => sum + g.trips.length, 0);
    const totalGps = filteredData.reduce((sum, g) => sum + g.gps.length, 0);
    return { employees: uniqueEmployees.size, hours: Math.round(totalHours * 100) / 100, trips: totalTrips, gps: totalGps };
  }, [filteredData]);

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === 'Actief').sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    ), [employees]);

  const resetFilters = () => {
    setDateFrom(DEFAULT_FROM);
    setDateTo(TODAY);
    setFilterEmployee("all");
    setFilterDepartment("all");
    setSearchQuery("");
    page.resetPage();
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rit & Tijd Rapportage</h1>
        <p className="text-sm text-slate-500">Goedgekeurde diensten met ritten, standplaatswerk en GPS Buddy data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-[18px] h-[18px] text-blue-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.employees}</p><p className="text-xs text-slate-500">Medewerkers</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center"><Clock className="w-[18px] h-[18px] text-indigo-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.hours}u</p><p className="text-xs text-slate-500">Totaal uren</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><Truck className="w-[18px] h-[18px] text-blue-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.trips}</p><p className="text-xs text-slate-500">Ritten</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center"><FileText className="w-[18px] h-[18px] text-emerald-600" /></div>
            <div><p className="text-xl font-semibold text-slate-900 leading-tight">{stats.gps}</p><p className="text-xs text-slate-500">GPS Buddy</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Van</Label>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); page.resetPage(); }} className="w-36 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Tot</Label>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); page.resetPage(); }} className="w-36 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Afdeling</Label>
              <Select value={filterDepartment} onValueChange={v => { setFilterDepartment(v); page.resetPage(); }}>
                <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle afdelingen</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Medewerker</Label>
              <Select value={filterEmployee} onValueChange={v => { setFilterEmployee(v); page.resetPage(); }}>
                <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Zoeken</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); page.resetPage(); }}
                  placeholder="Naam..."
                  className="pl-7 w-40 h-9 text-sm"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div>
      ) : filteredData.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen resultaten</h3>
          <p className="text-slate-500 mt-1">Pas de filters aan om goedgekeurde diensten te bekijken.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {page.paginateItems(filteredData).map(group => (
              <RitTijdEmployeeCard
                key={`${group.employee_id}_${group.date}`}
                group={group}
                vehicles={vehicles}
                customers={customers}
                projects={projects}
                activiteiten={activiteiten}
                getTripFuelCost={getTripFuelCost}
              />
            ))}
          </div>
          <Pagination
            totalItems={filteredData.length}
            currentPage={page.currentPage}
            pageSize={page.pageSize}
            onPageChange={page.setCurrentPage}
            onPageSizeChange={page.handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}