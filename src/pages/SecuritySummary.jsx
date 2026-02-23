import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, AlertTriangle, Eye, Lock, Key, Users, Server, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

const StatusBadge = ({ status }) => {
  const config = {
    gemitigeerd: { color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
    "op orde": { color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
    "laag risico": { color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
    "gemonitord risico": { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  };
  const c = config[status.toLowerCase()] || config["op orde"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.color}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const ITEMS = [
  {
    icon: Lock,
    title: "Gevoelige persoonsgegevens",
    status: "Gemitigeerd",
    description: "BSN en IBAN worden versleuteld opgeslagen met AES-256-GCM encryptie. Decryptie vindt uitsluitend plaats server-side wanneer noodzakelijk en wordt niet gelogd in plaintext.",
  },
  {
    icon: Mail,
    title: "Documentverzending",
    status: "Gemitigeerd",
    description: "Persoonsgevoelige documenten worden niet per e-mail verzonden. In plaats daarvan wordt een tijdelijke, token-gebaseerde beveiligde downloadlink gebruikt (48 uur geldig, maximaal 5 downloads). Vanaf v2.1.0 is publieke storage volledig uitgefaseerd voor ID-documenten.",
  },
  {
    icon: Key,
    title: "Sleutelkast-pincode",
    status: "Laag risico",
    description: "Pincode wordt niet getoond in onboarding of documenten. Alleen zichtbaar via HR-instellingen met audit logging en 30-seconden view timer.",
  },
  {
    icon: Users,
    title: "Toegangsbeheer",
    status: "Op orde",
    description: "Rolgebaseerd toegangsmodel (RBAC) met fijnmazige permissies. Admin-only voor kritieke acties. Audit logging actief op alle beveiligingsrelevante handelingen.",
  },
  {
    icon: Server,
    title: "Back-ups",
    status: "Gemonitord risico",
    description: "Back-ups bevatten versleutelde data (BSN/IBAN). Toegang beperkt tot admin. Herstel vereist bevestigingscode. Verdere versleuteling van back-upbestanden is gepland.",
  },
  {
    icon: Shield,
    title: "Externe communicatie",
    status: "Op orde",
    description: "Alle communicatie via TLS 1.2+. Gmail OAuth 2.0 voor e-mailverzending. Geen onversleutelde dataoverdracht mogelijk.",
  },
];

export default function SecuritySummary() {
  const gemitigeerdCount = ITEMS.filter(i => ["gemitigeerd", "laag risico"].includes(i.status.toLowerCase())).length;
  const gemonitordCount = ITEMS.filter(i => i.status.toLowerCase() === "gemonitord risico").length;
  const opOrdeCount = ITEMS.filter(i => i.status.toLowerCase() === "op orde").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Security Samenvatting
          </h1>
          <p className="text-sm text-slate-500 mt-1">Managementsamenvatting — Interdistri TMS</p>
          <p className="text-xs text-slate-400 mt-1">Doelgroep: Directie, accountant, auditor</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="w-4 h-4 mr-1.5" /> Afdrukken
        </Button>
      </div>

      {/* Score overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:border-0 print:p-3">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Beveiligingsstatus</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xl font-bold text-green-700">{gemitigeerdCount}</p>
            <p className="text-[10px] text-green-600 font-medium">Gemitigeerd</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xl font-bold text-blue-700">{opOrdeCount}</p>
            <p className="text-[10px] text-blue-600 font-medium">Operationeel stabiel</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-xl font-bold text-orange-700">{gemonitordCount}</p>
            <p className="text-[10px] text-orange-600 font-medium">Gemonitord</p>
          </div>
        </div>
        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Legenda:</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Gemitigeerd</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Gemonitord</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Operationeel stabiel</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const statusLower = item.status.toLowerCase();
          const borderColor = ["gemitigeerd", "laag risico"].includes(statusLower)
            ? "border-green-200" : statusLower === "gemonitord risico"
            ? "border-orange-200" : "border-blue-200";

          return (
            <div key={idx} className={`bg-white border rounded-xl p-5 ${borderColor} print:break-inside-avoid`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Update v2.1.0 */}
      <div className="bg-white border border-blue-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">Security Update v2.1.0 — ID Document Hardening</h2>
        <p className="text-xs text-slate-600 mb-2">Release datum: 23 februari 2026</p>
        <ul className="space-y-1 text-xs text-slate-700">
          {[
            "Legacy file_url fallback verwijderd",
            "Private storage verplicht (UploadPrivateFile)",
            "Signed URL (5 min) enforced voor document downloads",
            "Token expiry 48 uur",
            "Max downloads verlaagd naar 5",
            "Onversleutelde ID-documenten geblokkeerd bij download",
            "Audit logging bij security violations",
            "Dead code verwijderd (ShareIdDocumentButton)",
            "Single entry point voor payroll share (sendStamkaartEmail)",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Conclusie */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Conclusie</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Het Interdistri TMS beschikt over een <strong>volwassen beveiligingsniveau</strong> met AES-256 encryptie voor gevoelige persoonsgegevens, 
          beveiligde documentverzending via token-gebaseerde downloads, rolgebaseerde toegang en uitgebreide audit logging. 
          De belangrijkste risico's uit de oorspronkelijke risico-inventarisatie zijn gemitigeerd. Het resterende aandachtspunt 
          (back-up versleuteling) wordt actief gemonitord.
        </p>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 text-center italic pb-4">
        Deze samenvatting weerspiegelt de huidige security-architectuur per {today}. Voor vragen: security@interdistri.nl
      </p>
    </div>
  );
}