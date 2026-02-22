import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Monitor, Smartphone, Database, Mail, Server, ArrowDown, ArrowRight, AlertTriangle, Lock, Key, Globe, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const today = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });

const LayerBox = ({ color, label, children }) => (
  <div className={`rounded-lg border-2 ${color} p-4`}>
    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${color.split(" ")[0].replace("border", "text")}`}>{label}</p>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Block = ({ className, children }) => (
  <div className={`px-3 py-2 rounded-md text-xs font-medium text-center ${className}`}>{children}</div>
);

const FlowArrow = () => (
  <div className="flex justify-center py-1">
    <ArrowDown className="w-4 h-4 text-slate-400" />
  </div>
);

const FlowBlock = ({ color, children }) => (
  <div className={`px-4 py-2 rounded-lg text-xs font-medium text-center border ${color}`}>{children}</div>
);

const Section = ({ icon: Icon, title, children }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        {Icon && <Icon className="w-5 h-5 text-blue-600 shrink-0" />}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-slate-700 space-y-4">{children}</CardContent>
  </Card>
);

export default function SystemArchitectureDiagram() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    const response = await base44.functions.invoke('generateSystemArchitecturePdf', {});
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interdistri-TMS-Systeemarchitectuur-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    setDownloading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Server className="w-7 h-7 text-blue-600" />
            Systeemarchitectuur Overzicht
          </h1>
          <p className="text-sm text-slate-600 mt-1">Logische architectuur — Interdistri TMS</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="text-xs">Versie 2.0</Badge>
            <Badge variant="outline" className="text-xs">Status per: {today}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading} className="print:hidden">
          {downloading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
          Download als PDF
        </Button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-red-500" /> Encrypted Data</span>
        <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-blue-500" /> Public Endpoint</span>
        <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-green-500" /> Security Control</span>
        <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5 text-purple-500" /> External Service</span>
        <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-amber-500" /> Data Store</span>
      </div>

      {/* 1. Logisch Lagenmodel */}
      <Section icon={Monitor} title="1. Logisch Lagenmodel">
        <p>Het systeem is opgebouwd in vijf logische lagen:</p>
        <div className="space-y-3 mt-4">
          <LayerBox color="border-blue-300 bg-blue-50/50" label="Laag 1 — Presentatie">
            <Block className="bg-blue-100 text-blue-800"><Monitor className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Desktop App</Block>
            <Block className="bg-blue-100 text-blue-800"><Smartphone className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Mobiele App</Block>
            <Block className="bg-blue-100 text-blue-800">Contract Ondertekening</Block>
            <Block className="bg-blue-100 text-blue-800"><Globe className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Public SecureDownload</Block>
          </LayerBox>

          <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-300" /></div>

          <LayerBox color="border-green-300 bg-green-50/50" label="Laag 2 — Applicatielogica">
            <Block className="bg-green-100 text-green-800">Onboarding</Block>
            <Block className="bg-green-100 text-green-800">Contractbeheer</Block>
            <Block className="bg-green-100 text-green-800">HRM</Block>
            <Block className="bg-green-100 text-green-800">Tijdregistratie</Block>
            <Block className="bg-green-100 text-green-800">Planning</Block>
            <Block className="bg-green-100 text-green-800">Sleutelkastbeheer</Block>
            <Block className="bg-green-100 text-green-800">Rapportages</Block>
            <Block className="bg-green-100 text-green-800">Communicatie</Block>
            <Block className="bg-green-100 text-green-800">Back-up &amp; Herstel</Block>
          </LayerBox>

          <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-300" /></div>

          <LayerBox color="border-red-300 bg-red-50/50" label="Laag 3 — Security Layer">
            <Block className="bg-red-100 text-red-800"><Lock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Encryption Service (AES-256-GCM)</Block>
            <Block className="bg-red-100 text-red-800"><Key className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Secret Store (APP_ENCRYPTION_KEY)</Block>
            <Block className="bg-red-100 text-red-800"><Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Token Validation Layer</Block>
            <Block className="bg-red-100 text-red-800"><Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />RBAC &amp; Audit</Block>
          </LayerBox>

          <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-300" /></div>

          <LayerBox color="border-amber-300 bg-amber-50/50" label="Laag 4 — Datalaag (Entities)">
            <Block className="bg-amber-100 text-amber-800 font-bold"><Lock className="w-3 h-3 inline mr-0.5 -mt-0.5" />Employee (encrypted)</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">Contract</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">KeylockerPincode</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">SecureDownloadToken</Block>
            <Block className="bg-amber-100 text-amber-800">TimeEntry</Block>
            <Block className="bg-amber-100 text-amber-800">Trip</Block>
            <Block className="bg-amber-100 text-amber-800">Schedule</Block>
            <Block className="bg-amber-100 text-amber-800">Vehicle</Block>
            <Block className="bg-amber-100 text-amber-800">Customer</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">AuditLog</Block>
            <Block className="bg-amber-100 text-amber-800">EmailLog</Block>
            <Block className="bg-amber-100 text-amber-800">+45 overige</Block>
          </LayerBox>

          <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-300" /></div>

          <LayerBox color="border-purple-300 bg-purple-50/50" label="Laag 5 — Externe Services">
            <Block className="bg-purple-100 text-purple-800"><Mail className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Gmail API (OAuth 2.0)</Block>
            <Block className="bg-purple-100 text-purple-800"><Database className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Supabase</Block>
            <Block className="bg-purple-100 text-purple-800">File Storage</Block>
            <Block className="bg-purple-100 text-purple-800">Base44 Core (LLM, E-mail)</Block>
          </LayerBox>
        </div>
      </Section>

      {/* 2. Dataflow */}
      <Section icon={ArrowRight} title="2. Dataflow Blokdiagrammen">
        <p>Onderstaande diagrammen tonen hoe data door het systeem stroomt bij de belangrijkste processen.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Flow A: Onboarding */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">A — Onboarding & Contract</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Onboarding Wizard</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-red-200 bg-red-50 text-red-800">🔐 Encryption Service</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">Employee (encrypted)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">Contract (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">MailService (link only)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-purple-200 bg-purple-50 text-purple-800">Gmail API ↗</FlowBlock>
            </div>
          </div>

          {/* Flow B: Pincode */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">B — Pincode Aanmaak</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Onboarding Afronden</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">KeylockerPincode (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">AuditLog (CREATE)</FlowBlock>
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-[10px] text-green-700 text-center">Pincode verlaat het systeem NOOIT</p>
              </div>
            </div>
          </div>

          {/* Flow C: Backup */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">C — Backup & Herstel</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Admin: Backup maken</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">Backup (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">Export functie</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-purple-200 bg-purple-50 text-purple-800">Supabase ↗</FlowBlock>
            </div>
          </div>
        </div>

        {/* Aanvullende flows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Flow D: Tijdregistratie */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">D — Tijdregistratie & Goedkeuring</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Mobiele App / Desktop</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">TimeEntry (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">Trip (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">Goedkeuring (Admin)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">TimeEntry (UPDATE: Goedgekeurd)</FlowBlock>
            </div>
          </div>

          {/* Flow E: Beveiligde Documentverzending (NIEUW) */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">E — Beveiligde Documentverzending</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Admin: Document verzenden</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-red-200 bg-red-50 text-red-800">🔐 SecureDownloadToken genereren</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">MailService (link only)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-purple-200 bg-purple-50 text-purple-800">Gmail API ↗</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">🌐 SecureDownload (publiek)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-red-200 bg-red-50 text-red-800">🛡 Token validatie + decrypt</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">Document render</FlowBlock>
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-[10px] text-green-700 text-center">✅ Geen BSN/IBAN in e-mail — alleen beveiligde link</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Trust Boundaries */}
      <Section icon={AlertTriangle} title="3. Trust Boundaries">
        <p>Trust boundaries markeren waar data het beveiligde systeem verlaat. Elke grensovergang vormt een potentieel beveiligingsrisico.</p>

        <div className="mt-4 relative">
          <div className="border-2 border-dashed border-green-300 rounded-xl p-5 bg-green-50/30">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              VERTROUWDE ZONE — Interdistri TMS
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              <Block className="bg-green-100 text-green-800"><Lock className="w-3 h-3 inline mr-0.5" />Employee (encrypted)</Block>
              <Block className="bg-green-100 text-green-800">Contract</Block>
              <Block className="bg-green-100 text-green-800">KeylockerPincode</Block>
              <Block className="bg-green-100 text-green-800">SecureDownloadToken</Block>
              <Block className="bg-green-100 text-green-800">AuditLog</Block>
              <Block className="bg-green-100 text-green-800">Alle overige entities</Block>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Block className="bg-red-100 text-red-800"><Lock className="w-3 h-3 inline mr-0.5" />Encryption Service</Block>
              <Block className="bg-red-100 text-red-800"><Key className="w-3 h-3 inline mr-0.5" />Secret Store</Block>
              <Block className="bg-red-100 text-red-800"><Shield className="w-3 h-3 inline mr-0.5" />Token Validation</Block>
            </div>

            <div className="border-t-2 border-dashed border-red-300 my-4 relative">
              <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-red-600 uppercase">
                ⚡ Trust Boundary — Data verlaat het systeem
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                <Mail className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-green-800">E-mail verzending</p>
                <p className="text-[10px] text-green-600 mt-1">Gmail API (OAuth + TLS)</p>
                <p className="text-[10px] text-green-500 font-medium">Alleen beveiligde link</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                <Globe className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-blue-800">SecureDownload</p>
                <p className="text-[10px] text-blue-600 mt-1">Token + decrypt</p>
                <p className="text-[10px] text-blue-500">48u geldig, max 10×</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                <ArrowDown className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-orange-800">PDF Download</p>
                <p className="text-[10px] text-orange-600 mt-1">Browser → lokaal</p>
                <p className="text-[10px] text-orange-500">Contract, loonrapport</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                <Database className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-purple-800">Supabase Export</p>
                <p className="text-[10px] text-purple-600 mt-1">TLS + Service Key</p>
                <p className="text-[10px] text-purple-500">Entity data (encrypted)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Samenvatting tabel */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-2 border border-slate-200 font-semibold">Kanaal</th>
                <th className="text-left p-2 border border-slate-200 font-semibold">Data die vertrekt</th>
                <th className="text-left p-2 border border-slate-200 font-semibold">Beveiliging</th>
                <th className="text-left p-2 border border-slate-200 font-semibold">Risico</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">E-mail (Stamkaart/Onboarding)</td>
                <td className="p-2 border border-slate-200 text-green-700 font-medium">Alleen beveiligde downloadlink</td>
                <td className="p-2 border border-slate-200">OAuth 2.0 + TLS + Token</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-green-100 text-green-700 text-[10px]">Laag</Badge></td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 border border-slate-200 font-medium">SecureDownload (publiek)</td>
                <td className="p-2 border border-slate-200">Stamkaart met BSN/IBAN (server-side decrypt)</td>
                <td className="p-2 border border-slate-200">Token + expiry + download limit</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-green-100 text-green-700 text-[10px]">Laag</Badge></td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">PDF Download</td>
                <td className="p-2 border border-slate-200">Contract, loonrapport</td>
                <td className="p-2 border border-slate-200">Gebruiker-sessie</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge></td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 border border-slate-200 font-medium">Supabase Export</td>
                <td className="p-2 border border-slate-200">Alle entity data (BSN/IBAN encrypted)</td>
                <td className="p-2 border border-slate-200">TLS + Service Role Key</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge></td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">Sleutelkastpincode</td>
                <td className="p-2 border border-slate-200 font-medium italic text-green-700">Verlaat systeem NOOIT</td>
                <td className="p-2 border border-slate-200">Intern + audit</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-green-100 text-green-700 text-[10px]">Geen</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-xs text-slate-400 italic text-center pb-4">
        Architectuurstatus per: {today} — Confidential — Internal Use Only
      </div>
    </div>
  );
}