import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, Download, Clock, Lock, Key, FileText, Database, Eye, Server, TrendingUp, Users, ShieldCheck } from "lucide-react";
import { SECURITY_VERSION, SECURITY_LAST_UPDATED } from "@/components/utils/appVersion";

const SECTIONS = [
  {
    icon: Shield,
    title: "Beveiligingsarchitectuur",
    paragraphs: [
      "Interdistri TMS hanteert een role-based access control (RBAC) beveiligingsmodel.",
      "Toegang tot functionaliteiten is strikt gescheiden per rol:",
    ],
    bullets: [
      "ADMIN – Volledige systeemtoegang",
      "HR_MANAGER – HR-functionaliteiten",
      "FINANCE – Payroll & financiële rapportages",
      "OPERATIONS_MANAGER / SUPERVISOR – Operationele processen",
      "EMPLOYEE – Toegang tot eigen gegevens",
    ],
    footer: [
      "Elke backend-functie wordt server-side gevalideerd.",
      "Toegang wordt niet uitsluitend via de gebruikersinterface bepaald.",
    ],
  },
  {
    icon: Key,
    title: "Encryptie van Gevoelige Gegevens",
    paragraphs: [
      "Gevoelige persoonsgegevens zoals BSN en IBAN worden versleuteld opgeslagen via AES-256-GCM encryptie.",
      "Decryptie is uitsluitend toegestaan voor bevoegde rollen.",
      "Encryptiesleutels worden server-side beheerd en nooit blootgesteld aan de frontend.",
      "Identiteitsdocumenten worden opgeslagen in private storage en uitsluitend gedeeld via tijdgebonden downloadtokens (max 5 downloads, 48 uur geldig).",
    ],
  },
  {
    icon: FileText,
    title: "Secure Document Delivery",
    paragraphs: [
      "HR-documenten worden niet als bijlage via e-mail verzonden.",
      "Er wordt gebruikgemaakt van:",
    ],
    bullets: [
      "Tijdgebonden downloadtokens",
      "Beperkt aantal downloads",
      "Server-side validatie",
    ],
  },
  {
    icon: Database,
    title: "Governance & Back-up Beveiliging",
    paragraphs: [
      "Kritieke systeemfuncties zoals:",
    ],
    bullets: [
      "Back-ups",
      "Datamigraties",
      "Encryptiemigraties",
      "Systeemherstel",
    ],
    footer: [
      "zijn uitsluitend toegankelijk voor ADMIN-gebruikers.",
      "Er bestaan geen verborgen toegangsmechanismen of hardcoded uitzonderingen.",
    ],
  },
  {
    icon: Eye,
    title: "Logging & Audit",
    paragraphs: [
      "Beveiligingsgevoelige acties worden gelogd in een auditlog.",
    ],
  },
  {
    icon: Users,
    title: "Data-isolatie",
    paragraphs: [
      "Medewerkers hebben uitsluitend toegang tot hun eigen gegevens.",
      "Server-side validatie voorkomt toegang tot gegevens van andere medewerkers.",
    ],
  },
  {
    icon: Server,
    title: "Transportbeveiliging",
    paragraphs: [
      "Alle communicatie verloopt via HTTPS (TLS).",
    ],
  },
  {
    icon: TrendingUp,
    title: "Continue Verbetering",
    paragraphs: [
      "Het beveiligingsmodel wordt periodiek geëvalueerd.",
    ],
  },
];

export default function SecurityPrivacy() {
  const formattedDate = new Date(SECURITY_LAST_UPDATED + "T12:00:00").toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Security & Privacyverklaring</h1>
            <p className="text-sm text-slate-500">Interdistri TMS</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Download className="w-4 h-4" />
          Download als PDF
        </Button>
      </div>

      {/* Document */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm print:shadow-none print:border-0 print:rounded-none">
        {/* Document header */}
        <div className="border-b border-slate-200 px-8 py-6 print:px-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Security & Privacyverklaring</h1>
              <p className="text-base text-slate-600 mt-1">Interdistri TMS</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Interdistri B.V.</p>
              <p>Fleerbosseweg 19</p>
              <p>4421 RR Kapelle</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Laatste update: {formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Security versie: {SECURITY_VERSION}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Applicatieversie: v2.1.0</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="divide-y divide-slate-100">
          {SECTIONS.map((section, idx) => {
            const SectionIcon = section.icon;
            return (
              <div key={idx} className="px-8 py-5 print:px-4 print:py-3">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center print:bg-slate-200">
                    <SectionIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {idx + 1}. {section.title}
                  </h2>
                </div>
                <div className="pl-[38px] space-y-2">
                  {section.paragraphs?.map((p, pi) => (
                    <p key={pi} className="text-sm text-slate-700 leading-relaxed">{p}</p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-slate-700">
                      {section.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {section.footer?.map((f, fi) => (
                    <p key={fi} className="text-sm text-slate-700 leading-relaxed">{f}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-8 py-4 print:px-4">
          <p className="text-xs text-slate-400 text-center">
            Dit document is eigendom van Interdistri B.V. en is bedoeld ter informatie van medewerkers en betrokkenen.
            Voor vragen over dit beleid kunt u contact opnemen via security@interdistri.nl.
          </p>
        </div>
      </div>

      {/* Print-only PDF footer */}
      <div className="hidden print:block text-center text-xs text-slate-400 border-t border-slate-200 pt-4 mt-8">
        <p className="font-semibold text-slate-700">Interdistri TMS – Security & RBAC Architectuur</p>
        <p>Versie: {SECURITY_VERSION}</p>
        <p>Geëxporteerd op: {new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </div>
  );
}