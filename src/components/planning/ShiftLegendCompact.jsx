import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sun, Moon, Sunset, Home, Palmtree, Thermometer, Star, BookOpen, AlertCircle
} from "lucide-react";

const shiftTypes = [
  { value: "Dag", label: "Dag", icon: Sun, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "Avond", label: "Avond", icon: Sunset, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "Nacht", label: "Nacht", icon: Moon, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "Stand-by", label: "Stand-by", icon: AlertCircle, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "Opleiding", label: "Opleiding", icon: BookOpen, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "Vrij", label: "Vrij", icon: Home, color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "Verlof", label: "Verlof", icon: Palmtree, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "Ziek", label: "Ziek", icon: Thermometer, color: "bg-red-100 text-red-700 border-red-200" },
  { value: "Feestdag", label: "Feestdag", icon: Star, color: "bg-purple-100 text-purple-700 border-purple-200" },
];

export default function ShiftLegendCompact() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {shiftTypes.map(shift => {
        const Icon = shift.icon;
        return (
          <Badge key={shift.value} className={`${shift.color} border gap-1 text-[10px] py-0.5 px-1.5`}>
            <Icon className="w-2.5 h-2.5" />
            {shift.label}
          </Badge>
        );
      })}
    </div>
  );
}