import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RegistryIntegrityCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['registryIntegrity'],
    queryFn: async () => {
      const res = await base44.functions.invoke('verifyFunctionRegistry');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch last auto-heal attempt from AuditLog
  const { data: healLogs } = useQuery({
    queryKey: ['lastAutoHeal'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter(
        { target_id: 'auto-heal-registry' },
        '-created_date',
        3
      );
      return logs;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Shield className="w-4 h-4 text-slate-400 animate-pulse" />
          <span className="text-sm text-slate-500">Registry integrity controleren...</span>
        </CardContent>
      </Card>
    );
  }

  const isGreen = data?.status === 'GREEN';
  const isRed = data?.status === 'RED';
  const isErr = isError || data?.status === 'ERROR';
  const missingCount = data?.missing_count || 0;
  const brokenDeps = data?.broken_dependencies?.length || 0;
  const manifestCount = data?.manifest_count || 0;
  const deployedCount = data?.deployed_count || 0;

  // Parse heal info
  const lastHealAttempt = healLogs?.find(l => l.metadata?.phase === 'HEAL_START' || l.metadata?.phase === 'HEAL_RESULT');
  const lastHealResult = healLogs?.find(l => l.metadata?.phase === 'HEAL_RESULT');
  const consecutiveFailures = healLogs?.filter(l =>
    l.metadata?.phase === 'HEAL_RESULT' && !l.metadata?.heal_success
  ).length || 0;

  let color, label;
  if (isErr) {
    color = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Registry check mislukt';
  } else if (isRed) {
    color = 'bg-red-50 text-red-700 border-red-200';
    label = `${missingCount} functie(s) ontbreken${brokenDeps > 0 ? `, ${brokenDeps} broken dep(s)` : ''}`;
  } else {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = `${deployedCount}/${manifestCount} functies OK`;
  }

  const dotColor = isGreen ? 'bg-emerald-500' : isRed ? 'bg-red-500' : 'bg-amber-500';

  return (
    <Link to={createPageUrl("DeploymentStatus")}>
      <Card className={`border ${color} hover:shadow-md transition-shadow cursor-pointer`}>
        <CardContent className="py-3 px-4 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Shield className="w-4 h-4" />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColor}`} />
              </div>
              <span className="text-sm font-medium">Registry Integrity</span>
              <Badge variant="outline" className={`text-xs ${color} border-0`}>
                {label}
              </Badge>
            </div>
            {data?.timestamp && (
              <span className="text-xs opacity-60">
                {format(new Date(data.timestamp), "d MMM HH:mm", { locale: nl })}
              </span>
            )}
          </div>
          {/* Auto-heal status row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 pl-7">
            <Wrench className="w-3 h-3 flex-shrink-0" />
            {lastHealAttempt ? (
              <span>
                Laatste heal: {format(new Date(lastHealAttempt.created_date), "d MMM HH:mm", { locale: nl })}
                {lastHealResult && (
                  <span className={lastHealResult.metadata?.heal_success ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                    ({lastHealResult.metadata?.heal_success ? '✓ success' : '✗ failed'})
                  </span>
                )}
                {consecutiveFailures > 0 && (
                  <span className="text-red-600 ml-1">
                    · {consecutiveFailures}x gefaald
                  </span>
                )}
              </span>
            ) : (
              <span>Geen heal attempts</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}