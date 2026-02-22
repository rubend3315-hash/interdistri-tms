import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Mail, Users, Server, Eye, RefreshCw, Scale, Printer, CheckCircle2 } from "lucide-react";

const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

const Badge = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 border border-green-200">
    <CheckCircle2 className="w-3 h-3" />
    {children}
  </span>
);

const SECTIONS = [
  {
    icon: Shield,
    title: "Security-by-Design",
    badge: "Actief",
    content: "Interdistri TMS is ontwikkeld met security-by-design en privacy-by-default als uitgangspunt. Beveiliging is geen afterthought, maar een integraal onderdeel van de architectuur, het ontwikkelproces en de dagelijkse operatie.",
  },
  {
    icon: Lock,
    title: "Versleuteling van Gegevens",
    badge: "AES-256",
    points: [
      "AES-256-GCM encryptie voor gevoelige persoonsgegevens (BSN, IBAN)",
      "Server-side decryptie — alleen bij geautoriseerd verzoek",
      "Geen plaintext opslag van kritieke velden",
      "Unieke initialization vector (IV) per versleuteld veld",
    ],
  },
  {
    icon: Mail,
    title: "Beveiligde Documentverzending",
    badge: "Token-based",
    points: [
      "Geen persoonsgegevens via e-mail — uitsluitend beveiligde links",
      "Tijdelijke downloadtokens met cryptografisch random keys (256-bit)",
      "Links verlopen automatisch na 48 uur",
      "Maximaal 10 downloads per link",
      "Volledige logging van elke download (IP-adres, tijdstip)",
    ],
  },
  {
    icon: Users,
    title: "Rolgebaseerde Toegang",
    badge: "RBAC",
    points: [
      "Least privilege model — gebruikers zien alleen wat ze nodig hebben",
      "Admin-only voor kritieke functies (back-ups, gebruikersbeheer, audit logs)",
      "Fijnmazige permissies per module",
      "Automatische toegangsbeperking bij beëindiging dienstverband",
      "Uitgebreide audit logging van alle autorisatie-acties",
    ],
  },
  {
    icon: Server,
    title: "Transportbeveiliging",
    badge: "TLS 1.2+",
    points: [
      "Volledig HTTPS (TLS) voor alle communicatie",
      "OAuth 2.0 geauthenticeerde integraties (Gmail API)",
      "Geen onversleutelde dataoverdracht mogelijk",
      "Certificaatvalidatie op alle endpoints",
    ],
  },
  {
    icon: Eye,
    title: "Monitoring & Logging",
    badge: "Actief",
    points: [
      "Onwijzigbaar audit log voor alle kritieke handelingen",
      "Download logging met IP-adres en tijdstip",
      "Pincode-view logging met 30-seconden timer",
      "E-mailverzending logging met idempotency checks",
    ],
  },
  {
    icon: RefreshCw,
    title: "Continuïteit",
    badge: "Gemonitord",
    points: [
      "Periodieke geautomatiseerde back-ups",
      "Gescheiden productie- en testomgevingen",
      "Herstelprocedures met bevestigingscode",
      "Exportfunctionaliteit voor kritieke gegevens",
    ],
  },
  {
    icon: Scale,
    title: "Compliance",
    badge: "AVG",
    content: "Het systeem is ingericht conform de principes van de Algemene Verordening Gegevensbescherming (AVG/GDPR):",
    points: [
      "Dataminimalisatie — alleen noodzakelijke gegevens worden verwerkt",
      "Beveiliging van verwerking — technische en organisatorische maatregelen",
      "Transparantie — duidelijke documentatie van verwerkingen",
      "Toegangscontrole — strikt rolgebaseerd autorisatiemodel",
      "Opslagbeperking — gegevens worden niet langer bewaard dan noodzakelijk",
    ],
  },
];

export default function Trust() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Print button */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1.5" /> Afdrukken / PDF
        </Button>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 text-white mb-8 print:rounded-none print:bg-slate-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Interdistri B.V.</p>
            <p className="text-xs text-slate-400">Transport Management Systeem</p>
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
          Enterprise-Grade Security<br />
          <span className="text-emerald-400">for HR & Transport Operations</span>
        </h1>
        <p className="text-sm text-slate-300 mt-4 max-w-xl leading-relaxed">
          Wij beschermen de gegevens van onze medewerkers, klanten en partners met industrie-standaard 
          beveiligingsmaatregelen. Deze pagina geeft een overzicht van onze security-architectuur.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> AES-256 Encryptie
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> AVG Compliant
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Beveiligde Downloads
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Audit Logging
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden print:break-inside-avoid print:border-slate-300">
              <div className="flex items-start gap-4 p-5 md:p-6">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-slate-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h2 className="text-sm font-bold text-slate-900">{idx + 1}. {section.title}</h2>
                    <Badge>{section.badge}</Badge>
                  </div>
                  {section.content && (
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{section.content}</p>
                  )}
                  {section.points && (
                    <ul className="space-y-1.5">
                      {section.points.map((point, pi) => (
                        <li key={pi} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center space-y-2 pb-8">
        <p className="text-xs text-slate-400">
          Laatst bijgewerkt: {today}
        </p>
        <p className="text-xs text-slate-400">
          Vragen over beveiliging? Neem contact op via{" "}
          <a href="mailto:security@interdistri.nl" className="text-blue-500 hover:underline">security@interdistri.nl</a>
        </p>
        <p className="text-[10px] text-slate-300 mt-2">
          © {new Date().getFullYear()} Interdistri B.V. — Fleerbosseweg 19, 4421 RR Kapelle — K.v.K. 20150449
        </p>
      </div>
    </div>
  );
}