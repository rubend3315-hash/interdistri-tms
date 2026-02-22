import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ShieldCheck,
  Lock,
  Database,
  ClipboardList,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Printer,
  Server,
  Key,
  Users,
  Eye
} from "lucide-react";

const renderDate = new Date().toLocaleDateString("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const LAATSTE_REVIEW = "22 februari 2026";

// --- Status card data ---
const STATUS_CARDS = [
  {
    title: "Encryptie",
    icon: Lock,
    status: "operationeel",
    detail: "AES-256-GCM actief voor BSN & IBAN",
    sub: "Server-side decryptie, audit-gelogd",
  },
  {
    title: "Secure Downloads",
    icon: Download,
    status: "operationeel",
    detail: "Token-based, 48 uur geldig",
    sub: "Max 10 downloads per token, IP-logging",
  },
  {
    title: "Audit Logging",
    icon: ClipboardList,
    status: "operationeel",
    detail: "Alle beveiligingsacties gelogd",
    sub: "RBAC-gecontroleerd, niet-muteerbaar",
  },
  {
    title: "Back-ups",
    icon: Database,
    status: "aandacht",
    detail: "Back-ups bevatten versleutelde data",
    sub: "Export-logging gepland (roadmap fase 3)",
  },
];

// --- Compliance checklist ---
const COMPLIANCE_ITEMS = [
  { label: "HTTPS / TLS 1.2+ op alle endpoints", status: "ok" },
  { label: "AES-256-GCM encryptie persoonsgegevens", status: "ok" },
  { label: "RBAC met fijnmazige permissies", status: "ok" },
  { label: "Audit logging op beveiligingsacties", status: "ok" },
  { label: "Geen persoonsgegevens in e-mail", status: "ok" },
  { label: "Token-based secure document downloads", status: "ok" },
  { label: "Automatische toegangsbeperking bij uit-dienst", status: "ok" },
  { label: "OAuth 2.0 voor e-mailverzending (Gmail)", status: "ok" },
  { label: "Idempotency checks e-mailverzending", status: "ok" },
  { label: "2FA voor admin accounts", status: "gepland" },
  { label: "Key rotation procedure", status: "gepland" },
  { label: "IP-restrictie admin toegang", status: "gepland" },
  { label: "Back-up export logging", status: "gepland" },
];

const StatusIndicator = ({ status }) => {
  if (status === "operationeel") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        Operationeel
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" />
      Aandacht vereist
    </span>
  );
};

export default function GovernanceDashboard() {
  const okCount = COMPLIANCE_ITEMS.filter(i => i.status === "ok").length;
  const plannedCount = COMPLIANCE_ITEMS.filter(i => i.status === "gepland").length;
  const compliancePct = Math.round((okCount / COMPLIANCE_ITEMS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Governance Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centrale beveiligingscockpit — Interdistri TMS
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="outline" className="text-[11px] gap-1">
              <Clock className="w-3 h-3" />
              Gegenereerd: {renderDate}
            </Badge>
            <Badge variant="outline" className="text-[11px] gap-1">
              <Eye className="w-3 h-3" />
              Laatste review: {LAATSTE_REVIEW}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Afdrukken
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_CARDS.map((card) => {
          const Icon = card.icon;
          const isOk = card.status === "operationeel";
          return (
            <Card
              key={card.title}
              className={`border ${isOk ? "border-slate-200" : "border-amber-200 bg-amber-50/30"}`}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isOk ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <Icon className={`w-[18px] h-[18px] ${isOk ? "text-emerald-600" : "text-amber-600"}`} />
                  </div>
                  <StatusIndicator status={card.status} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{card.detail}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compliance Checklist + Architecture snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Checklist */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Compliance Checklist</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {okCount} van {COMPLIANCE_ITEMS.length} maatregelen operationeel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${compliancePct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">{compliancePct}%</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {COMPLIANCE_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors"
              >
                {item.status === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <span
                  className={`text-[13px] ${item.status === "ok" ? "text-slate-700" : "text-slate-500"}`}
                >
                  {item.label}
                </span>
                {item.status === "gepland" && (
                  <Badge className="ml-auto bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0">
                    Roadmap
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Snapshot + Quick Links */}
        <div className="space-y-4">
          {/* Architecture Snapshot */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold">Architectuur Snapshot</h3>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Frontend — React + TLS 1.2+
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Backend — Base44 BaaS + RBAC
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Encryptie — AES-256-GCM (server-side)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                E-mail — Gmail OAuth 2.0
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Downloads — SecureDownloadToken
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Audit — Event-based logging
              </div>
            </div>
            <Link
              to={createPageUrl("SystemArchitectureDiagram")}
              className="mt-4 flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Volledig systeemdiagram bekijken
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Snelle navigatie
            </h3>
            <div className="space-y-1.5">
              {[
                { label: "Security Samenvatting", page: "SecuritySummary", icon: ShieldCheck },
                { label: "Security Roadmap", page: "SecurityRoadmap", icon: Shield },
                { label: "Audit Log", page: "AuditLog", icon: ClipboardList },
                { label: "Back-ups", page: "Backups", icon: Database },
                { label: "Trust & Security", page: "Trust", icon: Lock },
              ].map((link) => {
                const LIcon = link.icon;
                return (
                  <Link
                    key={link.page}
                    to={createPageUrl(link.page)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors group"
                  >
                    <LIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    {link.label}
                    <ExternalLink className="w-3 h-3 ml-auto text-slate-300 group-hover:text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Maturity Score */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Security Maturity Score</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Encryptie", score: 9, max: 10 },
            { label: "Toegangsbeheer", score: 8, max: 10 },
            { label: "Audit & Logging", score: 8, max: 10 },
            { label: "Continuïteit", score: 6, max: 10 },
          ].map((s) => {
            const pct = (s.score / s.max) * 100;
            const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={s.label} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${pct}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
                    {s.score}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-1 pb-6">
        <p className="text-xs text-slate-400 italic">
          Dit dashboard wordt automatisch gegenereerd bij elke weergave.
          Gegenereerd op: {renderDate}
        </p>
        <p className="text-xs text-slate-400">
          Voor vragen: security@interdistri.nl
        </p>
      </div>
    </div>
  );
}