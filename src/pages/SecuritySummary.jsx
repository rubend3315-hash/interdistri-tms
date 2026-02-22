import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, AlertTriangle, TrendingUp, FileText } from "lucide-react";

const VERSIE = "1.0";
const LAATSTE_UPDATE = "2026-02-22";

export default function SecuritySummary() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          Security Samenvatting — Interdistri TMS
        </h1>
        <p className="text-sm text-slate-500 mt-1">Managementsamenvatting • Doelgroep: Directie, accountant, auditor</p>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className="text-xs">Versie {VERSIE}</Badge>
          <Badge variant="outline" className="text-xs">Laatste update: {LAATSTE_UPDATE}</Badge>
        </div>
      </div>

      {/* 1. Overzicht */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-blue-600" />
            1. Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          <p>Het Interdistri Transport Management Systeem (TMS) verwerkt personeels-, contract- en transportgegevens. Het systeem beschikt over de volgende beveiligingsmaatregelen:</p>
          <ul className="mt-3 space-y-2">
            {[
              "Rolgebaseerde toegang met gescheiden rechten voor beheerders en medewerkers",
              "Audit logging van alle beveiligingsrelevante acties",
              "TLS-beveiligde communicatie met alle externe services",
              "Gescheiden productie- en testomgeving met volledige data-isolatie",
              "Dubbele back-upstrategie (intern + externe database)",
              "Gescheiden sleutelkastbeheer — operationeel losgekoppeld van juridisch dossier",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 2. Beveiligingspunten */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            2. Beveiligingspunten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Gevoelige data alleen toegankelijk voor geautoriseerde beheerders",
              "Sleutelkastpincode nooit zichtbaar in documenten, print of e-mail",
              "E-mailverzending beveiligd via OAuth 2.0 en versleuteld transport",
              "Logging van alle kritieke acties (inzage, wijziging, verwijdering)",
              "Bevestigingscodes vereist bij data-herstel",
              "Idempotency-controle voorkomt dubbele e-mailverzendingen",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Risico's */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            3. Bekende Risico's
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { risico: "Gevoelige persoonsgegevens (BSN, IBAN) opgeslagen zonder veldversleuteling", ernst: "Hoog", mitigatie: "Toegangsbeperking + transportversleuteling (TLS)" },
              { risico: "Back-ups bevatten volledige onversleutelde data", ernst: "Hoog", mitigatie: "Alleen toegankelijk voor beheerders met bevestigingscode" },
              { risico: "E-mail naar loonadministratie kan persoonsgegevens bevatten", ernst: "Hoog", mitigatie: "OAuth 2.0 + TLS-beveiligd transport" },
              { risico: "Document-URLs niet voorzien van tijdgebonden handtekening", ernst: "Medium", mitigatie: "URLs zijn uniek en niet voorspelbaar" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-amber-900">{item.risico}</p>
                  <Badge className={`text-[10px] shrink-0 ml-2 ${item.ernst === "Hoog" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{item.ernst}</Badge>
                </div>
                <p className="text-xs text-amber-700">Mitigatie: {item.mitigatie}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Verbeterplan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            4. Verbeterplan 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { maatregel: "Veldversleuteling voor BSN, IBAN en pincode", prioriteit: "Hoog" },
              { maatregel: "Versleuteling van back-updata", prioriteit: "Hoog" },
              { maatregel: "Beveiligde download-links voor documenten (signed URLs)", prioriteit: "Middel" },
              { maatregel: "Tweefactorauthenticatie (2FA) voor beheerders", prioriteit: "Middel" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-800">{item.maatregel}</span>
                <Badge className={`text-[10px] shrink-0 ml-2 ${item.prioriteit === "Hoog" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{item.prioriteit}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5. Conclusie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-blue-600" />
            5. Conclusie
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-3">
          <p>
            Het Interdistri TMS biedt een beveiligingsniveau dat <strong>geschikt is voor MKB-operatie</strong>. Het systeem beschikt over rolgebaseerde toegang, audit logging, beveiligde communicatie en gescheiden back-upstrategieën.
          </p>
          <p>
            Bij verdere schaalvergroting wordt aanbevolen om <strong>veldversleuteling</strong> te implementeren voor persoonsgegevens en <strong>back-updata te versleutelen</strong>. Deze verbeteringen zijn gepland in het verbeterplan 2026.
          </p>
          <p className="text-xs text-slate-400 italic mt-4">
            Dit document is opgesteld per {LAATSTE_UPDATE} en is bestemd als managementsamenvatting voor interne en externe auditing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}