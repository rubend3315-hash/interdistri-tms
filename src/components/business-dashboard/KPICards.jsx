import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, Truck, MapPin } from "lucide-react";

const formatCurrency = (val) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(val || 0);

const formatNumber = (val, decimals = 1) =>
  new Intl.NumberFormat("nl-NL", { maximumFractionDigits: decimals }).format(val || 0);

export default function KPICards({ data }) {
  const cards = [
    {
      label: "Totale Omzet",
      value: formatCurrency(data.totalRevenue),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Totale Uren",
      value: formatNumber(data.totalHours),
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Totale Kilometers",
      value: formatNumber(data.totalKm, 0),
      icon: MapPin,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Aantal Ritten",
      value: formatNumber(data.totalTrips, 0),
      icon: Truck,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value}</p>
              </div>
              <div className={`${c.bg} ${c.color} p-3 rounded-xl`}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}