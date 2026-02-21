import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, addDays, differenceInDays, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { StatCard } from "@/components/ui/stat-card";
import { AlertCard } from "@/components/ui/alert-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Truck,
  Clock,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Calendar,
  FileText,
    Car,
  Bell,
  Download
} from "lucide-react";
import CharterOverview from "../components/dashboard/CharterOverview";
import RevenuePerCustomer from "../components/dashboard/RevenuePerCustomer";
import ContractWarnings from "../components/dashboard/ContractWarnings";
import ExportDialog from "../components/export/ExportDialog";

export default function Dashboard() {
  const today = new Date();
  const [showExport, setShowExport] = React.useState(false);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUserDashboard'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = currentUser?.role === 'admin';

  if (currentUser && !isAdmin) {
    return null;
  }

  // Only fetch dashboard data for admin users
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: isAdmin
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    enabled: isAdmin
  });

  const { data: timeEntries = [], isLoading: loadingTimeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 100),
    enabled: isAdmin
  });

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => base44.entities.Trip.list(),
    enabled: isAdmin
  });

  const { data: niwoPermits = [], isLoading: loadingNiwo } = useQuery({
    queryKey: ['niwoPermits'],
    queryFn: () => base44.entities.NiwoPermit.list(),
    enabled: isAdmin
  });

  const { data: managedDocuments = [] } = useQuery({
    queryKey: ['documents-dashboard'],
    queryFn: () => base44.entities.Document.filter({ status: 'Actief' }),
    enabled: isAdmin
  });

  const user = currentUser;

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allNotifications = await base44.entities.Notification.list('-created_date', 50);
      return allNotifications.filter(n => 
        n.user_ids && n.user_ids.includes(user.id)
      );
    },
    enabled: isAdmin && !!user?.id,
  });

  // Show loading while checking user role, then redirect non-admins
  if (loadingUser || (!isAdmin && currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Laden...</p>
        </div>
      </div>
    );
  }

  const isLoading = loadingEmployees || loadingVehicles || loadingTimeEntries || loadingTrips || loadingNiwo;

  // Calculate statistics
  const activeEmployees = employees.filter(e => e.status === 'Actief').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Beschikbaar').length;
  const pendingApprovals = timeEntries.filter(t => t.status === 'Ingediend').length;
  const todayTrips = trips.filter(t => t.date === format(today, 'yyyy-MM-dd')).length;

  // Find expiring documents
  const expiringDocuments = [];
  const warningDays = 30;

  employees.forEach(emp => {
    if (emp.drivers_license_expiry) {
      const daysUntil = differenceInDays(new Date(emp.drivers_license_expiry), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        expiringDocuments.push({
          type: 'Rijbewijs',
          name: `${emp.first_name} ${emp.last_name}`,
          expiry: emp.drivers_license_expiry,
          daysUntil,
          link: `Employees?id=${emp.id}`
        });
      }
    }
    if (emp.code95_expiry) {
      const daysUntil = differenceInDays(new Date(emp.code95_expiry), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        expiringDocuments.push({
          type: 'Code 95',
          name: `${emp.first_name} ${emp.last_name}`,
          expiry: emp.code95_expiry,
          daysUntil,
          link: `Employees?id=${emp.id}`
        });
      }
    }
  });

  vehicles.forEach(v => {
    if (v.apk_expiry) {
      const daysUntil = differenceInDays(new Date(v.apk_expiry), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        expiringDocuments.push({
          type: 'APK',
          name: v.license_plate,
          expiry: v.apk_expiry,
          daysUntil,
          link: `Vehicles?id=${v.id}`
        });
      }
    }
  });

  niwoPermits.forEach(p => {
    if (p.validity_date) {
      const daysUntil = differenceInDays(new Date(p.validity_date), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        expiringDocuments.push({
          type: 'NIWO Vergunning',
          name: p.permit_number,
          expiry: p.validity_date,
          daysUntil,
          link: `NiwoPermits?id=${p.id}`
        });
      }
    }
  });

  // Documents from Documentenbeheer
  managedDocuments.forEach(doc => {
    if (doc.expiry_date) {
      const daysUntil = differenceInDays(new Date(doc.expiry_date), today);
      if (daysUntil <= warningDays && daysUntil >= 0) {
        expiringDocuments.push({
          type: doc.document_type || 'Document',
          name: doc.linked_entity_name || doc.name,
          expiry: doc.expiry_date,
          daysUntil,
          link: 'Documents'
        });
      }
    }
  });

  expiringDocuments.sort((a, b) => a.daysUntil - b.daysUntil);

  // Recent activities - only show submitted and approved entries, deduplicated by employee+date
  const recentTimeEntries = [...timeEntries]
    .filter(e => e.status === 'Ingediend' || e.status === 'Goedgekeurd')
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .filter((entry, index, arr) => {
      const key = `${entry.employee_id}_${entry.date}`;
      return arr.findIndex(e => `${e.employee_id}_${e.date}` === key) === index;
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Welkom terug! Hier is een overzicht van vandaag.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exporteer Excel
          </Button>
          <Link to={createPageUrl("TimeTracking")}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Clock className="w-4 h-4 mr-2" />
              Tijdregistratie
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
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
              title="Beschikbare Voertuigen"
              value={availableVehicles}
              icon={Car}
              subtitle={`${vehicles.length} totaal`}
            />
            <StatCard
              title="Ritten Vandaag"
              value={todayTrips}
              icon={Truck}
              subtitle={format(today, "EEEE d MMMM", { locale: nl })}
            />
            <StatCard
              title="Ter Goedkeuring"
              value={pendingApprovals}
              icon={CheckSquare}
              subtitle="Openstaande uren"
              className={pendingApprovals > 0 ? "ring-2 ring-amber-200" : ""}
            />
          </>
        )}
      </div>

      {/* Alerts Section */}
      {expiringDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Verlopende Documenten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringDocuments.slice(0, 5).map((doc, index) => (
              <AlertCard
                key={index}
                variant={doc.daysUntil <= 7 ? "error" : "warning"}
                title={`${doc.type} - ${doc.name}`}
                description={`Verloopt over ${doc.daysUntil} dagen (${format(new Date(doc.expiry), "d MMMM yyyy", { locale: nl })})`}
                action="Bekijken"
                onAction={() => window.location.href = createPageUrl(doc.link)}
              />
            ))}
            {expiringDocuments.length > 5 && (
              <p className="text-sm text-slate-500 text-center pt-2">
                En nog {expiringDocuments.length - 5} andere documenten...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract Warnings */}
      {!isLoading && <ContractWarnings employees={employees} />}

      {/* Revenue per Customer */}
      <RevenuePerCustomer />

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Snelle Acties</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to={createPageUrl("Employees")}>
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                <span className="text-sm">Medewerkers</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Vehicles")}>
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Car className="w-6 h-6 text-emerald-600" />
                <span className="text-sm">Voertuigen</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Planning")}>
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Calendar className="w-6 h-6 text-purple-600" />
                <span className="text-sm">Planning</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Approvals")}>
              <Button variant="outline" className="w-full h-20 flex-col gap-2 relative">
                <CheckSquare className="w-6 h-6 text-amber-600" />
                <span className="text-sm">Goedkeuringen</span>
                {pendingApprovals > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-amber-500 text-white">
                    {pendingApprovals}
                  </Badge>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Time Entries */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recente Tijdregistraties</CardTitle>
              <Link to={createPageUrl("TimeTracking")}>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  Alles bekijken
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : recentTimeEntries.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nog geen tijdregistraties
              </p>
            ) : (
              <div className="space-y-3">
                {recentTimeEntries.map(entry => {
                  const employee = employees.find(e => e.id === entry.employee_id);
                  return (
                    <Link key={entry.id} to={createPageUrl("TimeTracking")}>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {entry.date ? format(new Date(entry.date), "d MMM yyyy", { locale: nl }) : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {entry.total_hours ? `${entry.total_hours}u` : '-'}
                          </p>
                          <Badge variant={
                            entry.status === 'Goedgekeurd' ? 'success' :
                            entry.status === 'Afgekeurd' ? 'destructive' :
                            entry.status === 'Ingediend' ? 'warning' : 'secondary'
                          } className="text-xs">
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

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Meldingen
              </CardTitle>
              <Link to={createPageUrl("Messages")}>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  Alles bekijken
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Geen meldingen
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${
                      !notification.is_read 
                        ? 'bg-blue-50 hover:bg-blue-100' 
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {notification.title}
                        </p>
                        {notification.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {notification.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(notification.created_date), "d MMM, HH:mm", { locale: nl })}
                        </p>
                      </div>
                      {notification.priority === 'urgent' && (
                        <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">
                          Urgent
                        </Badge>
                      )}
                      {notification.priority === 'high' && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">
                          Hoog
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
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