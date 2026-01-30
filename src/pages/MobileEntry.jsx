import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck,
  Clock,
  MapPin,
  Package,
  Send,
  Save,
  User,
  LogOut,
  CheckCircle,
  FileText,
  AlertTriangle,
  Camera,
  ExternalLink,
  MessageSquare,
  ClipboardCheck,
  Plus,
  Trash2,
  CalendarDays
} from "lucide-react";

export default function MobileEntry() {
  const [activeTab, setActiveTab] = useState("dienst");
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState(null);
  const [trips, setTrips] = useState([]);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: shiftTimes = [] } = useQuery({
    queryKey: ['shiftTimes'],
    queryFn: () => base44.entities.ShiftTime.list('-date', 1)
  });

  const { data: supervisorMessages = [] } = useQuery({
    queryKey: ['supervisorMessages'],
    queryFn: () => base44.entities.SupervisorMessage.filter({ is_active: true })
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['mySchedules', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const today = new Date();
      const currentWeek = getWeekNumber(today);
      const currentYear = today.getFullYear();
      const result = await base44.entities.Schedule.filter({
        employee_id: currentEmployee.id,
        week_number: currentWeek,
        year: currentYear
      });
      return result;
    },
    enabled: !!currentEmployee?.id
  });

  const { data: myTimeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ created_by: user?.email }),
    enabled: !!user?.email
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      setActiveTab("overzicht");
    }
  });

  const createInspectionMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleInspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });

  const createTripMutation = useMutation({
    mutationFn: (data) => base44.entities.Trip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });

  // Find current employee
  const currentEmployee = employees.find(e => e.email === user?.email);
  const todayShift = shiftTimes[0];
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Get relevant supervisor message
  const welcomeMessage = supervisorMessages.find(m => 
    (!m.target_employee_id || m.target_employee_id === currentEmployee?.id) &&
    (!m.department || m.department === 'Alle' || m.department === currentEmployee?.department)
  );

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: "",
    end_time: "",
    break_minutes: 30,
    notes: ""
  });

  const [inspectionData, setInspectionData] = useState({
    vehicle_id: "",
    mileage: "",
    exterior_clean: true,
    interior_clean: true,
    lights_working: true,
    tires_ok: true,
    brakes_ok: true,
    oil_level_ok: true,
    coolant_level_ok: true,
    windshield_ok: true,
    mirrors_ok: true,
    horn_working: true,
    first_aid_kit: true,
    fire_extinguisher: true,
    warning_triangle: true,
    safety_vest: true,
    damage_present: false,
    damage_description: "",
    notes: ""
  });

  const [expenseData, setExpenseData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: "Brandstof",
    description: "",
    amount: ""
  });

  // Drawing on canvas
  const [isDrawing, setIsDrawing] = useState(false);

  // Subscribe to schedule updates
  useEffect(() => {
    if (!currentEmployee?.id) return;
    
    const unsubscribe = base44.entities.Schedule.subscribe((event) => {
      if (event.data?.employee_id === currentEmployee.id) {
        queryClient.invalidateQueries({ queryKey: ['mySchedules'] });
      }
    });
    
    return unsubscribe;
  }, [currentEmployee?.id, queryClient]);

  useEffect(() => {
    if (showSignatureDialog && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [showSignatureDialog]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setSignature(dataUrl);
    setShowSignatureDialog(false);
  };

  const handleSubmitEntry = () => {
    // Validatie: er moet minimaal 1 rit zijn ingevoerd
    if (trips.length === 0) {
      alert('Je moet minimaal één rit invoeren voordat je de diensttijd kunt indienen. Ga naar het Ritten tabblad om een rit toe te voegen.');
      setActiveTab("ritten");
      return;
    }

    // Validatie: controleer of rit tijden binnen dienst tijden vallen
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      
      // Check start rit niet voor start dienst
      if (trip.start_time && formData.start_time) {
        if (trip.start_time < formData.start_time) {
          alert(`Rit ${i + 1}: Start rit (${trip.start_time}) kan niet voor start dienst (${formData.start_time}) liggen.`);
          setActiveTab("ritten");
          return;
        }
      }
      
      // Check einde rit niet na einde dienst
      if (trip.end_time && formData.end_time) {
        if (trip.end_time > formData.end_time) {
          alert(`Rit ${i + 1}: Einde rit (${trip.end_time}) kan niet na einde dienst (${formData.end_time}) liggen.`);
          setActiveTab("ritten");
          return;
        }
      }
    }

    if (!signature) {
      setShowSignatureDialog(true);
      return;
    }

    const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);
    
    // Submit time entry
    createTimeEntryMutation.mutate({
      employee_id: currentEmployee?.id,
      date: formData.date,
      week_number: getWeekNumber(new Date(formData.date)),
      year: new Date(formData.date).getFullYear(),
      start_time: formData.start_time,
      end_time: formData.end_time,
      break_minutes: Number(formData.break_minutes) || 0,
      total_hours: hours,
      shift_type: "Dag",
      notes: formData.notes,
      status: "Ingediend",
      signature_url: signature
    });

    // Submit all trips
    if (trips.length > 0) {
      trips.forEach(trip => {
        createTripMutation.mutate({
          employee_id: currentEmployee?.id,
          date: formData.date,
          vehicle_id: trip.vehicle_id,
          customer_id: trip.customer_id,
          route_name: trip.route_name,
          planned_stops: trip.planned_stops ? Number(trip.planned_stops) : null,
          start_km: trip.start_km ? Number(trip.start_km) : null,
          end_km: trip.end_km ? Number(trip.end_km) : null,
          total_km: trip.start_km && trip.end_km ? Number(trip.end_km) - Number(trip.start_km) : null,
          fuel_liters: trip.fuel_liters ? Number(trip.fuel_liters) : null,
          adblue_liters: trip.adblue_liters ? Number(trip.adblue_liters) : null,
          fuel_km: trip.fuel_km ? Number(trip.fuel_km) : null,
          charging_kwh: trip.charging_kwh ? Number(trip.charging_kwh) : null,
          departure_time: trip.start_time,
          arrival_time: trip.end_time,
          departure_location: trip.departure_location,
          notes: trip.notes,
          status: "Voltooid"
        });
      });
    }

    // Reset form
    setTrips([]);
    setSignature(null);
  };

  const handleSaveDraft = () => {
    const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);
    
    // Save time entry as draft
    createTimeEntryMutation.mutate({
      employee_id: currentEmployee?.id,
      date: formData.date,
      week_number: getWeekNumber(new Date(formData.date)),
      year: new Date(formData.date).getFullYear(),
      start_time: formData.start_time,
      end_time: formData.end_time,
      break_minutes: Number(formData.break_minutes) || 0,
      total_hours: hours,
      shift_type: "Dag",
      notes: formData.notes,
      status: "Concept"
    });

    // Save all trips as drafts
    if (trips.length > 0) {
      trips.forEach(trip => {
        createTripMutation.mutate({
          employee_id: currentEmployee?.id,
          date: formData.date,
          vehicle_id: trip.vehicle_id,
          customer_id: trip.customer_id,
          route_name: trip.route_name,
          planned_stops: trip.planned_stops ? Number(trip.planned_stops) : null,
          start_km: trip.start_km ? Number(trip.start_km) : null,
          end_km: trip.end_km ? Number(trip.end_km) : null,
          total_km: trip.start_km && trip.end_km ? Number(trip.end_km) - Number(trip.start_km) : null,
          fuel_liters: trip.fuel_liters ? Number(trip.fuel_liters) : null,
          adblue_liters: trip.adblue_liters ? Number(trip.adblue_liters) : null,
          fuel_km: trip.fuel_km ? Number(trip.fuel_km) : null,
          charging_kwh: trip.charging_kwh ? Number(trip.charging_kwh) : null,
          departure_time: trip.start_time,
          arrival_time: trip.end_time,
          departure_location: trip.departure_location,
          notes: trip.notes,
          status: "Gepland"
        });
      });
    }
  };

  const calculateHours = (start, end, breakMinutes) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes -= breakMinutes || 0;
    return Math.round(totalMinutes / 60 * 100) / 100;
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const approvedEntries = myTimeEntries.filter(e => e.status === 'Goedgekeurd');

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Skeleton className="w-32 h-32 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold">Interdistri TMS</h1>
              <p className="text-xs text-blue-100">Mobiele App</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Date & Time Bar */}
        <div className="bg-white/10 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">Vandaag</p>
              <p className="font-semibold">{format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Tijd</p>
              <p className="font-semibold text-xl">{format(new Date(), "HH:mm")}</p>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-xl p-4 text-slate-900">
          <h2 className="font-bold text-lg mb-2">
            Welkom in de Interdistri TMS app
          </h2>
          {welcomeMessage ? (
            <p className="text-sm text-slate-600 whitespace-pre-line">
              {welcomeMessage.message}
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Welkom op je werkdag, {currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name}` : user?.full_name}! 
              Werk met plezier en aandacht, en rijd veilig.
              Samen zorgen we dat alles op tijd op de juiste plek komt.
              Succes vandaag! 🚛
            </p>
          )}
        </div>

        {/* Today's Shift Time */}
        {todayShift && todayShift.date === todayStr && (
          <div className="mt-4 bg-amber-400 text-amber-900 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <div>
                <p className="text-xs font-medium">Dienst starttijd vandaag</p>
                <p className="font-bold text-xl">{todayShift.start_time}</p>
              </div>
            </div>
            {todayShift.message && (
              <p className="mt-2 text-sm">{todayShift.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4 -mt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-6 mb-4">
           <TabsTrigger value="planning" className="text-xs px-2">
             <CalendarDays className="w-4 h-4" />
           </TabsTrigger>
           <TabsTrigger value="dienst" className="text-xs px-2">
             <Clock className="w-4 h-4" />
           </TabsTrigger>
           <TabsTrigger value="ritten" className="text-xs px-2">
             <Truck className="w-4 h-4" />
           </TabsTrigger>
           <TabsTrigger value="inspectie" className="text-xs px-2">
             <ClipboardCheck className="w-4 h-4" />
           </TabsTrigger>
           <TabsTrigger value="declaratie" className="text-xs px-2">
             <FileText className="w-4 h-4" />
           </TabsTrigger>
           <TabsTrigger value="overzicht" className="text-xs px-2">
             <CheckCircle className="w-4 h-4" />
           </TabsTrigger>
          </TabsList>

          {/* Dienst Tab */}
          <TabsContent value="dienst" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Diensttijd
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Datum</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Start dienst</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Eind dienst</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pauze (min)</Label>
                    <Input
                      type="number"
                      value={formData.break_minutes}
                      onChange={(e) => setFormData({ ...formData, break_minutes: e.target.value })}
                    />
                  </div>
                </div>

                {formData.start_time && formData.end_time && (
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-700">
                      <strong>Totaal uren:</strong> {calculateHours(formData.start_time, formData.end_time, formData.break_minutes)} uur
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Opmerkingen</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Extra informatie..."
                  />
                </div>

                {trips.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700 font-medium">
                      ✓ {trips.length} rit(ten) toegevoegd in Ritten tab
                    </p>
                  </div>
                )}

                {signature && (
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700 mb-1">Handtekening toegevoegd ✓</p>
                    <img src={signature} alt="Handtekening" className="h-12 border rounded" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleSaveDraft}
                    disabled={createTimeEntryMutation.isPending || createTripMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Tussentijds opslaan
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleSubmitEntry}
                    disabled={createTimeEntryMutation.isPending || createTripMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Indienen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ritten Tab */}
          <TabsContent value="ritten" className="space-y-4">
            <Card className="bg-blue-900 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Rit Informatie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-100">
                  Ritten (Verblijfskosten art. 40 CAO)
                </p>
              </CardContent>
            </Card>

            {trips.map((trip, index) => (
              <Card key={index} className="border-2 border-slate-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Rit {index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTrips(trips.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Rit</Label>
                      <Input
                        type="time"
                        value={trip.start_time}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, start_time: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Einde Rit</Label>
                      <Input
                        type="time"
                        value={trip.end_time}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, end_time: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Vertreklocatie</Label>
                    <Input
                      value={trip.departure_location}
                      onChange={(e) => {
                        const newTrips = [...trips];
                        newTrips[index] = { ...trip, departure_location: e.target.value };
                        setTrips(newTrips);
                      }}
                      placeholder="bijv. Standplaats"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Kenteken *</Label>
                    <Select 
                      value={trip.vehicle_id} 
                      onValueChange={(v) => {
                        const newTrips = [...trips];
                        newTrips[index] = { ...trip, vehicle_id: v };
                        setTrips(newTrips);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer voertuig" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Begin km *</Label>
                      <Input
                        type="number"
                        value={trip.start_km}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, start_km: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Eind km</Label>
                      <Input
                        type="number"
                        value={trip.end_km}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, end_km: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Brandstof (liter)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={trip.fuel_liters || ""}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, fuel_liters: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">AdBlue (liter)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={trip.adblue_liters || ""}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, adblue_liters: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Km-stand van tanken</Label>
                      <Input
                        type="number"
                        value={trip.fuel_km || ""}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, fuel_km: e.target.value };
                          setTrips(newTrips);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-laden (kWh)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={trip.charging_kwh || ""}
                        onChange={(e) => {
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, charging_kwh: e.target.value };
                          setTrips(newTrips);
                        }}
                        placeholder="Als aan laadpaal"
                      />
                    </div>
                  </div>

                  {/* Route Details Section */}
                  <div className="pt-3 border-t">
                    <div className="bg-emerald-600 text-white p-2 rounded-lg mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-semibold">Route Details</span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Klant (verplicht om te voltooien)</Label>
                        <Select 
                          value={trip.customer_id || "none"} 
                          onValueChange={(v) => {
                            const newTrips = [...trips];
                            newTrips[index] = { ...trip, customer_id: v === "none" ? "" : v };
                            setTrips(newTrips);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer klant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecteer klant</SelectItem>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Selecteer route</Label>
                          <Input
                            value={trip.route_name}
                            onChange={(e) => {
                              const newTrips = [...trips];
                              newTrips[index] = { ...trip, route_name: e.target.value };
                              setTrips(newTrips);
                            }}
                            placeholder="Routenaam"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Bestelde stops</Label>
                          <Input
                            type="number"
                            value={trip.planned_stops}
                            onChange={(e) => {
                              const newTrips = [...trips];
                              newTrips[index] = { ...trip, planned_stops: e.target.value };
                              setTrips(newTrips);
                            }}
                            placeholder="bijv. 85"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Opmerkingen</Label>
                        <Textarea
                          value={trip.notes}
                          onChange={(e) => {
                            const newTrips = [...trips];
                            newTrips[index] = { ...trip, notes: e.target.value };
                            setTrips(newTrips);
                          }}
                          rows={2}
                          placeholder="Bijzonderheden, vertragingen, problemen..."
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button 
              variant="outline" 
              className="w-full border-dashed border-2 py-6"
              onClick={() => setTrips([...trips, {
                start_time: "",
                end_time: "",
                departure_location: "Standplaats",
                vehicle_id: "",
                start_km: "",
                end_km: "",
                fuel_liters: "",
                adblue_liters: "",
                fuel_km: "",
                charging_kwh: "",
                customer_id: "",
                route_name: "",
                planned_stops: "",
                notes: ""
              }])}
            >
              <Plus className="w-5 h-5 mr-2" />
              Regel Toevoegen
            </Button>
          </TabsContent>

          {/* Inspectie Tab */}
          <TabsContent value="inspectie" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                  Voertuiginspectie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Voertuig</Label>
                    <Select 
                      value={inspectionData.vehicle_id} 
                      onValueChange={(v) => setInspectionData({ ...inspectionData, vehicle_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kies voertuig" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.license_plate} - {v.brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Kilometerstand</Label>
                    <Input
                      type="number"
                      value={inspectionData.mileage}
                      onChange={(e) => setInspectionData({ ...inspectionData, mileage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'exterior_clean', label: 'Exterieur schoon' },
                    { key: 'interior_clean', label: 'Interieur schoon' },
                    { key: 'lights_working', label: 'Verlichting werkt' },
                    { key: 'tires_ok', label: 'Banden OK' },
                    { key: 'brakes_ok', label: 'Remmen OK' },
                    { key: 'oil_level_ok', label: 'Oliepeil OK' },
                    { key: 'windshield_ok', label: 'Voorruit OK' },
                    { key: 'mirrors_ok', label: 'Spiegels OK' },
                    { key: 'first_aid_kit', label: 'EHBO-kit' },
                    { key: 'fire_extinguisher', label: 'Brandblusser' },
                    { key: 'warning_triangle', label: 'Gevarendriehoek' },
                    { key: 'safety_vest', label: 'Veiligheidsvest' },
                  ].map(item => (
                    <label 
                      key={item.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        inspectionData[item.key] ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={inspectionData[item.key]}
                        onChange={(e) => setInspectionData({ ...inspectionData, [item.key]: e.target.checked })}
                        className="sr-only"
                      />
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                        inspectionData[item.key] ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {inspectionData[item.key] ? '✓' : '✗'}
                      </span>
                      <span className="text-xs">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 p-2 rounded-lg border bg-amber-50 border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inspectionData.damage_present}
                      onChange={(e) => setInspectionData({ ...inspectionData, damage_present: e.target.checked })}
                      className="sr-only"
                    />
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                      inspectionData.damage_present ? 'bg-amber-500 text-white' : 'bg-slate-300'
                    }`}>
                      {inspectionData.damage_present ? '!' : ''}
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Schade aanwezig</span>
                  </label>
                </div>

                {inspectionData.damage_present && (
                  <div className="space-y-1">
                    <Label className="text-xs">Schade omschrijving</Label>
                    <Textarea
                      value={inspectionData.damage_description}
                      onChange={(e) => setInspectionData({ ...inspectionData, damage_description: e.target.value })}
                      rows={2}
                      placeholder="Beschrijf de schade..."
                    />
                  </div>
                )}

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    createInspectionMutation.mutate({
                      ...inspectionData,
                      employee_id: currentEmployee?.id,
                      date: format(new Date(), 'yyyy-MM-dd'),
                      time: format(new Date(), 'HH:mm'),
                      mileage: inspectionData.mileage ? Number(inspectionData.mileage) : null,
                      status: inspectionData.damage_present ? 'Actie vereist' : 'Goedgekeurd'
                    });
                  }}
                  disabled={!inspectionData.vehicle_id || createInspectionMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Inspectie indienen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Declaratie Tab */}
          <TabsContent value="declaratie" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Declaratie indienen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Datum</Label>
                    <Input
                      type="date"
                      value={expenseData.date}
                      onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categorie</Label>
                    <Select 
                      value={expenseData.category} 
                      onValueChange={(v) => setExpenseData({ ...expenseData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Brandstof">Brandstof</SelectItem>
                        <SelectItem value="Parkeren">Parkeren</SelectItem>
                        <SelectItem value="Tol">Tol</SelectItem>
                        <SelectItem value="Maaltijd">Maaltijd</SelectItem>
                        <SelectItem value="Verblijf">Verblijf</SelectItem>
                        <SelectItem value="Materiaal">Materiaal</SelectItem>
                        <SelectItem value="Overig">Overig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Omschrijving</Label>
                  <Input
                    value={expenseData.description}
                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                    placeholder="Korte omschrijving..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Bedrag (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    createExpenseMutation.mutate({
                      employee_id: currentEmployee?.id,
                      date: expenseData.date,
                      category: expenseData.category,
                      description: expenseData.description,
                      amount: Number(expenseData.amount),
                      status: 'Ingediend'
                    });
                  }}
                  disabled={!expenseData.amount || createExpenseMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Declaratie indienen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overzicht Tab */}
          <TabsContent value="overzicht" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Goedgekeurde diensten
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEntries ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : approvedEntries.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Nog geen goedgekeurde diensten
                  </p>
                ) : (
                  <div className="space-y-2">
                    {approvedEntries.slice(0, 10).map(entry => (
                      <div key={entry.id} className="p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              {entry.date && format(new Date(entry.date), "d MMM yyyy", { locale: nl })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.start_time} - {entry.end_time}
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {entry.total_hours}u
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Snelle links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a 
                  href="https://www.mijn.bumper.nl" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-medium">Schade melden - Bumper</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
                <a 
                  href="https://werknemer.loket.nl" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Werknemersloket</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Handtekening</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg">
              <canvas
                ref={canvasRef}
                width={280}
                height={150}
                className="touch-none w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Teken je handtekening hierboven
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearSignature}>
                Wissen
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={saveSignature}>
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}