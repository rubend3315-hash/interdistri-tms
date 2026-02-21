import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Server, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const userFacingFunctions = [
  { name: "sendStamkaartEmail", caller: "Admin — Stamkaart page", auth: "admin" },
  { name: "sendEmployeeEmail", caller: "Admin — Messages page", auth: "admin" },
  { name: "sendWelcomeEmail", caller: "Admin — Onboarding / Employees", auth: "admin" },
  { name: "sendContractForSigning", caller: "Admin — Contracts page", auth: "admin" },
  { name: "notifyContractSigned", caller: "Employee/Admin — Contract signing", auth: "user" },
  { name: "retryEmail", caller: "Admin — EmailLog page", auth: "admin" },
  { name: "approveTimeEntry", caller: "Admin — Approvals page", auth: "admin" },
  { name: "rejectTimeEntry", caller: "Admin — Approvals page", auth: "admin" },
  { name: "submitTimeEntry", caller: "Employee — Mobile app", auth: "user" },
  { name: "resubmitTimeEntry", caller: "Employee — EditTimeEntry page", auth: "user" },
  { name: "upsertDraftTimeEntry", caller: "Employee — Mobile app (auto-save)", auth: "user" },
  { name: "deleteTimeEntryCascade", caller: "Admin — TimeTracking page", auth: "admin" },
  { name: "generateContract", caller: "Admin — Contracts page", auth: "admin" },
  { name: "generateNotifications", caller: "Admin / Scheduled task", auth: "admin" },
];

const systemLevelFunctions = [
  { name: "mailService", caller: "Andere backend functies", type: "INFRASTRUCTURE" },
  { name: "auditService", caller: "Andere backend functies", type: "INFRASTRUCTURE" },
  { name: "tenantService", caller: "Frontend wrappers + backend", type: "INFRASTRUCTURE" },
  { name: "guardAuditLog", caller: "Entity automation (AuditLog)", type: "GUARD" },
  { name: "guardTenantId", caller: "Entity automation (tenant entities)", type: "GUARD" },
  { name: "processContractWijziging", caller: "Entity automation (ContractWijziging)", type: "AUTOMATION" },
  { name: "sendTimeEntryRejectionEmail", caller: "Entity automation (TimeEntry)", type: "AUTOMATION" },
  { name: "onContractActivated", caller: "Entity automation (Contract)", type: "AUTOMATION" },
  { name: "autoInviteEmployee", caller: "Entity automation (Employee)", type: "AUTOMATION" },
  { name: "migrateTenantIds", caller: "Admin — handmatig via dashboard", type: "MIGRATION" },
];

const rules = [
  { rule: "USER_FACING functies MOETEN tenantService gebruiken voor tenant-aware data", ok: true },
  { rule: "SYSTEM_LEVEL functies MOGEN asServiceRole gebruiken", ok: true },
  { rule: "SYSTEM_LEVEL functies MOETEN tenant_id ontvangen via entity data of parameter", ok: true },
  { rule: "NOOIT user session en service role mixen in dezelfde functie", ok: false },
  { rule: "NOOIT directe base44.entities.X calls in USER_FACING functies", ok: false },
  { rule: "NOOIT tenantService aanroepen vanuit automations (geen user session)", ok: false },
];

export default function TenantArchitecture() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tenant Architectuur Conventie</h1>
        <p className="text-slate-500 mt-1">Code governance voor multi-tenant isolatie</p>
      </div>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Regels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                {r.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                )}
                <span className={`text-sm ${r.ok ? 'text-slate-700' : 'text-red-700 font-medium'}`}>
                  {r.rule}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User-facing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            USER_FACING functies
            <Badge className="bg-blue-100 text-blue-800 ml-2">{userFacingFunctions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Aangeroepen door gebruikers via de frontend. Vereisen user session. 
            Moeten tenantService gebruiken voor tenant-aware data. Mogen GEEN asServiceRole gebruiken voor tenant entities.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Functie</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Aangeroepen door</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Auth</th>
                </tr>
              </thead>
              <tbody>
                {userFacingFunctions.map(f => (
                  <tr key={f.name} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs text-blue-700">{f.name}</td>
                    <td className="py-2 px-3 text-slate-600">{f.caller}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {f.auth}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System-level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-orange-500" />
            SYSTEM_LEVEL functies
            <Badge className="bg-orange-100 text-orange-800 ml-2">{systemLevelFunctions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Aangeroepen door entity automations, scheduled tasks, of andere backend functies. 
            Geen user session. Mogen asServiceRole gebruiken. MOETEN tenant_id ontvangen via entity data of expliciete parameter.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Functie</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Aangeroepen door</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {systemLevelFunctions.map(f => (
                  <tr key={f.name} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs text-orange-700">{f.name}</td>
                    <td className="py-2 px-3 text-slate-600">{f.caller}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {f.type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Warning box */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Anti-patterns (NIET doen)</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                <li>• <code className="bg-red-100 px-1 rounded">base44.entities.Employee.list()</code> direct in USER_FACING functies</li>
                <li>• <code className="bg-red-100 px-1 rounded">tenantService.getCurrentTenant()</code> in SYSTEM_LEVEL automations</li>
                <li>• <code className="bg-red-100 px-1 rounded">base44.auth.me()</code> + <code className="bg-red-100 px-1 rounded">base44.asServiceRole</code> in dezelfde functie voor dezelfde operatie</li>
                <li>• Entity creates zonder tenant_id in SYSTEM_LEVEL functies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}