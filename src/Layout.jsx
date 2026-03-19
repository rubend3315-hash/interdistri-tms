import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock,
  Truck,
  RefreshCw,
  CalendarDays,
  CheckSquare,
  Users,
  Shield,
  Link2,
  Car,
  Server,
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
  LifeBuoy,
  Gauge
} from "lucide-react";
import NotificationBell from "./components/NotificationBell";
import { APP_VERSION } from "./components/utils/appVersion";
import AccessDenied from "./components/security/AccessDenied";
import { cn } from "@/lib/utils";
import { isNavGroupVisible } from "./components/utils/businessRoles";
import { hasPermission, hasAnyPermission, getEffectiveRole, isEmployeeUser } from "./components/core/rbac/requirePermission";
import { PERMISSIONS } from "./components/core/rbac/permissionRegistry";
import { ROLES } from "./components/core/rbac/roleDefinitions";

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

const enterpriseStyles = `
  /* Enterprise Design Tokens applied */
  .ent-sidebar { background: var(--ent-surface); border-right: 1px solid var(--ent-border); }
  .ent-sidebar-logo { border-bottom: 1px solid var(--ent-border); }
  .ent-sidebar-footer { border-top: 1px solid var(--ent-border); }
  .ent-nav-group-label { 
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; 
    color: var(--ent-text-muted); padding: 4px 12px; 
  }
  .ent-nav-item {
    position: relative; display: flex; align-items: center; gap: 12px;
    padding: 8px 12px; border-radius: var(--ent-radius-md);
    font-size: 13px; color: var(--ent-text-secondary);
    transition: all 120ms ease;
  }
  .ent-nav-item:hover { background: var(--ent-accent-light); color: var(--ent-text-primary); }
  .ent-nav-item--active {
    background: var(--ent-primary-muted); color: var(--ent-primary); font-weight: 500;
  }
  .ent-nav-item--active::before {
    content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 20px; background: var(--ent-primary); border-radius: 0 3px 3px 0;
  }
  .ent-nav-item--active .ent-nav-icon { color: var(--ent-primary); }
  .ent-nav-icon { width: 18px; height: 18px; flex-shrink: 0; color: var(--ent-text-muted); }
  .ent-nav-item:hover .ent-nav-icon { color: var(--ent-text-secondary); }
  
  /* Subgroup items - slightly smaller */
  .ent-nav-subitem {
    position: relative; display: flex; align-items: center; gap: 10px;
    padding: 6px 10px; border-radius: var(--ent-radius-sm);
    font-size: 12px; color: var(--ent-text-secondary);
    transition: all 120ms ease;
  }
  .ent-nav-subitem:hover { background: var(--ent-accent-light); color: var(--ent-text-primary); }
  .ent-nav-subitem--active {
    background: var(--ent-primary-muted); color: var(--ent-primary); font-weight: 500;
  }
  .ent-nav-subitem--active::before {
    content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 16px; background: var(--ent-primary); border-radius: 0 3px 3px 0;
  }
  .ent-nav-subitem--active .ent-nav-subicon { color: var(--ent-primary); }
  .ent-nav-subicon { width: 15px; height: 15px; flex-shrink: 0; color: var(--ent-text-muted); }
  .ent-nav-subitem:hover .ent-nav-subicon { color: var(--ent-text-secondary); }

  /* Governance highlight section */
  .ent-gov-section {
    background: linear-gradient(to bottom, var(--ent-gov-highlight), transparent);
    border: 1px solid var(--ent-gov-border);
    border-radius: var(--ent-radius-lg);
    padding: 8px; margin: 0 -4px;
  }
  .ent-gov-section .ent-sg-label { color: var(--ent-text-primary); }
  .ent-gov-section .ent-sg-icon { color: var(--ent-primary); }
  .ent-gov-section .ent-sg-border { border-color: color-mix(in srgb, var(--ent-primary) 20%, transparent); }

  /* Subgroup label */
  .ent-sg-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--ent-text-muted);
  }
  .ent-sg-icon { width: 15px; height: 15px; flex-shrink: 0; color: var(--ent-text-muted); }
  .ent-sg-border { border-left: 2px solid var(--ent-border); }
`;

const menuItems = [
  {
    label: "Core Operations",
    subtitle: "Dagelijkse uitvoering & planning",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
      { name: "Tijdregistratie", icon: Clock, page: "TimeTracking" },
      { name: "Goedkeuringen", icon: CheckSquare, page: "Approvals" },
      { name: "GPS Buddy Import", icon: RefreshCw, page: "TripSync" },
      { name: "Ritten", icon: Truck, page: "Trips" },
      { name: "Standplaatswerk", icon: Package, page: "StandplaatsWerk" },
      { name: "Planning", icon: CalendarDays, page: "Planning" },
      { name: "Dienst-Shifttijd", icon: CircleDot, page: "ShiftTime" },
      { name: "Dagstaat", icon: ClipboardList, page: "Dagstaat" },
      { name: "Stoprapport", icon: Timer, page: "VehicleStopReport" },
    ]
  },
  {
    label: "HR",
    subtitle: "Personeelsbeheer & lifecycle management",
    items: [
      { name: "Medewerkers", icon: Users, page: "Employees" },
      { name: "Onboarding", icon: Users, page: "Onboarding" },
      { name: "Stamkaart", icon: FileText, page: "Stamkaart" },
      { name: "Contracten", icon: FileText, page: "Contracts" },
      { name: "Contractwijzigingen", icon: FileText, page: "ContractWijzigingen" },
      { name: "Contract Analytics", icon: FileSpreadsheet, page: "ContractAnalytics" },
      { name: "Afgeronde Contracten", icon: CheckSquare, page: "CompletedContracts" },
      { name: "Bedrijfsreglement", icon: BookOpen, page: "Bedrijfsreglement" },
      { name: "Resultaat & Ontwikkeling", icon: FileText, page: "PerformanceReviews" },
      { name: "Documentenbeheer", icon: FileText, page: "Documents" },
    ]
  },
  {
    label: "Loon & Rapportage",
    subtitle: "Salarisadministratie & compliance",
    items: [
      { name: "Loonrapporten", icon: FileSpreadsheet, page: "SalaryReports" },
      { name: "CAO-regels", icon: BookOpen, page: "CaoRules" },
      { name: "Loontabellen", icon: DollarSign, page: "SalaryTables" },
      { name: "PayChecked Audit", icon: ShieldCheck, page: "PayCheckedAudit" },
      { name: "Dagrapport", icon: FileText, page: "PayrollReport" },
    ]
  },
  {
    label: "Business",
    subtitle: "Klant-, project- en commerciële sturing",
    items: [
      { name: "Klanten", icon: Building2, page: "Customers" },
      { name: "Projecten", icon: FolderKanban, page: "Projects" },
      { name: "Activiteiten", icon: Package, page: "Activiteiten" },
      { name: "Charters", icon: Truck, page: "Charters" },
      { name: "KPI rapportage PostNL", icon: FileSpreadsheet, page: "EmployeeReport" },
      { name: "Maandcontrole", icon: FileSpreadsheet, page: "Maandcontrole" },
      { name: "Business Dashboard", icon: LayoutDashboard, page: "BusinessDashboard" },
      { name: "KM Dashboard", icon: Gauge, page: "KmDashboard" },
    ]
  },
  {
    label: "Communicatie",
    subtitle: "Interne & externe berichtgeving",
    items: [
      { name: "Berichten", icon: Mail, page: "Messages" },
    ]
  },
  {
    label: "Operationeel Beheer",
    subtitle: "Configuratie & systeeminstellingen",
    items: [
      { name: "HR Instellingen", icon: Settings, page: "HRMSettings" },
      { name: "HR Import", icon: FileSpreadsheet, page: "HRImport" },
      { name: "Contract Sjablonen", icon: FileText, page: "ContractTemplates" },
      { name: "Feestdagen", icon: CalendarDays, page: "Holidays" },
      { name: "Integraties", icon: Link2, page: "Integrations" },
      { name: "Herberekeningen", icon: Wrench, page: "Recalculations" },
      { name: "Datamigratie", icon: Database, page: "DataMigration" },
      { name: "Voertuigen", icon: Car, page: "Vehicles" },
      { name: "NIWO Vergunningen", icon: FileText, page: "NiwoPermits" },
      { name: "Gebruikers", icon: Users, page: "Users" },
    ]
  },
  {
    label: "Governance & Control",
    subtitle: "Security, compliance & risicobeheersing",
    items: [
      { name: "Governance Dashboard", icon: Shield, page: "GovernanceDashboard" },
      { name: "Security Samenvatting", icon: ShieldCheck, page: "SecuritySummary" },
      { name: "Security Architectuur", icon: Shield, page: "SecurityArchitecture" },
      { name: "Toegangscontrole (RBAC)", icon: ShieldCheck, page: "SecurityAccessControl" },
      { name: "Systeemdiagram", icon: Shield, page: "SystemArchitectureDiagram" },
      { name: "Security Roadmap", icon: Shield, page: "SecurityRoadmap" },
      { name: "Security & Privacy", icon: Lock, page: "SecurityPrivacy" },
      { name: "Trust & Security", icon: ShieldCheck, page: "Trust" },
      { name: "Encryptie Migratie", icon: Lock, page: "EncryptionMigration" },
      { name: "Rollen & Rechten", icon: ShieldCheck, page: "RBACMatrix" },
      { name: "Audit Log", icon: ClipboardList, page: "AuditLog" },
      { name: "RBAC Audit", icon: ShieldCheck, page: "RBACAudit" },
    ]
  },
  {
    label: "Data & Continuïteit",
    subtitle: "Back-ups & databeheer",
    items: [
      { name: "Back-ups", icon: Database, page: "Backups" },
    ]
  },
  {
    label: "Documentatie",
    subtitle: "Help & handleidingen",
    items: [
      { name: "Help & Documentatie", icon: BookOpen, page: "HelpPage" },
      { name: "Handleiding Mobiele App", icon: Smartphone, page: "MobileHandleiding" },
      { name: "Payroll Export Docs", icon: FileSpreadsheet, page: "DailyPayrollExportDocs" },
      { name: "MobileEntry Bestanden", icon: Smartphone, page: "MobileEntryFiles" },
      { name: "iOS/Safari Issues", icon: Smartphone, page: "iOSMobileEntryDocs" },
    ]
  },
  {
    label: "Systeem",
    subtitle: "Deployment & monitoring",
    items: [
      { name: "Deployment Status", icon: Server, page: "DeploymentStatus" },
      { name: "Draft Cleanup", icon: Wrench, page: "DraftCleanup" },
      { name: "Versiehistorie", icon: Clock, page: "RecentChanges" },
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(attempt * 500, 1500),
  });

  const { data: currentEmployee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: async ({ queryKey }) => {
      const [, email] = queryKey;
      const emps = await base44.entities.Employee.filter({ email });
      return emps[0] ?? null;
    },
    enabled: !!user && (isEmployeeUser(user) || user?.business_role === 'EMPLOYEE'),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });


  const effectiveRole = getEffectiveRole(user);
  const isSuperAdmin = effectiveRole === ROLES.SUPER_ADMIN;



  /**
   * Permission-based page access check.
   * Maps pages to required RBAC permissions.
   * SUPER_ADMIN (wildcard) passes all checks automatically via hasPermission.
   */
  const hasPagePermission = (page) => {
    if (!user) return false;

    const PAGE_PERMISSION_MAP = {
      // Core Operations
      'Dashboard': PERMISSIONS.DASHBOARD_VIEW,
      'TimeTracking': PERMISSIONS.TIMETRACKING_MANAGE,
      'Approvals': PERMISSIONS.APPROVALS_MANAGE,
      'TripSync': PERMISSIONS.TRIPS_MANAGE,
      'Trips': PERMISSIONS.TRIPS_MANAGE,
      'StandplaatsWerk': PERMISSIONS.TRIPS_MANAGE,
      'Planning': PERMISSIONS.PLANNING_MANAGE,
      'ShiftTime': PERMISSIONS.PLANNING_MANAGE,
      'Dagstaat': PERMISSIONS.TRIPS_MANAGE,

      // HR
      'Employees': PERMISSIONS.EMPLOYEES_MANAGE,
      'Onboarding': PERMISSIONS.ONBOARDING_MANAGE,
      'Stamkaart': PERMISSIONS.EMPLOYEES_MANAGE,
      'Contracts': PERMISSIONS.CONTRACTS_MANAGE,
      'ContractWijzigingen': PERMISSIONS.CONTRACTS_MANAGE,
      'ContractAnalytics': PERMISSIONS.CONTRACTS_MANAGE,
      'CompletedContracts': PERMISSIONS.CONTRACTS_MANAGE,
      'Bedrijfsreglement': PERMISSIONS.EMPLOYEES_MANAGE,
      'PerformanceReviews': PERMISSIONS.EMPLOYEES_MANAGE,
      'Documents': PERMISSIONS.DOCUMENTS_MANAGE,

      // Loon & Rapportage
      'SalaryReports': PERMISSIONS.CONTRACTS_MANAGE,
      'CaoRules': PERMISSIONS.CONTRACTS_MANAGE,
      'SalaryTables': PERMISSIONS.CONTRACTS_MANAGE,
      'PayCheckedAudit': PERMISSIONS.CONTRACTS_MANAGE,
      'PayrollReport': PERMISSIONS.CONTRACTS_MANAGE,

      // Business
      'Customers': PERMISSIONS.CUSTOMERS_MANAGE,
      'CustomerDetail': PERMISSIONS.CUSTOMERS_MANAGE,
      'Projects': PERMISSIONS.PROJECTS_MANAGE,
      'Activiteiten': PERMISSIONS.ACTIVITIES_MANAGE,
      'Charters': PERMISSIONS.CHARTERS_MANAGE,
      'EmployeeReport': PERMISSIONS.KPI_VIEW,
      'Maandcontrole': PERMISSIONS.CUSTOMERS_MANAGE,
      'BusinessDashboard': PERMISSIONS.CUSTOMERS_MANAGE,

      // Communicatie
      'Messages': PERMISSIONS.MAIL_SEND,

      // Operationeel Beheer
      'HRMSettings': PERMISSIONS.GOVERNANCE_MANAGE,
      'HRImport': PERMISSIONS.EMPLOYEES_MANAGE,
      'ContractTemplates': PERMISSIONS.CONTRACTS_MANAGE,
      'Holidays': PERMISSIONS.GOVERNANCE_MANAGE,
      'Integrations': PERMISSIONS.GOVERNANCE_MANAGE,
      'Recalculations': PERMISSIONS.GOVERNANCE_MANAGE,
      'DataMigration': PERMISSIONS.GOVERNANCE_MANAGE,
      'Vehicles': PERMISSIONS.PLANNING_MANAGE,
      'KmDashboard': PERMISSIONS.PLANNING_MANAGE,
      'NiwoPermits': PERMISSIONS.PLANNING_MANAGE,
      'Users': PERMISSIONS.USERS_MANAGE,

      // Governance & Control
      'GovernanceDashboard': PERMISSIONS.GOVERNANCE_MANAGE,
      'SecuritySummary': PERMISSIONS.GOVERNANCE_MANAGE,
      'SecurityArchitecture': PERMISSIONS.GOVERNANCE_MANAGE,
      'SecurityAccessControl': PERMISSIONS.GOVERNANCE_MANAGE,
      'SystemArchitectureDiagram': PERMISSIONS.GOVERNANCE_MANAGE,
      'SecurityRoadmap': PERMISSIONS.GOVERNANCE_MANAGE,
      'EncryptionMigration': PERMISSIONS.ENCRYPTION_MANAGE,
      'RBACMatrix': PERMISSIONS.GOVERNANCE_MANAGE,
      'AuditLog': PERMISSIONS.AUDIT_READ,
      'RBACAudit': PERMISSIONS.GOVERNANCE_MANAGE,
      'Backups': PERMISSIONS.GOVERNANCE_MANAGE,
      'DeploymentStatus': PERMISSIONS.GOVERNANCE_MANAGE,
      'DraftCleanup': PERMISSIONS.GOVERNANCE_MANAGE,
      'RecentChanges': PERMISSIONS.GOVERNANCE_MANAGE,

      // Publiek / open
      'SecurityPrivacy': '__public__',
      'Trust': '__public__',
      'HelpPage': '__public__',
      'MobileHandleiding': '__public__',
      'DailyPayrollExportDocs': '__public__',
      'MobileEntryFiles': PERMISSIONS.GOVERNANCE_MANAGE,
      'iOSMobileEntryDocs': PERMISSIONS.GOVERNANCE_MANAGE,
      'SecureDownload': '__public__',

      // Mobiel
      'MobileEntry': PERMISSIONS.MOBILE_OWN,
    };

    const requiredPermission = PAGE_PERMISSION_MAP[page];
    if (!requiredPermission) return isSuperAdmin; // unknown pages: admin only
    if (requiredPermission === '__public__') return true;
    return hasPermission(user, requiredPermission);
  };

  const filteredMenu = useMemo(() => {
    return menuItems
      .filter(group => isNavGroupVisible(user, group.label))
      .map(group => {
        if (group.subgroups) {
          const filteredSubgroups = group.subgroups.map(sg => ({
            ...sg,
            items: sg.items.filter(item => hasPagePermission(item.page))
          })).filter(sg => sg.items.length > 0);
          return { ...group, subgroups: filteredSubgroups };
        }
        return {
          ...group,
          items: group.items.filter(item => hasPagePermission(item.page))
        };
      }).filter(group => group.subgroups ? group.subgroups.length > 0 : group.items?.length > 0);
  }, [user, effectiveRole]);



  const isMobilePage = currentPageName === "MobileEntry";
  const isSecureDownloadPage = currentPageName === "SecureDownload";
  const isStamkaartSignaturePage = currentPageName === "StamkaartSignature";
  const isPublicSecurityPage = currentPageName === "SecurityPrivacy";
  const isStamkaartDocument = false;
  const isEmployeeContractPage = user && user?.business_role === 'EMPLOYEE' && currentPageName === "Contracts";
  const isEmployeeEditTimeEntry = user && user?.business_role === 'EMPLOYEE' && currentPageName === "EditTimeEntry";

  // Public pages — render immediately, skip all auth
  if (isSecureDownloadPage || isStamkaartSignaturePage || isPublicSecurityPage) {
    return <>{children}</>;
  }

  // While user is loading, show nothing to prevent flash/redirect issues
  if (loadingUser) {
    return null;
  }

  // If user is not logged in after retries, show brief message then redirect
  if (userError || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600">Sessie verlopen, opnieuw verbinden...</p>
          {(() => { setTimeout(() => base44.auth.redirectToLogin(), 1500); return null; })()}
        </div>
      </div>
    );
  }

  // --- Toegangscontrole: alleen EMPLOYEE rol vereist employee-link ---
  // Alleen gebruikers met een EXPLICIETE business_role=EMPLOYEE of die gekoppeld
  // zijn aan een Employee-record worden als medewerker behandeld.
  // Gebruikers zonder business_role die geen Employee-koppeling hebben,
  // worden NIET geblokkeerd (ze krijgen gewoon de permission check).
  const hasExplicitEmployeeRole = user?.business_role === 'EMPLOYEE';
  let showGraceWarning = false;

  if (hasExplicitEmployeeRole) {
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

  // --- EMPLOYEE: altijd naar MobileEntry, nergens anders ---
  if (hasExplicitEmployeeRole && currentPageName !== "MobileEntry" && currentPageName !== "SecureDownload" && currentPageName !== "StamkaartSignature" && currentPageName !== "SecurityPrivacy" && currentPageName !== "Contracts") {
    return <Navigate to={createPageUrl("MobileEntry")} replace />;
  }

  // PLANNER landing page: redirect Dashboard → Planning
  if (effectiveRole === ROLES.PLANNER && currentPageName === "Dashboard") {
    return <>{window.location.replace(createPageUrl("Planning"))}</>;
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

  // Permission guard — non-public, non-mobile pages require explicit permission
  // Gebruikers zonder expliciete business_role die GEEN admin zijn,
  // worden niet geblokkeerd als ze geen business_role hebben
  // (ze zijn waarschijnlijk nieuwe gebruikers die nog geen rol toegewezen hebben gekregen)
  if (!hasPagePermission(currentPageName)) {
    // Als de gebruiker geen admin is én geen expliciete business_role heeft,
    // toon dan een vriendelijker bericht i.p.v. AccessDenied
    if (!user.business_role && user.role !== 'admin') {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <h1 className="text-lg font-semibold">Welkom</h1>
            <p className="text-muted-foreground">
              Je account is nog niet volledig geconfigureerd. Neem contact op met je beheerder om je rol in te stellen.
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
    return <AccessDenied />;
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
      <style>{enterpriseStyles}</style>
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
                  <div key={group.label} style={{ marginTop: groupIdx > 0 ? 'var(--ent-space-6)' : 0 }}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="ent-nav-group-label w-full flex items-center justify-between hover:text-slate-600 transition-colors"
                    >
                      <div className="text-left">
                        <span>{group.label}</span>
                        {group.subtitle && expandedGroups.includes(group.label) && (
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-slate-400 mt-0.5 leading-tight">{group.subtitle}</span>
                        )}
                      </div>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0",
                        expandedGroups.includes(group.label) ? "rotate-0" : "-rotate-90"
                      )} />
                    </button>
                    {expandedGroups.includes(group.label) && (
                      <div className="mt-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ent-space-1)' }}>
                        {/* Regular items */}
                        {group.items && group.items.map((item) => {
                          const isActive = currentPageName === item.page;
                          return (
                            <Link
                              key={item.page}
                              to={createPageUrl(item.page)}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "ent-nav-item",
                                isActive && "ent-nav-item--active"
                              )}
                            >
                              <item.icon className="ent-nav-icon" />
                              <span>{item.name}</span>
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
                              isHighlighted ? "ent-gov-section" : "",
                              sgIdx > 0 && !isHighlighted && "mt-1"
                            )} style={sgIdx === 0 ? { marginTop: 'var(--ent-space-2)' } : undefined}>
                              <button
                                onClick={() => toggleGroup(sgKey)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors hover:bg-slate-50/60"
                              >
                                <SgIcon className={cn("ent-sg-icon", isHighlighted && "ent-sg-icon")} />
                                <span className={cn("ent-sg-label flex-1 text-left", isHighlighted && "ent-sg-label")}>{sg.label}</span>
                                <ChevronRight className={cn(
                                  "w-3 h-3 text-slate-400 transition-transform duration-200",
                                  sgExpanded && "rotate-90"
                                )} />
                              </button>
                              {sgExpanded && (
                                <div className={cn(
                                  "ml-3.5 pl-2.5 mt-0.5 ent-sg-border",
                                  isHighlighted && "ent-sg-border"
                                )} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ent-space-1)' }}>
                                  {sg.items.map((item) => {
                                    const isActive = currentPageName === item.page;
                                    return (
                                      <Link
                                        key={item.page}
                                        to={createPageUrl(item.page)}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                          "ent-nav-subitem",
                                          isActive && "ent-nav-subitem--active"
                                        )}
                                      >
                                        <item.icon className="ent-nav-subicon" />
                                        <span>{item.name}</span>
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
                      to={createPageUrl("MobileEntry")}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                    >
                      <Smartphone className="w-5 h-5 text-slate-400" />
                      <span className="text-sm">Mobiele Invoer</span>
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
                              <Link
                                to={createPageUrl("SecurityPrivacy")}
                                className="block text-xs text-slate-400 hover:text-blue-600 text-center mt-1 transition-colors"
                              >
                                Security & Privacyverklaring
                              </Link>
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