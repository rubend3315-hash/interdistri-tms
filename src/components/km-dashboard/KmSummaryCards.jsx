import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Gauge, Fuel, Droplets } from "lucide-react";

export default function KmSummaryCards({ trips }) {
  const totalKm = trips.reduce((sum, t) => sum + (t.total_km || 0), 0);
  const totalFuel = trips.reduce((sum, t) => sum + (t.fuel_liters || 0), 0);
  const totalAdblue = trips.reduce((sum, t) => sum + (t.adblue_liters || 0), 0);
  const uniqueVehicles = new Set(trips.map(t => t.vehicle_id)).size;
  const avgKmPerTrip = trips.length > 0 ? Math.round(totalKm / trips.length) : 0;

  const cards = [
    { label: "Totaal km", value: totalKm.toLocaleString('nl-NL'), icon: Gauge, color: "text-blue-600 bg-blue-50" },
    { label: "Ritten", value: trips.length, icon: Truck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Gem. km/rit", value: avgKmPerTrip.toLocaleString('nl-NL'), icon: Gauge, color: "text-purple-600 bg-purple-50" },
    { label: "Brandstof (L)", value: totalFuel.toLocaleString('nl-NL', { maximumFractionDigits: 1 }), icon: Fuel, color: "text-amber-600 bg-amber-50" },
    { label: "AdBlue (L)", value: totalAdblue.toLocaleString('nl-NL', { maximumFractionDigits: 1 }), icon: Droplets, color: "text-cyan-600 bg-cyan-50" },
    { label: "Voertuigen", value: uniqueVehicles, icon: Truck, color: "text-slate-600 bg-slate-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-lg font-bold text-slate-900">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}