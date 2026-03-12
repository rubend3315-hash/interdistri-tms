import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, MapPin, Clock, Package, ArrowRight, RotateCcw, Info } from "lucide-react";

function formatHoursToHHMM(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function TIRekenmodule() {
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [aantalStops, setAantalStops] = useState("");
  const [rijtijdMinuten, setRijtijdMinuten] = useState(20);
  const [opstarttijdMinuten, setOpstarttijdMinuten] = useState(10);

  const { data: tiRoutes = [], isLoading } = useQuery({
    queryKey: ['tiModelRoutes'],
    queryFn: () => base44.entities.TIModelRoute.filter({ is_active: true }),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const selectedRoute = useMemo(() => {
    return tiRoutes.find(r => r.id === selectedRouteId);
  }, [tiRoutes, selectedRouteId]);

  // Bereken de norm per stop (in uren) op basis van de modelroute
  const berekening = useMemo(() => {
    if (!selectedRoute || !aantalStops || Number(aantalStops) <= 0) return null;

    const modelStops = selectedRoute.number_of_stops;
    const modelTijdUren = selectedRoute.total_time_hours;
    const stops = Number(aantalStops);

    // Norm per stop in uren = model rittijd / model stops
    const normPerStop = modelTijdUren / modelStops;

    // Besteltijd = aantal stops × norm per stop
    const besteltijdUren = stops * normPerStop;

    // Rijtijd en opstarttijd in uren
    const rijtijdUren = rijtijdMinuten / 60;
    const opstarttijdUren = opstarttijdMinuten / 60;

    // Totale rittijd
    const totaalUren = besteltijdUren + rijtijdUren + opstarttijdUren;

    // Norm per uur (stops per uur besteltijd)
    const normPerUur = selectedRoute.manual_norm_per_hour || selectedRoute.calculated_norm_per_hour || (modelStops / modelTijdUren);

    return {
      modelStops,
      modelTijdUren,
      normPerStop,
      normPerUur,
      stops,
      besteltijdUren,
      rijtijdUren,
      opstarttijdUren,
      totaalUren,
    };
  }, [selectedRoute, aantalStops, rijtijdMinuten, opstarttijdMinuten]);

  const handleReset = () => {
    setSelectedRouteId("");
    setAantalStops("");
    setRijtijdMinuten(20);
    setOpstarttijdMinuten(10);
  };

  // Group routes by customer
  const routesByCustomer = useMemo(() => {
    const grouped = {};
    tiRoutes.forEach(route => {
      const customer = customers.find(c => c.id === route.customer_id);
      const key = customer?.company_name || 'Onbekend';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(route);
    });
    return grouped;
  }, [tiRoutes, customers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">TI Rekenmodule</h1>
          <p className="text-slate-500 mt-1">Bereken rittijd en besteltijd op basis van modelroutes en aantal stops</p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Invoer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Route selectie */}
            <div className="space-y-2">
              <Label>Route selecteren</Label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een route..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(routesByCustomer).map(([customerName, routes]) => (
                    <React.Fragment key={customerName}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                        {customerName}
                      </div>
                      {routes.sort((a, b) => a.route_code.localeCompare(b.route_code)).map(route => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_code} — {route.route_name}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model info */}
            {selectedRoute && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <Info className="w-3 h-3" /> MODELGEGEVENS
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-blue-600 text-xs">Norm stops</p>
                    <p className="font-bold text-blue-900">{selectedRoute.number_of_stops}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 text-xs">Norm rittijd</p>
                    <p className="font-bold text-blue-900">
                      {selectedRoute.total_time_hours}u ({formatHoursToHHMM(selectedRoute.total_time_hours)})
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 text-xs">Norm/uur</p>
                    <p className="font-bold text-blue-900">
                      {(selectedRoute.manual_norm_per_hour || selectedRoute.calculated_norm_per_hour || (selectedRoute.number_of_stops / selectedRoute.total_time_hours)).toFixed(1)} stops/uur
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 text-xs">Stuks</p>
                    <p className="font-bold text-blue-900">{selectedRoute.number_of_parcels || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Aantal stops */}
            <div className="space-y-2">
              <Label>Aantal stops</Label>
              <Input
                type="number"
                placeholder="Bijv. 120"
                value={aantalStops}
                onChange={(e) => setAantalStops(e.target.value)}
                min={1}
              />
            </div>

            {/* Rijtijd */}
            <div className="space-y-2">
              <Label>Rijtijd (minuten)</Label>
              <Input
                type="number"
                value={rijtijdMinuten}
                onChange={(e) => setRijtijdMinuten(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-slate-400">Tijd van standplaats naar depot klant</p>
            </div>

            {/* Opstarttijd */}
            <div className="space-y-2">
              <Label>Opstarttijd (minuten)</Label>
              <Input
                type="number"
                value={opstarttijdMinuten}
                onChange={(e) => setOpstarttijdMinuten(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-slate-400">Bus controleren, voertuigcontrole, tanken</p>
            </div>
          </CardContent>
        </Card>

        {/* Resultaat panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Berekening
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRoute ? (
              <div className="text-center py-16 text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Selecteer een route om te beginnen</p>
              </div>
            ) : !berekening ? (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Vul het aantal stops in om de berekening te starten</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Route header */}
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">
                    {selectedRoute.route_code}
                  </Badge>
                  <span className="font-semibold text-slate-800 text-lg">{selectedRoute.route_name}</span>
                </div>

                {/* Berekeningsstappen */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Berekeningsstappen</p>

                  {/* Stap 1: Norm per stop */}
                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="w-7 h-7 flex items-center justify-center p-0 text-xs">1</Badge>
                    <div className="flex-1">
                      <p className="text-slate-600">
                        Norm per stop = {berekening.modelTijdUren}u ÷ {berekening.modelStops} stops
                      </p>
                      <p className="font-bold text-slate-900">
                        = {(berekening.normPerStop * 60).toFixed(2)} min/stop ({berekening.normPerStop.toFixed(4)}u)
                      </p>
                    </div>
                  </div>

                  {/* Stap 2: Besteltijd */}
                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="w-7 h-7 flex items-center justify-center p-0 text-xs">2</Badge>
                    <div className="flex-1">
                      <p className="text-slate-600">
                        Besteltijd = {berekening.stops} stops × {(berekening.normPerStop * 60).toFixed(2)} min
                      </p>
                      <p className="font-bold text-slate-900">
                        = {berekening.besteltijdUren.toFixed(2)}u ({formatHoursToHHMM(berekening.besteltijdUren)})
                      </p>
                    </div>
                  </div>

                  {/* Stap 3: Rijtijd */}
                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="w-7 h-7 flex items-center justify-center p-0 text-xs">3</Badge>
                    <div className="flex-1">
                      <p className="text-slate-600">Rijtijd</p>
                      <p className="font-bold text-slate-900">
                        + {rijtijdMinuten} min ({berekening.rijtijdUren.toFixed(2)}u)
                      </p>
                    </div>
                  </div>

                  {/* Stap 4: Opstarttijd */}
                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="w-7 h-7 flex items-center justify-center p-0 text-xs">4</Badge>
                    <div className="flex-1">
                      <p className="text-slate-600">Opstarttijd</p>
                      <p className="font-bold text-slate-900">
                        + {opstarttijdMinuten} min ({berekening.opstarttijdUren.toFixed(2)}u)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Totaal */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-emerald-600 font-medium mb-1">Totaal rit klant</p>
                      <p className="text-2xl font-bold text-emerald-800">{formatHoursToHHMM(berekening.besteltijdUren)}</p>
                      <p className="text-xs text-emerald-600">{berekening.besteltijdUren.toFixed(2)} uur</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-emerald-600 font-medium mb-1">Rij + Opstart</p>
                      <p className="text-2xl font-bold text-emerald-800">{formatHoursToHHMM(berekening.rijtijdUren + berekening.opstarttijdUren)}</p>
                      <p className="text-xs text-emerald-600">{(berekening.rijtijdUren + berekening.opstarttijdUren).toFixed(2)} uur</p>
                    </div>
                    <div className="text-center border-l-2 border-emerald-300 pl-4">
                      <p className="text-xs text-emerald-600 font-medium mb-1">TOTALE RITTIJD</p>
                      <p className="text-3xl font-bold text-emerald-900">{formatHoursToHHMM(berekening.totaalUren)}</p>
                      <p className="text-sm text-emerald-700 font-semibold">{berekening.totaalUren.toFixed(2)} uur</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-emerald-600 font-medium mb-1">Norm/uur</p>
                      <p className="text-2xl font-bold text-emerald-800">{berekening.normPerUur.toFixed(1)}</p>
                      <p className="text-xs text-emerald-600">stops per uur</p>
                    </div>
                  </div>
                </div>

                {/* Vergelijking met model */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2">VERGELIJKING MET MODEL</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-amber-600 text-xs">Stops verschil</p>
                      <p className="font-bold text-amber-900">
                        {berekening.stops - berekening.modelStops > 0 ? '+' : ''}{berekening.stops - berekening.modelStops} stops
                      </p>
                    </div>
                    <div>
                      <p className="text-amber-600 text-xs">Besteltijd verschil</p>
                      <p className="font-bold text-amber-900">
                        {(berekening.besteltijdUren - berekening.modelTijdUren) > 0 ? '+' : ''}{(berekening.besteltijdUren - berekening.modelTijdUren).toFixed(2)}u
                      </p>
                    </div>
                    <div>
                      <p className="text-amber-600 text-xs">Totaal vs model</p>
                      <p className="font-bold text-amber-900">
                        {(berekening.totaalUren - berekening.modelTijdUren) > 0 ? '+' : ''}{(berekening.totaalUren - berekening.modelTijdUren).toFixed(2)}u
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}