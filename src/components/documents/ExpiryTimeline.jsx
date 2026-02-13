import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format, addDays, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, Clock, FileText, XCircle } from "lucide-react";

const PERIOD_CONFIG = [
  { key: "expired", label: "Verlopen", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", filter: (days) => days < 0 },
  { key: "week", label: "Binnen 7 dagen", color: "bg-red-400", textColor: "text-red-600", bgLight: "bg-red-50", filter: (days) => days >= 0 && days <= 7 },
  { key: "month", label: "Binnen 30 dagen", color: "bg-amber-400", textColor: "text-amber-700", bgLight: "bg-amber-50", filter: (days) => days > 7 && days <= 30 },
  { key: "quarter", label: "Binnen 90 dagen", color: "bg-blue-400", textColor: "text-blue-700", bgLight: "bg-blue-50", filter: (days) => days > 30 && days <= 90 },
];

export default function ExpiryTimeline({ documents }) {
  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    const docsWithExpiry = documents
      .filter(d => d.expiry_date && d.status !== "Gearchiveerd")
      .map(d => ({
        ...d,
        daysLeft: differenceInDays(new Date(d.expiry_date), today),
      }));

    return PERIOD_CONFIG.map(period => ({
      ...period,
      docs: docsWithExpiry
        .filter(d => period.filter(d.daysLeft))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    }));
  }, [documents]);

  const totalUrgent = grouped.reduce((s, g) => s + g.docs.length, 0);

  if (totalUrgent === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Geen documenten die binnenkort verlopen</p>
        <p className="text-sm text-slate-400 mt-1">Alle documenten met vervaldatum zijn langer dan 90 dagen geldig.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {grouped.filter(g => g.docs.length > 0).map(g => (
          <Badge key={g.key} variant="outline" className={`${g.bgLight} ${g.textColor} border-0 px-3 py-1`}>
            {g.key === "expired" && <XCircle className="w-3.5 h-3.5 mr-1" />}
            {g.key !== "expired" && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
            {g.docs.length} {g.label.toLowerCase()}
          </Badge>
        ))}
      </div>

      {/* Timeline groups */}
      {grouped.filter(g => g.docs.length > 0).map(group => (
        <div key={group.key}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${group.color}`} />
            <h3 className={`font-semibold text-sm ${group.textColor}`}>{group.label}</h3>
            <Badge variant="outline" className="text-xs">{group.docs.length}</Badge>
          </div>

          <div className="space-y-2 ml-5 border-l-2 border-slate-100 pl-4">
            {group.docs.map(doc => (
              <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg ${group.bgLight}`}>
                <div className="flex items-center gap-3">
                  <FileText className={`w-4 h-4 ${group.textColor}`} />
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                      {doc.linked_entity_name && <span>• {doc.linked_entity_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${group.textColor}`}>
                    {doc.daysLeft < 0
                      ? `${Math.abs(doc.daysLeft)} dagen verlopen`
                      : doc.daysLeft === 0
                        ? "Vandaag!"
                        : `${doc.daysLeft} dagen`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: nl })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}