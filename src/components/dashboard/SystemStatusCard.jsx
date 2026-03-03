import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function SystemStatusCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['systemHealthCheck'],
    queryFn: async () => {
      const res = await base44.functions.invoke('systemHealthCheck');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  let status = 'loading';
  let label = 'Controleren...';
  let color = 'bg-slate-100 text-slate-600';

  if (isError || (data && data.error)) {
    status = 'red';
    label = 'Backend failure detected';
    color = 'bg-red-100 text-red-700 border-red-200';
  } else if (data && data.status) {
    if (data.status === "GREEN") {
      const allGood = data.base44_connection && data.supabase_connection &&
        (!data.errors || data.errors.length === 0);

      if (allGood) {
        status = 'green';
        label = 'All systems operational';
        color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else {
        status = 'orange';
        label = 'Partial connectivity issue';
        color = 'bg-amber-50 text-amber-700 border-amber-200';
      }
    } else {
      status = 'red';
      label = 'System issue detected';
      color = 'bg-red-100 text-red-700 border-red-200';
    }
  }

  const dotColor = {
    loading: 'bg-slate-400',
    green: 'bg-emerald-500',
    orange: 'bg-amber-500',
    red: 'bg-red-500',
  }[status];

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Activity className="w-4 h-4 text-slate-400 animate-pulse" />
          <span className="text-sm text-slate-500">System status controleren...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${color}`}>
      <CardContent className="py-3 px-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-4 h-4" />
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColor}`} />
          </div>
          <span className="text-sm font-medium">System Status</span>
          <Badge variant="outline" className={`text-xs ${color} border-0`}>
            {label}
          </Badge>
        </div>
        {data?.timestamp && (
          <span className="text-xs opacity-60">
            {format(new Date(data.timestamp), "d MMM HH:mm", { locale: nl })}
          </span>
        )}
      </CardContent>
    </Card>
  );
}