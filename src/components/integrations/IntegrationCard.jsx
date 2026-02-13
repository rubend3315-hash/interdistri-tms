import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Settings, CheckCircle2, XCircle, Clock, Minus } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const typeLabels = {
  loket_nl: "Loket.nl",
  planning_sync: "Planning Sync",
  custom: "Custom API",
};

const typeDescriptions = {
  loket_nl: "Verlofdagen en medewerkergegevens ophalen vanuit Loket.nl",
  planning_sync: "Projectinformatie synchroniseren met je planningsysteem",
  custom: "Aangepaste API-koppeling",
};

const statusConfig = {
  success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 text-green-700 border-green-200", label: "Gelukt" },
  error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 text-red-700 border-red-200", label: "Fout" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Bezig..." },
  never: { icon: Minus, color: "text-slate-400", bg: "bg-slate-50 text-slate-500 border-slate-200", label: "Nog niet gesynchroniseerd" },
};

export default function IntegrationCard({ integration, onToggle, onSync, onEdit, syncing }) {
  const status = statusConfig[integration.last_sync_status || "never"];
  const StatusIcon = status.icon;

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${integration.is_active ? "bg-green-500" : "bg-slate-300"}`} />
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {typeLabels[integration.type] || integration.type}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {typeDescriptions[integration.type]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{integration.is_active ? "Actief" : "Inactief"}</span>
          <Switch
            checked={integration.is_active}
            onCheckedChange={() => onToggle(integration)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <Badge variant="outline" className={status.bg}>
                {status.label}
              </Badge>
            </div>
            {integration.last_sync && (
              <span className="text-xs text-slate-500">
                Laatste sync: {format(new Date(integration.last_sync), "d MMM yyyy HH:mm", { locale: nl })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(integration)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Instellingen
            </Button>
            <Button
              size="sm"
              onClick={() => onSync(integration)}
              disabled={!integration.is_active || !integration.api_key || syncing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Bezig..." : "Synchroniseer nu"}
            </Button>
          </div>
        </div>
        {integration.is_active && integration.api_key && (
          <p className="text-xs text-slate-500 mt-2">
            ⏱ Automatische sync elke {integration.sync_interval_minutes || 60} minuten
          </p>
        )}
        {!integration.api_key && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ API sleutel nog niet ingesteld. Ga naar Instellingen om je API sleutel toe te voegen.
          </p>
        )}
        {integration.last_sync_message && integration.last_sync_status === "error" && (
          <p className="text-xs text-red-600 mt-2">
            {integration.last_sync_message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}