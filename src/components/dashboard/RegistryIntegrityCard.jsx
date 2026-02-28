import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
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

  let color, label, DotIcon;
  if (isErr) {
    color = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Registry check mislukt';
    DotIcon = AlertTriangle;
  } else if (isRed) {
    color = 'bg-red-50 text-red-700 border-red-200';
    label = `${missingCount} functie(s) ontbreken${brokenDeps > 0 ? `, ${brokenDeps} broken dep(s)` : ''}`;
    DotIcon = AlertTriangle;
  } else {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = `${deployedCount}/${manifestCount} functies OK`;
    DotIcon = CheckCircle2;
  }

  const dotColor = isGreen ? 'bg-emerald-500' : isRed ? 'bg-red-500' : 'bg-amber-500';

  return (
    <Link to={createPageUrl("DeploymentStatus")}>
      <Card className={`border ${color} hover:shadow-md transition-shadow cursor-pointer`}>
        <CardContent className="py-3 px-4 flex items-center justify-between flex-wrap gap-2">
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
          <div className="flex items-center gap-3">
            {isRed && data?.missing_functions?.length > 0 && (
              <span className="text-xs opacity-75 hidden sm:inline">
                {data.missing_functions.map(f => f.name).slice(0, 3).join(', ')}
                {data.missing_functions.length > 3 && ` +${data.missing_functions.length - 3}`}
              </span>
            )}
            {data?.timestamp && (
              <span className="text-xs opacity-60">
                {format(new Date(data.timestamp), "d MMM HH:mm", { locale: nl })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}