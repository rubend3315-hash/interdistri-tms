import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Truck,
  User,
  Calendar,
  MapPin,
  Trash2,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X
} from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { isDateInDefinitiefPeriode } from "@/components/utils/loonperiodeUtils";
import { checkEmployeeActiveRules } from "@/components/utils/employeeContractCheck";
import ConfirmDialog from "../components/ConfirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import Pagination, { usePagination } from "@/components/ui/Pagination";

const statuses = ["Gepland", "Onderweg", "Voltooid", "Geannuleerd"];

function RouteSelector({ value, customerId, tiModelRoutes, dbRoutes, customers, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allRoutes = useMemo(() => {
    const routes = [];
    // TIModelRoutes grouped by customer
    tiModelRoutes.forEach(r => {
      const customer = customers.find(c => c.id === r.customer_id);
      routes.push({
        id: r.id,
        code: r.route_code,
        name: r.route_name,
        customerId: r.customer_id,
        customerName: customer?.company_name || 'Onbekend',
        label: `${r.route_code} - ${r.route_name}`,
        source: 'ti'
      });
    });
    // DB Routes grouped by customer
    dbRoutes.forEach(r => {
      const customer = customers.find(c => c.id === r.customer_id);
      routes.push({
        id: r.id,
        code: r.route_code,
        name: r.route_name,
        customerId: r.customer_id,
        customerName: customer?.company_name || 'Onbekend',
        label: `${r.route_code} - ${r.route_name}`,
        source: 'db'
      });
    });
    return routes;
  }, [tiModelRoutes, dbRoutes, customers]);

  const filtered = allRoutes.filter(r => {
    if (customerId && r.customerId !== customerId) return false;
    if (!search) return true;
    return r.label.toLowerCase().includes(search.toLowerCase()) || 
           r.customerName.toLowerCase().includes(search.toLowerCase());
  });

  const grouped = filtered.reduce((acc, r) => {
    if (!acc[r.customerName]) acc[r.customerName] = [];
    acc[r.customerName].push(r);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {value || "Selecteer route..."}
          <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek route..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Geen routes gevonden</CommandEmpty>
            {Object.entries(grouped).map(([customerName, routes]) => (
              <CommandGroup key={customerName} heading={customerName}>
                {routes.map(r => (
                  <CommandItem
                    key={`${r.source}-${r.id}`}
                    value={r.label}
                    onSelect={() => {
                      onChange(r.code, r.customerId);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="font-medium">{r.code}</span>
                    <span className="ml-2 text-slate-500">{r.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {/* Allow custom input */}
            {search && !filtered.some(r => r.code === search) && (
              <CommandGroup heading="Handmatig">
                <CommandItem
                  value={`custom-${search}`}
                  onSelect={() => {
                    onChange(search, "");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  Gebruik "{search}" als routenaam
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const TRIPS_DEFAULT_FROM = format(subDays(new Date(), 30), 'yyyy-MM-dd');
const TRIPS_TODAY = format(new Date(), 'yyyy-MM-dd');

export default function Trips() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState(TRIPS_DEFAULT_FROM);
  const [filterDateTo, setFilterDateTo] = useState(TRIPS_TODAY);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("voltooid");
  const queryClient = useQueryClient();

  const resetFilters = () => {
    setSearchTerm("");
    setFilterDateFrom(TRIPS_DEFAULT_FROM);
    setFilterDateTo(TRIPS_TODAY);
    setFilterEmployee("all");
    voltooidePageState.resetPage();
    conceptPageState.resetPage();
  };

  const refOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

  // Server-side filtered query
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', filterDateFrom, filterDateTo],
    queryFn: () => {
      const filter = {};
      if (filterDateFrom) filter.date = { ...(filter.date || {}), $gte: filterDateFrom };
      if (filterDateTo) filter.date = { ...(filter.date || {}), $lte: filterDateTo };
      return base44.entities.Trip.filter(filter, '-date');
    },
    ...refOpts,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    ...refOpts,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    ...refOpts,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['tiModelRoutes'],
    queryFn: () => base44.entities.TIModelRoute.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: dbRoutes = [] } = useQuery({
    queryKey: ['routesList'],
    queryFn: () => base44.entities.Route.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntriesForTrips'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 200),
    ...refOpts,
  });

  const { data: caoRules = [] } = useQuery({
    queryKey: ['caoRules'],
    queryFn: () => base44.entities.CaoRule.filter({ 
      category: 'Verblijfkosten',
      status: 'Actief'
    }),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: loonperiodeStatuses = [] } = useQuery({
    queryKey: ['loonperiodeStatuses'],
    queryFn: () => base44.entities.LoonperiodeStatus.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Trip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsDialogOpen(false);
      setSelectedTrip(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trip.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsDialogOpen(false);
      setSelectedTrip(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Trip.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });

  const [formData, setFormData] = useState({
    employee_id: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    vehicle_id: "",
    customer_id: "",
    route_name: "",
    planned_stops: "",
    completed_stops: "",
    start_km: "",
    end_km: "",
    fuel_liters: "",
    fuel_cost: "",
    cargo_description: "",
    cargo_weight: "",
    departure_time: "",
    arrival_time: "",
    status: "Gepland",
    notes: ""
  });
  const [kmWarning, setKmWarning] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const voltooidePageState = usePagination(20);
  const conceptPageState = usePagination(20);

  const resetForm = () => {
    setFormData({
      employee_id: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      vehicle_id: "",
      customer_id: "",
      route_name: "",
      planned_stops: "",
      completed_stops: "",
      start_km: "",
      end_km: "",
      fuel_liters: "",
      fuel_cost: "",
      cargo_description: "",
      cargo_weight: "",
      departure_time: "",
      arrival_time: "",
      status: "Gepland",
      notes: ""
    });
    setKmWarning("");
  };

  // Validate km against vehicle's current_mileage
  const validateKm = (vehicleId, startKm) => {
    if (!vehicleId || !startKm) {
      setKmWarning("");
      return;
    }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle || !vehicle.current_mileage) {
      setKmWarning("");
      return;
    }
    const startKmNum = Number(startKm);
    const expectedKm = vehicle.current_mileage;
    if (startKmNum < expectedKm) {
      setKmWarning(`Begin km-stand (${startKmNum}) is lager dan de verwachte km-stand van ${vehicle.license_plate}: ${expectedKm} km`);
    } else if (startKmNum > expectedKm + 500) {
      setKmWarning(`Begin km-stand (${startKmNum}) wijkt sterk af van de verwachte km-stand van ${vehicle.license_plate}: ${expectedKm} km`);
    } else {
      setKmWarning("");
    }
  };

  const openEditDialog = (trip) => {
    // Check of rit in definitieve periode valt
    if (trip.date) {
      const tripYear = new Date(trip.date).getFullYear();
      if (isDateInDefinitiefPeriode(trip.date, tripYear, loonperiodeStatuses)) return;
    }
    setSelectedTrip(trip);
    setFormData({
      ...trip,
      planned_stops: trip.planned_stops || "",
      completed_stops: trip.completed_stops || "",
      start_km: trip.start_km || "",
      end_km: trip.end_km || "",
      fuel_liters: trip.fuel_liters || "",
      fuel_cost: trip.fuel_cost || "",
      cargo_weight: trip.cargo_weight || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedTrip(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check active contract/reiskosten rules for the selected employee
    if (formData.employee_id && formData.date) {
      const emp = employees.find(em => em.id === formData.employee_id);
      const ruleCheck = checkEmployeeActiveRules(emp, formData.date);
      if (!ruleCheck.hasActiveContract) {
        alert(ruleCheck.warnings.join('\n'));
        return;
      }
    }
    
    // Calculate subsistence allowance
    const subsistenceAllowance = calculateSubsistenceAllowance(
      formData.departure_time,
      formData.arrival_time,
      formData.date
    );

    const submitData = { ...formData };
    // Clean empty strings for optional fields
    Object.keys(submitData).forEach(key => {
      if (typeof submitData[key] === 'string' && submitData[key].trim() === '') {
        submitData[key] = null;
      }
    });
    // Convert numeric fields
    submitData.planned_stops = formData.planned_stops ? Number(formData.planned_stops) : null;
    submitData.completed_stops = formData.completed_stops ? Number(formData.completed_stops) : null;
    submitData.start_km = formData.start_km ? Number(formData.start_km) : null;
    submitData.end_km = formData.end_km ? Number(formData.end_km) : null;
    submitData.total_km = formData.start_km && formData.end_km ? Number(formData.end_km) - Number(formData.start_km) : null;
    submitData.fuel_liters = formData.fuel_liters ? Number(formData.fuel_liters) : null;
    submitData.fuel_cost = formData.fuel_cost ? Number(formData.fuel_cost) : null;
    submitData.cargo_weight = formData.cargo_weight ? Number(formData.cargo_weight) : null;
    submitData.subsistence_allowance = subsistenceAllowance;

    // Update vehicle current_mileage if end_km is provided
    if (submitData.end_km && submitData.vehicle_id) {
      const vehicle = vehicles.find(v => v.id === submitData.vehicle_id);
      if (vehicle && (!vehicle.current_mileage || submitData.end_km > vehicle.current_mileage)) {
        base44.entities.Vehicle.update(submitData.vehicle_id, { current_mileage: submitData.end_km });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }
    }

    if (selectedTrip) {
      updateMutation.mutate({ id: selectedTrip.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getEmployee = (id) => employees.find(e => e.id === id);
  const getVehicle = (id) => vehicles.find(v => v.id === id);
  const getCustomer = (id) => customers.find(c => c.id === id);

  const calculateSubsistenceAllowance = (departureTime, arrivalTime, tripDate) => {
    if (!departureTime || !arrivalTime) return 0;
    if (!Array.isArray(caoRules) || caoRules.length === 0) return 0;

    const [depH, depM] = departureTime.split(':').map(Number);
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    let totalMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
    const spansNextDay = totalMinutes < 0;
    if (spansNextDay) totalMinutes += 24 * 60;
    const tripHours = totalMinutes / 60;

    if (tripHours <= 4) return 0;

    const depMinutes = depH * 60 + depM;
    const arrMinutes = arrH * 60 + arrM;
    const departsBefore14 = depMinutes < 14 * 60;
    
    const applicableRules = caoRules.filter(rule => {
      if (!rule || rule.status !== 'Actief') return false;
      if (rule.start_date && new Date(tripDate) < new Date(rule.start_date)) return false;
      if (rule.end_date && new Date(tripDate) > new Date(rule.end_date)) return false;
      
      const nameLower = (rule.name || '').toLowerCase();
      const isVerblijf = nameLower.includes('verblijfskosten') || nameLower.includes('verblijfkosten');
      const isMeerdaags = nameLower.includes('meerdaags');
      const isEendaags = (nameLower.includes('ndaagse') || nameLower.includes('eendaagse')) && !isMeerdaags;
      return isVerblijf && isEendaags;
    });

    if (applicableRules.length === 0) return 0;

    let totalAllowance = 0;

    if (departsBefore14) {
      const basisRule = applicableRules.find(r => !r.start_time && !r.end_time);
      
      if (basisRule) {
        const basisRate = basisRule.value || 0;
        
        // Apply basis rate to entire trip, then override with time-specific rates
        totalAllowance = tripHours * basisRate;

        // Process time-specific rules (e.g., 18:00-24:00)
        const timeRules = applicableRules.filter(r => r.start_time && r.end_time);
        for (const rule of timeRules) {
          const [startH, startM] = rule.start_time.split(':').map(Number);
          const [endH, endM] = rule.end_time.split(':').map(Number);
          const ruleStartMinutes = startH * 60 + startM;
          const ruleEndMinutes = endH * 60 + endM;
          const ruleRate = rule.value || 0;

          let ruleHours = 0;

          if (spansNextDay) {
            // Trip goes from today to tomorrow
            // First segment: from departure to midnight (24:00)
            if (depMinutes < 24 * 60) {
              const overlapStart = Math.max(depMinutes, ruleStartMinutes);
              const overlapEnd = Math.min(24 * 60, ruleEndMinutes);
              if (overlapEnd > overlapStart) {
                ruleHours += (overlapEnd - overlapStart) / 60;
              }
            }
            // Second segment: from midnight to arrival (next day)
            if (arrMinutes > 0) {
              const overlapStart = Math.max(0, ruleStartMinutes);
              const overlapEnd = Math.min(arrMinutes, ruleEndMinutes);
              if (overlapEnd > overlapStart) {
                ruleHours += (overlapEnd - overlapStart) / 60;
              }
            }
          } else {
            // Trip stays within same day
            const overlapStart = Math.max(depMinutes, ruleStartMinutes);
            const overlapEnd = Math.min(depMinutes + totalMinutes, ruleEndMinutes);
            if (overlapEnd > overlapStart) {
              ruleHours = (overlapEnd - overlapStart) / 60;
            }
          }

          // Subtract basis rate for this period and add the rule rate
          totalAllowance -= ruleHours * basisRate;
          totalAllowance += ruleHours * ruleRate;
        }
      }
    }

    // Check for extra toeslag (12+ hours)
    if (tripHours >= 12) {
      const toeslagRule = applicableRules.find(r => {
        const nameLower = (r.name || '').toLowerCase();
        const descLower = (r.description || '').toLowerCase();
        return (nameLower.includes('toeslag') || descLower.includes('toeslag')) && 
               (descLower.includes('12 uur') || descLower.includes('12uur'));
      });

      if (toeslagRule) {
        totalAllowance += toeslagRule.value || toeslagRule.fixed_amount || 0;
      }
    }

    return totalAllowance;
  };

  // Normalize a time relative to an anchor using modulo arithmetic.
  // Maps all times into a 24h window [anchor, anchor+1440).
  const normalizeToAnchor = (anchor, timeMin) => {
    const offset = ((timeMin - anchor) % 1440 + 1440) % 1440;
    return anchor + offset;
  };

  // Validate trip times against time entries
  const validateTripAgainstTimeEntry = (trip) => {
    if (!trip.departure_time || !trip.arrival_time || !trip.employee_id || !trip.date) {
      return { valid: null, message: "Geen rittijden" }; // can't validate
    }
    // Find matching time entry for this employee on this date (or end_date for overnight)
    const matchingEntries = timeEntries.filter(te => 
      te.employee_id === trip.employee_id && 
      (te.date === trip.date || te.end_date === trip.date)
    );
    if (matchingEntries.length === 0) {
      return { valid: false, message: "Geen tijdregistratie gevonden voor deze datum" };
    }
    const [tripDepH, tripDepM] = trip.departure_time.split(':').map(Number);
    const [tripArrH, tripArrM] = trip.arrival_time.split(':').map(Number);
    const tripDepMinutes = tripDepH * 60 + tripDepM;
    const tripArrMinutes = tripArrH * 60 + tripArrM;

    for (const te of matchingEntries) {
      if (!te.start_time || !te.end_time) continue;
      const [teStartH, teStartM] = te.start_time.split(':').map(Number);
      const [teEndH, teEndM] = te.end_time.split(':').map(Number);
      const teStart = teStartH * 60 + teStartM;
      const teEnd = teEndH * 60 + teEndM;

      // Normalize all times relative to dienst-start anchor
      const anchor = teStart;
      const svcEndN = normalizeToAnchor(anchor, teEnd);
      const tripDepN = normalizeToAnchor(anchor, tripDepMinutes);
      const tripArrN = normalizeToAnchor(anchor, tripArrMinutes);
      const tripArrFinal = tripArrN <= tripDepN ? tripArrN + 1440 : tripArrN;

      const depOk = tripDepN >= anchor && tripDepN <= svcEndN;
      const arrOk = tripArrFinal <= svcEndN;

      if (depOk && arrOk) {
        return { valid: true, message: `Binnen tijdregistratie (${te.start_time} - ${te.end_time})` };
      }
    }
    const te = matchingEntries[0];
    return { valid: false, message: `Buiten tijdregistratie (${te.start_time || '?'} - ${te.end_time || '?'})` };
  };

  const filteredTrips = trips.filter(t => {
    // Employee filter (server already filtered by date)
    if (filterEmployee !== "all" && t.employee_id !== filterEmployee) return false;
    // Search filter (client-side)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const employee = getEmployee(t.employee_id);
      const vehicle = getVehicle(t.vehicle_id);
      const matchesSearch = 
        t.route_name?.toLowerCase().includes(term) ||
        employee?.first_name?.toLowerCase().includes(term) ||
        employee?.last_name?.toLowerCase().includes(term) ||
        vehicle?.license_plate?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const voltooideTripsAll = filteredTrips.filter(t => t.status === "Voltooid");
  const conceptTripsAll = filteredTrips.filter(t => t.status === "Gepland");
  const voltooideTrips = voltooidePageState.paginateItems(voltooideTripsAll);
  const conceptTrips = conceptPageState.paginateItems(conceptTripsAll);

  // Detect overlap between trips for same employee+date
  const getTripOverlaps = (trip) => {
    if (!trip.departure_time || !trip.arrival_time || !trip.employee_id || !trip.date) return [];
    const [sH, sM] = trip.departure_time.split(':').map(Number);
    const [eH, eM] = trip.arrival_time.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    const siblings = trips.filter(
      (t) => t.id !== trip.id && t.employee_id === trip.employee_id && t.date === trip.date && t.departure_time && t.arrival_time
    );
    const overlapping = [];
    for (const sib of siblings) {
      const [s2H, s2M] = sib.departure_time.split(':').map(Number);
      const [e2H, e2M] = sib.arrival_time.split(':').map(Number);
      const s2 = s2H * 60 + s2M;
      const e2 = e2H * 60 + e2M;
      if (startMin < e2 && endMin > s2) {
        overlapping.push(sib);
      }
    }
    return overlapping;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Gepland": return "bg-blue-100 text-blue-700";
      case "Onderweg": return "bg-amber-100 text-amber-700";
      case "Voltooid": return "bg-emerald-100 text-emerald-700";
      case "Geannuleerd": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ritten</h1>
          <p className="text-sm text-slate-500">Registratie van ritten, km-standen en brandstof</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Rit
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px] max-w-[280px]">
              <Label className="text-xs text-slate-500 mb-1 block">Zoeken</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Route, chauffeur, kenteken..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); voltooidePageState.resetPage(); conceptPageState.resetPage(); }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs text-slate-500 mb-1 block">Medewerker</Label>
              <Select value={filterEmployee} onValueChange={(v) => { setFilterEmployee(v); voltooidePageState.resetPage(); conceptPageState.resetPage(); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Alle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  {employees.filter(e => e.status === 'Actief').map(e => (
                    <SelectItem key={e.id} value={e.id}>{getFullName(e)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-slate-500 mb-1 block">Datum van</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); voltooidePageState.resetPage(); conceptPageState.resetPage(); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-slate-500 mb-1 block">Datum tot</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); voltooidePageState.resetPage(); conceptPageState.resetPage(); }}
                className="h-9 text-sm"
              />
            </div>
            {(searchTerm || filterEmployee !== "all" || filterDateFrom !== TRIPS_DEFAULT_FROM || filterDateTo !== TRIPS_TODAY) && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500" onClick={resetFilters}>
                <X className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trips Tabs */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voltooid">
              Voltooid ({voltooideTripsAll.length})
            </TabsTrigger>
            <TabsTrigger value="concept">
              Concept ({conceptTripsAll.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voltooid" className="space-y-3 mt-3">
            {voltooideTripsAll.length === 0 ? (
              <Card className="p-12 text-center">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Geen voltooide ritten</h3>
                <p className="text-slate-500 mt-1">Er zijn nog geen voltooide ritten.</p>
              </Card>
            ) : (
              <>
              {voltooideTrips.map(trip => {
                const employee = getEmployee(trip.employee_id);
                const vehicle = getVehicle(trip.vehicle_id);
                const customer = getCustomer(trip.customer_id);
                const subsistence = calculateSubsistenceAllowance(trip.departure_time, trip.arrival_time, trip.date);
                const tripYear = trip.date ? new Date(trip.date).getFullYear() : null;
                const tripLocked = trip.date && tripYear && isDateInDefinitiefPeriode(trip.date, tripYear, loonperiodeStatuses);
                const validation = validateTripAgainstTimeEntry(trip);
                const tripOverlaps = getTripOverlaps(trip);
                
                return (
                  <Card 
                    key={trip.id} 
                    className={`transition-shadow ${tripLocked ? "opacity-75" : "hover:shadow-sm cursor-pointer"}`}
                    onClick={() => !tripLocked && openEditDialog(trip)}
                  >
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-slate-900 truncate">
                                {trip.route_name || 'Rit'}
                              </h3>
                              <Badge className={`text-[11px] px-2 py-0 leading-5 ${getStatusColor(trip.status)}`}>
                                {trip.status}
                              </Badge>
                              {tripLocked && (
                                <Badge className="text-[11px] px-2 py-0 leading-5 bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Vergrendeld
                                </Badge>
                              )}
                              {validation.valid === true && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" title={validation.message} />
                              )}
                              {validation.valid === false && (
                                <XCircle className="w-4 h-4 text-red-500" title={validation.message} />
                              )}
                              {tripOverlaps.length > 0 && (
                                <AlertTriangle className="w-4 h-4 text-amber-500" title={`Overlap met ${tripOverlaps.length} andere rit(ten)`} />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {trip.date && format(new Date(trip.date), "d MMM", { locale: nl })}
                              </span>
                              {employee && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {getFullName(employee)}
                                </span>
                              )}
                              {vehicle && (
                                <span className="flex items-center gap-1">
                                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                                  {vehicle.license_plate}
                                </span>
                              )}
                              {trip.start_km != null && trip.end_km != null && (
                                <span>{trip.start_km}–{trip.end_km} km</span>
                              )}
                              {trip.total_km > 0 && <span className="font-medium text-slate-700">{trip.total_km} km</span>}
                              {trip.departure_time && trip.arrival_time && (
                                <span>{trip.departure_time}–{trip.arrival_time}</span>
                              )}
                              {trip.departure_time && trip.arrival_time && (() => {
                                const [dH, dM] = trip.departure_time.split(':').map(Number);
                                const [aH, aM] = trip.arrival_time.split(':').map(Number);
                                let m = (aH * 60 + aM) - (dH * 60 + dM);
                                if (m < 0) m += 1440;
                                return <span className="font-medium text-blue-600">{(m / 60).toFixed(1)}u</span>;
                              })()}
                              {subsistence > 0 && (
                                <span className="font-medium text-emerald-600">€{subsistence.toFixed(2)}</span>
                              )}
                            </div>
                            {tripOverlaps.length > 0 && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Overlap ({tripOverlaps.length})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                                  );
                                  })}
              <Pagination
                totalItems={voltooideTripsAll.length}
                currentPage={voltooidePageState.currentPage}
                pageSize={voltooidePageState.pageSize}
                onPageChange={voltooidePageState.setCurrentPage}
                onPageSizeChange={voltooidePageState.handlePageSizeChange}
              />
              </>
            )}
          </TabsContent>

                                  <TabsContent value="concept" className="space-y-3 mt-3">
                                    {conceptTripsAll.length === 0 ? (
                                      <Card className="p-8 text-center">
                                        <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <h3 className="text-sm font-medium text-slate-900">Geen concept ritten</h3>
                                        <p className="text-xs text-slate-500 mt-1">Er zijn geen concept ritten (status: Gepland).</p>
                                      </Card>
                                    ) : (
                                      <>
                                      {conceptTrips.map(trip => {
                                  const employee = getEmployee(trip.employee_id);
                                  const vehicle = getVehicle(trip.vehicle_id);
                                  const customer = getCustomer(trip.customer_id);
                                  const subsistence = calculateSubsistenceAllowance(trip.departure_time, trip.arrival_time, trip.date);
                                  const validation = validateTripAgainstTimeEntry(trip);
                                  const tripOverlaps = getTripOverlaps(trip);

                                  return (
                                  <Card 
                                  key={trip.id} 
                                  className="hover:shadow-sm transition-shadow cursor-pointer"
                                  onClick={() => openEditDialog(trip)}
                                  >
                                  <CardContent className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-5 h-5 text-slate-600" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="text-sm font-semibold text-slate-900 truncate">{trip.route_name || 'Rit'}</h3>
                                          <Badge className={`text-[11px] px-2 py-0 leading-5 ${getStatusColor(trip.status)}`}>{trip.status}</Badge>
                                          {validation.valid === true && <CheckCircle2 className="w-4 h-4 text-green-500" title={validation.message} />}
                                          {validation.valid === false && <XCircle className="w-4 h-4 text-red-500" title={validation.message} />}
                                          {tripOverlaps.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" title={`Overlap met ${tripOverlaps.length} rit(ten)`} />}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {trip.date && format(new Date(trip.date), "d MMM", { locale: nl })}
                                          </span>
                                          {employee && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{getFullName(employee)}</span>}
                                          {vehicle && <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-400" />{vehicle.license_plate}</span>}
                                          {trip.start_km != null && trip.end_km != null && <span>{trip.start_km}–{trip.end_km} km</span>}
                                          {trip.total_km > 0 && <span className="font-medium text-slate-700">{trip.total_km} km</span>}
                                          {trip.departure_time && trip.arrival_time && <span>{trip.departure_time}–{trip.arrival_time}</span>}
                                          {subsistence > 0 && <span className="font-medium text-emerald-600">€{subsistence.toFixed(2)}</span>}
                                        </div>
                                        {tripOverlaps.length > 0 && (
                                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                            <AlertTriangle className="w-3 h-3" /> Overlap ({tripOverlaps.length})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                );
              })}
              <Pagination
                totalItems={conceptTripsAll.length}
                currentPage={conceptPageState.currentPage}
                pageSize={conceptPageState.pageSize}
                onPageChange={conceptPageState.setCurrentPage}
                onPageSizeChange={conceptPageState.handlePageSizeChange}
              />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedTrip ? 'Rit Bewerken' : 'Nieuwe Rit'}</span>
              {selectedTrip && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmDelete({ id: selectedTrip.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chauffeur *</Label>
                <Select 
                  value={formData.employee_id} 
                  onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === 'Actief').map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {getFullName(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voertuig *</Label>
                <Select 
                  value={formData.vehicle_id} 
                  onValueChange={(v) => {
                    const vehicle = vehicles.find(vh => vh.id === v);
                    const prefillKm = vehicle?.current_mileage ? String(vehicle.current_mileage) : formData.start_km;
                    setFormData({ ...formData, vehicle_id: v, start_km: prefillKm });
                    validateKm(v, prefillKm);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate} - {v.brand} {v.current_mileage ? `(${v.current_mileage} km)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Route</Label>
                <RouteSelector
                  value={formData.route_name}
                  customerId={formData.customer_id}
                  tiModelRoutes={tiModelRoutes}
                  dbRoutes={dbRoutes}
                  customers={customers}
                  onChange={(routeName, customerId) => setFormData({ ...formData, route_name: routeName, customer_id: customerId || formData.customer_id })}
                />
              </div>
              <div className="space-y-2">
                <Label>Klant</Label>
                <Select 
                  value={formData.customer_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, customer_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Geplande stops</Label>
                <Input
                  type="number"
                  value={formData.planned_stops}
                  onChange={(e) => setFormData({ ...formData, planned_stops: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Afgeronde stops</Label>
                <Input
                  type="number"
                  value={formData.completed_stops}
                  onChange={(e) => setFormData({ ...formData, completed_stops: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Begin km-stand</Label>
                <Input
                  type="number"
                  value={formData.start_km}
                  onChange={(e) => {
                    setFormData({ ...formData, start_km: e.target.value });
                    validateKm(formData.vehicle_id, e.target.value);
                  }}
                />
                {formData.vehicle_id && (() => {
                  const v = vehicles.find(vh => vh.id === formData.vehicle_id);
                  return v?.current_mileage ? (
                    <p className="text-xs text-slate-500">Verwacht: {v.current_mileage} km ({v.license_plate})</p>
                  ) : null;
                })()}
              </div>
              <div className="space-y-2">
                <Label>Eind km-stand</Label>
                <Input
                  type="number"
                  value={formData.end_km}
                  onChange={(e) => setFormData({ ...formData, end_km: e.target.value })}
                />
              </div>
            </div>
            {kmWarning && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">{kmWarning}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vertrektijd</Label>
                <Input
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Aankomsttijd</Label>
                <Input
                  type="time"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Getankte liters</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuel_liters}
                  onChange={(e) => setFormData({ ...formData, fuel_liters: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Brandstofkosten (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuel_cost}
                  onChange={(e) => setFormData({ ...formData, fuel_cost: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lading omschrijving</Label>
                <Input
                  value={formData.cargo_description}
                  onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ladinggewicht (kg)</Label>
                <Input
                  type="number"
                  value={formData.cargo_weight}
                  onChange={(e) => setFormData({ ...formData, cargo_weight: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {formData.departure_time && formData.arrival_time && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-medium text-emerald-900">
                  <strong>Berekende verblijfskosten:</strong> €{calculateSubsistenceAllowance(formData.departure_time, formData.arrival_time, formData.date).toFixed(2)}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Op basis van CAO-regels voor verblijfskosten
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title="Rit verwijderen"
        description="Weet je zeker dat je deze rit wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
        onConfirm={() => {
          if (confirmDelete?.id) deleteMutation.mutate(confirmDelete.id);
          setConfirmDelete(null);
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}