import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Fuel, Calculator, RefreshCw, Save, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";

import FuelSurchargeFilters from "@/components/fuel-surcharge/FuelSurchargeFilters";
import FuelSettingsTable from "@/components/fuel-surcharge/FuelSettingsTable";
import FuelSettingsDialog from "@/components/fuel-surcharge/FuelSettingsDialog";
import FuelSurchargeReport from "@/components/fuel-surcharge/FuelSurchargeReport";
import FuelSurchargeHistory from "@/components/fuel-surcharge/FuelSurchargeHistory";
import CbsPriceChart from "@/components/fuel-surcharge/CbsPriceChart";
import KmDieselPriceChart from "@/components/km-dashboard/KmDieselPriceChart";

export default function FuelSurcharge() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [activeTab, setActiveTab] = useState("calculate");

  // Filters
  const [periodType, setPeriodType] = useState("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [customerFilter, setCustomerFilter] = useState("all");

  // Dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState(null);

  // Current calculation result
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const cOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

  // Data queries
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'Actief' }),
    ...cOpts,
  });

  const { data: fuelSettings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['fuelSettings'],
    queryFn: () => base44.entities.CustomerFuelSettings.filter({ is_active: true }),
    ...cOpts,
  });

  const { data: surcharges = [] } = useQuery({
    queryKey: ['fuelSurcharges'],
    queryFn: () => base44.entities.FuelSurcharge.list('-created_date', 50),
    ...cOpts,
  });

  const { data: tlnPrices = [], isLoading: tlnLoading } = useQuery({
    queryKey: ['dieselPrices'],
    queryFn: () => base44.entities.DieselPrice.filter({}, '-date', 2000),
    staleTime: 60 * 60 * 1000,
  });

  const { data: cbsPrices = [], isLoading: cbsLoading } = useQuery({
    queryKey: ['cbsDieselPrices'],
    queryFn: () => base44.entities.CbsDieselPrice.filter({}, '-date', 2000),
    staleTime: 60 * 60 * 1000,
  });

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[c.id] = c; });
    return m;
  }, [customers]);

  // Compute date range
  const dateRange = useMemo(() => {
    if (periodType === "day") return { from: selectedDate, to: selectedDate };
    if (periodType === "week") {
      const we = endOfWeek(weekStart, { weekStartsOn: 1 });
      return { from: format(weekStart, 'yyyy-MM-dd'), to: format(we, 'yyyy-MM-dd') };
    }
    return { from: rangeFrom, to: rangeTo };
  }, [periodType, selectedDate, weekStart, rangeFrom, rangeTo]);

  // CBS Sync
  const [syncing, setSyncing] = useState(false);
  const [syncingTln, setSyncingTln] = useState(false);
  const handleCbsSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncCbsDieselPrices', { since: '2024-01-01' });
      toast.success(`CBS Sync: ${res.data.created} nieuwe prijzen opgehaald`);
      queryClient.invalidateQueries({ queryKey: ['cbsDieselPrices'] });
    } catch (err) {
      toast.error(`CBS Sync fout: ${err.message}`);
    }
    setSyncing(false);
  };
  const handleTlnSync = async () => {
    setSyncingTln(true);
    try {
      const res = await base44.functions.invoke('syncDieselPrices', {});
      toast.success(`TLN Sync: ${res.data.inserted} nieuwe prijzen opgehaald`);
      queryClient.invalidateQueries({ queryKey: ['dieselPrices'] });
    } catch (err) {
      toast.error(`TLN Sync fout: ${err.message}`);
    }
    setSyncingTln(false);
  };

  // Calculate surcharge
  const handleCalculate = async (customerId, shouldSave = false) => {
    setCalculating(true);
    try {
      const res = await base44.functions.invoke('calculateFuelSurcharge', {
        customer_id: customerId,
        date_from: dateRange.from,
        date_to: dateRange.to,
        save: shouldSave,
      });
      setCalculationResult(res.data.surcharge);
      if (shouldSave) {
        toast.success('Berekening opgeslagen');
        queryClient.invalidateQueries({ queryKey: ['fuelSurcharges'] });
      }
    } catch (err) {
      toast.error(`Berekeningsfout: ${err.response?.data?.error || err.message}`);
    }
    setCalculating(false);
  };

  // Settings CRUD
  const handleSaveSettings = async (data) => {
    if (editingSettings?.id) {
      await base44.entities.CustomerFuelSettings.update(editingSettings.id, data);
    } else {
      await base44.entities.CustomerFuelSettings.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['fuelSettings'] });
    setSettingsDialogOpen(false);
    setEditingSettings(null);
    toast.success('Instellingen opgeslagen');
  };

  const handleDeleteSettings = async (id) => {
    if (!confirm('Weet je zeker dat je deze instellingen wilt verwijderen?')) return;
    await base44.entities.CustomerFuelSettings.delete(id);
    queryClient.invalidateQueries({ queryKey: ['fuelSettings'] });
    toast.success('Verwijderd');
  };

  const handleDeleteSurcharge = async (id) => {
    if (!confirm('Weet je zeker dat je deze berekening wilt verwijderen?')) return;
    await base44.entities.FuelSurcharge.delete(id);
    queryClient.invalidateQueries({ queryKey: ['fuelSurcharges'] });
    toast.success('Verwijderd');
  };

  // Customers that have at least one fuel setting configured (deduplicated)
  const configuredCustomerIds = new Set(fuelSettings.map(s => s.customer_id));
  const customersWithSettings = customers.filter(c => configuredCustomerIds.has(c.id));

  // Count settings per customer for display
  const settingsCountByCustomer = {};
  fuelSettings.forEach(s => { settingsCountByCustomer[s.customer_id] = (settingsCountByCustomer[s.customer_id] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Fuel className="w-8 h-8 text-amber-600" />
            Brandstoftoeslag
          </h1>
          <p className="text-slate-500 mt-1">Bereken en beheer brandstoftoeslagen per klant</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCbsSync} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            CBS Sync
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calculate">Berekenen</TabsTrigger>
          <TabsTrigger value="settings">Instellingen</TabsTrigger>
          <TabsTrigger value="history">Geschiedenis</TabsTrigger>
          <TabsTrigger value="prices">Brandstofprijzen</TabsTrigger>
        </TabsList>

        <TabsContent value="calculate" className="space-y-6 mt-4">
          <FuelSurchargeFilters
            periodType={periodType} setPeriodType={setPeriodType}
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            weekStart={weekStart} setWeekStart={setWeekStart}
            rangeFrom={rangeFrom} setRangeFrom={setRangeFrom}
            rangeTo={rangeTo} setRangeTo={setRangeTo}
            customerFilter={customerFilter} setCustomerFilter={setCustomerFilter}
            customers={customersWithSettings}
          />

          {/* Calculate buttons per customer */}
          {customerFilter === "all" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customersWithSettings.map(c => (
                <Button key={c.id} variant="outline" className="justify-start gap-2 h-auto py-3"
                  onClick={() => handleCalculate(c.id)} disabled={calculating}>
                  <Calculator className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">{c.company_name}</div>
                    <div className="text-xs text-slate-500">{settingsCountByCustomer[c.id]} voertuigtype(s) · {dateRange.from} — {dateRange.to}</div>
                  </div>
                </Button>
              ))}
              {customersWithSettings.length === 0 && (
                <p className="text-slate-400 text-sm col-span-3">
                  Geen klanten met brandstof-instellingen. Ga naar Instellingen om te beginnen.
                </p>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => handleCalculate(customerFilter)} disabled={calculating} className="gap-2">
                {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                Bereken
              </Button>
              {calculationResult && (
                <Button variant="outline" onClick={() => handleCalculate(customerFilter, true)} disabled={calculating} className="gap-2">
                  <Save className="w-4 h-4" />
                  Opslaan
                </Button>
              )}
            </div>
          )}

          {calculating && (
            <div className="flex items-center gap-3 text-slate-500 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Berekening uitvoeren...</span>
            </div>
          )}

          {calculationResult && !calculating && (
            <FuelSurchargeReport
              surcharge={calculationResult}
              customerName={customerMap[calculationResult.customer_id]?.company_name || '?'}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-4">
          <FuelSettingsTable
            settings={fuelSettings}
            customerMap={customerMap}
            onEdit={(s) => { setEditingSettings(s); setSettingsDialogOpen(true); }}
            onDelete={handleDeleteSettings}
            onAdd={() => { setEditingSettings(null); setSettingsDialogOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-4">
          <FuelSurchargeHistory
            surcharges={surcharges}
            customerMap={customerMap}
            onView={(s) => { setCalculationResult(s); setActiveTab('calculate'); }}
            onDelete={handleDeleteSurcharge}
          />
        </TabsContent>

        <TabsContent value="prices" className="space-y-6 mt-4">
          <KmDieselPriceChart allPrices={tlnPrices} pricesLoading={tlnLoading} />
          <CbsPriceChart cbsPrices={cbsPrices} loading={cbsLoading} />
        </TabsContent>
      </Tabs>

      <FuelSettingsDialog
        open={settingsDialogOpen}
        onClose={() => { setSettingsDialogOpen(false); setEditingSettings(null); }}
        settings={editingSettings}
        onSave={handleSaveSettings}
        customers={customers}
      />
    </div>
  );
}