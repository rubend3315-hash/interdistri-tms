import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, FileText, Code, Wrench, Server, Layout } from "lucide-react";

const SECTIONS = [
  {
    title: "Pagina's",
    icon: Layout,
    color: "bg-blue-50 text-blue-700",
    items: [
      { path: "pages/MobileEntry", frozen: true },
      { path: "pages/MobileHandleiding" },
      { path: "pages/MobileBedrijfsreglement" },
    ]
  },
  {
    title: "Componenten — Direct geïmporteerd",
    icon: FileText,
    color: "bg-emerald-50 text-emerald-700",
    items: [
      { path: "components/mobile/MobileHeader" },
      { path: "components/mobile/MobileMenu" },
      { path: "components/mobile/MobileFrontpage" },
      { path: "components/mobile/MobileSignatureDialog" },
      { path: "components/mobile/MobileReglementTab" },
      { path: "components/mobile/MobileHandleidingTab" },
      { path: "components/mobile/MobilePlanningTab" },
      { path: "components/mobile/WeekHeader" },
      { path: "components/mobile/tabs/MobileDienstTab" },
      { path: "components/mobile/tabs/DienstRegelsTab" },
      { path: "components/mobile/tabs/MobileInspectionTab" },
      { path: "components/mobile/tabs/MobileExpenseTab" },
      { path: "components/mobile/tabs/MobileOverviewTab" },
      { path: "components/mobile/tabs/MobileMessagesTab" },
      { path: "components/mobile/tabs/MobileLinksTab" },
    ]
  },
  {
    title: "Sub-componenten",
    icon: Code,
    color: "bg-purple-50 text-purple-700",
    items: [
      { path: "components/mobile/dienstregels/DienstRegelDrawer" },
      { path: "components/mobile/dienstregels/DienstRegelRow" },
      { path: "components/mobile/dienstregels/DeleteConfirmDialog" },
      { path: "components/mobile/MobileStepIndicator" },
      { path: "components/mobile/StandplaatsWerkSection" },
      { path: "components/mobile/AutoSaveIndicator" },
      { path: "components/mobile/overview/WeekCard" },
      { path: "components/mobile/overview/WeekDetail" },
      { path: "components/mobile/overview/WeekNavigator" },
      { path: "components/mobile/overview/WeekSelector" },
      { path: "components/mobile/tabs/MobileRittenTab", note: "deprecated" },
    ]
  },
  {
    title: "Utilities — Mobiel-specifiek",
    icon: Wrench,
    color: "bg-amber-50 text-amber-700",
    items: [
      { path: "components/utils/mobile/useMobileData" },
      { path: "components/utils/mobile/useMobileForm" },
      { path: "components/utils/mobile/useMobileSubmit" },
      { path: "components/utils/mobile/useBusinessMode" },
      { path: "components/utils/mobile/useEntrySubmit" },
      { path: "components/utils/mobile/syncDienstEndTime" },
      { path: "components/utils/mobile/timeLogicTests" },
      { path: "components/utils/mobile/timePolicy" },
      { path: "components/utils/mobile/dienstRegelValidation" },
      { path: "components/utils/mobile/signatureCompressor" },
      { path: "components/utils/mobile/clientSubmitLogger" },
      { path: "components/utils/mobile/safariHardenedFetch" },
      { path: "components/utils/mobile/assertTimelineConsistency" },
      { path: "components/utils/useOfflineSync" },
      { path: "components/utils/offlineStorage" },
      { path: "components/hooks/useMobileEntryMode" },
    ]
  },
  {
    title: "Backend Functies",
    icon: Server,
    color: "bg-red-50 text-red-700",
    items: [
      { path: "functions/submitTimeEntry" },
      { path: "functions/upsertDraftTimeEntry" },
    ]
  },
];

export default function MobileEntryFiles() {
  const totalFiles = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-8 h-8 text-blue-600" />
          MobileEntry — Bestandsoverzicht
        </h1>
        <p className="text-slate-500 mt-1">
          Alle {totalFiles} bestanden verbonden met de Mobiele Invoer module.
          <br />
          <span className="text-sm text-amber-600 font-medium">
            Deze bestanden moeten frozen worden gezet om onbedoelde wijzigingen te voorkomen.
          </span>
        </p>
      </div>

      {SECTIONS.map(section => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
                <section.icon className="w-4 h-4" />
              </div>
              {section.title}
              <Badge variant="outline" className="ml-auto">{section.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {section.items.map(item => (
                <div key={item.path} className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
                  <code className="text-xs font-mono text-slate-700 flex-1">{item.path}</code>
                  {item.frozen && (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                      <Lock className="w-3 h-3 mr-1" /> FROZEN
                    </Badge>
                  )}
                  {item.note && (
                    <Badge variant="outline" className="text-[10px] text-slate-500">{item.note}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}