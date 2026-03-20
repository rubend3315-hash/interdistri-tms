import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Settings } from "lucide-react";

export default function FuelSettingsTable({ settings, customerMap, onEdit, onDelete, onAdd }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            Klant brandstof-instellingen
          </CardTitle>
          <Button size="sm" onClick={onAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Nieuwe klant
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klant</TableHead>
                <TableHead className="text-right">Basisprijs (€/ltr)</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead className="text-right">Verbruiksfactor</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Nog geen klant-instellingen. Voeg een klant toe om te beginnen.
                  </TableCell>
                </TableRow>
              )}
              {settings.map(s => {
                const customer = customerMap[s.customer_id];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{customer?.company_name || 'Onbekend'}</TableCell>
                    <TableCell className="text-right tabular-nums">€ {s.base_fuel_price?.toFixed(4)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {s.calculation_method === 'km' ? 'Per KM' : 'Per uur'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.calculation_method === 'km'
                        ? `${s.fuel_consumption_per_km} L/km (1:${Math.round(1 / (s.fuel_consumption_per_km || 0.1))})`
                        : `${s.fuel_consumption_per_hour} L/uur`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                          <Pencil className="w-4 h-4" />
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