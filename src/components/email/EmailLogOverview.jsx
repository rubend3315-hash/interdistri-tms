import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, XCircle, Mail, AlertTriangle, Bug } from "lucide-react";

const SOURCE_LABELS = {
  sendStamkaartEmail: "Stamkaart",
  sendWelcomeEmail: "Onboarding",
  sendEmployeeEmail: "Medewerker e-mail",
  sendContractForSigning: "Contract",
  notifyContractSigned: "Contract notificatie",
  sendContractToPayroll: "Loonadministratie",
  testEmailSend: "Test",
  sendTimeEntryRejectionEmail: "Dienst afgekeurd",
  processContractWijziging: "Contractwijziging",
};

function LogRow({ log }) {
  const dateStr = log.sent_at || log.created_date;
  const d = dateStr ? new Date(dateStr) : null;
  const sourceLabel = SOURCE_LABELS[log.source_function] || log.source_function || "—";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-slate-900 text-sm truncate max-w-[400px]">
                {log.subject || "(geen onderwerp)"}
              </h4>
              {log.status === "success" ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verzonden
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 text-xs gap-1">
                  <XCircle className="w-3 h-3" /> Mislukt
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span><strong>Aan:</strong> {log.to}</span>
              {log.cc && <span><strong>CC:</strong> {log.cc}</span>}
            </div>
            {log.error_message && (
              <div className="mt-1.5 text-xs text-red-600 bg-red-50 p-2 rounded flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="truncate">{log.error_message}</span>
              </div>
            )}
          </div>
          <div className="text-right text-xs text-slate-400 whitespace-nowrap">
            {d ? format(d, "d MMM yyyy", { locale: nl }) : "—"}
            <br />
            {d ? format(d, "HH:mm") : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailLogOverview() {
  const [tab, setTab] = useState("all");

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: () => base44.entities.EmailLog.list("-created_date", 50),
  });

  const successLogs = emailLogs.filter((l) => l.status === "success");
  const failedLogs = emailLogs.filter((l) => l.status === "failed");

  const displayed =
    tab === "success" ? successLogs : tab === "failed" ? failedLogs : emailLogs;

  const handleDebug = () => {
    const last5 = emailLogs.slice(0, 5);
    console.log("=== Laatste 5 EmailLog records ===");
    last5.forEach((l, i) => {
      console.log(`[${i + 1}]`, {
        to: l.to,
        cc: l.cc,
        subject: l.subject,
        status: l.status,
        source: l.source_function,
        sent_at: l.sent_at,
        error: l.error_message || null,
      });
    });
    console.log("=================================");
    alert(`${last5.length} logs getoond in de browser console (F12)`);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Totaal</p>
              <p className="text-xl font-bold">{emailLogs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Verzonden</p>
              <p className="text-xl font-bold text-emerald-700">{successLogs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Fouten</p>
              <p className="text-xl font-bold text-red-700">{failedLogs.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug + Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">Alle ({emailLogs.length})</TabsTrigger>
            <TabsTrigger value="success">Verzonden ({successLogs.length})</TabsTrigger>
            <TabsTrigger value="failed">Fouten ({failedLogs.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" variant="outline" onClick={handleDebug} className="ml-2 gap-1 text-xs">
          <Bug className="w-3.5 h-3.5" /> Laatste 5 logs
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Laden...</div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Geen verzonden e-mails gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayed.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}