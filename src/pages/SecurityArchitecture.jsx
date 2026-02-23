import React, { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Database, Mail, FileText, Users, Key, AlertTriangle, CheckCircle2, Server, Eye, Download } from "lucide-react";
import { SECURITY_VERSION, SECURITY_LAST_UPDATED } from "@/components/utils/appVersion";

const VERSIE = SECURITY_VERSION;
const LAATSTE_UPDATE = SECURITY_LAST_UPDATED;

const Section = ({ id, icon: Icon, title, children }) => (
  <Card id={id} className="scroll-mt-6">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        {Icon && <Icon className="w-5 h-5 text-blue-600 shrink-0" />}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-slate-700 space-y-4">{children}</CardContent>
  </Card>
);

const Table = ({ headers, rows, className }) => (
  <div className={`overflow-x-auto ${className || ''}`}>
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50">{headers.map((h, i) => <th key={i} className="text-left p-2 border border-slate-200 font-semibold text-slate-700">{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((row, ri) => <tr key={ri} className={ri % 2 ? "bg-slate-50/50" : ""}>{row.map((cell, ci) => <td key={ci} className="p-2 border border-slate-200">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export default function SecurityArchitecture() {
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Security Architectuur — Interdistri TMS
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Badge className="bg-blue-100 text-blue-800 text-xs">{VERSIE}</Badge>
            <Badge variant="outline" className="text-xs">Laatste update: {LAATSTE_UPDATE}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-2">Interne security-documentatie & auditreferentie. Alleen zichtbaar voor Admin.</p>
        </div>
        <Button onClick={handlePrintPdf} variant="outline" className="print:hidden shrink-0 gap-2">
          <Download className="w-4 h-4" />
          Exporteer als PDF
        </Button>
      </div>

      {/* 1. Doel en Scope */}
      <Section id="scope" icon={FileText} title="1. Doel en Scope">
        <p>Dit document beschrijft de beveiligingsarchitectuur van het Interdistri TMS-systeem. Het omvat:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dataclassificatie</strong> — welke gegevens als gevoelig worden beschouwd</li>
          <li><strong>Autorisatiemodel</strong> — rollen, rechten en kritieke acties</li>
          <li><strong>Dataflows</strong> — hoe data door het systeem stroomt</li>
          <li><strong>Externe koppelingen</strong> — welke externe services worden gebruikt</li>
          <li><strong>Encryptiebeleid</strong> — transportbeveiliging en veldniveau-encryptie</li>
          <li><strong>Logging & audittrail</strong> — wat er wordt gelogd en door wie</li>
          <li><strong>Back-up & herstel</strong> — continuïteitsmaatregelen</li>
          <li><strong>Risico-overzicht</strong> — bekende risico's en mitigatie</li>
        </ul>
      </Section>

      {/* 2. Architectuuroverzicht */}
      <Section id="architectuur" icon={Server} title="2. Architectuuroverzicht">
        <p>Het systeem is opgebouwd uit gescheiden modules met elk een eigen verantwoordelijkheid:</p>
        <Table
          headers={["Module", "Type", "Toelichting"]}
          rows={[
            ["Onboarding", "Juridisch dossier", "Verklaringen, handtekeningen, stamkaart. Bevat géén sleutelkastpincode."],
            ["Contractbeheer", "Juridisch & HR", "Contractgeneratie, ondertekening, activering en archivering."],
            ["Sleutelkastbeheer", "Operationele security", "Pincodebeheer volledig losgekoppeld van onboarding. Eigen entity, eigen audit."],
            ["HRM-instellingen", "Configuratie", "Afdelingen, functies, loontabellen, e-mail sjablonen, pincodebeheer."],
            ["Tijdregistratie", "Operationeel", "Uren, diensten, goedkeuringen met audit trail."],
            ["Planning", "Operationeel", "Weekroosters, capaciteit, drag & drop."],
            ["Back-upbeheer", "Continuïteit", "Interne JSON-backups en Supabase export."],
            ["Communicatie", "Operationeel", "E-mail via Gmail API, interne berichten."],
          ]}
        />
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
          <p className="text-xs text-blue-800">
            <strong>Architectuurprincipe:</strong> Onboarding = juridisch dossier. Sleutelkastbeheer = operationeel beveiligingsbeheer. Deze modules zijn volledig gescheiden.
          </p>
        </div>
      </Section>

      {/* 3. Dataclassificatie */}
      <Section id="dataclassificatie" icon={Database} title="3. Dataclassificatie">
        <p>De volgende gegevenstypen worden als <strong>hooggevoelig</strong> geclassificeerd:</p>
        <Table
          headers={["Gegevenstype", "Classificatie", "Voorkomt in entity", "Encrypted opgeslagen?"]}
          rows={[
            ["BSN (Burgerservicenummer)", <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>, "Employee", "Nee (plaintext)"],
            ["IBAN (Bankrekening)", <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>, "Employee", "Nee (plaintext)"],
            ["ID-documentnummer", <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>, "Employee", "Nee (plaintext)"],
            ["Contractgegevens", <Badge className="bg-orange-100 text-orange-700 text-[10px]">Hoog</Badge>, "Contract, Employee", "Nee"],
            ["Loongegevens (uurloon, schaal)", <Badge className="bg-orange-100 text-orange-700 text-[10px]">Hoog</Badge>, "Employee, SalaryTable, Contract", "Nee"],
            ["Sleutelkastpincode", <Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge>, "KeylockerPincode", "Nee (plaintext)"],
            ["Handtekeningen (URL)", <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Medium</Badge>, "Contract, OnboardingProcess, Employee", "Nee (URL-gebaseerd)"],
          ]}
        />
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
          <p className="text-xs text-amber-800">
            <strong>Encryptiebeleid:</strong> Field-level encryptie is niet actief (platformbeperking Base44). Alle transport verloopt via TLS (HTTPS). Aanbeveling: bij schaalvergroting field-level encryptie implementeren voor BSN en IBAN.
          </p>
        </div>
      </Section>

      {/* 4. Autorisatie & Rollenmodel */}
      <Section id="rollen" icon={Users} title="4. Autorisatie & Rollenmodel">
        <p>Het systeem kent twee primaire rollen:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-1">🔑 Admin</h4>
            <ul className="text-xs text-blue-800 space-y-0.5">
              <li>• Volledige toegang tot alle modules</li>
              <li>• Kan gebruikers uitnodigen en rollen toekennen</li>
              <li>• Kan gevoelige operaties uitvoeren (zie onder)</li>
              <li>• Toegang tot audit log en back-ups</li>
            </ul>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-1">👤 User (Medewerker)</h4>
            <ul className="text-xs text-green-800 space-y-0.5">
              <li>• Beperkte toegang op basis van permissions-array</li>
              <li>• Non-admin wordt doorgestuurd naar Mobiele App</li>
              <li>• Kan eigen contract ondertekenen</li>
              <li>• Geen toegang tot gevoelige HR-data</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 font-semibold text-slate-800">Kritieke acties (uitsluitend Admin):</p>
        <Table
          headers={["Actie", "Module", "Audit gelogd?"]}
          rows={[
            ["Pincode bekijken (30s beveiligd)", "Pincodebeheer", "Ja"],
            ["Pincode wijzigen / genereren", "Pincodebeheer", "Ja"],
            ["Onboarding afronden", "Onboarding", "Ja (auto-pincode)"],
            ["Contract activeren (management ondertekening)", "Contracten", "Ja"],
            ["Stamkaart verzenden naar loonadministratie", "Stamkaart", "Ja"],
            ["Back-up maken / herstellen", "Back-ups", "Nee (admin-only)"],
            ["Supabase export / import", "Back-ups", "Nee (admin-only)"],
            ["Gebruiker uitnodigen / rollen wijzigen", "Gebruikers", "Ja"],
            ["E-mail bulk verzenden", "Communicatie", "Ja (via EmailLog)"],
          ]}
        />
      </Section>

      {/* 5. Sleutelkastbeheer Architectuur */}
      <Section id="sleutelkast" icon={Key} title="5. Sleutelkastbeheer Architectuur">
        <p>Sleutelkastpincodes worden beheerd in een eigen entity (<code>KeylockerPincode</code>), volledig losgekoppeld van het onboardingproces.</p>
        
        <h4 className="font-semibold text-slate-800 mt-3">Automatische aanmaak</h4>
        <ul className="list-disc pl-5 space-y-0.5 text-xs">
          <li>Bij afronden onboarding: systeem controleert of actieve pincode bestaat</li>
          <li>Indien niet: automatische 4-cijferige pincode gegenereerd</li>
          <li>Verboden codes (0000, 1234, 1111, etc.) worden geblokkeerd</li>
          <li>Bron wordt gelogd als <code>source: "onboarding"</code></li>
        </ul>

        <h4 className="font-semibold text-slate-800 mt-3">Beveiligingsmaatregelen</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
          {[
            "Geen zichtbaarheid in onboarding UI",
            "Geen zichtbaarheid in print of PDF",
            "Geen verzending via e-mail",
            "30 seconden beveiligde weergave",
            "Bevestigingsdialoog vóór weergave",
            "Audit logging op elke actie (view, wijzig, aanmaak)",
            "Duplicaatcontrole op actieve pincodes",
            "Alleen Admin heeft toegang",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Dataflows */}
      <Section id="dataflows" icon={FileText} title="6. Dataflows">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-800">6.1 Onboarding Flow</h4>
            <ol className="list-decimal pl-5 text-xs space-y-0.5 mt-1">
              <li>Admin start onboarding → persoonsgegevens invoeren (lokale state)</li>
              <li>Stamkaart invullen → optioneel e-mailen naar loonadministratie (Gmail API)</li>
              <li>Verklaringen ondertekenen → handtekening uploaden (File Storage)</li>
              <li>Contract genereren → backend functie → Contract entity</li>
              <li>Medewerker uitnodigen → User entity + welkomstmail (Gmail API)</li>
              <li>Afronden → Employee CREATE, OnboardingProcess CREATE, KeylockerPincode CREATE</li>
            </ol>
            <p className="text-xs text-slate-500 mt-1">Data die systeem verlaat: stamkaart-email (BSN, IBAN), welkomstmail (naam, e-mail)</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800">6.2 Contract Flow</h4>
            <ol className="list-decimal pl-5 text-xs space-y-0.5 mt-1">
              <li>Contract genereren (Concept) → sjabloon + medewerkergegevens</li>
              <li>Verzenden ter ondertekening → Gmail API → medewerker</li>
              <li>Medewerker tekent → handtekening upload → Contract UPDATE</li>
              <li>Management tekent → Contract status "Actief"</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800">6.3 Mailflow (Gmail API)</h4>
            <ol className="list-decimal pl-5 text-xs space-y-0.5 mt-1">
              <li>Alle e-mails via centrale <code>mailService</code> backend functie</li>
              <li>Template resolution via EmailTemplate entity</li>
              <li>Idempotency check via EmailLog (voorkomt duplicaten)</li>
              <li>Verzending via Gmail API (OAuth 2.0 + TLS)</li>
              <li>Resultaat gelogd in EmailLog + AuditLog</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800">6.4 Print / PDF Flow</h4>
            <ol className="list-decimal pl-5 text-xs space-y-0.5 mt-1">
              <li>Onboarding print: stamkaart + verklaringen + handtekening — <strong>geen pincode</strong></li>
              <li>Stamkaart print: BSN, IBAN, adres, loongegevens</li>
              <li>Loonrapport PDF: uuroverzicht, toeslagen (geen BSN/IBAN)</li>
              <li>Contract PDF: contracttekst met persoonsgegevens</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800">6.5 Sleutelkastbeheer Flow</h4>
            <ol className="list-decimal pl-5 text-xs space-y-0.5 mt-1">
              <li>Onboarding afgerond → automatische pincode in KeylockerPincode</li>
              <li>HR bekijkt pincode → bevestigingsdialoog → 30s zichtbaar → audit log</li>
              <li>HR wijzigt pincode → oude deactiveren → nieuwe aanmaken → audit log</li>
              <li>Pincode verlaat het systeem <strong>nooit</strong></li>
            </ol>
          </div>
        </div>
      </Section>

      {/* 7. Logging & Audittrail */}
      <Section id="audit" icon={Eye} title="7. Logging & Audittrail">
        <p>Alle beveiligingsrelevante acties worden vastgelegd in de <code>AuditLog</code> entity.</p>
        <Table
          headers={["Actie-type", "Voorbeeld", "Bevat gevoelige data?"]}
          rows={[
            ["create", "Medewerker aangemaakt, pincode gegenereerd", "Nee (alleen beschrijving)"],
            ["update", "Contract status gewijzigd, permissies aangepast", "Nee"],
            ["delete", "Record verwijderd", "Nee"],
            ["send", "E-mail verzonden", "Nee (alleen status)"],
            ["sign", "Contract ondertekend", "Nee"],
            ["approve / reject", "Uren goedgekeurd of afgekeurd", "Nee"],
            ["read (pincode)", "Pincode bekeken", "Nee (alleen employee_id)"],
            ["role_change", "Gebruikersrol gewijzigd", "Nee"],
            ["export / import", "Data geëxporteerd of geïmporteerd", "Nee"],
          ]}
        />
        <div className="p-3 bg-green-50 rounded-lg border border-green-200 mt-2">
          <p className="text-xs text-green-800">
            <strong>Beleid:</strong> Geen BSN, IBAN of andere persoonsgegevens worden opgeslagen in AuditLog metadata. Alleen functionele beschrijvingen en referentie-ID's.
          </p>
        </div>
      </Section>

      {/* 8. Externe Koppelingen */}
      <Section id="extern" icon={Server} title="8. Externe Koppelingen">
        <Table
          headers={["Service", "Doel", "Data verzonden", "Beveiliging"]}
          rows={[
            ["Gmail API", "E-mail verzending (alle typen)", "E-mailinhoud (kan BSN/IBAN bevatten bij stamkaart)", "OAuth 2.0 + TLS (HTTPS)"],
            ["Supabase", "Externe backup-opslag (PostgreSQL)", "Volledige entity-data (alle entities)", "Service Role Key + TLS (HTTPS)"],
            ["Base44 File Storage", "Bestanden (foto's, handtekeningen, documenten)", "Binaire bestanden", "TLS (HTTPS)"],
            ["Base44 Core LLM", "AI-assistentie (contractanalyse)", "Contracttekst", "TLS (HTTPS)"],
          ]}
        />
        <h4 className="font-semibold text-slate-800 mt-3">OAuth Connectors</h4>
        <Table
          headers={["Connector", "Scopes", "Doel"]}
          rows={[
            ["Gmail", "gmail.send, gmail.readonly, email", "Alle uitgaande e-mails, e-mailhistorie"],
          ]}
        />
        <h4 className="font-semibold text-slate-800 mt-3">Environment Secrets</h4>
        <Table
          headers={["Secret", "Doel", "Gebruikt door"]}
          rows={[
            ["SUPABASE_URL", "Supabase database URL", "Backup export/import functies"],
            ["SUPABASE_SERVICE_ROLE_KEY", "Authenticatie naar Supabase", "Backup export/import functies"],
          ]}
        />
      </Section>

      {/* 9. Back-up & Herstel */}
      <Section id="backup" icon={Database} title="9. Back-up & Herstel">
        <Table
          headers={["Methode", "Type", "Opslag", "Frequentie", "Admin-only?"]}
          rows={[
            ["Handmatige backup", "Intern (JSON in Base44)", "Backup entity", "Op verzoek", "Ja"],
            ["Supabase export", "Extern (PostgreSQL)", "Supabase database", "Op verzoek", "Ja"],
            ["Scheduled backup", "Intern (JSON in Base44)", "Backup entity", "Configureerbaar (automation)", "Ja"],
          ]}
        />
        <h4 className="font-semibold text-slate-800 mt-3">Herstelproces</h4>
        <Table
          headers={["Methode", "Bevestiging", "Risico"]}
          rows={[
            ["Herstel uit interne backup", "Code: HERSTEL-BEVESTIGD", "Huidige data wordt volledig overschreven"],
            ["Herstel per entity", "Code: HERSTEL-BEVESTIGD", "Alleen geselecteerde entity wordt overschreven"],
            ["Herstel uit Supabase", "Code: SUPABASE-HERSTEL", "Huidige data wordt volledig overschreven"],
          ]}
        />
        <h4 className="font-semibold text-slate-800 mt-3">Omgevingsscheiding</h4>
        <Table
          headers={["Aspect", "Productie", "Test"]}
          rows={[
            ["Database", "Gescheiden (prod)", "Gescheiden (dev)"],
            ["Back-ups", "Eigen backup-reeks", "Eigen backup-reeks"],
            ["Data-isolatie", "Volledig gescheiden", "Volledig gescheiden"],
          ]}
        />
        <p className="text-xs text-slate-500 mt-2"><strong>Niet geback-upt:</strong> Gebruikersaccounts (login credentials), OAuth tokens, environment variables.</p>
      </Section>

      {/* 10. Risico-overzicht */}
      <Section id="risico" icon={AlertTriangle} title="10. Risico-overzicht">
        <Table
          headers={["Risico", "Ernst", "Mitigatie"]}
          rows={[
            ["BSN/IBAN opgeslagen in plaintext (Employee)", <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>, "Rolrestricties (admin-only) + TLS transport"],
            ["Backup entity bevat alle gevoelige data", <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>, "Admin-only toegang, bevestigingscodes"],
            ["E-mail (stamkaart) bevat beveiligde link", <Badge className="bg-green-100 text-green-700 text-[10px]">Gemitigeerd</Badge>, "Token-based link, geen BSN/IBAN in e-mail (v2.1.0)"],
            ["Sleutelkastpincode in plaintext", <Badge className="bg-orange-100 text-orange-700 text-[10px]">Medium</Badge>, "Audit logging, 30s view, bevestigingsdialoog"],
            ["ID-documenten in publieke storage", <Badge className="bg-green-100 text-green-700 text-[10px]">Gemitigeerd</Badge>, "Private storage verplicht, signed URL (5 min), legacy fallback verwijderd (v2.1.0)"],
            ["Geen field-level encryptie", <Badge className="bg-red-100 text-red-700 text-[10px]">Hoog</Badge>, "Platformbeperking — TLS als compensatie"],
          ]}
        />
      </Section>

      {/* 11. Conclusie */}
      <Section id="conclusie" icon={Shield} title="11. Conclusie">
        <p>De Interdistri TMS-architectuur biedt een solide basis voor MKB-operatie met:</p>
        <ul className="list-disc pl-5 space-y-0.5 text-xs mt-2">
          <li>Gescheiden juridische en operationele modules</li>
          <li>Rolgebaseerd autorisatiemodel met permissies per module</li>
          <li>Centrale audit trail voor alle beveiligingsrelevante acties</li>
          <li>Beveiligd pincodebeheer losgekoppeld van onboarding</li>
          <li>Dubbele backup-strategie (intern + Supabase)</li>
          <li>Volledige omgevingsscheiding (productie vs. test)</li>
        </ul>
        <div className="p-3 bg-green-50 rounded-lg border border-green-200 mt-3">
          <p className="text-xs text-green-800">
            <strong>v2.1.0 Update:</strong> ID-documenten worden opgeslagen in private storage. Toegang verloopt uitsluitend via SecureDownloadToken (48 uur geldig), max 5 downloads, signed URL (5 minuten geldig), IP logging en server-side RBAC validatie. Public file_url fallback is volledig verwijderd. Geen publieke fallback mogelijk.
          </p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
          <p className="text-xs text-amber-800">
            <strong>Aanbeveling bij schaalvergroting:</strong> Field-level encryptie implementeren voor BSN, IBAN en pincode-velden.
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-4 italic">
          Dit document is gegenereerd op basis van de actuele systeemconfiguratie per {LAATSTE_UPDATE} en is uitsluitend bestemd voor interne security-documentatie en audit.
        </p>
      </Section>

      {/* PDF Export Footer (alleen zichtbaar in print) */}
      <div className="hidden print:block text-center text-xs text-slate-400 border-t border-slate-200 pt-4 mt-8">
        <p className="font-semibold text-slate-700">Interdistri TMS – Security & RBAC Architectuur</p>
        <p>Versie: {VERSIE}</p>
        <p>Geëxporteerd op: {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  );
}