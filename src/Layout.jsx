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
  ChevronRight,
  Settings,
  CircleDot,
  Mail,
  Database,
  Lock,
  Wrench,
  ShieldCheck,
  ClipboardList,
  HardDrive,
  LifeBuoy
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
    label: "Core Operations",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
      { name: "Tijdregistratie", icon: Clock, page: "TimeTracking" },
      { name: "Goedkeuringen", icon: CheckSquare, page: "Approvals" },
      { name: "Ritten", icon: Truck, page: "Trips" },
      { name: "Standplaatswerk", icon: Package, page: "StandplaatsWerk" },
      { name: "Planning", icon: CalendarDays, page: "Planning" },
      { name: "Dienst-Shifttijd", icon: CircleDot, page: "ShiftTime" },
      { name: "Dagstaat", icon: ClipboardList, page: "Dagstaat" },
    ]
  },
  {
    label: "HR & Business",
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
      { name: "Loonrapporten", icon: FileSpreadsheet, page: "SalaryReports" },
      { name: "PayChecked Audit", icon: ShieldCheck, page: "PayCheckedAudit" },
      { name: "Charters", icon: Truck, page: "Charters" },
      { name: "Klanten", icon: Building2, page: "Customers" },
      { name: "Projecten", icon: FolderKanban, page: "Projects" },
      { name: "Activiteiten", icon: Package, page: "Activiteiten" },
      { name: "Berichten", icon: Mail, page: "Messages" },
    ]
  },
  {
    label: "Governance & Control",
    subgroups: [
      {
        label: "Security & Compliance",
        icon: Shield,
        highlight: true,
        items: [
          { name: "Governance Dashboard", icon: Shield, page: "GovernanceDashboard" },
          { name: "Security Samenvatting", icon: ShieldCheck, page: "SecuritySummary" },
          { name: "Security Architectuur", icon: Shield, page: "SecurityArchitecture" },
          { name: "Systeemdiagram", icon: Shield, page: "SystemArchitectureDiagram" },
          { name: "Security Roadmap", icon: Shield, page: "SecurityRoadmap" },
          { name: "Security & Privacy", icon: Lock, page: "SecurityPrivacy" },
          { name: "Trust & Security", icon: ShieldCheck, page: "Trust" },
          { name: "Encryptie Migratie", icon: Lock, page: "EncryptionMigration" },
          { name: "Audit Log", icon: ClipboardList, page: "AuditLog" },
        ]
      },
      {
        label: "Data & Continuïteit",
        icon: HardDrive,
        items: [
          { name: "Back-ups", icon: Database, page: "Backups" },
          { name: "Datamigratie", icon: Database, page: "DataMigration" },
        ]
      },
      {
        label: "Platform & Integraties",
        icon: Link2,
        items: [
          { name: "Integraties", icon: Link2, page: "Integrations" },
          { name: "Herberekeningen", icon: Wrench, page: "Recalculations" },
          { name: "HR Instellingen", icon: Settings, page: "HRMSettings" },
          { name: "Feestdagen", icon: CalendarDays, page: "Holidays" },
          { name: "Documentenbeheer", icon: FileText, page: "Documents" },
          { name: "Gebruikers", icon: Users, page: "Users" },
        ]
      },
      {
        label: "Operationeel Beheer",
        icon: Car,
        items: [
          { name: "Voertuigen", icon: Car, page: "Vehicles" },
          { name: "NIWO Vergunningen", icon: FileText, page: "NiwoPermits" },
        ]
      },
      {
        label: "Documentatie",
        icon: LifeBuoy,
        items: [
          { name: "Help & Documentatie", icon: BookOpen, page: "HelpPage" },
          { name: "Handleiding Mobiele App", icon: Smartphone, page: "MobileHandleiding" },
        ]
      },
    ]
  },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const result = [];
    for (const g of menuItems) {
      if (g.items && g.items.some(i => i.page === currentPageName)) {
        result.push(g.label);
      }
      if (g.subgroups) {
        for (const sg of g.subgroups) {
          if (sg.items.some(i => i.page === currentPageName)) {
            result.push(g.label);
            result.push(`${g.label}::${sg.label}`);
          }
        }
      }
    }
    return result.length > 0 ? result : [];
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
      'GovernanceDashboard': 'admin_only',
      'SecuritySummary': 'admin_only',
      'SecurityPrivacy': 'helppage',
      'Trust': 'helppage',
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
    return menuItems.map(group => {
      if (group.subgroups) {
        const filteredSubgroups = group.subgroups.map(sg => ({
          ...sg,
          items: sg.items.filter(item => hasPermission(item.page))
        })).filter(sg => sg.items.length > 0);
        return { ...group, subgroups: filteredSubgroups };
      }
      return {
        ...group,
        items: group.items.filter(item => hasPermission(item.page))
      };
    }).filter(group => group.subgroups ? group.subgroups.length > 0 : group.items?.length > 0);
  }, [user?.role, user?.permissions]);



  const isMobilePage = currentPageName === "MobileEntry" || currentPageName === "MobileEntryMultiDay";
  const isSecureDownloadPage = currentPageName === "SecureDownload";
  const isStamkaartDocument = false;
  const isEmployeeContractPage = user && user.role !== 'admin' && currentPageName === "Contracts";
  const isEmployeeEditTimeEntry = user && user.role !== 'admin' && currentPageName === "EditTimeEntry";

  // SecureDownload is fully public — render immediately, skip all auth
  if (isSecureDownloadPage) {
    return <>{children}</>;
  }

  // While user is loading, show nothing to prevent flash/redirect issues
  if (loadingUser) {
    return null;
  }

  // If user is not logged in, redirect to login
  if (userError || !user) {
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
              <nav className="flex-1 overflow-y-auto py-3 px-3">
                {filteredMenu.map((group, groupIdx) => (
                  <div key={group.label} className={cn(groupIdx > 0 && "mt-6")}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] hover:text-slate-600 transition-colors"
                    >
                      {group.label}
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        expandedGroups.includes(group.label) ? "rotate-0" : "-rotate-90"
                      )} />
                    </button>
                    {expandedGroups.includes(group.label) && (
                      <div className="space-y-0.5 mt-1">
                        {/* Regular items */}
                        {group.items && group.items.map((item) => {
                          const isActive = currentPageName === item.page;
                          return (
                            <Link
                              key={item.page}
                              to={createPageUrl(item.page)}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                                isActive 
                                  ? "bg-blue-50/80 text-blue-800 font-medium" 
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                              )}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
                              )}
                              <item.icon className={cn(
                                "w-[18px] h-[18px] flex-shrink-0",
                                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"
                              )} />
                              <span className="text-[13px]">{item.name}</span>
                            </Link>
                          );
                        })}
                        {/* Subgroups */}
                        {group.subgroups && group.subgroups.map((sg, sgIdx) => {
                          const sgKey = `${group.label}::${sg.label}`;
                          const sgExpanded = expandedGroups.includes(sgKey);
                          const SgIcon = sg.icon;
                          const isHighlighted = sg.highlight === true;
                          return (
                            <div key={sg.label} className={cn(
                              sgIdx === 0 ? "mt-1" : "mt-2",
                              isHighlighted && "bg-gradient-to-b from-slate-50 to-slate-50/40 rounded-xl px-1.5 py-1.5 -mx-1 border border-slate-200/60 mt-2 mb-1"
                            )}>
                              <button
                                onClick={() => toggleGroup(sgKey)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
                                  isHighlighted 
                                    ? "text-slate-700 hover:bg-white/60" 
                                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                )}
                              >
                                <SgIcon className={cn(
                                  "w-[15px] h-[15px] flex-shrink-0",
                                  isHighlighted ? "text-blue-600/80" : "text-slate-400"
                                )} />
                                <span className="flex-1 text-left">{sg.label}</span>
                                <ChevronRight className={cn(
                                  "w-3 h-3 text-slate-400 transition-transform duration-200",
                                  sgExpanded && "rotate-90"
                                )} />
                              </button>
                              {sgExpanded && (
                                <div className={cn(
                                  "space-y-0.5 mt-0.5 ml-3.5 pl-2.5",
                                  isHighlighted ? "border-l-2 border-blue-200/50" : "border-l-2 border-slate-100"
                                )}>
                                  {sg.items.map((item) => {
                                    const isActive = currentPageName === item.page;
                                    return (
                                      <Link
                                        key={item.page}
                                        to={createPageUrl(item.page)}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                          "relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 group",
                                          isActive 
                                            ? "bg-blue-50/80 text-blue-800 font-medium" 
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                        )}
                                      >
                                        {isActive && (
                                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-600 rounded-r-full" />
                                        )}
                                        <item.icon className={cn(
                                          "w-[15px] h-[15px] flex-shrink-0",
                                          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"
                                        )} />
                                        <span className="text-[12px]">{item.name}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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