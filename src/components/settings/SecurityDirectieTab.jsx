import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Mail, Users, Eye, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Printer } from "lucide-react";

const RAG = ({ status }) => {
  const c = {
    groen: { bg: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
    oranje: { bg: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
    geel: { bg: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
    rood: { bg: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  }[status.toLowerCase()] || c.groen;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const RISKS = [
  { risico: "Admin account compromise", status: "Oranje", actie: "2FA implementeren" },
  { risico: "Backup export zonder extra versleuteling", status: "Oranje", actie: "Logging & restrictie uitbreiden" },
  { risico: "Encryption key rotatie", status: "Oranje", actie: "Procedure opstellen" },
  { risico: "Pincode plaintext opslag", status: "Geel", actie: "Optioneel encrypten" },
  { risico: "Mail exposure persoonsgegevens", status: "Groen", actie: "Opgelost — token-based downloads" },
];

const CONTROLS = [
  { naam: "Encryptie-at-rest (AES-256)", done: true },
  { naam: "Secure mail redesign", done: true },
  { naam: "Token-based downloads", done: true },
  { naam: "Audit logging", done: true },
  { naam: "Role-based access (RBAC)", done: true },
  { naam: "Admin 2FA", done: false, note: "Gepland Q1" },
  { naam: "Key rotation procedure", done: false, note: "Gepland Q2" },
];

const ROADMAP = [
  { quarter: "Q1 2026", items: ["2FA voor Admin accounts", "Backup export logging & restrictie"] },
  { quarter: "Q2 2026", items: ["Key rotation procedure", "Single-use download optie"] },
  { quarter: "Q3 2026", items: ["IP restrictie admin-panel", "Security dashboard metrics"] },
  { quarter: "Q4 2026", items: ["Interne security audit", "Penetratietest (extern)"] },
];

export default function SecurityDirectieTab() {
  const doneCount = CONTROLS.filter(c => c.done).length;
  const totalControls = CONTROLS.length;
  const pct = Math.round((doneCount / totalControls) * 100);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Directie Security Overzicht
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Intern management dashboard — niet delen met externen</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="w-4 h-4 mr-1.5" /> Afdrukken
        </Button>
      </div>

      {/* 1. Maturity Scores */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">1. Security Maturity Score</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ScoreCard label="AVG Maturity" score={8.5} max={10} color="blue" />
          <ScoreCard label="ISO-light Maturity" score={7.5} max={10} color="slate" />
        </div>
      </div>

      {/* 2. Risico's */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">2. Hoogste Risico's</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Risico</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actie</th>
              </tr>
            </thead>
            <tbody>
              {RISKS.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 text-slate-700">{r.risico}</td>
                  <td className="py-2.5"><RAG status={r.status} /></td>
                  <td className="py-2.5 text-slate-600 text-xs">{r.actie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:break-inside-avoid">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">3. Security Controls</h3>
          <span className="text-xs font-medium text-slate-500">{doneCount}/{totalControls} actief ({pct}%)</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONTROLS.map((c, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${c.done ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-500'}`}>
              {c.done
                ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                : <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              }
              <span className="flex-1">{c.naam}</span>
              {c.note && <span className="text-[10px] text-orange-600 font-medium">{c.note}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Incident Response */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">4. Incident Response Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-800 font-medium">Geen actieve incidenten</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-800 font-medium">Logging actief</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Shield className="w-4 h-4 text-slate-600" />
            <span className="text-xs text-slate-700 font-medium">Responsible disclosure ingericht</span>
          </div>
        </div>
      </div>

      {/* 5. Roadmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">5. Roadmap — Volgende 12 maanden</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROADMAP.map((q, qi) => (
            <div key={qi} className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-bold text-blue-700 mb-2">{q.quarter}</p>
              <ul className="space-y-1.5">
                {q.items.map((item, ii) => (
                  <li key={ii} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-center italic">
        Vertrouwelijk — Alleen voor intern directiegebruik • Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

function ScoreCard({ label, score, max, color }) {
  const pct = (score / max) * 100;
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="p-4 border border-slate-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-lg font-bold text-slate-900">{score}<span className="text-xs text-slate-400 font-normal">/{max}</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}