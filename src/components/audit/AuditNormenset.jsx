import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NORMENSET = [
  {
    id: "A",
    title: "Deel A: Eisen aan de identificatie van de onderneming",
    items: [
      { id: "1.1a", norm: "1.1a", text: "Uittreksel Handelsregister KvK aanwezig", severity: "rood" },
      { id: "1.1b", norm: "1.1b", text: "Doelomschrijving KvK gericht op vervoer/PayChecked", severity: "rood" },
      { id: "1.1c", norm: "1.1c", text: "Loonheffingsnummer en omzetbelastingnummer aanwezig", severity: "rood" },
      { id: "1.1d", norm: "1.1d", text: "Geldige communautaire vergunning aanwezig", severity: "rood" },
      { id: "1.1e", norm: "1.1e", text: "Bedrijfs-/kantooractiviteiten in Nederland", severity: "rood" },
      { id: "1.1f", norm: "1.1f", text: "Werknemers in dienst betrokken bij vervoersovereenkomst", severity: "rood" },
      { id: "1.2a", norm: "1.2a", text: "Inzicht in concernrelaties", severity: "oranje" },
      { id: "1.2b", norm: "1.2b", text: "Bestuurders onderneming kenbaar gemaakt", severity: "oranje" },
      { id: "1.2c", norm: "1.2c", text: "Wijzigingen naamgeving/eigendom binnen 30 dagen gemeld", severity: "oranje" },
    ]
  },
  {
    id: "B",
    title: "Deel B: Klachtenprocedures",
    items: [
      { id: "2.1.1", norm: "2.1.1", text: "Schriftelijke klachtenprocedure (4 O-systematiek) voor eigen onderneming", severity: "oranje" },
      { id: "2.1.2", norm: "2.1.2", text: "Klacht binnen 15 werkdagen gegrond/ongegrond (min. €750)", severity: "oranje" },
      { id: "2.1.3", norm: "2.1.3", text: "Gegronde klachten binnen 30 werkdagen gemeld aan inspectie-instelling", severity: "oranje" },
      { id: "2.1.3.2", norm: "2.1.3.2", text: "Corrigerende maatregelen binnen 30 werkdagen bij gegronde klacht", severity: "oranje" },
      { id: "2.2.1", norm: "2.2.1", text: "Klachtenprocedure voor ondervervoerder/uitlener aanwezig", severity: "oranje" },
      { id: "2.2.2", norm: "2.2.2", text: "Ondervervoerder klacht binnen 30 werkdagen beoordeeld", severity: "oranje" },
      { id: "2.2.3", norm: "2.2.3", text: "Klachten ondervervoerder geregistreerd en gemeld", severity: "oranje" },
    ]
  },
  {
    id: "C",
    title: "Deel C: Contracten",
    items: [
      { id: "3.1.1", norm: "3.1.1", text: "Ondervervoerder met PayChecked keurmerk aantoonbaar", severity: "oranje" },
      { id: "3.1.2", norm: "3.1.2", text: "Melding inschakelen ketenpartijen door ondervervoerder", severity: "oranje" },
      { id: "3.1.3", norm: "3.1.3", text: "Max. aantal ketenpartijen ondervervoerder vastgelegd", severity: "oranje" },
      { id: "3.2.1", norm: "3.2.1", text: "Contract met niet-PayChecked ondervervoerder: juiste arbeidsvoorwaarden, kettingbeding", severity: "oranje" },
      { id: "3.2.2", norm: "3.2.2", text: "Omzet per ondervervoerder max. 5% eigen omzet", severity: "oranje" },
      { id: "3.2.3", norm: "3.2.3", text: "Totaal ondervervoer max. 50% eigen omzet", severity: "oranje" },
      { id: "3.2.5", norm: "3.2.5", text: "Kopie communautaire vergunning ondervervoerder aanwezig", severity: "oranje" },
      { id: "3.3.1", norm: "3.3.1", text: "ZZP-overeenkomst: modelovereenkomst, ID, vergunning, KvK", severity: "oranje" },
      { id: "3.4.1", norm: "3.4.1", text: "Collegiale inleen: max 6 weken, communautaire vergunning, CAO BGV", severity: "oranje" },
      { id: "3.5.1", norm: "3.5.1", text: "Inleen: uitlener NEN 4400 gecertificeerd + SNA register", severity: "rood" },
      { id: "3.5.2", norm: "3.5.2", text: "Inleen: uitlener KIWA aanwijzingsbeschikking", severity: "rood" },
      { id: "3.5.3", norm: "3.5.3", text: "Inleen: schriftelijke overeenkomst met juiste bepalingen", severity: "oranje" },
    ]
  },
  {
    id: "D",
    title: "Deel D: Loonadministratie & naleving CAO BGV",
    items: [
      { id: "4.1.1", norm: "4.1.1", text: "ID-vaststelling bij arbeidsovereenkomst (incl. kopieën)", severity: "rood" },
      { id: "4.1.2", norm: "4.1.2", text: "Hernieuwde ID-vaststelling niet-EU werknemers bij verlopen document", severity: "rood" },
      { id: "4.1.3", norm: "4.1.3", text: "Gerechtigd zijn tot arbeid in Nederland vastgesteld", severity: "rood" },
      { id: "4.1.4", norm: "4.1.4", text: "Schriftelijke arbeidsovereenkomst conform art. 7:655 BW", severity: "rood" },
      { id: "4.1.5", norm: "4.1.5", text: "Mutaties arbeidsovereenkomst tijdig verwerkt", severity: "oranje" },
      { id: "4.1.6", norm: "4.1.6", text: "Personeelsdossiers 5 jaar bewaard (ID, arbeidsovereenkomst)", severity: "oranje" },
      { id: "4.2.1", norm: "4.2.1", text: "Loonadministratie juist, volledig en tijdig (mutaties < 1 maand)", severity: "oranje" },
      { id: "4.2.2", norm: "4.2.2", text: "Geen all-in loon toegepast", severity: "rood" },
      { id: "4.2.3", norm: "4.2.3", text: "Procedure voor toepassen relevante lonen aanwezig", severity: "oranje" },
      { id: "4.2.4", norm: "4.2.4", text: "Loon minimaal WML / juiste loonschaal / trede / tredeverhogingen", severity: "rood" },
      { id: "4.2.5", norm: "4.2.5", text: "ATV/verlofadministratie conform CAO (art. 67a, 68)", severity: "oranje" },
      { id: "4.3.1", norm: "4.3.1", text: "Urenregistratie juist, volledig en tijdig (art. 26 CAO)", severity: "oranje" },
      { id: "4.3.2", norm: "4.3.2", text: "Methode urenregistratie maakt sluitende administratie mogelijk", severity: "oranje" },
      { id: "4.4.1", norm: "4.4.1", text: "Vakantiegeld juist verwerkt", severity: "oranje" },
      { id: "4.4.2", norm: "4.4.2", text: "Toeslagenmatrix / nachtritten toeslag juist verwerkt", severity: "oranje" },
      { id: "4.4.3", norm: "4.4.3", text: "Vergoeding overstaan juist verwerkt", severity: "oranje" },
      { id: "4.4.4", norm: "4.4.4", text: "Ploegentoeslag juist verwerkt", severity: "oranje" },
      { id: "4.4.5", norm: "4.4.5", text: "Toeslag overwerk juist verwerkt", severity: "oranje" },
      { id: "4.4.6", norm: "4.4.6", text: "Toeslag weekenduren juist verwerkt", severity: "oranje" },
      { id: "4.4.7", norm: "4.4.7", text: "Toeslag feestdagen juist verwerkt", severity: "oranje" },
      { id: "4.4.8", norm: "4.4.8", text: "Tijd-voor-tijd regeling juist verwerkt", severity: "oranje" },
      { id: "4.4.9", norm: "4.4.9", text: "Jaarurennorm / 40-uursgarantie juist verwerkt", severity: "oranje" },
      { id: "4.4.10", norm: "4.4.10", text: "Persoonlijk keuzebudget juist verwerkt", severity: "oranje" },
      { id: "4.4.11", norm: "4.4.11", text: "Inhoudingen/verrekeningen gespecificeerd en schriftelijk overeengekomen", severity: "oranje" },
      { id: "4.4.12", norm: "4.4.12", text: "Verblijfskosten conform art. 40 CAO (opmerking: per 1-1-2026 oranje)", severity: "opmerking" },
      { id: "4.5.1", norm: "4.5.1", text: "Gewerkte uren, verloonde uren en uitbetaalde uren in overeenstemming", severity: "rood" },
      { id: "4.6.1", norm: "4.6.1", text: "Loonstrook bevat: bruto loon, samenstelling, inhoudingen, WML, namen, termijn", severity: "rood" },
      { id: "4.6.2", norm: "4.6.2", text: "Betaling giraal op bankrekening werknemer (min. netto WML)", severity: "rood" },
    ]
  },
  {
    id: "E",
    title: "Deel E: Overige voorwaarden",
    items: [
      { id: "5.1", norm: "5.1", text: "Verzoeken art. 78 CAO / onderzoeken IL&T/Arbeidsinspectie/Belastingdienst gemeld", severity: "oranje" },
      { id: "5.2", norm: "5.2", text: "Laatste twee inspectierapporten beschikbaar bij wisseling inspectie-instelling", severity: "oranje" },
      { id: "5.3", norm: "5.3", text: "Adequate kasadministratie (ongebruikelijke transacties verklaarbaar, kwitering volledig)", severity: "oranje" },
    ]
  }
];

export default function AuditNormenset() {
  const [expandedParts, setExpandedParts] = useState(NORMENSET.map(n => n.id));
  const [assessments, setAssessments] = useState({});

  const togglePart = (id) => {
    setExpandedParts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const setAssessment = (itemId, field, value) => {
    setAssessments(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value }
    }));
  };

  const getStatusCounts = () => {
    let conform = 0, oranje = 0, rood = 0, nvt = 0, open = 0;
    NORMENSET.forEach(part => {
      part.items.forEach(item => {
        const a = assessments[item.id];
        if (!a?.status) open++;
        else if (a.status === "conform") conform++;
        else if (a.status === "oranje") oranje++;
        else if (a.status === "rood") rood++;
        else if (a.status === "nvt") nvt++;
      });
    });
    const total = NORMENSET.reduce((s, p) => s + p.items.length, 0);
    return { conform, oranje, rood, nvt, open, total };
  };

  const counts = getStatusCounts();

  const severityBadge = (s) => {
    if (s === "rood") return <Badge className="bg-red-100 text-red-700 text-[10px]">Rood</Badge>;
    if (s === "oranje") return <Badge className="bg-orange-100 text-orange-700 text-[10px]">Oranje</Badge>;
    if (s === "opmerking") return <Badge className="bg-blue-100 text-blue-700 text-[10px]">Opmerking</Badge>;
    return null;
  };

  const statusIcon = (status) => {
    if (status === "conform") return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === "oranje") return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    if (status === "rood") return <XCircle className="w-4 h-4 text-red-600" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Conform" count={counts.conform} color="bg-green-50 text-green-700 border-green-200" />
        <SummaryCard label="Oranje afwijking" count={counts.oranje} color="bg-orange-50 text-orange-700 border-orange-200" />
        <SummaryCard label="Rode afwijking" count={counts.rood} color="bg-red-50 text-red-700 border-red-200" />
        <SummaryCard label="N.v.t." count={counts.nvt} color="bg-slate-50 text-slate-600 border-slate-200" />
        <SummaryCard label="Nog open" count={counts.open} color="bg-blue-50 text-blue-700 border-blue-200" />
      </div>

      <p className="text-xs text-slate-500">
        PayChecked Registratienormen versie 1 juli 2025 · {counts.total} normpunten · Beoordeel elk punt
      </p>

      {/* Parts */}
      {NORMENSET.map(part => (
        <Card key={part.id} className="overflow-hidden">
          <button
            onClick={() => togglePart(part.id)}
            className="w-full flex items-center gap-3 px-5 py-3 bg-slate-700 text-white hover:bg-slate-600 transition-colors text-left"
          >
            {expandedParts.includes(part.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-semibold text-sm">{part.title}</span>
            <span className="ml-auto text-xs text-slate-300">{part.items.length} normpunten</span>
          </button>
          {expandedParts.includes(part.id) && (
            <CardContent className="p-0 divide-y">
              {part.items.map(item => {
                const a = assessments[item.id] || {};
                return (
                  <div key={item.id} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{item.norm}</span>
                          {severityBadge(item.severity)}
                          {a.status && statusIcon(a.status)}
                        </div>
                        <p className="text-sm text-slate-700">{item.text}</p>
                      </div>
                      <div className="flex-shrink-0 w-40">
                        <Select
                          value={a.status || ""}
                          onValueChange={v => setAssessment(item.id, "status", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Beoordeel..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conform">✅ Conform</SelectItem>
                            <SelectItem value="oranje">🟠 Oranje afwijking</SelectItem>
                            <SelectItem value="rood">🔴 Rode afwijking</SelectItem>
                            <SelectItem value="nvt">⚪ N.v.t.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(a.status === "oranje" || a.status === "rood") && (
                      <Textarea
                        className="mt-2 text-xs h-16"
                        placeholder="Toelichting afwijking..."
                        value={a.notes || ""}
                        onChange={e => setAssessment(item.id, "notes", e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function SummaryCard({ label, count, color }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}