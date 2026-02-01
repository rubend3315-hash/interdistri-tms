import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Database, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export default function DataMigration() {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [migrationResult, setMigrationResult] = useState(null);

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
                <div className="mt-2 text-sm space-y-1">
                  <p>• {migrationResult.details.customers} klant(en) gemigreerd</p>
                  <p>• {migrationResult.details.articles} artikel(en) gemigreerd</p>
                  <p>• {migrationResult.details.imports} import(s) gemigreerd</p>
                  <p>• {migrationResult.details.timodel_routes} TI Model route(s) gemigreerd</p>
                  <p>• {migrationResult.details.routes} route(s) gemigreerd</p>
                  {migrationResult.details.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Fouten:</p>
                      {migrationResult.details.errors.map((err, idx) => (
                        <p key={idx} className="text-red-600">- {err}</p>
                      ))}
                    </div>
                  )}
                </div>
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
    </div>
  );
}