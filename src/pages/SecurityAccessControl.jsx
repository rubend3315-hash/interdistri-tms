import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Users, Lock, FileText, DollarSign, Truck, ClipboardList } from "lucide-react";
import { SECURITY_VERSION, SECURITY_LAST_UPDATED } from "@/components/utils/appVersion";

const ROLES = [
  { name: "ADMIN", label: "Administrator", color: "bg-red-100 text-red-800", desc: "Volledige toegang tot alle modules en functies" },
  { name: "HR_MANAGER", label: "HR Manager", color: "bg-blue-100 text-blue-800", desc: "Medewerkers, contracten, onboarding, stamkaart" },
  { name: "FINANCE", label: "Finance", color: "bg-green-100 text-green-800", desc: "Loonrapporten, payroll, export" },
  { name: "OPERATIONS_MANAGER", label: "Operations Manager", color: "bg-purple-100 text-purple-800", desc: "Planning, ritten, klanten, projecten" },
  { name: "SUPERVISOR", label: "Supervisor", color: "bg-orange-100 text-orange-800", desc: "Operationeel toezicht, dagstaat" },
  { name: "EMPLOYEE", label: "Medewerker", color: "bg-slate-100 text-slate-800", desc: "Mobiele invoer, eigen gegevens" },
];

const DOMAINS = [
  {
    name: "HR & Medewerkers",
    icon: Users,
    functions: [
      { fn: "sendStamkaartEmail", roles: ["ADMIN", "HR_MANAGER"] },
      { fn: "sendWelcomeEmail", roles: ["ADMIN", "HR_MANAGER"] },
      { fn: "generateContract", roles: ["ADMIN", "HR_MANAGER"] },
      { fn: "sendContractForSigning", roles: ["ADMIN", "HR_MANAGER"] },
    ],
  },
  {
    name: "Payroll & Rapportage",
    icon: DollarSign,
    functions: [
      { fn: "sendContractToPayroll", roles: ["ADMIN", "FINANCE"] },
      { fn: "exportTimeAndTrips", roles: ["ADMIN", "FINANCE"] },
      { fn: "generateReport", roles: ["ADMIN", "FINANCE", "HR_MANAGER"] },
    ],
  },
  {
    name: "Governance & Systeem (ADMIN-only)",
    icon: Shield,
    functions: [
      { fn: "createBackup", roles: ["ADMIN"] },
      { fn: "restoreBackup", roles: ["ADMIN"] },
      { fn: "migrateFullSystem", roles: ["ADMIN"] },
      { fn: "exportCriticalData", roles: ["ADMIN"] },
      { fn: "recalculate", roles: ["ADMIN"] },
      { fn: "encryptionService", roles: ["ADMIN"] },
    ],
  },
  {
    name: "Operationeel",
    icon: Truck,
    functions: [
      { fn: "submitTimeEntry", roles: ["Alle geauthenticeerde gebruikers"] },
      { fn: "approveTimeEntry", roles: ["ADMIN"] },
      { fn: "rejectTimeEntry", roles: ["ADMIN"] },
    ],
  },
];

const CONFIRMATIONS = [
  { label: "Encryptie endpoints beschermd", ok: true, detail: "encryptionService: ADMIN-only, RBAC check vóór data" },
  { label: "Governance functies ADMIN-only", ok: true, detail: "createBackup, restoreBackup, migrateFullSystem, exportCriticalData, recalculate" },
  { label: "Geen hardcoded backdoors", ok: true, detail: "Email-bypass uit migrateFullSystem verwijderd" },
  { label: "Payroll gescheiden van HR", ok: true, detail: "sendContractToPayroll/exportTimeAndTrips: FINANCE, niet HR_MANAGER" },
  { label: "Auth check vóór data query", ok: true, detail: "Alle geharde functies checken auth + RBAC vóór enige entity call" },
  { label: "Geen business_role override op ADMIN-only functies", ok: true, detail: "Governance functies checken uitsluitend user.role === 'admin'" },
];

const RoleCell = ({ allowed }) => (
  allowed
    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
    : <XCircle className="w-4 h-4 text-slate-300" />
);

export default function SecurityAccessControl() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Security & Toegangscontrole
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Badge className="bg-blue-100 text-blue-800">{SECURITY_VERSION}</Badge>
          <Badge variant="outline">Laatste update: {SECURITY_LAST_UPDATED}</Badge>
        </div>
        <p className="text-sm text-slate-500 mt-2">Enterprise RBAC overzicht — alle backend functies met rol-gebaseerde toegangscontrole.</p>
      </div>

      {/* Rollenmatrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Rollenmatrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES.map(role => (
              <div key={role.name} className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                <Badge className={`${role.color} text-xs`}>{role.name}</Badge>
                <p className="font-medium text-sm mt-1.5">{role.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{role.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domein-overzicht */}
      {DOMAINS.map(domain => {
        const DomainIcon = domain.icon;
        return (
          <Card key={domain.name}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DomainIcon className="w-5 h-5 text-blue-600" />
                {domain.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-2 border border-slate-200 font-semibold">Functie</th>
                      {ROLES.map(r => (
                        <th key={r.name} className="p-2 border border-slate-200 font-semibold text-center text-xs">{r.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {domain.functions.map(fn => (
                      <tr key={fn.fn} className="hover:bg-slate-50/50">
                        <td className="p-2 border border-slate-200 font-mono text-xs">{fn.fn}</td>
                        {ROLES.map(r => (
                          <td key={r.name} className="p-2 border border-slate-200 text-center">
                            <RoleCell allowed={fn.roles.includes(r.name) || fn.roles.includes("Alle geauthenticeerde gebruikers")} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Bevestigingen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5 text-green-600" />
            Security Bevestigingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {CONFIRMATIONS.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-green-50/50">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-4">
        Interdistri TMS — Security & RBAC Architectuur — {SECURITY_VERSION} — {SECURITY_LAST_UPDATED}
      </div>
    </div>
  );
}