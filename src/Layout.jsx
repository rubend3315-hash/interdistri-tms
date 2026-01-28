import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Car,
  FileText,
  Building2,
  FolderKanban,
  BookOpen,
  DollarSign,
  FileSpreadsheet,
  Smartphone,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings,
  Bell,
  CircleDot
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { 
    label: "Kernsystemen", 
    items: [
      { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
      { name: "Tijdregistratie", icon: Clock, page: "TimeTracking" },
      { name: "Ritten", icon: Truck, page: "Trips" },
      { name: "Planning", icon: CalendarDays, page: "Planning" },
      { name: "Goedkeuringen", icon: CheckSquare, page: "Approvals" },
      { name: "Dienst-Shifttijd", icon: CircleDot, page: "ShiftTime" },
    ]
  },
  {
    label: "HR & Beheer",
    items: [
      { name: "Medewerkers", icon: Users, page: "Employees" },
      { name: "CAO-regels", icon: BookOpen, page: "CaoRules" },
      { name: "Loontabellen", icon: DollarSign, page: "SalaryTables" },
    ]
  },
  {
    label: "Beheer",
    items: [
      { name: "Gebruikers", icon: Settings, page: "Users" },
      { name: "Voertuigen", icon: Car, page: "Vehicles" },
      { name: "NIWO Vergunningen", icon: FileText, page: "NiwoPermits" },
      { name: "Klanten", icon: Building2, page: "Customers" },
      { name: "Projecten", icon: FolderKanban, page: "Projects" },
      { name: "Feestdagen", icon: CalendarDays, page: "Holidays" },
    ]
  },
  {
    label: "Loon & Rapportage",
    items: [
      { name: "Loonrapporten", icon: FileSpreadsheet, page: "SalaryReports" },
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(["Kernsystemen", "HR & Beheer", "Loon & Rapportage"]);
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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
      'CaoRules': 'cao',
      'SalaryTables': 'salary',
      'Holidays': 'holidays',
      'SalaryReports': 'reports',
      'MobileEntry': 'mobile'
    };
    
    const requiredPermission = pagePermissionMap[page];
    if (!requiredPermission) return true;
    
    return user.permissions?.includes(requiredPermission) || false;
  };

  const isMobilePage = currentPageName === "MobileEntry";

  if (isMobilePage) {
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
        <div className="w-10" />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
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
            {menuItems.map((group) => (
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
                    {group.items.filter(item => hasPermission(item.page)).map((item) => {
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
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                title="Afmelden"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "lg:ml-72 min-h-screen",
        "pt-16 lg:pt-0"
      )}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}