import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle2, Clock, AlertCircle, TrendingUp, Server, Key, Eye, Users, Mail, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAATSTE_UPDATE = "2026-02-22";

const StatusBadge = ({ status }) => {
  const config = {
    voltooid: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2, iconColor: "text-green-600", label: "Voltooid" },
    gepland:  { color: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock, iconColor: "text-orange-500", label: "Gepland" },
    niet_gestart: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle, iconColor: "text-red-500", label: "Niet gestart" },
  };
  const c = config[status] || config.niet_gestart;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.color}`}>
      <Icon className={`w-3 h-3 ${c.iconColor}`} />
      {c.label}
    </span>
  );
};

const ItemRow = ({ status, children }) => {
  const iconMap = {
    voltooid: <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />,
    gepland: <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />,
    niet_gestart: <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      {iconMap[status] || iconMap.niet_gestart}
      <span>{children}</span>
    </div>
  );
};

const PHASES = [
  {
    nummer: 1,
    titel: "Basisbeveiliging",
    status: "voltooid",
    color: "green",
    icon: Shield,
    beschrijving: "Fundament van de beveiligingsarchitectuur — alle basismaatregelen zijn geïmplementeerd en actief.",
    items: [
      { label: "TLS (HTTPS) voor alle communicatie", status: "voltooid" },
      { label: "Rolgebaseerde toegang (RBAC) met fijnmazige permissies", status: "voltooid" },
      { label: "Audit logging op alle beveiligingsrelevante acties", status: "voltooid" },
      { label: "Secure e-mail redesign — geen persoonsgegevens meer in e-mail", status: "voltooid" },
      { label: "Idempotency checks bij e-mailverzending", status: "voltooid" },
      { label: "Module-scheiding (Onboarding ≠ Pincodebeheer)", status: "voltooid" },
      { label: "Automatische toegangsbeperking bij uit-dienst-treding", status: "voltooid" },
    ],
  },
  {
    nummer: 2,
    titel: "Databeveiliging",
    status: "voltooid",
    color: "green",
    icon: Lock,
    beschrijving: "Alle gevoelige persoonsgegevens zijn versleuteld en documentdownloads verlopen via beveiligde tokens.",
    items: [
      { label: "AES-256-GCM encryptie voor BSN en IBAN", status: "voltooid" },
      { label: "Token-based secure downloads (48 uur, max 10 downloads)", status: "voltooid" },
      { label: "Download logging met IP-adres en tijdstip", status: "voltooid" },
      { label: "Onboarding beveiliging — pincode niet zichtbaar in documenten", status: "voltooid" },
      { label: "Stamkaart via beveiligde downloadlink i.p.v. e-mailbijlage", status: "voltooid" },
      { label: "Encryptie vóór opslag — server-side decryptie bij geautoriseerd verzoek", status: "voltooid" },
    ],
  },
  {
    nummer: 3,
    titel: "Versterking",
    status: "gepland",
    color: "orange",
    icon: TrendingUp,
    beschrijving: "Geplande maatregelen om de beveiliging verder te versterken naar enterprise-niveau.",
    items: [
      { label: "2FA verplicht voor admin accounts", status: "gepland" },
      { label: "Encryptie sleutelkastpincode (AES-256)", status: "gepland" },
      { label: "Key rotation procedure", status: "gepland" },
      { label: "IP-restrictie voor admin toegang", status: "gepland" },
      { label: "Single-use download tokens (optioneel)", status: "gepland" },
      { label: "Download notificatie bij openen", status: "gepland" },
      { label: "Backup export logging", status: "gepland" },
    ],
  },
];

export default function SecurityRoadmap() {
  const completedPhases = PHASES.filter(p => p.status === "voltooid").length;
  const totalItems = PHASES.reduce((sum, p) => sum + p.items.length, 0);
  const completedItems = PHASES.reduce((sum, p) => sum + p.items.filter(i => i.status === "voltooid").length, 0);
  const progressPct = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Security Roadmap
          </h1>
          <p className="text-sm text-slate-500 mt-1">Post-implementatie overzicht — Interdistri TMS</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">Laatste update: {LAATSTE_UPDATE}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="w-4 h-4 mr-1.5" /> Afdrukken
        </Button>
      </div>

      {/* Progress overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:border-0 print:p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Voortgang</h2>
          <span className="text-sm font-bold text-slate-900">{progressPct}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-lg font-bold text-green-700">{completedPhases}</p>
            <p className="text-[10px] text-green-600 font-medium">Fasen voltooid</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{completedItems}/{totalItems}</p>
            <p className="text-[10px] text-blue-600 font-medium">Maatregelen voltooid</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-lg font-bold text-orange-700">{totalItems - completedItems}</p>
            <p className="text-[10px] text-orange-600 font-medium">Nog gepland</p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="font-medium text-slate-700">Legenda:</span>
        <StatusBadge status="voltooid" />
        <StatusBadge status="gepland" />
        <StatusBadge status="niet_gestart" />
      </div>

      {/* Phases */}
      {PHASES.map((phase) => {
        const borderColor = phase.status === "voltooid" ? "border-green-200" : phase.status === "gepland" ? "border-orange-200" : "border-red-200";
        const bgColor = phase.status === "voltooid" ? "bg-green-50/50" : phase.status === "gepland" ? "bg-orange-50/50" : "bg-red-50/50";
        const Icon = phase.icon;

        return (
          <div key={phase.nummer} className={`border rounded-xl overflow-hidden ${borderColor} print:break-inside-avoid`}>
            <div className={`px-5 py-4 ${bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${phase.status === "voltooid" ? "bg-green-100" : "bg-orange-100"}`}>
                    <Icon className={`w-4.5 h-4.5 ${phase.status === "voltooid" ? "text-green-700" : "text-orange-700"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Fase {phase.nummer} — {phase.titel}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{phase.beschrijving}</p>
                  </div>
                </div>
                <StatusBadge status={phase.status} />
              </div>
            </div>
            <div className="px-5 py-4 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {phase.items.map((item, idx) => (
                  <ItemRow key={idx} status={item.status}>{item.label}</ItemRow>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:break-before-page">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Tijdlijn</h2>
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200" />

          <div className="relative pb-6">
            <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
            <Badge className="bg-green-100 text-green-700 text-[10px] mb-1">Q1 2026 — Voltooid</Badge>
            <p className="text-xs text-slate-600">Fase 1: Basisbeveiliging — TLS, RBAC, audit logging, secure e-mail</p>
          </div>

          <div className="relative pb-6">
            <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
            <Badge className="bg-green-100 text-green-700 text-[10px] mb-1">Q1 2026 — Voltooid</Badge>
            <p className="text-xs text-slate-600">Fase 2: Databeveiliging — AES-256 encryptie, token downloads, onboarding beveiliging</p>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow" />
            <Badge className="bg-orange-100 text-orange-700 text-[10px] mb-1">Q2–Q4 2026 — Gepland</Badge>
            <p className="text-xs text-slate-600">Fase 3: Versterking — 2FA, key rotation, IP-restrictie, pincode encryptie</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 text-center italic pb-4">
        Dit document wordt periodiek bijgewerkt. Laatste update: {LAATSTE_UPDATE}. Voor vragen: security@interdistri.nl
      </p>
    </div>
  );
}