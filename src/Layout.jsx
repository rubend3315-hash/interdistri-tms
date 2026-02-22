import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock,
  Truck,
  CalendarDays,
  CheckSquare,
  Users,
  Shield,
  Link2,
  Car,
  FileText,
  Building2,
  FolderKanban,
  BookOpen,
  DollarSign,
  FileSpreadsheet,
  Smartphone,
  Package,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings,
  CircleDot,
  Mail
} from "lucide-react";
import NotificationBell from "./components/NotificationBell";
import { APP_VERSION } from "./components/utils/appVersion";
import MobileEntry from "./pages/MobileEntry";
import { cn } from "@/lib/utils";

// Service worker registration removed to prevent errors

const printStyles = `
  @page { margin: 10mm; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body, html { margin: 0; padding: 0; width: 100%; height: auto; }
    aside { display: none !important; }
    .lg\\:hidden { display: none !important; }
    main { margin-left: 0 !important; padding: 0 !important; width: 100% !important; }
    main > div { padding: 0 !important; }
    .print\\:break-before-page { break-before: page !important; page-break-before: always !important; }
    .print\\:hidden { display: none !important; }
    .print\\:block { display: block !important; }
    .print\\:bg-slate-800 { background-color: #1e293b !important; color: white !important; }
    .print\\:rounded-none { border-radius: 0 !important; }
    table { font-size: 9pt !important; border-collapse: collapse !important; width: 100% !important; }
    th, td { padding: 3px 4px !important; }
    .bg-green-500, .bg-orange-500 { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print\\:hidden button { display: none !important; }
    [role="dialog"] { position: relative !important; inset: auto !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 5px !important; border: none !important; box-shadow: none !important; overflow: visible !important; transform: none !important; background: white !important; }
    [role="dialog"] > div:first-child { display: none !important; }
    [role="dialog"] + div { display: none !important; }
    .overflow-x-auto { overflow: visible !important; }
    h1, h2, h3, h4 { page-break-after: avoid !important; }
    .rounded-xl { border-radius: 4px !important; }
  }
`;

const menuItems = [
  {
    label: "Kernsystemen",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
      { name: "Tijdregistratie", icon: Clock, page: "TimeTracking" },
      { name: "Goedkeuringen", icon: CheckSquare, page: "Approvals" },
      { name: "Ritten", icon: Truck, page: "Trips" },
      { name: "Standplaatswerk", icon: Package, page: "StandplaatsWerk" },
      { name: "Planning", icon: CalendarDays, page: "Planning" },
      { name: "Dienst-Shifttijd", icon: CircleDot, page: "ShiftTime" },
      { name: "Dagstaat", icon: FileText, page: "Dagstaat" },
    ]
  },
  {
    label: "HR & Beheer",
    items: [
      { name: "Onboarding", icon: Users, page: "Onboarding" },
      { name: "Medewerkers", icon: Users, page: "Employees" },
      { name: "Stamkaart", icon: FileText, page: "Stamkaart" },
      { name: "HR Import", icon: FileSpreadsheet, page: "HRImport" },
      { name: "Contracten", icon: FileText, page: "Contracts" },
      { name: "Contract Sjablonen", icon: FileText, page: "ContractTemplates" },
      { name: "Contractwijzigingen", icon: FileText, page: "ContractWijzigingen" },
      { name: "Contract Analytics", icon: FileSpreadsheet, page: "ContractAnalytics" },
      { name: "Afgeronde Contracten", icon: CheckSquare, page: "CompletedContracts" },
      { name: "Bedrijfsreglement", icon: BookOpen, page: "Bedrijfsreglement" },
      { name: "CAO-regels", icon: BookOpen, page: "CaoRules" },
      { name: "Loontabellen", icon: DollarSign, page: "SalaryTables" },
      { name: "Resultaat & Ontwikkeling", icon: FileText, page: "PerformanceReviews" },
      { name: "KPI rapportage PostNL", icon: Users, page: "EmployeeReport" },
      ]
      },
      {
      label: "Loon & Rapportage",
      items: [
      { name: "Loonrapporten", icon: FileSpreadsheet, page: "SalaryReports" },
      { name: "PayChecked Audit", icon: Shield, page: "PayCheckedAudit" },
      ]
      },
  {
    label: "Charters",
    items: [
      { name: "Charters", icon: Truck, page: "Charters" },
    ]
  },
  {
    label: "Klanten",
    items: [
      { name: "Klanten", icon: Building2, page: "Customers" },
      { name: "Projecten", icon: FolderKanban, page: "Projects" },
      { name: "Activiteiten", icon: Package, page: "Activiteiten" },
      ]
      },
      {
      label: "Communicatie",
    items: [
      { name: "Berichten", icon: Mail, page: "Messages" },
    ]
  },
  {
    label: "Beheer",
    items: [
      { name: "HR Instellingen", icon: BookOpen, page: "HRMSettings" },
      { name: "Feestdagen", icon: CalendarDays, page: "Holidays" },
      { name: "Integraties", icon: Link2, page: "Integrations" },
      { name: "Herberekeningen", icon: Shield, page: "Recalculations" },
      { name: "Documentenbeheer", icon: FileText, page: "Documents" },
      { name: "Gebruikers", icon: Settings, page: "Users" },
      { name: "Audit Log", icon: Shield, page: "AuditLog" },
      { name: "Voertuigen", icon: Car, page: "Vehicles" },
      { name: "NIWO Vergunningen", icon: FileText, page: "NiwoPermits" },
      { name: "Back-ups", icon: Shield, page: "Backups" },
      { name: "Datamigratie", icon: Shield, page: "DataMigration" },
      { name: "Help & Documentatie", icon: BookOpen, page: "HelpPage" },
      { name: "Handleiding Mobiele App", icon: Smartphone, page: "MobileHandleiding" },
      { name: "Security Architectuur", icon: Shield, page: "SecurityArchitecture" },
      { name: "Security Roadmap", icon: Shield, page: "SecurityRoadmap" },
      { name: "Systeemdiagram", icon: Shield, page: "SystemArchitectureDiagram" },
      { name: "Security Samenvatting", icon: Shield, page: "SecuritySummary" },
      { name: "Encryptie Migratie", icon: Shield, page: "EncryptionMigration" },
    ]
  },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const activeGroup = menuItems.find(g => g.items.some(i => i.page === currentPageName));
    return activeGroup ? [activeGroup.label] : [];
  });
  const { data: user, isLoading: loadingUser, isError: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const { data: currentEmployee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: async ({ queryKey }) => {
      const [, email] = queryKey;
      const emps = await base44.entities.Employee.filter({ email });
      return emps[0] ?? null;
    },
    enabled: !!user && user.role !== 'admin',
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });


  const hasPermission = (page) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const pagePermissionMap = {
      'Dashboard': 'dashboard',
      'TimeTracking': 'timetracking',
      'Trips': 'trips',
      'Planning': 'planning',
      'Approvals': 'approvals',
      'ShiftTime': 'shifttime',
      'Employees': 'employees',
      'Users': 'users',
      'Vehicles': 'vehicles',
      'NiwoPermits': 'niwo',
      'Customers': 'customers',
      'Projects': 'projects',
      'Documents': 'documents',
      'EmployeeReport': 'reports',
      'CaoRules': 'cao',
      'SalaryTables': 'salary',
      'HRMSettings': 'hrmsettings',
      'Holidays': 'holidays',
      'SalaryReports': 'reports',
      'MobileEntry': 'mobile',
      'MobileEntryMultiDay': 'mobile',
      'Messages': 'messages',
      'Charters': 'charters',
      'AuditLog': 'users',
      'Contracts': 'contracts',
      'ContractTemplates': 'contracts',
      'ContractWijzigingen': 'contracts',
      'ContractAnalytics': 'contracts',
      'CompletedContracts': 'contracts',
      'HRImport': 'hrimport',
      'Stamkaart': 'employees',
      'CustomerDetail': 'customers',
      'Bedrijfsreglement': 'employees',
      'PerformanceReviews': 'employees',
      'Backups': 'admin_only',
      'DataMigration': 'admin_only',
      'Recalculations': 'admin_only',
      'Integrations': 'admin_only',
      'Dagstaat': 'dagstaat',
      'HelpPage': 'helppage',
      'Onboarding': 'employees',
      'MobileHandleiding': 'helppage',
      'SecurityArchitecture': 'admin_only',
      'SecurityRoadmap': 'admin_only',
      'SystemArchitectureDiagram': 'admin_only',
      'SecuritySummary': 'admin_only',
      'SecureDownload': 'public',
      'EncryptionMigration': 'admin_only',
      'Activiteiten': 'customers',
      'StandplaatsWerk': 'timetracking',
      'PayCheckedAudit': 'reports',
      
    };
    
    const requiredPermission = pagePermissionMap[page];
    if (!requiredPermission) return user.role === 'admin';
    if (requiredPermission === 'admin_only') return false;
    
    return user.permissions?.includes(requiredPermission) || false;
  };

  const filteredMenu = useMemo(() => {
    return menuItems.map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.page))
    })).filter(group => group.items.length > 0);
  }, [user?.role, user?.permissions]);



  const isMobilePage = currentPageName === "MobileEntry" || currentPageName === "MobileEntryMultiDay";
  const isSecureDownloadPage = currentPageName === "SecureDownload";
  const isStamkaartDocument = false;
  const isEmployeeContractPage = user && user.role !== 'admin' && currentPageName === "Contracts";
  const isEmployeeEditTimeEntry = user && user.role !== 'admin' && currentPageName === "EditTimeEntry";

  // While user is loading, show nothing to prevent flash/redirect issues
  if (loadingUser) {
    return null;
  }

  // If user is not logged in, allow SecureDownload without auth, redirect others to login
  if (userError || !user) {
    if (isSecureDownloadPage) {
      return <>{children}</>;
    }
    base44.auth.redirectToLogin();
    return null;
  }

  // --- Toegangscontrole non-admin ---
  let showGraceWarning = false;

  if (user?.role !== "admin") {
    if (loadingEmployee) {
      return null;
    }

    if (!currentEmployee) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-lg font-semibold">Geen toegang</h1>
            <p className="text-muted-foreground">
              Je account is niet gekoppeld aan een actieve medewerker.
            </p>
            <button
              onClick={() => base44.auth.logout()}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Uitloggen
            </button>
          </div>
        </div>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (currentEmployee.out_of_service_date) {
      const endDate = new Date(currentEmployee.out_of_service_date);
      endDate.setHours(0, 0, 0, 0);

      const graceEnd = new Date(endDate);
      graceEnd.setDate(graceEnd.getDate() + 7);

      if (today > graceEnd) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center space-y-4">
              <h1 className="text-lg font-semibold">Geen toegang</h1>
              <p className="text-muted-foreground">
                Je account is niet gekoppeld aan een actieve medewerker.
              </p>
              <button
                onClick={() => base44.auth.logout()}
                className="px-4 py-2 bg-primary text-white rounded"
              >
                Uitloggen
              </button>
            </div>
          </div>
        );
      }

      if (today >= endDate && today <= graceEnd) {
        showGraceWarning = true;
      }
    }
  }

  if (user?.role !== "admin" && currentPageName === "Dashboard") {
    return <MobileEntry currentUser={user} />;
  }

  if (isMobilePage) {
    return <>{React.cloneElement(children, { currentUser: user })}</>;
  }

  if (isStamkaartDocument) {
    return <>{children}</>;
  }

  if (isEmployeeContractPage || isEmployeeEditTimeEntry) {
    return <>{children}</>;
  }

  const toggleGroup = (label) => {
    setExpandedGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{printStyles}</style>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">Interdistri</span>
          </div>
          <div className="w-10" /> {/* Spacer voor symmetrie */}
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Interdistri</h1>
                <p className="text-xs text-slate-500">TMS Systeem</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {filteredMenu.map((group) => (
                  <div key={group.label} className="mb-2">
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                    >
                      {group.label}
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        expandedGroups.includes(group.label) ? "rotate-0" : "-rotate-90"
                      )} />
                    </button>
                    {expandedGroups.includes(group.label) && (
                      <div className="space-y-1 mt-1">
                        {group.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                            isActive 
                              ? "bg-blue-50 text-blue-700 font-medium" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <item.icon className={cn(
                            "w-5 h-5",
                            isActive ? "text-blue-600" : "text-slate-400"
                          )} />
                          <span className="text-sm">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            
            {/* Mobile App Link */}
                {currentEmployee && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Link
                      to={createPageUrl(currentEmployee.mobile_entry_type === 'multi_day' ? "MobileEntryMultiDay" : "MobileEntry")}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                    >
                      <Smartphone className="w-5 h-5 text-slate-400" />
                      <span className="text-sm">Mobiele Invoer ({currentEmployee.mobile_entry_type === 'multi_day' ? 'Multi Day' : 'Single Day'})</span>
                    </Link>
                  </div>
                )}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-sm font-semibold text-slate-600">
                  {user?.full_name?.charAt(0) || 'G'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name || 'Gebruiker'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <NotificationBell />
              <button 
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                    title="Afmelden"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">Interdistri TMS v{APP_VERSION}</p>
              </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "lg:ml-72 min-h-screen",
        "pt-16 lg:pt-0"
      )}>
        {showGraceWarning && (
          <div style={{
            background: "#fff3cd",
            color: "#856404",
            padding: "12px 16px",
            borderBottom: "1px solid #ffeeba",
            textAlign: "center",
            fontWeight: 500
          }}>
            Je dienstverband is beëindigd. Je kunt nog tot 7 dagen na je uit-dienstdatum inloggen om je zaken af te ronden.
          </div>
        )}
        <div className="p-4 lg:p-8">
          {React.cloneElement(children, { currentUser: user })}
        </div>
      </main>
    </div>
  );
}