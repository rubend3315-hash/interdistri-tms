import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Monitor, Smartphone, Database, Mail, Server, ArrowDown, ArrowRight, AlertTriangle } from "lucide-react";

const VERSIE = "1.0";
const LAATSTE_UPDATE = "2026-02-22";

const LayerBox = ({ color, label, children }) => (
  <div className={`rounded-lg border-2 ${color} p-4`}>
    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${color.replace("border-", "text-").replace("bg-", "text-").split(" ")[0].replace("border", "text")}`}>{label}</p>
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
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Server className="w-8 h-8 text-blue-600" />
          Systeemarchitectuur Overzicht
        </h1>
        <p className="text-lg text-slate-600 mt-1">Logische architectuur — Interdistri TMS</p>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className="text-xs">Versie {VERSIE}</Badge>
          <Badge variant="outline" className="text-xs">Laatste update: {LAATSTE_UPDATE}</Badge>
        </div>
      </div>

      {/* 1. Logisch Lagenmodel */}
      <Section icon={Monitor} title="1. Logisch Lagenmodel">
        <p>Het systeem is opgebouwd in vier logische lagen:</p>

        <div className="space-y-3 mt-4">
          {/* Laag 1 */}
          <LayerBox color="border-blue-300 bg-blue-50/50" label="Laag 1 — Presentatie">
            <Block className="bg-blue-100 text-blue-800">
              <Monitor className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Desktop App
            </Block>
            <Block className="bg-blue-100 text-blue-800">
              <Smartphone className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Mobiele App
            </Block>
            <Block className="bg-blue-100 text-blue-800">Contract Ondertekening</Block>
          </LayerBox>

          <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-300" /></div>

          {/* Laag 2 */}
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

          {/* Laag 3 */}
          <LayerBox color="border-amber-300 bg-amber-50/50" label="Laag 3 — Datalaag (Entities)">
            <Block className="bg-amber-100 text-amber-800 font-bold">Employee</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">Contract</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">KeylockerPincode</Block>
            <Block className="bg-amber-100 text-amber-800">TimeEntry</Block>
            <Block className="bg-amber-100 text-amber-800">Trip</Block>
            <Block className="bg-amber-100 text-amber-800">Schedule</Block>
            <Block className="bg-amber-100 text-amber-800">Vehicle</Block>
            <Block className="bg-amber-100 text-amber-800">Customer</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">AuditLog</Block>
            <Block className="bg-amber-100 text-amber-800 font-bold">Backup</Block>
            <Block className="bg-amber-100 text-amber-800">EmailLog</Block>
            <Block className="bg-amber-100 text-amber-800">+45 overige</Block>
          </LayerBox>

          <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-300" /></div>

          {/* Laag 4 */}
          <LayerBox color="border-purple-300 bg-purple-50/50" label="Laag 4 — Externe Services">
            <Block className="bg-purple-100 text-purple-800">
              <Mail className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Gmail API
            </Block>
            <Block className="bg-purple-100 text-purple-800">
              <Database className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Supabase
            </Block>
            <Block className="bg-purple-100 text-purple-800">File Storage</Block>
            <Block className="bg-purple-100 text-purple-800">Base44 Core (LLM, E-mail)</Block>
          </LayerBox>
        </div>
      </Section>

      {/* 2. Dataflow Blokdiagram */}
      <Section icon={ArrowRight} title="2. Dataflow Blokdiagrammen">
        <p>Onderstaande diagrammen tonen hoe data door het systeem stroomt bij de belangrijkste processen.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">

          {/* Flow A: Onboarding → Contract → Mail */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">A — Onboarding & Contract</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Onboarding Wizard</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">Employee (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-amber-200 bg-amber-50 text-amber-800">Contract (CREATE)</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">MailService</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-purple-200 bg-purple-50 text-purple-800">Gmail API ↗</FlowBlock>
            </div>
          </div>

          {/* Flow B: Onboarding → Pincode */}
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

          {/* Flow C: Backup → Supabase */}
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

          {/* Flow E: Stamkaart e-mail */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">E — Stamkaart naar Loonadministratie</p>
            <div className="flex flex-col items-center gap-0">
              <FlowBlock color="border-blue-200 bg-blue-50 text-blue-800">Admin: Stamkaart verzenden</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">sendStamkaartEmail</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-green-200 bg-green-50 text-green-800">MailService</FlowBlock>
              <FlowArrow />
              <FlowBlock color="border-purple-200 bg-purple-50 text-purple-800">Gmail API ↗</FlowBlock>
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-[10px] text-red-700 text-center">⚠ Bevat BSN, IBAN, adres</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Trust Boundaries */}
      <Section icon={AlertTriangle} title="3. Trust Boundaries">
        <p>Trust boundaries markeren waar data het beveiligde systeem verlaat. Elke grensovergang vormt een potentieel beveiligingsrisico.</p>

        <div className="mt-4 relative">
          {/* Interne zone */}
          <div className="border-2 border-dashed border-green-300 rounded-xl p-5 bg-green-50/30">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              VERTROUWDE ZONE — Interdistri TMS
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Block className="bg-green-100 text-green-800">Employee</Block>
              <Block className="bg-green-100 text-green-800">Contract</Block>
              <Block className="bg-green-100 text-green-800">KeylockerPincode</Block>
              <Block className="bg-green-100 text-green-800">AuditLog</Block>
              <Block className="bg-green-100 text-green-800">TimeEntry</Block>
              <Block className="bg-green-100 text-green-800">Schedule</Block>
              <Block className="bg-green-100 text-green-800">Alle overige entities</Block>
            </div>

            {/* Boundary lijn */}
            <div className="border-t-2 border-dashed border-red-300 my-4 relative">
              <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-red-600 uppercase">
                ⚡ Trust Boundary — Data verlaat het systeem
              </span>
            </div>

            {/* Uitgaande kanalen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                <Mail className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-red-800">E-mail verzending</p>
                <p className="text-[10px] text-red-600 mt-1">Gmail API (OAuth + TLS)</p>
                <p className="text-[10px] text-red-500">BSN/IBAN mogelijk</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                <ArrowDown className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-orange-800">PDF Download</p>
                <p className="text-[10px] text-orange-600 mt-1">Browser → lokaal</p>
                <p className="text-[10px] text-orange-500">Contract, loonrapport</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <Monitor className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-amber-800">Print</p>
                <p className="text-[10px] text-amber-600 mt-1">Browser print → papier</p>
                <p className="text-[10px] text-amber-500">Stamkaart, onboarding</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                <Database className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-purple-800">Supabase Export</p>
                <p className="text-[10px] text-purple-600 mt-1">TLS + Service Key</p>
                <p className="text-[10px] text-purple-500">Alle entity data</p>
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
                <td className="p-2 border border-slate-200 font-medium">E-mail (Stamkaart)</td>
                <td className="p-2 border border-slate-200">BSN, IBAN, adres, loongegevens</td>
                <td className="p-2 border border-slate-200">OAuth 2.0 + TLS</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge></td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 border border-slate-200 font-medium">E-mail (Contract)</td>
                <td className="p-2 border border-slate-200">Contractgegevens, naam, functie</td>
                <td className="p-2 border border-slate-200">OAuth 2.0 + TLS</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge></td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">PDF Download</td>
                <td className="p-2 border border-slate-200">Contract, loonrapport</td>
                <td className="p-2 border border-slate-200">Gebruiker-sessie</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge></td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 border border-slate-200 font-medium">Print</td>
                <td className="p-2 border border-slate-200">Stamkaart, onboarding dossier</td>
                <td className="p-2 border border-slate-200">Fysiek (papier)</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge></td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-medium">Supabase Export</td>
                <td className="p-2 border border-slate-200">Alle entity data (incl. BSN, IBAN)</td>
                <td className="p-2 border border-slate-200">TLS + Service Role Key</td>
                <td className="p-2 border border-slate-200"><Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge></td>
              </tr>
              <tr className="bg-slate-50/50">
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
        Dit document is gegenereerd op basis van de actuele systeemconfiguratie per {LAATSTE_UPDATE} en is uitsluitend bestemd voor interne architectuurdocumentatie.
      </div>
    </div>
  );
}