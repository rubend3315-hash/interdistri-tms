import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Plus, History } from "lucide-react";
import { toast } from "sonner";

import IntegrationCard from "../components/integrations/IntegrationCard";
import IntegrationEditDialog from "../components/integrations/IntegrationEditDialog";
import SyncLogTable from "../components/integrations/SyncLogTable";

const DEFAULT_INTEGRATIONS = [
  {
    name: "Loket.nl — Verlofdagen",
    type: "loket_nl",
    is_active: false,
    sync_interval_minutes: 60,
    last_sync_status: "never",
  },
  {
    name: "Planning — Projectsync",
    type: "planning_sync",
    is_active: false,
    sync_interval_minutes: 60,
    last_sync_status: "never",
  },
];

export default function Integrations() {
  const queryClient = useQueryClient();
  const [editIntegration, setEditIntegration] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => base44.entities.Integration.list(),
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["syncLogs"],
    queryFn: () => base44.entities.SyncLog.list("-created_date", 50),
  });

  const setupDefaults = useMutation({
    mutationFn: async () => {
      for (const def of DEFAULT_INTEGRATIONS) {
        const existing = integrations.find((i) => i.type === def.type);
        if (!existing) {
          await base44.entities.Integration.create(def);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Standaard integraties aangemaakt");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (integration) => {
      await base44.entities.Integration.update(integration.id, {
        is_active: !integration.is_active,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Integration.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Instellingen opgeslagen");
    },
  });

  const handleSync = async (integration) => {
    if (!integration.api_key || !integration.api_url) {
      toast.error("Stel eerst de API URL en sleutel in via Instellingen");
      return;
    }
    setSyncingId(integration.id);
    // Simuleer een sync-poging — wanneer de echte API gekoppeld is wordt dit vervangen
    await base44.entities.SyncLog.create({
      integration_id: integration.id,
      sync_type: integration.type === "loket_nl" ? "verlofdagen" : "projecten",
      status: "error",
      records_synced: 0,
      records_failed: 0,
      message: "Synchronisatie wordt beschikbaar zodra de API-koppeling is geconfigureerd.",
    });
    await base44.entities.Integration.update(integration.id, {
      last_sync: new Date().toISOString(),
      last_sync_status: "pending",
      last_sync_message: "API-koppeling nog niet volledig geconfigureerd.",
    });
    queryClient.invalidateQueries({ queryKey: ["integrations"] });
    queryClient.invalidateQueries({ queryKey: ["syncLogs"] });
    setSyncingId(null);
    toast.info("Synchronisatie wordt beschikbaar zodra de API volledig is geconfigureerd.");
  };

  const handleSave = async (id, data) => {
    await saveMutation.mutateAsync({ id, data });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-7 h-7 text-blue-600" />
            Integraties
          </h1>
          <p className="text-slate-500 mt-1">
            Beheer koppelingen met externe systemen zoals Loket.nl en je planningtool.
          </p>
        </div>
        {integrations.length === 0 && (
          <Button
            onClick={() => setupDefaults.mutate()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Standaard integraties aanmaken
          </Button>
        )}
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">
            <Link2 className="w-4 h-4 mr-1" />
            Koppelingen
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="w-4 h-4 mr-1" />
            Sync Logboek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  Nog geen integraties
                </h3>
                <p className="text-slate-500 mb-4">
                  Klik op "Standaard integraties aanmaken" om te beginnen met Loket.nl en Planning Sync.
                </p>
                <Button
                  onClick={() => setupDefaults.mutate()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Standaard integraties aanmaken
                </Button>
              </CardContent>
            </Card>
          ) : (
            integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onToggle={(i) => toggleMutation.mutate(i)}
                onSync={handleSync}
                onEdit={setEditIntegration}
                syncing={syncingId === integration.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronisatie Logboek</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncLogTable logs={syncLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <IntegrationEditDialog
        open={!!editIntegration}
        onClose={() => setEditIntegration(null)}
        integration={editIntegration}
        onSave={handleSave}
      />
    </div>
  );
}