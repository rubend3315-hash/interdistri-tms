import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Clock, Truck, ClipboardCheck, FileText,
  CheckCircle, CalendarDays, Mail, ExternalLink, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { id: "dienst", title: "Diensttijd", desc: "Registreer je werktijden", icon: Clock, color: "text-blue-600 bg-blue-50" },
  { id: "ritten", title: "Dienstregels", desc: "Ritten & standplaatswerk", icon: Truck, color: "text-emerald-600 bg-emerald-50" },
  { id: "inspectie", title: "Voertuiginspectie", desc: "Controleer je voertuig", icon: ClipboardCheck, color: "text-amber-600 bg-amber-50" },
  { id: "declaratie", title: "Declaraties", desc: "Dien kosten in", icon: FileText, color: "text-purple-600 bg-purple-50" },
  { id: "overzicht", title: "Overzicht", desc: "Goedgekeurde diensten", icon: CheckCircle, color: "text-teal-600 bg-teal-50" },
  { id: "planning", title: "Mijn Planning", desc: "Bekijk je weekrooster", icon: CalendarDays, color: "text-indigo-600 bg-indigo-50" },
  { id: "berichten", title: "Berichten", desc: "Lees en stuur berichten", icon: Mail, color: "text-orange-600 bg-orange-50" },
  { id: "links", title: "Snelle Links", desc: "Handige links", icon: ExternalLink, color: "text-slate-600 bg-slate-100" },
];

export default function MobileFrontpage({ onNavigate }) {
  // Cache-warming
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: () => base44.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
  });

  return (
    <div className="-mx-3">
      {/* Section header */}
      <div className="px-4 py-2">
        <h2 className="text-[15px] font-semibold text-slate-900">Wat wil je doen?</h2>
      </div>

      {/* Edge-to-edge list */}
      <div className="divide-y divide-slate-100">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white active:bg-slate-50 text-left"
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", item.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-900">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}