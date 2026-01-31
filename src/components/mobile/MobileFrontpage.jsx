import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Truck,
  ClipboardCheck,
  FileText,
  CheckCircle,
  CalendarDays,
  ExternalLink,
  ArrowRight
} from "lucide-react";

export default function MobileFrontpage({ onNavigate }) {
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

  return (
    <div className="space-y-2">
      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-2.5">
          <h2 className="font-bold text-base text-slate-900 mb-0.5">
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
                  <div className="flex items-center gap-3 p-2.5">
                    <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-900">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600">
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