import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, Database, AlertTriangle, CheckCircle2, Phone } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Automatische Backups",
    color: "text-blue-600",
    bg: "bg-blue-50",
    items: [
      "Base44 platform maakt automatische dagelijkse backups van alle data",
      "Retentieperiode: platform-beheerd (contacteer Base44 voor exacte termijn)",
      "Aanvullend: wekelijkse kritieke data export (Tenant, Employee, Contract, EmailLog, AuditLog)",
      "Handmatige full backup beschikbaar via Backups pagina",
      "Externe kopie naar Supabase als secondary storage",
    ],
  },
  {
    icon: Clock,
    title: "Restore Mogelijkheden",
    color: "text-green-600",
    bg: "bg-green-50",
    items: [
      "Point-in-time restore: via Base44 support (platform-niveau)",
      "App-level restore: per entity of volledige backup via Backups pagina",
      "Supabase restore: fallback bij platform-level problemen",
      "Kritieke entity exports: JSON + CSV bestanden voor offline bewaring",
    ],
  },
  {
    icon: Shield,
    title: "Tenant Bescherming",
    color: "text-purple-600",
    bg: "bg-purple-50",
    items: [
      "Tenants kunnen NIET fysiek verwijderd worden (guardTenantDelete automation)",
      "Verwijderde tenant wordt automatisch hersteld + AuditLog entry",
      "Soft delete lifecycle: active → suspended → archived",
      "Gearchiveerde tenants: data leesbaar, nieuwe records geblokkeerd",
      "Geen cascade deletes — onderliggende data blijft altijd bestaan",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Procedure bij Ongeluk / Data Verlies",
    color: "text-amber-600",
    bg: "bg-amber-50",
    items: [
      "1. Controleer of guardTenantDelete de tenant heeft hersteld (AuditLog)",
      "2. Probeer restore via Backups pagina (meest recente backup)",
      "3. Probeer restore vanuit Supabase secondary storage",
      "4. Download kritieke entity exports (JSON/CSV) als noodmaatregel",
      "5. Contacteer Base44 support voor platform-level restore",
    ],
  },
  {
    icon: Phone,
    title: "Contact & SLA",
    color: "text-red-600",
    bg: "bg-red-50",
    items: [
      "Base44 Support: via dashboard → Help of support@base44.com",
      "Hersteltijd: afhankelijk van omvang, typisch < 24 uur voor platform-level restore",
      "App-level restore: direct beschikbaar via Backups pagina",
      "Meld dataverlies zo snel mogelijk — hoe eerder, hoe vollediger het herstel",
    ],
  },
];

export default function DataProtectionPolicy() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-600" />
          Dataprotectie & Backup Beleid
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className={`${section.bg} rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <section.icon className={`w-5 h-5 ${section.color}`} />
              <h3 className="font-semibold text-slate-900">{section.title}</h3>
            </div>
            <ul className="space-y-1.5 ml-7">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${section.color} mt-0.5 shrink-0`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}