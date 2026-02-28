import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const formatNumber = (val) =>
  new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(val);

export default function KmOverviewChart({ data, viewMode }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Kilometers Overzicht</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Geen data beschikbaar</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Kilometers ({viewMode === "weekly" ? "Wekelijks" : "Maandelijks"})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${formatNumber(v)} km`} />
            <Bar dataKey="total_km" name="Kilometers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}