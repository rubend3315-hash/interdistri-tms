import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Database, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";

export default function DataMigration() {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [migrationResult, setMigrationResult] = useState(null);
  const [activeTab, setActiveTab] = useState("customers");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers-prod'],
    queryFn: () => base44.entities.Customer.list()
  });

  const migrateMutation = useMutation({
    mutationFn: async (customer_ids) => {
      const response = await base44.functions.invoke('migrateCustomerData', { customer_ids });
      return response.data;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
      setSelectedCustomers([]);
    },
    onError: (error) => {
      setMigrationResult({
        success: false,
        error: error.message
      });
    }
  });

  const migrateFullSystemMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('migrateFullSystem', {});
      return response.data;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
    },
    onError: (error) => {
      setMigrationResult({
        success: false,
        error: error.message
      });
    }
  });

  const clearTestDbMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('clearTestDatabase', {});
      return response.data;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
    },
    onError: (error) => {
      setMigrationResult({
        success: false,
        error: error.message
      });
    }
  });

  const handleMigrate = () => {
    if (selectedCustomers.length === 0) {
      alert('Selecteer minimaal één klant om te migreren');
      return;
    }

    const confirm = window.confirm(
      `Weet je zeker dat je ${selectedCustomers.length} klant(en) wilt migreren van Productie naar Test?\n\n` +
      `Dit zal de klant(en) en alle gerelateerde data (artikelen, imports, routes) kopiëren.`
    );

    if (confirm) {
      migrateMutation.mutate(selectedCustomers);
    }
  };

  const handleFullSystemMigration = () => {
    const confirm = window.confirm(
      `⚠️ WAARSCHUWING: Dit zal het VOLLEDIGE SYSTEEM migreren van Productie naar Test!\n\n` +
      `Dit omvat:\n` +
      `• Alle medewerkers\n` +
      `• Alle voertuigen en NIWO vergunningen\n` +
      `• Alle klanten en gerelateerde data\n` +
      `• Alle contracten en tijdregistraties\n` +
      `• Alle ritten en planningen\n` +
      `• Alle CAO-regels en loontabellen\n` +
      `• En nog veel meer...\n\n` +
      `Dit kan enkele minuten duren. Weet je het zeker?`
    );

    if (confirm) {
      migrateFullSystemMutation.mutate();
    }
  };

  const handleClearTestDatabase = () => {
    const confirm = window.confirm(
      `⚠️ WAARSCHUWING: Dit zal ALLE data in de Test database PERMANENT verwijderen!\n\n` +
      `Dit omvat ALLES:\n` +
      `• Alle medewerkers\n` +
      `• Alle voertuigen\n` +
      `• Alle klanten\n` +
      `• Alle tijdregistraties\n` +
      `• Alle ritten\n` +
      `• En alle andere data\n\n` +
      `Deze actie kan NIET ongedaan worden gemaakt!\n\n` +
      `Weet je het ABSOLUUT ZEKER?`
    );

    if (confirm) {
      clearTestDbMutation.mutate();
    }
  };

  const toggleCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Datamigratie</h1>
        <p className="text-slate-600 mt-2">
          Migreer klantdata van Productie naar Test omgeving
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Let op:</strong> Deze functie kopieert klanten en alle gerelateerde data (artikelen, imports, TI Model routes, routes) 
          van de <strong>Productie</strong> database naar de <strong>Test</strong> database. 
          Gebruik dit alleen voor testwerkzaamheden.
        </AlertDescription>
      </Alert>

      {migrationResult && (
        <Alert className={migrationResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
          {migrationResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription className={migrationResult.success ? "text-emerald-800" : "text-red-800"}>
            {migrationResult.success ? (
              <div>
                <strong>Migratie succesvol!</strong>
                <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                  {migrationResult.details.employees !== undefined && <p>• {migrationResult.details.employees} medewerkers</p>}
                  {migrationResult.details.vehicles !== undefined && <p>• {migrationResult.details.vehicles} voertuigen</p>}
                  {migrationResult.details.niwo_permits !== undefined && <p>• {migrationResult.details.niwo_permits} NIWO vergunningen</p>}
                  {migrationResult.details.customers !== undefined && <p>• {migrationResult.details.customers} klanten</p>}
                  {migrationResult.details.articles !== undefined && <p>• {migrationResult.details.articles} artikelen</p>}
                  {migrationResult.details.ti_model_routes !== undefined && <p>• {migrationResult.details.ti_model_routes} TI Model routes</p>}
                  {migrationResult.details.routes !== undefined && <p>• {migrationResult.details.routes} routes</p>}
                  {migrationResult.details.customer_imports !== undefined && <p>• {migrationResult.details.customer_imports} imports</p>}
                  {migrationResult.details.projects !== undefined && <p>• {migrationResult.details.projects} projecten</p>}
                  {migrationResult.details.cao_rules !== undefined && <p>• {migrationResult.details.cao_rules} CAO-regels</p>}
                  {migrationResult.details.salary_tables !== undefined && <p>• {migrationResult.details.salary_tables} loontabellen</p>}
                  {migrationResult.details.holidays !== undefined && <p>• {migrationResult.details.holidays} feestdagen</p>}
                  {migrationResult.details.contracts !== undefined && <p>• {migrationResult.details.contracts} contracten</p>}
                  {migrationResult.details.time_entries !== undefined && <p>• {migrationResult.details.time_entries} tijdregistraties</p>}
                  {migrationResult.details.trips !== undefined && <p>• {migrationResult.details.trips} ritten</p>}
                  {migrationResult.details.schedules !== undefined && <p>• {migrationResult.details.schedules} planningen</p>}
                  {migrationResult.details.shift_times !== undefined && <p>• {migrationResult.details.shift_times} dienst-shifttijden</p>}
                  {migrationResult.details.vehicle_inspections !== undefined && <p>• {migrationResult.details.vehicle_inspections} voertuiginspecties</p>}
                  {migrationResult.details.expenses !== undefined && <p>• {migrationResult.details.expenses} declaraties</p>}
                  {migrationResult.details.messages !== undefined && <p>• {migrationResult.details.messages} berichten</p>}
                  {migrationResult.details.supervisor_messages !== undefined && <p>• {migrationResult.details.supervisor_messages} supervisor berichten</p>}
                </div>
                {migrationResult.details.errors?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <p className="font-semibold text-amber-700">Waarschuwingen ({migrationResult.details.errors.length}):</p>
                    <div className="max-h-32 overflow-y-auto mt-1 space-y-0.5">
                      {migrationResult.details.errors.slice(0, 10).map((err, idx) => (
                        <p key={idx} className="text-xs text-amber-600">- {err}</p>
                      ))}
                      {migrationResult.details.errors.length > 10 && (
                        <p className="text-xs text-amber-600 italic">...en nog {migrationResult.details.errors.length - 10} meer</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong>Migratie mislukt</strong>
                <p className="mt-1">{migrationResult.error}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="customers">
            <Database className="w-4 h-4 mr-2" />
            Specifieke klanten
          </TabsTrigger>
          <TabsTrigger value="full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Volledig systeem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Selecteer klanten om te migreren
              </CardTitle>
              <CardDescription>
                Klanten uit Productie database
              </CardDescription>
            </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              Geen klanten gevonden in Productie
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  {selectedCustomers.length === customers.length ? 'Deselecteer alle' : 'Selecteer alle'}
                </Button>
                <Badge variant="outline">
                  {selectedCustomers.length} / {customers.length} geselecteerd
                </Badge>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customers.map(customer => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleCustomer(customer.id)}
                  >
                    <Checkbox
                      checked={selectedCustomers.includes(customer.id)}
                      onCheckedChange={() => toggleCustomer(customer.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{customer.company_name}</p>
                      {customer.city && (
                        <p className="text-sm text-slate-500">{customer.city}</p>
                      )}
                    </div>
                    <Badge className={customer.status === 'Actief' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {customer.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleMigrate}
                  disabled={selectedCustomers.length === 0 || migrateMutation.isPending}
                >
                  {migrateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Bezig met migreren...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Migreer naar Test ({selectedCustomers.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Volledige systeemmigratie
              </CardTitle>
              <CardDescription>
                Migreer alle data van Productie naar Test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>⚠️ WAARSCHUWING:</strong> Deze actie migreert ALLE data van Productie naar Test. 
                  Dit omvat alle medewerkers, voertuigen, klanten, contracten, tijdregistraties, ritten, planningen, en meer.
                  Dit proces kan enkele minuten duren.
                </AlertDescription>
              </Alert>

              <Alert className="bg-blue-50 border-blue-200">
                <Database className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>💡 Tip:</strong> Als de Test database niet leeg is, gebruik eerst de "Leeg Test Database" knop hieronder 
                  om duplicaten te voorkomen.
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-slate-900">Wat wordt gemigreerd:</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                  <div>• Medewerkers</div>
                  <div>• Voertuigen</div>
                  <div>• NIWO Vergunningen</div>
                  <div>• Klanten</div>
                  <div>• Artikelen</div>
                  <div>• TI Model Routes</div>
                  <div>• Routes</div>
                  <div>• Customer Imports</div>
                  <div>• Projecten</div>
                  <div>• CAO-regels</div>
                  <div>• Loontabellen</div>
                  <div>• Feestdagen</div>
                  <div>• Contracten</div>
                  <div>• Tijdregistraties</div>
                  <div>• Ritten</div>
                  <div>• Planningen</div>
                  <div>• Dienst-shifttijden</div>
                  <div>• Voertuiginspecties</div>
                  <div>• Declaraties</div>
                  <div>• Berichten</div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="destructive"
                  className="w-full h-12"
                  onClick={handleClearTestDatabase}
                  disabled={clearTestDbMutation.isPending}
                >
                  {clearTestDbMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Bezig met legen...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Leeg Test Database eerst
                    </>
                  )}
                </Button>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-base"
                onClick={handleFullSystemMigration}
                disabled={migrateFullSystemMutation.isPending || clearTestDbMutation.isPending}
              >
                {migrateFullSystemMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Bezig met migreren... Dit kan enkele minuten duren
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Start volledige systeemmigratie
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}