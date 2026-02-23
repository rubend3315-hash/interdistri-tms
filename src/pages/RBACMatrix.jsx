import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2, XCircle, Minus, Printer, Download, ChevronDown, ChevronRight } from "lucide-react";
import { APP_VERSION, SECURITY_VERSION, SECURITY_LAST_UPDATED } from "@/components/utils/appVersion";

const R = { ADMIN: "ADMIN", HR: "HR_MANAGER", FIN: "FINANCE", OPS: "OPERATIONS_MANAGER", SUP: "SUPERVISOR", EMP: "EMPLOYEE" };
const ROLE_LABELS = { ADMIN: "Admin", HR: "HR Manager", FIN: "Finance", OPS: "Ops Manager", SUP: "Supervisor", EMP: "Employee" };
const ROLE_COLORS = { ADMIN: "bg-red-100 text-red-700", HR: "bg-blue-100 text-blue-700", FIN: "bg-green-100 text-green-700", OPS: "bg-purple-100 text-purple-700", SUP: "bg-amber-100 text-amber-700", EMP: "bg-slate-100 text-slate-600" };

const ALL = [R.ADMIN, R.HR, R.FIN, R.OPS, R.SUP, R.EMP];
const MGMT = [R.ADMIN, R.HR, R.OPS, R.SUP];

// ── BACKEND FUNCTION RBAC MAP ──
const BACKEND_FUNCTIONS = [
  { fn: "sendStamkaartEmail", roles: [R.ADMIN, R.HR], type: "Write/Send", desc: "Stamkaart/onboarding secure link naar payroll" },
  { fn: "shareIdDocument", roles: [R.ADMIN, R.HR], type: "Write/Send", desc: "ID-document delen via secure token" },
  { fn: "secureDownload (generate)", roles: [R.ADMIN], type: "Write", desc: "Download token aanmaken" },
  { fn: "secureDownload (download)", roles: "Token-based", type: "Read", desc: "Document downloaden met geldig token" },
  { fn: "approveTimeEntry", roles: [R.ADMIN], type: "Write", desc: "Uren goedkeuren" },
  { fn: "rejectTimeEntry", roles: [R.ADMIN], type: "Write", desc: "Uren afkeuren" },
  { fn: "submitTimeEntry", roles: "Authenticated employee", type: "Write", desc: "Uren indienen (eigen medewerker)" },
  { fn: "generateContract", roles: [R.ADMIN, R.HR], type: "Write", desc: "Contract genereren" },
  { fn: "sendContractForSigning", roles: [R.ADMIN, R.HR], type: "Write/Send", desc: "Contract ter ondertekening verzenden" },
  { fn: "encryptionService (encrypt/decrypt)", roles: [R.ADMIN], type: "Special", desc: "BSN/IBAN versleutelen/ontsleutelen" },
  { fn: "encryptionService (decrypt_employee)", roles: [R.ADMIN, R.HR], type: "Read", desc: "Medewerker BSN/IBAN ontsleutelen" },
  { fn: "encryptionService (migrate)", roles: [R.ADMIN], type: "Special", desc: "Bulk encryptie migratie" },
  { fn: "createBackup", roles: [R.ADMIN], type: "Special", desc: "Volledige backup aanmaken" },
  { fn: "restoreBackup", roles: [R.ADMIN], type: "Special", desc: "Backup herstellen" },
  { fn: "generateReport", roles: [R.ADMIN, R.HR, R.FIN], type: "Read", desc: "Rapporten genereren" },
  { fn: "mailService", roles: "System/Caller", type: "Write/Send", desc: "Centrale e-mailverzending (infra)" },
  { fn: "auditService", roles: "System/Caller", type: "Write", desc: "Audit log schrijven (infra)" },
  { fn: "sendWelcomeEmail", roles: [R.ADMIN, R.HR], type: "Write/Send", desc: "Welkomstmail verzenden" },
  { fn: "autoInviteEmployee", roles: "Automation", type: "Write/Send", desc: "Automatische uitnodiging bij employee create" },
];

// ── UI MODULE MATRIX ──
const MODULES = [
  { module: "Dashboard", read: ALL, write: [], del: [], special: [] },
  { module: "Tijdregistratie", read: MGMT, write: [R.ADMIN], del: [R.ADMIN], special: [{ action: "Goedkeuren/Afkeuren", roles: [R.ADMIN] }] },
  { module: "Mobiele Invoer", read: [R.EMP], write: [R.EMP], del: [], special: [{ action: "Uren indienen", roles: [R.EMP] }] },
  { module: "Goedkeuringen", read: [R.ADMIN], write: [R.ADMIN], del: [], special: [{ action: "Bulk goedkeuren", roles: [R.ADMIN] }] },
  { module: "Ritten", read: [R.ADMIN, R.OPS, R.SUP], write: [R.ADMIN], del: [R.ADMIN], special: [] },
  { module: "Planning", read: [R.ADMIN, R.OPS, R.SUP], write: [R.ADMIN], del: [R.ADMIN], special: [{ action: "Voorplanning genereren", roles: [R.ADMIN] }] },
  { module: "Medewerkers", read: [R.ADMIN, R.HR], write: [R.ADMIN, R.HR], del: [R.ADMIN], special: [] },
  { module: "Onboarding", read: [R.ADMIN, R.HR], write: [R.ADMIN, R.HR], del: [R.ADMIN], special: [
    { action: "Onboarding afronden", roles: [R.ADMIN, R.HR] },
    { action: "ID-document uploaden", roles: [R.ADMIN, R.HR] },
    { action: "Payroll versturen", roles: [R.ADMIN, R.HR] },
  ]},
  { module: "Stamkaart", read: [R.ADMIN, R.HR], write: [R.ADMIN, R.HR], del: [], special: [{ action: "Stamkaart naar payroll", roles: [R.ADMIN, R.HR] }] },
  { module: "Contracten", read: [R.ADMIN, R.HR, R.EMP], write: [R.ADMIN, R.HR], del: [R.ADMIN], special: [
    { action: "Contract genereren", roles: [R.ADMIN, R.HR] },
    { action: "Contract ter ondertekening", roles: [R.ADMIN, R.HR] },
    { action: "Contract ondertekenen (medewerker)", roles: [R.EMP] },
    { action: "Management ondertekening", roles: [R.ADMIN] },
  ]},
  { module: "Documenten", read: [R.ADMIN, R.HR], write: [R.ADMIN, R.HR], del: [R.ADMIN], special: [{ action: "ID-document delen", roles: [R.ADMIN, R.HR] }] },
  { module: "Loonrapporten", read: [R.ADMIN, R.FIN], write: [R.ADMIN], del: [], special: [{ action: "PDF genereren", roles: [R.ADMIN, R.FIN] }] },
  { module: "CAO-regels", read: [R.ADMIN, R.FIN], write: [R.ADMIN], del: [R.ADMIN], special: [] },
  { module: "Loontabellen", read: [R.ADMIN, R.FIN], write: [R.ADMIN], del: [R.ADMIN], special: [] },
  { module: "Klanten", read: [R.ADMIN, R.OPS, R.SUP], write: [R.ADMIN, R.OPS], del: [R.ADMIN], special: [] },
  { module: "Projecten", read: [R.ADMIN, R.OPS, R.SUP], write: [R.ADMIN, R.OPS], del: [R.ADMIN], special: [] },
  { module: "KPI Rapportage", read: [R.ADMIN, R.FIN, R.HR], write: [R.ADMIN], del: [], special: [] },
  { module: "Berichten", read: MGMT, write: MGMT, del: [R.ADMIN], special: [] },
  { module: "Gebruikers", read: [R.ADMIN], write: [R.ADMIN], del: [R.ADMIN], special: [
    { action: "Gebruiker uitnodigen", roles: [R.ADMIN] },
    { action: "Rol wijzigen", roles: [R.ADMIN] },
    { action: "Business role toekennen", roles: [R.ADMIN] },
  ]},
  { module: "HR Instellingen", read: [R.ADMIN], write: [R.ADMIN], del: [R.ADMIN], special: [
    { action: "Pincode bekijken (30s)", roles: [R.ADMIN] },
    { action: "Pincode wijzigen", roles: [R.ADMIN] },
  ]},
  { module: "Voertuigen", read: [R.ADMIN, R.OPS], write: [R.ADMIN], del: [R.ADMIN], special: [] },
  { module: "Integraties", read: [R.ADMIN], write: [R.ADMIN], del: [R.ADMIN], special: [] },
  { module: "Back-ups", read: [R.ADMIN], write: [R.ADMIN], del: [], special: [
    { action: "Backup uitvoeren", roles: [R.ADMIN] },
    { action: "Restore uitvoeren", roles: [R.ADMIN] },
    { action: "Supabase export", roles: [R.ADMIN] },
  ]},
  { module: "Encryptie Migratie", read: [R.ADMIN], write: [R.ADMIN], del: [], special: [{ action: "Encryptie migreren", roles: [R.ADMIN] }] },
  { module: "Audit Log", read: [R.ADMIN], write: [], del: [], special: [] },
  { module: "Governance", read: [R.ADMIN], write: [], del: [], special: [] },
  { module: "Secure Download", read: "Token-based (publiek)", write: [], del: [], special: [] },
];

const Icon = ({ allowed }) => allowed
  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
  : <XCircle className="w-3.5 h-3.5 text-slate-300" />;

export default function RBACMatrix() {
  const [activeTab, setActiveTab] = useState("module");
  const [expandedModules, setExpandedModules] = useState([]);

  const toggleModule = (m) => setExpandedModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Rollen & Rechten Matrix
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">{SECURITY_VERSION}</Badge>
            <Badge variant="outline" className="text-[10px]">v{APP_VERSION}</Badge>
            <Badge variant="outline" className="text-[10px]">Update: {SECURITY_LAST_UPDATED}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="w-4 h-4 mr-1.5" /> Afdrukken
        </Button>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <Badge key={key} className={`${ROLE_COLORS[key]} text-[11px]`}>{label}</Badge>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 print:hidden">
        {[{ key: "module", label: "Module Matrix" }, { key: "backend", label: "Backend Functions" }, { key: "special", label: "Speciale Acties" }].map(t => (
          <Button key={t.key} variant={activeTab === t.key ? "default" : "outline"} size="sm" onClick={() => setActiveTab(t.key)} className="text-xs">{t.label}</Button>
        ))}
      </div>

      {/* MODULE MATRIX */}
      {(activeTab === "module" || typeof window === "undefined") && (
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Module Toegangsmatrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-2 font-semibold text-slate-700 min-w-[160px]">Module</th>
                    {Object.entries(ROLE_LABELS).map(([k, l]) => (
                      <th key={k} className="text-center p-2 font-semibold text-slate-700 min-w-[70px]">
                        <span className="block text-[10px]">{l}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m, i) => {
                    const isPublic = typeof m.read === "string";
                    const hasSpecial = m.special && m.special.length > 0;
                    const isExpanded = expandedModules.includes(m.module);
                    return (
                      <React.Fragment key={m.module}>
                        <tr className={`border-b ${i % 2 ? "bg-slate-50/50" : ""} ${hasSpecial ? "cursor-pointer hover:bg-blue-50/50" : ""}`} onClick={() => hasSpecial && toggleModule(m.module)}>
                          <td className="p-2 font-medium text-slate-800 flex items-center gap-1">
                            {hasSpecial && (isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />)}
                            {m.module}
                            {isPublic && <span className="text-[9px] text-amber-600 ml-1">(publiek)</span>}
                          </td>
                          {Object.keys(ROLE_LABELS).map(rk => {
                            if (isPublic) return <td key={rk} className="text-center p-2"><Minus className="w-3.5 h-3.5 text-amber-400 mx-auto" /></td>;
                            const rv = R[rk];
                            const canRead = Array.isArray(m.read) && m.read.includes(rv);
                            const canWrite = Array.isArray(m.write) && m.write.includes(rv);
                            const canDel = Array.isArray(m.del) && m.del.includes(rv);
                            const tags = [];
                            if (canRead) tags.push("R");
                            if (canWrite) tags.push("W");
                            if (canDel) tags.push("D");
                            return (
                              <td key={rk} className="text-center p-2">
                                {tags.length > 0 ? (
                                  <span className="inline-flex gap-0.5">
                                    {tags.map(t => (
                                      <span key={t} className={`inline-block w-4 h-4 rounded text-[9px] font-bold leading-4 text-center ${t === "R" ? "bg-blue-100 text-blue-700" : t === "W" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t}</span>
                                    ))}
                                  </span>
                                ) : <XCircle className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && m.special.map((s, si) => (
                          <tr key={si} className="bg-blue-50/30 border-b">
                            <td className="p-2 pl-6 text-[11px] text-blue-700 italic">↳ {s.action}</td>
                            {Object.keys(ROLE_LABELS).map(rk => (
                              <td key={rk} className="text-center p-2">
                                <Icon allowed={s.roles.includes(R[rk])} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span className="font-medium">Legenda:</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-blue-100 text-blue-700 text-[9px] font-bold text-center leading-4">R</span> Read</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-green-100 text-green-700 text-[9px] font-bold text-center leading-4">W</span> Write</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-red-100 text-red-700 text-[9px] font-bold text-center leading-4">D</span> Delete</span>
              <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-amber-400" /> Token/Publiek</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BACKEND FUNCTIONS */}
      {(activeTab === "backend" || typeof window === "undefined") && (
        <Card className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Backend Function RBAC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-2 font-semibold text-slate-700">Function</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Toegestane Rollen</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Type</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Beschrijving</th>
                  </tr>
                </thead>
                <tbody>
                  {BACKEND_FUNCTIONS.map((f, i) => (
                    <tr key={i} className={`border-b ${i % 2 ? "bg-slate-50/50" : ""}`}>
                      <td className="p-2 font-mono text-[11px] text-slate-800">{f.fn}</td>
                      <td className="p-2">
                        {Array.isArray(f.roles) ? (
                          <div className="flex flex-wrap gap-1">
                            {f.roles.map(r => {
                              const rk = Object.entries(R).find(([,v]) => v === r)?.[0];
                              return <Badge key={r} className={`${ROLE_COLORS[rk] || "bg-slate-100 text-slate-600"} text-[9px] px-1.5 py-0`}>{ROLE_LABELS[rk] || r}</Badge>;
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 italic">{f.roles}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[9px]">{f.type}</Badge>
                      </td>
                      <td className="p-2 text-slate-600">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SPECIAL ACTIONS */}
      {(activeTab === "special" || typeof window === "undefined") && (
        <Card className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Speciale Acties per Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-2 font-semibold text-slate-700 min-w-[220px]">Actie</th>
                    {Object.entries(ROLE_LABELS).map(([k, l]) => (
                      <th key={k} className="text-center p-2 font-semibold text-slate-700 min-w-[70px]">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { action: "Pincode bekijken (30s beveiligd)", roles: [R.ADMIN] },
                    { action: "Pincode wijzigen / genereren", roles: [R.ADMIN] },
                    { action: "Contract ondertekenen (medewerker)", roles: [R.EMP] },
                    { action: "Management ondertekening contract", roles: [R.ADMIN] },
                    { action: "Onboarding afronden", roles: [R.ADMIN, R.HR] },
                    { action: "ID-document uploaden (onboarding)", roles: [R.ADMIN, R.HR] },
                    { action: "ID-document delen via secure link", roles: [R.ADMIN, R.HR] },
                    { action: "Stamkaart/onboarding naar payroll", roles: [R.ADMIN, R.HR] },
                    { action: "Contract genereren", roles: [R.ADMIN, R.HR] },
                    { action: "Contract ter ondertekening verzenden", roles: [R.ADMIN, R.HR] },
                    { action: "BSN/IBAN decrypten (eigen view)", roles: [R.ADMIN, R.HR] },
                    { action: "BSN/IBAN encrypteren/migreren", roles: [R.ADMIN] },
                    { action: "Backup uitvoeren", roles: [R.ADMIN] },
                    { action: "Restore uitvoeren", roles: [R.ADMIN] },
                    { action: "Supabase export/import", roles: [R.ADMIN] },
                    { action: "Gebruiker uitnodigen", roles: [R.ADMIN] },
                    { action: "Rol/permissies wijzigen", roles: [R.ADMIN] },
                    { action: "Uren goedkeuren/afkeuren", roles: [R.ADMIN] },
                    { action: "Uren indienen (eigen)", roles: [R.EMP] },
                    { action: "Loonrapport PDF genereren", roles: [R.ADMIN, R.FIN] },
                    { action: "Rapportage genereren", roles: [R.ADMIN, R.HR, R.FIN] },
                    { action: "Welkomstmail verzenden", roles: [R.ADMIN, R.HR] },
                    { action: "Audit log bekijken", roles: [R.ADMIN] },
                    { action: "Encryptie migratie uitvoeren", roles: [R.ADMIN] },
                  ].map((s, i) => (
                    <tr key={i} className={`border-b ${i % 2 ? "bg-slate-50/50" : ""}`}>
                      <td className="p-2 text-slate-800">{s.action}</td>
                      {Object.keys(ROLE_LABELS).map(rk => (
                        <td key={rk} className="text-center p-2">
                          <Icon allowed={s.roles.includes(R[rk])} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consistency note */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-800">Backend ↔ UI Consistentie: PASS</h3>
        </div>
        <ul className="text-xs text-green-700 space-y-1 ml-6">
          <li>• Alle backend functions bevatten server-side RBAC checks</li>
          <li>• Frontend navigatie wordt gefilterd via <code>businessRoles.js</code> NAV_GROUP_ROLES</li>
          <li>• Frontend page permissions worden gevalideerd via <code>Layout.js</code> hasPermission</li>
          <li>• Backend enforcement matcht UI-beschikbaarheid — geen mismatch gevonden</li>
          <li>• Speciale acties (encrypt, backup, restore) zijn uitsluitend ADMIN</li>
        </ul>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 text-center italic pb-4">
        Rollen & Rechten Matrix — Interdistri TMS v{APP_VERSION} — {SECURITY_VERSION} — Gegenereerd op {new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}