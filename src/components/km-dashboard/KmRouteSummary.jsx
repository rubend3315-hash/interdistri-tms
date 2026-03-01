import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function KmRouteSummary({ trips }) {
  // Group by route_name
  const byRoute = {};
  trips.forEach(t => {
    const key = t.route_name || "(geen route)";
    if (!byRoute[key]) {
      byRoute[key] = { trips: 0, totalKm: 0, fuel: 0, adblue: 0 };
    }
    const r = byRoute[key];
    r.trips++;
    r.totalKm += t.total_km || 0;
    r.fuel += t.fuel_liters || 0;
    r.adblue += t.adblue_liters || 0;
  });

  const rows = Object.entries(byRoute)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalKm - a.totalKm);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Samenvatting per route</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Ritten</TableHead>
                <TableHead className="text-right">Totaal km</TableHead>
                <TableHead className="text-right">Gem. km/rit</TableHead>
                <TableHead className="text-right">Brandstof (L)</TableHead>
                <TableHead className="text-right">AdBlue (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.name}>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{r.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.trips}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{r.totalKm.toLocaleString('nl-NL')}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.trips > 0 ? Math.round(r.totalKm / r.trips).toLocaleString('nl-NL') : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.fuel > 0 ? r.fuel.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.adblue > 0 ? r.adblue.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) : '-'}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50 font-semibold border-t-2">
                <TableCell>Totaal</TableCell>
                <TableCell className="text-right tabular-nums">{rows.reduce((s, r) => s + r.trips, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{rows.reduce((s, r) => s + r.totalKm, 0).toLocaleString('nl-NL')}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{rows.reduce((s, r) => s + r.fuel, 0).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}</TableCell>
                <TableCell className="text-right tabular-nums">{rows.reduce((s, r) => s + r.adblue, 0).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}