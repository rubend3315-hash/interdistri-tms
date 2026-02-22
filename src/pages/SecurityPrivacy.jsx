import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Printer, Lock, Eye, FileText, Server, RefreshCw, Scale, Mail, TrendingUp, Download, KeyRound, Clock, Users } from "lucide-react";

const SECTIONS = [
  {
    icon: Lock,
    title: "Bescherming persoonsgegevens",
    content: `Interdistri hecht groot belang aan de bescherming van persoonsgegevens van medewerkers, klanten en partners. Alle persoonsgegevens worden verwerkt in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR).

Gevoelige gegevens zoals BSN-nummers en IBAN-rekeningnummers worden uitsluitend opgeslagen in versleutelde vorm. Toegang tot deze gegevens is beperkt tot geautoriseerde medewerkers met een legitieme verwerkingsgrond.`
  },
  {
    icon: KeyRound,
    title: "Encryptie (AES-256-GCM)",
    content: `Alle gevoelige persoonsgegevens worden versleuteld met AES-256-GCM, een industriestandaard encryptie-algoritme dat door overheden en financiële instellingen wereldwijd wordt gebruikt.

• Encryptie vindt plaats vóór opslag in de database
• Elke waarde krijgt een unieke initialization vector (IV)
• Decryptie vindt uitsluitend server-side plaats bij geautoriseerde verzoeken
• Encryptiesleutels worden gescheiden van de data opgeslagen`
  },
  {
    icon: Download,
    title: "Beveiligde downloadlinks",
    content: `Voor het delen van vertrouwelijke documenten (stamkaarten, onboarding dossiers) worden beveiligde downloadlinks gebruikt in plaats van directe e-mailbijlagen.

• Links verlopen automatisch na 48 uur
• Maximaal 10 downloads per link
• Elke download wordt gelogd met IP-adres en tijdstip
• Cryptografisch random tokens (256-bit) voorkomen raden van URLs
• Geen vertrouwelijke gegevens in de e-mail zelf`
  },
  {
    icon: Users,
    title: "Rolgebaseerde toegang",
    content: `Het systeem hanteert een strikt rolgebaseerd toegangsmodel (RBAC) waarbij gebruikers alleen toegang hebben tot de functionaliteiten die bij hun rol passen.

• Administrators: volledig beheer van het systeem
• Medewerkers: alleen eigen gegevens, tijdregistratie en planning
• Fijnmazige permissies per module (planning, HR, rapportage, etc.)
• Automatische toegangsbeperking bij uit-dienst-treding (7 dagen grace period)
• Alle toegangspogingen worden gelogd`
  },
  {
    icon: Eye,
    title: "Audit logging",
    content: `Alle belangrijke acties binnen het systeem worden vastgelegd in een onwijzigbaar audit log. Dit biedt volledige traceerbaarheid en verantwoording.

• Wie heeft wat gedaan, wanneer en vanuit welk IP-adres
• Wijzigingen aan medewerkergegevens, contracten en loondata
• E-mailverzendingen en documentdownloads
• Inlog- en uitloggebeurtenissen
• Audit logs zijn alleen-lezen en kunnen niet worden gewijzigd of verwijderd`
  },
  {
    icon: Server,
    title: "Transportbeveiliging (TLS)",
    content: `Alle communicatie tussen gebruikers en het systeem verloopt via versleutelde verbindingen.

• TLS 1.2+ voor alle HTTP-verbindingen
• Certificaatvalidatie op alle API-endpoints
• Geen onversleutelde dataoverdracht mogelijk
• E-mailverzending via OAuth 2.0 geauthenticeerde Gmail API`
  },
  {
    icon: RefreshCw,
    title: "Back-ups & continuïteit",
    content: `Gegevens worden regelmatig geback-upt om dataverlies te voorkomen en bedrijfscontinuïteit te waarborgen.

• Dagelijkse geautomatiseerde back-ups
• Back-ups worden versleuteld opgeslagen
• Herstelprocedures zijn gedocumenteerd en getest
• Exportfunctionaliteit voor kritieke gegevens beschikbaar voor administrators`
  },
  {
    icon: Scale,
    title: "AVG-uitgangspunten",
    content: `De verwerking van persoonsgegevens is gebaseerd op de volgende AVG-principes:

• Rechtmatigheid: verwerking op basis van uitvoering arbeidsovereenkomst en wettelijke verplichting
• Doelbinding: gegevens worden alleen voor het beoogde doel verwerkt
• Dataminimalisatie: alleen noodzakelijke gegevens worden verzameld
• Opslagbeperking: gegevens worden niet langer bewaard dan noodzakelijk
• Integriteit en vertrouwelijkheid: technische en organisatorische maatregelen
• Verantwoording: alle verwerkingen zijn gedocumenteerd`
  },
  {
    icon: Mail,
    title: "Responsible disclosure",
    content: `Interdistri neemt beveiligingsmeldingen serieus. Als u een kwetsbaarheid ontdekt, verzoeken wij u dit verantwoord te melden.

• Meld kwetsbaarheden via: security@interdistri.nl
• Beschrijf het probleem zo gedetailleerd mogelijk
• Geef ons redelijke tijd om het probleem op te lossen voordat u het openbaar maakt
• Wij zullen geen juridische stappen ondernemen tegen onderzoekers die te goeder trouw handelen

Wij streven ernaar binnen 5 werkdagen te reageren op meldingen.`
  },
  {
    icon: TrendingUp,
    title: "Continue verbetering",
    content: `Beveiliging is een doorlopend proces. Interdistri investeert continu in het verbeteren van de beveiligingsmaatregelen.

• Regelmatige evaluatie van beveiligingsbeleid en -procedures
• Monitoring van nieuwe dreigingen en kwetsbaarheden
• Implementatie van security best practices
• Training en bewustwording van medewerkers
• Periodieke review van toegangsrechten en autorisaties`
  },
];

export default function SecurityPrivacy() {
  const contentRef = useRef(null);
  const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Actions bar – hidden in print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Security & Privacy</h1>
            <p className="text-sm text-slate-500">Beveiligings- en privacyverklaring Interdistri TMS</p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1.5" /> Afdrukken / PDF
        </Button>
      </div>

      {/* Document */}
      <div ref={contentRef} className="bg-white border border-slate-200 rounded-xl shadow-sm print:shadow-none print:border-0 print:rounded-none">
        {/* Document header */}
        <div className="border-b border-slate-200 px-8 py-6 print:px-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Security & Privacy Verklaring</h1>
              <p className="text-sm text-slate-600 mt-1">Interdistri B.V. — Transport Management Systeem</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Interdistri B.V.</p>
              <p>Fleerbosseweg 19</p>
              <p>4421 RR Kapelle</p>
              <p>K.v.K. nr: 20150449</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Laatst bijgewerkt: {today}</span>
          </div>
        </div>

        {/* Introduction */}
        <div className="px-8 py-6 border-b border-slate-100 print:px-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Interdistri B.V. neemt de beveiliging van gegevens en de privacy van haar medewerkers, klanten en partners zeer serieus. 
            Dit document beschrijft de technische en organisatorische maatregelen die wij treffen om persoonsgegevens en bedrijfsinformatie 
            te beschermen binnen ons Transport Management Systeem (TMS).
          </p>
        </div>

        {/* Sections */}
        <div className="divide-y divide-slate-100">
          {SECTIONS.map((section, idx) => (
            <div key={idx} className="px-8 py-5 print:px-4 print:py-3">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center print:bg-slate-200">
                  <section.icon className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {idx + 1}. {section.title}
                </h2>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-[38px]">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-8 py-4 print:px-4">
          <p className="text-xs text-slate-400 text-center">
            Dit document is eigendom van Interdistri B.V. en is bedoeld ter informatie van medewerkers en betrokkenen. 
            Voor vragen over dit beleid kunt u contact opnemen via security@interdistri.nl.
          </p>
        </div>
      </div>
    </div>
  );
}