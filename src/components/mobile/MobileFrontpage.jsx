import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Clock,
  Truck,
  ClipboardCheck,
  FileText,
  CheckCircle,
  CalendarDays,
  ExternalLink,
  ArrowRight,
  CircleDot,
  Package
} from "lucide-react";

export default function MobileFrontpage({ onNavigate }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const currentEmployee = employees.find(e => e.email === user?.email);

  const shiftDepartment = currentEmployee?.mobile_shift_department || currentEmployee?.department;

  const { data: shiftTimes = [] } = useQuery({
    queryKey: ['shiftTimes', currentEmployee?.id, shiftDepartment],
    queryFn: async () => {
      if (!shiftDepartment) return [];
      
      const allShifts = await base44.entities.ShiftTime.list();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const filteredShifts = allShifts.filter(shift => 
        shift.department === shiftDepartment && shift.date >= today
      );
      
      const sortedShifts = filteredShifts.sort((a, b) => a.date.localeCompare(b.date));
      return sortedShifts.slice(0, 1);
    },
    enabled: !!shiftDepartment
  });

  const todayShift = shiftTimes.length > 0 ? shiftTimes[0] : null;

  const menuItems = [
    {
      id: "dienst",
      title: "Diensttijd",
      description: "Registreer je werktijden",
      icon: Clock,
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "ritten",
      title: "Ritten",
      description: "Voer je ritten in",
      icon: Truck,
      color: "from-emerald-500 to-emerald-600"
    },
    {
      id: "standplaats",
      title: "Standplaatswerk",
      description: "Loodswerk registreren",
      icon: Package,
      color: "from-amber-600 to-amber-700"
    },
    {
      id: "inspectie",
      title: "Voertuiginspectie",
      description: "Controleer je voertuig",
      icon: ClipboardCheck,
      color: "from-amber-500 to-amber-600"
    },
    {
      id: "declaratie",
      title: "Declaraties",
      description: "Dien kosten in",
      icon: FileText,
      color: "from-purple-500 to-purple-600"
    },
    {
      id: "overzicht",
      title: "Overzicht",
      description: "Bekijk goedgekeurde diensten",
      icon: CheckCircle,
      color: "from-teal-500 to-teal-600"
    },
    {
      id: "planning",
      title: "Mijn Planning",
      description: "Bekijk je weekrooster",
      icon: CalendarDays,
      color: "from-indigo-500 to-indigo-600"
    },
    {
      id: "links",
      title: "Snelle Links",
      description: "Handige externe links",
      icon: ExternalLink,
      color: "from-slate-500 to-slate-600"
    }
  ];

  // Toon shifttijd-kaart alleen voor gebruikers met een alternatieve mobile_shift_department
  const showShiftCard = currentEmployee?.mobile_shift_department && todayShift;

  return (
    <div className="space-y-1.5">
      {showShiftCard && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 mb-0.5">
              <CircleDot className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-sm text-amber-900">
                Shifttijd {shiftDepartment}
              </h2>
            </div>
            <div className="text-xs text-amber-800 space-y-0.5 ml-6">
              <p><span className="font-medium">Datum:</span> {format(new Date(todayShift.date), 'EEEE d MMMM', { locale: nl })}</p>
              <p><span className="font-medium">Start dienst:</span> {todayShift.service_start_time || '-'}</p>
              <p><span className="font-medium">Shift:</span> {todayShift.start_time || '-'} - {todayShift.end_time || '-'}</p>
              {todayShift.message && (
                <p className="mt-1 text-amber-700 italic">{todayShift.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-2">
          <h2 className="font-bold text-sm text-slate-900 mb-0.5">
            Wat wil je doen?
          </h2>
          <p className="text-xs text-slate-600">
            Kies een optie om direct aan de slag te gaan
          </p>
        </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="text-left"
            >
              <Card className="hover:shadow-lg transition-all duration-200 border hover:border-blue-300">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2.5 p-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-900">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}