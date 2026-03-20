import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, FileText } from "lucide-react";
import { format, parseISO, getISOWeek } from "date-fns";

const fmt = (n) => n?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-';

const statusColors = {
  'Concept': 'bg-yellow-100 text-yellow-800',
  'Definitief': 'bg-green-100 text-green-800',
  'Gefactureerd': 'bg-blue-100 text-blue-800',
};

export default function FuelSurchargeHistory({ surcharges, customerMap, onView, onDelete }) {
  if (!surcharges?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          Opgeslagen berekeningen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klant</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Ritten</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead className="text-right">Toeslag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surcharges.map(s => {
                const customer = customerMap[s.customer_id];
                const weekNr = getISOWeek(parseISO(s.date_from));
                const periodLabel = s.date_from === s.date_to
                  ? format(parseISO(s.date_from), 'dd-MM-yyyy')
                  : `Wk ${weekNr} · ${format(parseISO(s.date_from), 'dd-MM')} - ${format(parseISO(s.date_to), 'dd-MM-yyyy')}`;

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{customer?.company_name || '?'}</TableCell>
                    <TableCell className="tabular-nums text-sm">{periodLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.trip_count || 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.total_km?.toLocaleString('nl-NL') || 0}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">€ {fmt(s.surcharge_amount)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[s.status] || 'bg-slate-100 text-slate-600'}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onView(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}