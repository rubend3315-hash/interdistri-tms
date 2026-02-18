import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOfflineSync } from "@/components/utils/useOfflineSync";
import OfflineSyncIndicator from "@/components/OfflineSyncIndicator";
import { format, getWeek, getYear } from "date-fns";
import { nl } from "date-fns/locale";
import { motion } from "framer-motion";
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
import { toast } from "sonner";
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
  CalendarDays,
  Menu,
  Home,
  X,
  Bell,
  Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import MobileFrontpage from "@/components/mobile/MobileFrontpage";
import MobileReglementTab from "@/components/mobile/MobileReglementTab.jsx";
import MobileHandleidingTab from "@/components/mobile/MobileHandleidingTab.jsx";
import MobilePlanningTab from "@/components/mobile/MobilePlanningTab.jsx";
import MobileSignatureDialog from "@/components/mobile/MobileSignatureDialog.jsx";
import StandplaatsWerkSection from "@/components/mobile/StandplaatsWerkSection.jsx";

const STATIC_MENU_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "dienst", label: "Diensttijd", icon: Clock },
  { id: "ritten", label: "Ritten", icon: Truck },
  { id: "inspectie", label: "Voertuiginspectie", icon: ClipboardCheck },
  { id: "declaratie", label: "Declaratie", icon: FileText },
  { id: "overzicht", label: "Overzicht", icon: CheckCircle },
  { id: "planning", label: "Planning", icon: CalendarDays },
  { id: "berichten", label: "Berichten", icon: Mail },
  { id: "reglement", label: "Bedrijfsreglement", icon: FileText },
  { id: "contracten", label: "Mijn Contracten", icon: FileText, isLink: true },
  { id: "links", label: "Links", icon: ExternalLink },
  { id: "handleiding", label: "Handleiding", icon: FileText }
];

const timeToMinutes = (time) => {
  if (!time || time.length < 5) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

export default function MobileEntry() {
  const [activeTab, setActiveTab] = useState("home");
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState(null);
  const [trips, setTrips] = useState([]);
  const [standplaatsWerk, setStandplaatsWerk] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { isOnline, syncStatus, addToQueue } = useOfflineSync();

  // Tab order for swiping
  const tabOrder = ["home", "dienst", "ritten", "standplaats", "inspectie", "declaratie", "overzicht", "planning", "berichten", "reglement", "links"];
  
  const handleSwipe = (direction) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (direction === "left" && currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else if (direction === "right" && currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: () => base44.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['activeVehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ status: 'Beschikbaar' })
  });

  const { data: supervisorMessages = [] } = useQuery({
    queryKey: ['supervisorMessages'],
    queryFn: () => base44.entities.SupervisorMessage.filter({ is_active: true })
  });

  const { data: myTimeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ created_by: user?.email }),
    enabled: !!user?.email
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['activeCustomers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'Actief' })
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routesMobile'],
    queryFn: () => base44.entities.Route.filter({ is_active: true })
  });

  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['tiModelRoutesMobile'],
    queryFn: () => base44.entities.TIModelRoute.filter({ is_active: true })
  });

  const { data: activiteiten = [] } = useQuery({
    queryKey: ['activiteiten'],
    queryFn: () => base44.entities.Activiteit.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['activeProjectsMobile'],
    queryFn: () => base44.entities.Project.filter({ status: 'Actief' })
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries', user?.email] });
    }
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries', user?.email] });
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
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Track page load
  useEffect(() => {
    if (currentEmployee?.id) {
      base44.analytics.track({ eventName: "mobile_entry_page_loaded", properties: { employeeId: currentEmployee.id, entryType: "single_day" } });
    }
  }, [currentEmployee?.id]);

  const { data: myMessages = [] } = useQuery({
    queryKey: ['myMessages', currentEmployee?.id],
    queryFn: () => base44.entities.Message.filter({ to_employee_id: currentEmployee?.id }),
    enabled: !!currentEmployee?.id
  });

  const unreadCount = myMessages.filter(m => !m.is_read).length;

  const { data: shiftTimes = [] } = useQuery({
    queryKey: ['shiftTimes', currentEmployee?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!currentEmployee?.department) return [];
      
      const now = new Date();
      const currentHour = now.getHours();
      
      let targetDate;
      if (currentHour >= 12) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = format(tomorrow, 'yyyy-MM-dd');
      } else {
        targetDate = format(now, 'yyyy-MM-dd');
      }
      
      const shifts = await base44.entities.ShiftTime.filter({ 
        department: currentEmployee.department,
        date: targetDate
      });
      
      shifts.sort((a, b) => a.service_start_time.localeCompare(b.service_start_time));
      return shifts.slice(0, 1);
    },
    enabled: !!currentEmployee?.department,
    staleTime: 5 * 60 * 1000
  });

  const todayShift = shiftTimes[0];

  // Get schedules after currentEmployee is defined
  const { data: schedules = [] } = useQuery({
    queryKey: ['mySchedules', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const today = new Date();
      const currentWeek = getWeek(today, { weekStartsOn: 1 });
      const currentYear = getYear(today);
      const result = await base44.entities.Schedule.filter({
        employee_id: currentEmployee.id,
        week_number: currentWeek,
        year: currentYear
      });
      return result;
    },
    enabled: !!currentEmployee?.id
  });

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

  // Load existing draft entry and trips when app opens
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    if (!currentEmployee?.id || draftLoaded) return;
    
    const loadDraft = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const draftEntries = await base44.entities.TimeEntry.filter({
          employee_id: currentEmployee.id,
          date: today,
          status: 'Concept'
        });
        
        if (draftEntries.length > 0) {
          const draft = draftEntries[0];
          setFormData({
            date: draft.date || today,
            start_time: draft.start_time || "",
            end_time: draft.end_time || "",
            break_minutes: draft.break_minutes ?? 30,
            notes: draft.notes || ""
          });
          if (draft.signature_url) {
            setSignature(draft.signature_url);
          }
        }
        
        const existingTrips = await base44.entities.Trip.filter({
          employee_id: currentEmployee.id,
          date: today
        });
        
        const draftTrips = existingTrips.filter(t => t.status === 'Gepland');
        if (draftTrips.length > 0) {
          setTrips(draftTrips.map(t => ({
            start_time: t.departure_time || "",
            end_time: t.arrival_time || "",
            departure_location: t.departure_location || "Standplaats",
            vehicle_id: t.vehicle_id || "",
            damage_occurred: "Nee",
            start_km: t.start_km ? String(t.start_km) : "",
            end_km: t.end_km ? String(t.end_km) : "",
            fuel_liters: t.fuel_liters ? String(t.fuel_liters) : "",
            adblue_liters: t.adblue_liters ? String(t.adblue_liters) : "",
            fuel_km: t.fuel_km ? String(t.fuel_km) : "",
            charging_kwh: t.charging_kwh ? String(t.charging_kwh) : "",
            customer_id: t.customer_id || "",
            route_name: t.route_name || "",
            planned_stops: t.planned_stops ? String(t.planned_stops) : "",
            notes: t.notes || "",
            _existingId: t.id
          })));
        }

        // Laad bestaande standplaatswerk
        const existingSpw = await base44.entities.StandplaatsWerk.filter({
          employee_id: currentEmployee.id,
          date: today
        });
        if (existingSpw.length > 0) {
          setStandplaatsWerk(existingSpw.map(s => ({
            start_time: s.start_time || "",
            end_time: s.end_time || "",
            customer_id: s.customer_id || "",
            project_id: s.project_id || "",
            activity_id: s.activity_id || "",
            notes: s.notes || "",
            _existingId: s.id
          })));
        }
      } catch (error) {
        console.error('Draft laden mislukt:', error);
      } finally {
        setDraftLoaded(true);
      }
    };
    
    loadDraft();
  }, [currentEmployee?.id, draftLoaded]);

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
    notes: "",
    damage_photos: []
  });

  const [expenseData, setExpenseData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: "Brandstof",
    description: "",
    amount: "",
    receipt_file: null,
    receipt_url: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Menu items with dynamic badge
  const menuItems = useMemo(() =>
    STATIC_MENU_ITEMS.map(item =>
      item.id === 'berichten' ? { ...item, badge: unreadCount } : item
    ), [unreadCount]);

  // Signature save handler for MobileSignatureDialog
  const handleSignatureSave = (dataUrl) => {
    setSignature(dataUrl);
  };

  const handleSubmitEntry = async () => {
    base44.analytics.track({ eventName: "mobile_entry_submit_start", properties: { employeeId: currentEmployee?.id, date: formData.date, tripCount: trips.length, hasSignature: !!signature } });

    if (trips.length === 0) {
      base44.analytics.track({ eventName: "mobile_entry_validation_fail", properties: { employeeId: currentEmployee?.id, reason: "no_trips" } });
      toast.error('Je moet minimaal één rit invoeren voordat je kunt indienen.');
      setActiveTab("ritten");
      return;
    }

    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      if (!trip.start_time || !trip.end_time) {
        toast.error(`Rit ${i + 1}: Vul zowel start- als eindtijd in.`);
        setActiveTab("ritten");
        return;
      }
    }

    // Validate trip times against service times using numeric comparison
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      const tripStart = timeToMinutes(trip.start_time);
      const tripEnd = timeToMinutes(trip.end_time);
      const dienstStart = timeToMinutes(formData.start_time);
      const dienstEnd = timeToMinutes(formData.end_time);

      if (tripStart !== null && dienstStart !== null && tripStart < dienstStart) {
        toast.error(`Rit ${i + 1}: starttijd rit (${trip.start_time}) ligt vóór start dienst (${formData.start_time}).`);
        setActiveTab("ritten");
        return;
      }

      if (tripEnd !== null && dienstEnd !== null && tripEnd > dienstEnd) {
        toast.error(`Rit ${i + 1}: eindtijd rit (${trip.end_time}) ligt na einde dienst (${formData.end_time}).`);
        setActiveTab("ritten");
        return;
      }
    }

    if (!signature) {
      setShowSignatureDialog(true);
      return;
    }

    submitAndReturn();
  };

  const submitAndReturn = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const hasDamage = trips.some(trip => trip.damage_occurred === "Ja");
      const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);

      const timeEntryData = {
        employee_id: currentEmployee?.id,
        date: formData.date,
        week_number: getWeek(new Date(formData.date), { weekStartsOn: 1 }),
        year: getYear(new Date(formData.date)),
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: Number(formData.break_minutes) || 0,
        total_hours: hours,
        shift_type: "Dag",
        notes: formData.notes,
        status: isOnline ? "Ingediend" : "Concept",
        signature_url: signature
      };

      if (isOnline) {
        const existingEntries = await base44.entities.TimeEntry.filter({
          employee_id: currentEmployee?.id,
          date: formData.date,
          status: 'Concept'
        });

        if (existingEntries.length > 0) {
          await base44.entities.TimeEntry.update(existingEntries[0].id, timeEntryData);
          for (let i = 1; i < existingEntries.length; i++) {
            await base44.entities.TimeEntry.delete(existingEntries[i].id);
          }
        } else {
          await base44.entities.TimeEntry.create(timeEntryData);
        }

        const existingTrips = await base44.entities.Trip.filter({
          employee_id: currentEmployee?.id,
          date: formData.date,
          status: 'Gepland'
        });
        for (const et of existingTrips) {
          await base44.entities.Trip.delete(et.id);
        }
      } else {
        addToQueue('createTimeEntry', timeEntryData);
      }

      if (trips.length > 0) {
        for (const trip of trips) {
          const tripData = {
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
          };

          if (isOnline) {
            await base44.entities.Trip.create(tripData);
          } else {
            addToQueue('createTrip', tripData);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['myTimeEntries', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });

      base44.analytics.track({ eventName: "mobile_entry_submit_success", properties: { employeeId: currentEmployee?.id, date: formData.date, totalHours: hours, tripCount: trips.length, isOnline } });

      // Save standplaatsWerk records - verwijder eerst bestaande om duplicaten te voorkomen
      if (isOnline) {
        const existingSpw = await base44.entities.StandplaatsWerk.filter({
          employee_id: currentEmployee?.id,
          date: formData.date
        });
        for (const s of existingSpw) {
          await base44.entities.StandplaatsWerk.delete(s.id);
        }
      }
      if (standplaatsWerk.length > 0) {
        for (const spw of standplaatsWerk) {
          if (spw.customer_id || spw.activity_id) {
            const spwData = {
              employee_id: currentEmployee?.id,
              date: formData.date,
              start_time: spw.start_time || null,
              end_time: spw.end_time || null,
              customer_id: spw.customer_id || null,
              project_id: spw.project_id || null,
              activity_id: spw.activity_id || null,
              notes: spw.notes || null,
            };
            if (isOnline) {
              await base44.entities.StandplaatsWerk.create(spwData);
            } else {
              addToQueue('createStandplaatsWerk', spwData);
            }
          }
        }
      }

      if (isOnline) {
        toast.success('Dienst en ritten succesvol ingediend!');
      } else {
        toast.info('Offline: gegevens worden gesynchroniseerd wanneer de verbinding hersteld is.');
      }

      setTrips([]);
      setStandplaatsWerk([]);
      setSignature(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: "",
        end_time: "",
        break_minutes: 30,
        notes: ""
      });

      if (hasDamage) {
        window.open('https://mijn.bumper.nl', '_blank');
      }

      setActiveTab("home");
    } catch (error) {
      console.error('Indienen mislukt:', error);
      base44.analytics.track({ eventName: "mobile_entry_submit_fail", properties: { employeeId: currentEmployee?.id, date: formData.date, error: error?.message || "unknown" } });
      toast.error('Er is een fout opgetreden bij het indienen. Probeer opnieuw.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (submittingRef.current) return;
    if (!currentEmployee?.id) {
      toast.error('Medewerker niet gevonden. Probeer de pagina te herladen.');
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const hours = calculateHours(formData.start_time, formData.end_time, formData.break_minutes);

      const timeEntryPayload = {
        employee_id: currentEmployee?.id,
        date: formData.date,
        week_number: getWeek(new Date(formData.date), { weekStartsOn: 1 }),
        year: getYear(new Date(formData.date)),
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: Number(formData.break_minutes) || 0,
        total_hours: hours,
        shift_type: "Dag",
        notes: formData.notes,
        status: "Concept"
      };

      const freshEntries = await base44.entities.TimeEntry.filter({
        employee_id: currentEmployee?.id,
        date: formData.date,
        status: 'Concept'
      });

      if (freshEntries.length > 0) {
        await base44.entities.TimeEntry.update(freshEntries[0].id, timeEntryPayload);
        for (let i = 1; i < freshEntries.length; i++) {
          await base44.entities.TimeEntry.delete(freshEntries[i].id);
        }
      } else {
        await base44.entities.TimeEntry.create(timeEntryPayload);
      }

      // Altijd bestaande draft trips opruimen en opnieuw aanmaken
      const existingDraftTrips = await base44.entities.Trip.filter({
        employee_id: currentEmployee?.id,
        date: formData.date,
        status: 'Gepland'
      });
      for (const et of existingDraftTrips) {
        await base44.entities.Trip.delete(et.id);
      }

      for (const trip of trips) {
        if (!trip.vehicle_id) continue;
        await base44.entities.Trip.create({
          employee_id: currentEmployee.id,
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
      }

      // Bestaande standplaatswerk opruimen en opnieuw aanmaken
      const existingSpw = await base44.entities.StandplaatsWerk.filter({
        employee_id: currentEmployee.id,
        date: formData.date
      });
      for (const s of existingSpw) {
        await base44.entities.StandplaatsWerk.delete(s.id);
      }
      for (const spw of standplaatsWerk) {
        if (spw.customer_id || spw.activity_id || spw.notes) {
          await base44.entities.StandplaatsWerk.create({
            employee_id: currentEmployee.id,
            date: formData.date,
            start_time: spw.start_time || null,
            end_time: spw.end_time || null,
            customer_id: spw.customer_id || null,
            project_id: spw.project_id || null,
            activity_id: spw.activity_id || null,
            notes: spw.notes || null,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['myTimeEntries', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      base44.analytics.track({ eventName: "mobile_entry_draft_saved", properties: { employeeId: currentEmployee?.id, date: formData.date, tripCount: trips.length } });
      toast.success('Concept opgeslagen');
      setTimeout(() => setActiveTab("home"), 300);
    } catch (error) {
      console.error('Opslaan mislukt:', error);
      base44.analytics.track({ eventName: "mobile_entry_draft_fail", properties: { employeeId: currentEmployee?.id, error: error?.message || "unknown" } });
      toast.error('Concept opslaan mislukt. Controleer je verbinding.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const calculateHours = (start, end, breakMinutes) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = Math.max(0, totalMinutes - (breakMinutes || 0));
    return Math.round(totalMinutes / 60 * 100) / 100;
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

  // menuItems is now computed via useMemo above

  return (
    <div className="min-h-screen bg-slate-100">
      <OfflineSyncIndicator isOnline={isOnline} syncStatus={syncStatus} />
      
      {/* Menu Overlay */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      {/* Slide-out Menu */}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold">Menu</h2>
                  <p className="text-xs text-blue-100">Navigatie</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                if (item.isLink) {
                  return (
                    <Link
                      key={item.id}
                      to={createPageUrl("Contracts")}
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-slate-600 hover:bg-slate-50"
                    >
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${
                      activeTab === item.id ? 'text-blue-600' : 'text-slate-400'
                    }`} />
                    <span className="text-sm">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Afmelden</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2.5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Interdistri TMS</h1>
              <p className="text-xs text-blue-100">Mobiele App</p>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-3 -m-1 hover:bg-white/20 rounded-lg active:bg-white/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Menu openen"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Date & Time Bar */}
        <div className="bg-white/10 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-100">Vandaag</p>
              <p className="font-semibold text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100">Tijd</p>
              <p className="font-semibold text-lg">{format(currentTime, "HH:mm")}</p>
            </div>
          </div>
        </div>

        {/* Today's Shift Time */}
        {todayShift && (
          <div className="mt-2 bg-amber-400 text-amber-900 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <div>
                <p className="text-xs font-medium">
                  {todayShift.date === todayStr ? 'Dienst starttijd vandaag' : `Dienst ${format(new Date(todayShift.date), "EEEE d MMMM", { locale: nl })}`}
                </p>
                <p className="font-bold text-lg">{todayShift.service_start_time}</p>
                {todayShift.start_time && todayShift.end_time && (
                  <p className="text-xs mt-1">
                    <strong>Shift:</strong> {todayShift.start_time} - {todayShift.end_time}
                  </p>
                )}
              </div>
            </div>
            {todayShift.message && (
              <p className="mt-1 text-xs">{todayShift.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <motion.div 
        className="p-3 pb-32"
        style={{ minHeight: 'calc(100vh - 140px)' }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.x < -80 && info.velocity.x < -300) handleSwipe("left");
          if (info.offset.x > 80 && info.velocity.x > 300) handleSwipe("right");
        }}
      >
      <Tabs value={activeTab} onValueChange={setActiveTab}>

      {/* Home/Frontpage Tab */}
      {activeTab === "home" && <TabsContent value="home" forceMount>
            {/* Welcome Message */}
            <div className="bg-white rounded-lg p-2.5 text-slate-900 mb-2 border-2 border-blue-200">
              <h2 className="font-bold text-base mb-1">
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

            <MobileFrontpage onNavigate={setActiveTab} />
          </TabsContent>}

          {/* Berichten Tab */}
          {activeTab === "berichten" && <TabsContent value="berichten" className="space-y-4" forceMount>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Berichten & Notificaties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myMessages.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Geen berichten
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myMessages.slice(0, 20).map(message => {
                      const messageDate = message.created_date ? new Date(message.created_date) : new Date();
                      return (
                        <div 
                          key={message.id} 
                          className={`p-3 rounded-lg border ${
                            message.is_read 
                              ? 'bg-white border-slate-200' 
                              : 'bg-blue-50 border-blue-200'
                          }`}
                          onClick={async () => {
                            if (!message.is_read) {
                              await base44.entities.Message.update(message.id, { is_read: true });
                              queryClient.invalidateQueries({ queryKey: ['myMessages'] });
                            }
                          }}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {!message.is_read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                              )}
                              <p className="font-semibold text-slate-900 text-sm">
                                {message.subject || 'Bericht'}
                              </p>
                            </div>
                            {message.priority === 'Urgent' && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Urgent
                              </Badge>
                            )}
                            {message.priority === 'Hoog' && (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                Hoog
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(messageDate, "d MMM yyyy, HH:mm", { locale: nl })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>}

          {/* Planning Tab */}
          {activeTab === "planning" && <TabsContent value="planning" className="space-y-4" forceMount>
            <MobilePlanningTab
              schedules={schedules}
              currentEmployee={currentEmployee}
              routes={routes}
              tiModelRoutes={tiModelRoutes}
              vehicles={vehicles}
            />
          </TabsContent>}

          {/* Dienst Tab */}
           {activeTab === "dienst" && <TabsContent value="dienst" className="space-y-4" forceMount>
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

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    Stap 1: Voer starttijd in
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Start dienst *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength="5"
                    value={formData.start_time}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length >= 3) {
                        value = value.slice(0, 2) + ':' + value.slice(2, 4);
                      }
                      setFormData({ ...formData, start_time: value });
                    }}
                    placeholder="08:30"
                  />
                  <p className="text-xs text-slate-500 mt-1">Typ tijd in formaat UU:MM (bijv. 08:30)</p>
                </div>

                {formData.start_time && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-700 font-medium">
                      ✓ Starttijd: {formData.start_time}
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setActiveTab("ritten")}
                  disabled={!formData.start_time}
                >
                  Volgende → Ritten invoeren
                </Button>

                {trips.length > 0 && (
                  <>
                    <div className="border-t my-4"></div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">
                        Stap 2: Voer eindtijd in
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-700 font-medium">
                        ✓ {trips.length} rit(ten) toegevoegd
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Eind dienst *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength="5"
                          value={formData.end_time}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^0-9]/g, '');
                            if (value.length >= 3) {
                              value = value.slice(0, 2) + ':' + value.slice(2, 4);
                            }
                            setFormData({ ...formData, end_time: value });
                          }}
                          onBlur={(e) => {
                            const newEndTime = e.target.value;
                            const dienstEndMin = timeToMinutes(newEndTime);
                            const dienstStartMin = timeToMinutes(formData.start_time);
                            if (dienstEndMin !== null && trips.length > 0) {
                              const invalidTrips = [];
                              trips.forEach((trip, idx) => {
                                const tripEndMin = timeToMinutes(trip.end_time);
                                const tripStartMin = timeToMinutes(trip.start_time);
                                if (tripEndMin !== null && tripEndMin > dienstEndMin) {
                                  invalidTrips.push(`Rit ${idx + 1}: eindtijd rit (${trip.end_time}) ligt na eindtijd dienst (${newEndTime})`);
                                }
                                if (tripStartMin !== null && dienstStartMin !== null && tripStartMin < dienstStartMin) {
                                  invalidTrips.push(`Rit ${idx + 1}: starttijd rit (${trip.start_time}) ligt vóór starttijd dienst (${formData.start_time})`);
                                }
                              });
                              
                              if (invalidTrips.length > 0) {
                                toast.warning('Ritten buiten diensttijd: ' + invalidTrips.join('; '));
                              }
                            }
                          }}
                          placeholder="16:30"
                        />
                        <p className="text-xs text-slate-500 mt-1">Typ tijd in formaat UU:MM (bijv. 16:30)</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Pauze (minuten)</Label>
                        <Input
                          type="number"
                          value={formData.break_minutes}
                          onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value, 10) || 0 })}
                        />
                      </div>
                    </div>

                    {formData.end_time && (
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

                    {signature && (
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-700 mb-1">Handtekening toegevoegd ✓</p>
                        <img src={signature} alt="Handtekening" className="h-12 border rounded" />
                      </div>
                    )}

                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleSubmitEntry}
                      disabled={isSubmitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Met Handtekening Indienen
                    </Button>
                  </>
                )}
                </CardContent>
                </Card>
                </TabsContent>}

          {/* Standplaatswerk Tab */}
          {activeTab === "standplaats" && <TabsContent value="standplaats" className="space-y-4" forceMount>
            <StandplaatsWerkSection
              standplaatsWerk={standplaatsWerk}
              setStandplaatsWerk={setStandplaatsWerk}
              customers={customers}
              projects={projects}
              activiteiten={activiteiten}
            />

            {standplaatsWerk.length > 0 && (
              <div className="space-y-2 pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  className="w-full py-3 border-emerald-300 bg-emerald-50"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Tussentijds Opslaan & Terug naar Home
                </Button>
              </div>
            )}
          </TabsContent>}

          {/* Ritten Tab */}
          {activeTab === "ritten" && <TabsContent value="ritten" className="space-y-4" forceMount>
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
                        type="text"
                        inputMode="numeric"
                        maxLength="5"
                        value={trip.start_time}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^0-9]/g, '');
                          if (value.length >= 3) {
                            value = value.slice(0, 2) + ':' + value.slice(2, 4);
                          }
                          
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, start_time: value };
                          setTrips(newTrips);
                        }}
                        onBlur={(e) => {
                          const newStartTime = e.target.value;
                          const tripMin = timeToMinutes(newStartTime);
                          const dienstMin = timeToMinutes(formData.start_time);
                          if (tripMin !== null && dienstMin !== null && tripMin < dienstMin) {
                            toast.warning(`Start rit (${newStartTime}) ligt vóór start dienst (${formData.start_time}).`);
                          }
                        }}
                        placeholder="09:00"
                      />
                      <p className="text-xs text-slate-500">Typ tijd UU:MM (bijv. 09:00)</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Einde Rit</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength="5"
                        value={trip.end_time}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^0-9]/g, '');
                          if (value.length >= 3) {
                            value = value.slice(0, 2) + ':' + value.slice(2, 4);
                          }
                          
                          const newTrips = [...trips];
                          newTrips[index] = { ...trip, end_time: value };
                          setTrips(newTrips);
                        }}
                        onBlur={(e) => {
                          const newEndTime = e.target.value;
                          const tripMin = timeToMinutes(newEndTime);
                          const dienstMin = timeToMinutes(formData.end_time);
                          if (tripMin !== null && dienstMin !== null && tripMin > dienstMin) {
                            toast.warning(`Einde rit (${newEndTime}) ligt na einde dienst (${formData.end_time}).`);
                          }
                        }}
                        placeholder="15:00"
                      />
                      <p className="text-xs text-slate-500">Typ tijd UU:MM (bijv. 15:00)</p>
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

                  <div className="space-y-1">
                    <Label className="text-xs">Schade gereden?</Label>
                    <Select 
                      value={trip.damage_occurred || "Nee"} 
                      onValueChange={(v) => {
                        const newTrips = [...trips];
                        newTrips[index] = { ...trip, damage_occurred: v };
                        setTrips(newTrips);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nee">Nee</SelectItem>
                        <SelectItem value="Ja">Ja</SelectItem>
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
                          <Select
                            value={trip.route_name || "none"}
                            onValueChange={(v) => {
                              const newTrips = [...trips];
                              newTrips[index] = { ...trip, route_name: v === "none" ? "" : v, route_name_custom: v === "__custom__" ? "" : undefined };
                              if (v === "__custom__") {
                                newTrips[index] = { ...trip, route_name: "", _showCustomRoute: true };
                              } else {
                                newTrips[index] = { ...trip, route_name: v === "none" ? "" : v, _showCustomRoute: false };
                              }
                              setTrips(newTrips);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer route" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecteer route</SelectItem>
                              {[...tiModelRoutes].filter(r => !trip.customer_id || r.customer_id === trip.customer_id).sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true })).map(r => (
                                <SelectItem key={`ti-${r.id}`} value={r.route_code || r.route_name}>
                                  {r.route_code} - {r.route_name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
                              {[...routes].filter(r => !trip.customer_id || r.customer_id === trip.customer_id).sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true })).map(r => (
                                <SelectItem key={`rt-${r.id}`} value={r.route_code || r.route_name}>
                                  {r.route_code} - {r.route_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {trip._showCustomRoute && (
                            <Input
                              className="mt-1"
                              value={trip.route_name}
                              onChange={(e) => {
                                const newTrips = [...trips];
                                newTrips[index] = { ...trip, route_name: e.target.value, _showCustomRoute: true };
                                setTrips(newTrips);
                              }}
                              placeholder="Typ routenaam..."
                              autoFocus
                            />
                          )}
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
                damage_occurred: "Nee",
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

            {trips.length > 0 && (
              <div className="space-y-2 pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  className="w-full py-3 border-emerald-300 bg-emerald-50"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Tussentijds Opslaan & Terug naar Home
                </Button>
                {trips.length > 0 && (
                  <Button 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setActiveTab("dienst")}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Volgende → Einde diensttijd invoeren
                  </Button>
                )}
              </div>
            )}
              </TabsContent>}

          {/* Inspectie Tab */}
          {activeTab === "inspectie" && <TabsContent value="inspectie" className="space-y-4" forceMount>
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
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Schade omschrijving</Label>
                      <Textarea
                        value={inspectionData.damage_description}
                        onChange={(e) => setInspectionData({ ...inspectionData, damage_description: e.target.value })}
                        rows={2}
                        placeholder="Beschrijf de schade..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Foto's van schade</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const uploadResult = await base44.integrations.Core.UploadFile({ file });
                                setInspectionData({ 
                                  ...inspectionData, 
                                  damage_photos: [...inspectionData.damage_photos, uploadResult.file_url]
                                });
                              } catch (error) {
                                alert('Fout bij uploaden foto: ' + error.message);
                              }
                            }
                            e.target.value = '';
                          }}
                          className="text-xs"
                        />
                        <Camera className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      </div>

                      {inspectionData.damage_photos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-emerald-600 font-medium">
                            ✓ {inspectionData.damage_photos.length} foto('s) toegevoegd
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {inspectionData.damage_photos.map((url, idx) => (
                              <div key={idx} className="relative">
                                <img 
                                  src={url} 
                                  alt={`Schade ${idx + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border-2 border-slate-200"
                                />
                                <button
                                  onClick={() => {
                                    setInspectionData({
                                      ...inspectionData,
                                      damage_photos: inspectionData.damage_photos.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
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
                      damage_photos: inspectionData.damage_photos,
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

                <div className="space-y-1">
                  <Label className="text-xs">Bon / Factuur (optioneel)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setExpenseData({ ...expenseData, receipt_file: file });
                        }
                      }}
                      className="text-xs"
                    />
                    {expenseData.receipt_file && (
                      <Camera className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  {expenseData.receipt_file && (
                    <p className="text-xs text-emerald-600">
                      ✓ {expenseData.receipt_file.name}
                    </p>
                  )}
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    let receiptUrl = "";
                    
                    // Upload receipt if provided
                    if (expenseData.receipt_file) {
                      try {
                        const uploadResult = await base44.integrations.Core.UploadFile({
                          file: expenseData.receipt_file
                        });
                        receiptUrl = uploadResult.file_url;
                      } catch (error) {
                        alert('Fout bij uploaden bon: ' + error.message);
                        return;
                      }
                    }

                    createExpenseMutation.mutate({
                      employee_id: currentEmployee?.id,
                      date: expenseData.date,
                      category: expenseData.category,
                      description: expenseData.description,
                      amount: Number(expenseData.amount),
                      receipt_url: receiptUrl,
                      status: 'Ingediend'
                    });
                  }}
                  disabled={!expenseData.amount || createExpenseMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createExpenseMutation.isPending ? 'Bezig...' : 'Declaratie indienen'}
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
          </TabsContent>

          {/* Reglement Tab */}
          <TabsContent value="reglement" className="space-y-4">
            <MobileReglementTab />
          </TabsContent>

          {/* Handleiding Tab */}
          <TabsContent value="handleiding" className="space-y-4">
            <MobileHandleidingTab />
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Snelle links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a 
                  href="https://mijn.bumper.nl" 
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
      </motion.div>

      {/* Signature Dialog */}
      <MobileSignatureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onSave={handleSignatureSave}
      />
    </div>
  );
}