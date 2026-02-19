import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";

export default function MobileOverviewTab({ approvedEntries, loadingEntries }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Goedgekeurde diensten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEntries ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : approvedEntries.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nog geen goedgekeurde diensten</p>
          ) : (
            <div className="space-y-2">
              {approvedEntries.slice(0, 10).map(entry => (
                <div key={entry.id} className="p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{entry.date && format(new Date(entry.date), "d MMM yyyy", { locale: nl })}</p>
                      <p className="text-xs text-slate-500">{entry.start_time} - {entry.end_time}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">{entry.total_hours}u</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}