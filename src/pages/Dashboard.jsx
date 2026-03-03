import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Truck,
  Clock,
  CheckSquare,
  ArrowRight,
  Calendar,
  Car,
  Bell,
  Download,
  AlertTriangle,
  FileText,
  Smartphone
} from "lucide-react";
import CharterOverview from "../components/dashboard/CharterOverview";
import WeekRevenueCard from "../components/dashboard/WeekRevenueCard";
import ContractWarnings from "../components/dashboard/ContractWarnings";
import ExportDialog from "../components/export/ExportDialog";
import SystemStatusCard from "../components/dashboard/SystemStatusCard";
import RegistryIntegrityCard from "../components/dashboard/RegistryIntegrityCard";
import MobileEntryStatusCard from "../components/dashboard/MobileEntryStatusCard";
import NotificationsCard from "../components/dashboard/NotificationsCard";
import AggregationStatusWidget from "../components/dashboard/AggregationStatusWidget";

export default function Dashboard({ currentUser }) {
  const today = new Date();
  const [showExport, setShowExport] = React.useState(false);

  const isAdmin = currentUser?.role === 'admin';

  if (!currentUser || !isAdmin) {
    return null;
  }

  const queryOpts = { staleTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false };

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: isAdmin,
    ...queryOpts
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    enabled: isAdmin,
    ...queryOpts
  });

  const { data: timeEntries = [], isLoading: loadingTimeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 100),
    enabled: isAdmin,
    ...queryOpts
  });

  const todayStr = format(today, 'yyyy-MM-dd');
  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['trips-today', todayStr],
    queryFn: () => base44.entities.Trip.filter({ date: todayStr }),
    enabled: isAdmin,
    ...queryOpts
  });

  const { data: niwoPermits = [] } = useQuery({
    queryKey: ['niwoPermits'],
    queryFn: () => base44.entities.NiwoPermit.list(),
    enabled: isAdmin,
    ...queryOpts
  });

  const { data: managedDocuments = [] } = useQuery({
    queryKey: ['documents-dashboard'],
    queryFn: () => base44.entities.Document.filter({ status: 'Actief' }),
    enabled: isAdmin,
    ...queryOpts
  });

  const isLoading = loadingEmployees || loadingVehicles || loadingTimeEntries || loadingTrips;

  // Calculate statistics
  const activeEmployees = employees.filter(e => e.status === 'Actief').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Beschikbaar').length;
  const pendingApprovals = timeEntries.filter(t => t.status === 'Ingediend').length;
  const todayTrips = trips.length;

  // Build notification items from expiring documents + system alerts
  const notificationItems = [];
  const warningDays = 30;

  employees.forEach(emp => {
    if (emp.drivers_license_expiry) {
      const daysUntil = differenceInDays(new Date(emp.drivers_license_expiry), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        notificationItems.push({
          type: 'Rijbewijs',
          name: `${emp.first_name} ${emp.last_name}`,
          expiry: emp.drivers_license_expiry,
          daysUntil,
          link: `Employees?id=${emp.id}`,
          severity: daysUntil <= 7 ? 'red' : 'amber'
        });
      }
    }
    if (emp.code95_expiry) {
      const daysUntil = differenceInDays(new Date(emp.code95_expiry), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        notificationItems.push({
          type: 'Code 95',
          name: `${emp.first_name} ${emp.last_name}`,
          expiry: emp.code95_expiry,
          daysUntil,
          link: `Employees?id=${emp.id}`,
          severity: daysUntil <= 7 ? 'red' : 'amber'
        });
      }
    }
  });

  vehicles.forEach(v => {
    if (v.apk_expiry) {
      const daysUntil = differenceInDays(new Date(v.apk_expiry), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        notificationItems.push({
          type: 'APK',
          name: v.license_plate,
          expiry: v.apk_expiry,
          daysUntil,
          link: `Vehicles?id=${v.id}`,
          severity: daysUntil <= 7 ? 'red' : 'amber'
        });
      }
    }
  });

  niwoPermits.forEach(p => {
    if (p.validity_date) {
      const daysUntil = differenceInDays(new Date(p.validity_date), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        notificationItems.push({
          type: 'NIWO',
          name: p.permit_number,
          expiry: p.validity_date,
          daysUntil,
          link: `NiwoPermits?id=${p.id}`,
          severity: daysUntil <= 7 ? 'red' : 'amber'
        });
      }
    }
  });

  managedDocuments.forEach(doc => {
    if (doc.expiry_date) {
      const daysUntil = differenceInDays(new Date(doc.expiry_date), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        notificationItems.push({
          type: doc.document_type || 'Document',
          name: doc.linked_entity_name || doc.name,
          expiry: doc.expiry_date,
          daysUntil,
          link: 'Documents',
          severity: daysUntil <= 7 ? 'red' : 'amber'
        });
      }
    }
  });

  // Add pending approvals as system alert
  if (pendingApprovals > 0) {
    notificationItems.push({
      type: 'Systeem',
      name: `${pendingApprovals} goedkeuringen open`,
      daysUntil: null,
      link: 'Approvals',
      severity: 'blue'
    });
  }

  notificationItems.sort((a, b) => {
    const sevOrder = { red: 0, amber: 1, blue: 2 };
    return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3) || (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
  });

  // Recent activities
  const recentTimeEntries = [...timeEntries]
    .filter(e => e.status === 'Ingediend' || e.status === 'Goedgekeurd')
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .filter((entry, index, arr) => {
      const key = `${entry.employee_id}_${entry.date}`;
      return arr.findIndex(e => `${e.employee_id}_${e.date}` === key) === index;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* System Status + Registry Integrity + Aggregation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SystemStatusCard />
        <RegistryIntegrityCard />
        <AggregationStatusWidget />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welkom terug! Overzicht van vandaag.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-1.5" />
            Exporteer
          </Button>
          <Link to={createPageUrl("TimeTracking")}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Clock className="w-4 h-4 mr-1.5" />
              Tijdregistratie
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Actieve Medewerkers"
              value={activeEmployees}
              icon={Users}
              subtitle={`${employees.length} totaal`}
            />
            <StatCard
              title="Voertuigen"
              value={availableVehicles}
              icon={Car}
              subtitle={`${vehicles.length} totaal`}
            />
            <StatCard
              title="Ritten Vandaag"
              value={todayTrips}
              icon={Truck}
              subtitle={format(today, "EEEE d MMM", { locale: nl })}
            />
            <StatCard
              title="Goedkeuringen"
              value={pendingApprovals}
              icon={CheckSquare}
              subtitle="Openstaand"
              className={pendingApprovals > 0 ? "ring-1 ring-amber-200" : ""}
            />
            <MobileEntryStatusCard />
          </>
        )}
      </div>



      {/* Contract Warnings - compact */}
      {!isLoading && <ContractWarnings employees={employees} />}

      {/* Second Row: Meldingen (4 col) + Klanten (8 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <NotificationsCard items={notificationItems} />
        </div>
        <div className="lg:col-span-8">
          <WeekRevenueCard />
        </div>
      </div>

      {/* Third Row: Quick Actions + Recent + Charters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm">Snelle Acties</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4">
            <Link to={createPageUrl("Employees")}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5 text-xs">
                <Users className="w-5 h-5 text-blue-600" />
                Medewerkers
              </Button>
            </Link>
            <Link to={createPageUrl("Vehicles")}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5 text-xs">
                <Car className="w-5 h-5 text-emerald-600" />
                Voertuigen
              </Button>
            </Link>
            <Link to={createPageUrl("Planning")}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5 text-xs">
                <Calendar className="w-5 h-5 text-purple-600" />
                Planning
              </Button>
            </Link>
            <Link to={createPageUrl("Approvals")}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5 text-xs relative">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                Goedkeuringen
                {pendingApprovals > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] px-1.5 py-0">
                    {pendingApprovals}
                  </Badge>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Time Entries */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recente Tijdregistraties</CardTitle>
              <Link to={createPageUrl("TimeTracking")}>
                <Button variant="ghost" size="sm" className="text-blue-600 h-7 text-xs px-2">
                  Alles
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : recentTimeEntries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nog geen tijdregistraties
              </p>
            ) : (
              <div className="space-y-1.5">
                {recentTimeEntries.map(entry => {
                  const employee = employees.find(e => e.id === entry.employee_id);
                  return (
                    <Link key={entry.id} to={createPageUrl("TimeTracking")}>
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">
                              {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {entry.date ? format(new Date(entry.date), "d MMM", { locale: nl }) : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-slate-900">
                            {entry.total_hours ? `${entry.total_hours}u` : '-'}
                          </p>
                          <Badge variant={
                            entry.status === 'Goedgekeurd' ? 'success' :
                            entry.status === 'Afgekeurd' ? 'destructive' :
                            entry.status === 'Ingediend' ? 'warning' : 'secondary'
                          } className="text-[9px] px-1 py-0">
                            {entry.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charter Overview */}
        <CharterOverview />
      </div>

      <ExportDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  );
}