import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const fmt = (val) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(val || 0);
const fmtN = (val, d = 1) =>
  new Intl.NumberFormat("nl-NL", { maximumFractionDigits: d }).format(val || 0);

export default function CustomerRevenueTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Klant Details</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Geen data beschikbaar</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Klant Details</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Klant</TableHead>
              <TableHead className="text-right">Uren</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Ritten</TableHead>
              <TableHead className="text-right">Omzet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right">{fmtN(row.total_hours)}</TableCell>
                <TableCell className="text-right">{fmtN(row.total_km, 0)}</TableCell>
                <TableCell className="text-right">{fmtN(row.trip_count, 0)}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(row.calculated_revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}