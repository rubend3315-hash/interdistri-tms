import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle2, Circle, AlertTriangle, TrendingUp, Server, Key, Eye } from "lucide-react";

const VERSIE = "1.0";
const LAATSTE_UPDATE = "2026-02-22";

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

const Check = ({ children }) => (
  <div className="flex items-center gap-2 text-xs">
    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
    <span>{children}</span>
  </div>
);

const Planned = ({ children }) => (
  <div className="flex items-center gap-2 text-xs">
    <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    <span>{children}</span>
  </div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50">{headers.map((h, i) => <th key={i} className="text-left p-2 border border-slate-200 font-semibold text-slate-700">{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((row, ri) => <tr key={ri} className={ri % 2 ? "bg-slate-50/50" : ""}>{row.map((cell, ci) => <td key={ci} className="p-2 border border-slate-200">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export default function SecurityRoadmap() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Security Upgrade Roadmap 2026
        </h1>
        <p className="text-lg text-slate-600 mt-1">Beveiligingsvolwassenheid — Interdistri TMS</p>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className="text-xs">Versie {VERSIE}</Badge>
          <Badge variant="outline" className="text-xs">Laatste update: {LAATSTE_UPDATE}</Badge>
        </div>
      </div>

      {/* 1. Huidige Situatie */}
      <Section icon={Eye} title="1. Huidige Situatie (2026)">
        <p>Het Interdistri TMS beschikt op dit moment over de volgende beveiligingsmaatregelen:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <Check>Rolgebaseerde toegang (Admin / User met permissies)</Check>
          <Check>Audit logging op beveiligingsrelevante acties</Check>
          <Check>TLS (HTTPS) voor alle externe communicatie</Check>
          <Check>Module-scheiding (Onboarding vs. Pincodebeheer)</Check>
          <Check>Dubbele back-upstrategie (intern + Supabase)</Check>
          <Check>Beveiligd pincodebeheer met 30s view en bevestiging</Check>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-3">
          <p className="text-xs text-amber-800">
            <strong>Huidig hiaat:</strong> Geen field-level encryptie voor gevoelige velden (BSN, IBAN, pincode). Data is in plaintext opgeslagen in de database. Dit is een platformbeperking van Base44.
          </p>
        </div>
      </Section>

      {/* 2. Maturity Levels */}
      <Section icon={TrendingUp} title="2. Beveiligingsvolwassenheid — Maturity Levels">
        <div className="space-y-6">

          {/* Level 1 */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-600 text-white text-xs">LEVEL 1</Badge>
              <h4 className="font-semibold text-green-900">BASIC — Huidige situatie</h4>
              <Badge className="bg-green-100 text-green-700 text-[10px] ml-auto">Actief</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <Check>TLS transport voor alle externe communicatie</Check>
              <Check>Audit logging (AuditLog entity)</Check>
              <Check>Rolrestricties (admin vs. user)</Check>
              <Check>Gescheiden modules (onboarding ≠ pincodebeheer)</Check>
              <Check>Bevestigingscodes bij back-upherstel</Check>
              <Check>Idempotency checks bij e-mailverzending</Check>
              <Check>Beveiligd pincode-inzicht (30s + bevestiging)</Check>
              <Check>Automatische pincode-aanmaak bij onboarding</Check>
            </div>
          </div>

          {/* Level 2 */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-blue-600 text-white text-xs">LEVEL 2</Badge>
              <h4 className="font-semibold text-blue-900">PROFESSIONAL — Aanbevolen verbeteringen</h4>
              <Badge className="bg-blue-100 text-blue-700 text-[10px] ml-auto">Gepland</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <Planned>Field-level encryptie voor BSN</Planned>
              <Planned>Field-level encryptie voor IBAN</Planned>
              <Planned>Field-level encryptie voor Pincode</Planned>
              <Planned>Backup-data versleutelen (AES-256)</Planned>
              <Planned>Signed URLs voor document downloads</Planned>
              <Planned>Stamkaart via secure download link i.p.v. e-mail</Planned>
              <Planned>Pincode hashing + decryptie alleen server-side</Planned>
              <Planned>Rate limiting op gevoelige endpoints</Planned>
            </div>
            <div className="p-3 bg-white/60 rounded-lg mt-3">
              <p className="text-xs text-blue-800">
                <strong>Impact:</strong> Eliminatie van de grootste risico's (plaintext BSN/IBAN, onversleutelde backups). Vereist platform-ondersteuning voor field-level encryptie of een custom encryptie-laag in backend functions.
              </p>
            </div>
          </div>

          {/* Level 3 */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-purple-600 text-white text-xs">LEVEL 3</Badge>
              <h4 className="font-semibold text-purple-900">ENTERPRISE — Langetermijn</h4>
              <Badge className="bg-purple-100 text-purple-700 text-[10px] ml-auto">Toekomst</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <Planned>Hardware Security Module (HSM) of HashiCorp Vault</Planned>
              <Planned>Key rotation beleid (automatisch)</Planned>
              <Planned>SIEM logging integratie</Planned>
              <Planned>Intrusion Detection System (IDS)</Planned>
              <Planned>2FA voor Admin accounts</Planned>
              <Planned>Automatische pincode-rotatie (periodiek)</Planned>
              <Planned>Data Loss Prevention (DLP) beleid</Planned>
              <Planned>Penetratietests (jaarlijks)</Planned>
            </div>
            <div className="p-3 bg-white/60 rounded-lg mt-3">
              <p className="text-xs text-purple-800">
                <strong>Impact:</strong> Maximale beveiliging geschikt voor enterprise-schaal en compliance-eisen (ISO 27001, AVG audit-trail). Vereist significante infrastructuurinvestering.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Prioriteiten 2026 */}
      <Section icon={AlertTriangle} title="3. Prioriteiten 2026">
        <Table
          headers={["Prioriteit", "Maatregel", "Risico dat het mitigeert", "Complexiteit", "Status"]}
          rows={[
            [
              <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>,
              "Encryptie BSN en IBAN",
              "Plaintext persoonsgegevens in database",
              "Hoog (platform-afhankelijk)",
              <Badge variant="outline" className="text-[10px]">Gepland</Badge>
            ],
            [
              <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>,
              "Backup-data versleutelen",
              "Onversleutelde backups bevatten alle gevoelige data",
              "Medium",
              <Badge variant="outline" className="text-[10px]">Gepland</Badge>
            ],
            [
              <Badge className="bg-orange-100 text-orange-700 text-[10px]">Middel</Badge>,
              "Signed File URLs",
              "Publiek toegankelijke document-URLs",
              "Laag",
              <Badge variant="outline" className="text-[10px]">Gepland</Badge>
            ],
            [
              <Badge className="bg-orange-100 text-orange-700 text-[10px]">Middel</Badge>,
              "Pincode encryptie / hashing",
              "Plaintext pincode in database",
              "Medium",
              <Badge variant="outline" className="text-[10px]">Gepland</Badge>
            ],
            [
              <Badge className="bg-orange-100 text-orange-700 text-[10px]">Middel</Badge>,
              "Stamkaart via secure link i.p.v. e-mail",
              "BSN/IBAN in e-mail naar loonadministratie",
              "Medium",
              <Badge variant="outline" className="text-[10px]">Gepland</Badge>
            ],
            [
              <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Laag</Badge>,
              "SIEM logging integratie",
              "Beperkte real-time monitoring",
              "Hoog",
              <Badge variant="outline" className="text-[10px]">Toekomst</Badge>
            ],
            [
              <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Laag</Badge>,
              "HSM / Vault voor key management",
              "Encryptiesleutels in applicatie-omgeving",
              "Hoog",
              <Badge variant="outline" className="text-[10px]">Toekomst</Badge>
            ],
            [
              <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Laag</Badge>,
              "2FA voor Admin accounts",
              "Account-overname via gestolen wachtwoord",
              "Medium (platform-afhankelijk)",
              <Badge variant="outline" className="text-[10px]">Toekomst</Badge>
            ],
          ]}
        />
      </Section>

      {/* Visuele roadmap */}
      <Section icon={TrendingUp} title="4. Roadmap Tijdlijn">
        <div className="relative">
          {/* Tijdlijn */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          {/* Q1 2026 */}
          <div className="relative pl-10 pb-8">
            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
            <div>
              <Badge className="bg-green-100 text-green-700 text-[10px] mb-1">Q1 2026</Badge>
              <h4 className="font-semibold text-slate-900 text-sm">Fundament — Huidige situatie vastleggen</h4>
              <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                <li>✅ Security Architectuur documentatie</li>
                <li>✅ Security Roadmap documentatie</li>
                <li>✅ Risico-inventarisatie afgerond</li>
              </ul>
            </div>
          </div>

          {/* Q2 2026 */}
          <div className="relative pl-10 pb-8">
            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
            <div>
              <Badge className="bg-blue-100 text-blue-700 text-[10px] mb-1">Q2 2026</Badge>
              <h4 className="font-semibold text-slate-900 text-sm">Fase 1 — Encryptie implementatie</h4>
              <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                <li>○ Field-level encryptie BSN en IBAN</li>
                <li>○ Pincode hashing implementatie</li>
                <li>○ Backup-versleuteling (AES-256)</li>
              </ul>
            </div>
          </div>

          {/* Q3 2026 */}
          <div className="relative pl-10 pb-8">
            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white" />
            <div>
              <Badge className="bg-orange-100 text-orange-700 text-[10px] mb-1">Q3 2026</Badge>
              <h4 className="font-semibold text-slate-900 text-sm">Fase 2 — Document- en communicatiebeveiliging</h4>
              <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                <li>○ Signed URLs voor File Storage</li>
                <li>○ Secure download link voor stamkaart (vervangt e-mail)</li>
                <li>○ Rate limiting op gevoelige endpoints</li>
              </ul>
            </div>
          </div>

          {/* Q4 2026+ */}
          <div className="relative pl-10">
            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-white" />
            <div>
              <Badge className="bg-purple-100 text-purple-700 text-[10px] mb-1">Q4 2026+</Badge>
              <h4 className="font-semibold text-slate-900 text-sm">Fase 3 — Enterprise security</h4>
              <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                <li>○ 2FA voor Admin accounts</li>
                <li>○ SIEM logging integratie</li>
                <li>○ Automatische pincode-rotatie</li>
                <li>○ Penetratietest planning</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Conclusie */}
      <Section icon={Shield} title="5. Conclusie">
        <p>
          De huidige beveiligingsarchitectuur (Level 1 — Basic) biedt een solide basis voor MKB-operatie met rolgebaseerde toegang, audit logging en module-scheiding. De roadmap beschrijft een gefaseerd pad naar Level 2 (Professional) en uiteindelijk Level 3 (Enterprise) beveiliging.
        </p>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
          <p className="text-xs text-blue-800">
            <strong>Directe aanbeveling:</strong> Prioriteit geven aan field-level encryptie voor BSN en IBAN (Q2 2026) en backup-versleuteling. Dit elimineert de twee grootste risico's in de huidige architectuur.
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-4 italic">
          Dit document is opgesteld per {LAATSTE_UPDATE} en dient als planningsdocument voor beveiligingsverbeteringen. Status van individuele maatregelen wordt periodiek bijgewerkt.
        </p>
      </Section>
    </div>
  );
}