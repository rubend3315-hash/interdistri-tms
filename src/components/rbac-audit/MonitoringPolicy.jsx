import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Lock, AlertTriangle, Database, FileText } from "lucide-react";

const POLICY_SECTIONS = [
  {
    icon: Clock,
    title: "Dagelijkse Snapshot",
    color: "blue",
    items: [
      "Elke nacht om 02:00 CET wordt een snapshot genomen van alle user roles",
      "Per user wordt vastgelegd: user_id, email, system_role, business_role, employee_id, effective_role",
      "Snapshots worden opgeslagen in de UserRoleSnapshot entity (append-only)",
    ],
  },
  {
    icon: Shield,
    title: "Invariant Validatie",
    color: "indigo",
    items: [
      "Na elke snapshot worden invariant checks uitgevoerd",
      "Check 1: EMPLOYEE zonder gekoppeld Employee record → WARNING",
      "Check 2: Non-admin met SUPER_ADMIN business role → VIOLATION",
      "Check 3: Null business_role met Employee koppeling → ANOMALY (informatief)",
      "Resultaten worden gelogd in RBACDecisionLog",
    ],
  },
  {
    icon: Lock,
    title: "Immutable Logging",
    color: "red",
    items: [
      "UserRoleSnapshot, RBACDecisionLog en RBACIntegrityReport zijn append-only",
      "UPDATE en DELETE operaties zijn niet toegestaan",
      "Pogingen tot wijziging worden gelogd als tamper_attempt in AuditLog",
      "Guard functie (guardAuditLogs) bewaakt de integriteit",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Drift Detectie",
    color: "amber",
    items: [
      "Admin count wijziging → drift alert",
      "User count wijziging >5% → drift alert",
      "Violation count > 0 → drift alert",
      "Drift alerts worden gelogd in AuditLog als RBAC_DRIFT_DETECTED",
      "Geen automatische blokkades — alleen signalering",
    ],
  },
  {
    icon: Database,
    title: "Integrity Report & Hash",
    color: "emerald",
    items: [
      "Dagelijks wordt een RBACIntegrityReport aangemaakt met samenvattende statistieken",
      "SHA-256 hash wordt berekend over alle user_id:effective_role combinaties",
      "Hash maakt aantoonbaar dat role-state niet stilzwijgend is gewijzigd",
      "Externe auditor kan role-state op datum X reconstrueren via snapshot + hash",
    ],
  },
  {
    icon: FileText,
    title: "Admin Authority",
    color: "slate",
    items: [
      "Alleen Base44 platform admins (user.role === 'admin') hebben toegang tot dit dashboard",
      "Alle dashboard-toegang wordt gelogd in AuditLog",
      "Export van integrity reports wordt apart gelogd",
      "Geen role editing, geen bulk acties, alleen lezen",
    ],
  },
];

export default function MonitoringPolicy() {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">RBAC Monitoring Policy v1.0</p>
              <p className="text-blue-700">
                Dit document beschrijft het volledige RBAC monitoring framework. Alle controles zijn passief en observerend —
                er worden geen autorisaties, permissies of rollen gewijzigd door dit systeem.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {POLICY_SECTIONS.map((section) => {
          const Icon = section.icon;
          const colorMap = {
            blue: 'bg-blue-100 text-blue-700',
            indigo: 'bg-indigo-100 text-indigo-700',
            red: 'bg-red-100 text-red-700',
            amber: 'bg-amber-100 text-amber-700',
            emerald: 'bg-emerald-100 text-emerald-700',
            slate: 'bg-slate-100 text-slate-700',
          };

          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${colorMap[section.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-slate-300 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}