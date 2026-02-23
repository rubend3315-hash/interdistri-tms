import React from "react";
import ReactMarkdown from "react-markdown";

const DOC = `
# Daily Payroll Export — Technische Documentatie

**Versie:** 2.3  
**Datum:** 2026-02-23  
**Status:** Productie  

---

## A) Overzicht

| Eigenschap | Waarde |
|---|---|
| Systeemnaam | Daily Payroll Export |
| Versie | 2.3 |
| Doel | Dagelijkse loonrapportage exporteren als PDF, JSON en/of Azure push |
| Timezone | \`Europe/Amsterdam\` |
| Datetime formaat | ISO 8601 compliant (DST-aware via Luxon) |
| Schema enforcement | AJV runtime validatie met \`additionalProperties: false\` |

### Doelstelling

Het Daily Payroll Export systeem verzamelt per dag alle goedgekeurde tijdregistraties, ritten en standplaatswerkzaamheden van actieve medewerkers en exporteert deze in drie formaten:

1. **PDF** — Leesbaar overzichtsrapport voor management/HR
2. **JSON** — Machine-leesbaar databestand (base64-encoded download)
3. **Azure Push** — Directe POST naar Azure endpoint voor externe verwerking

Alle exports hanteren hetzelfde datamodel (schema v2.3) en dezelfde validatieregels.

---

## B) Architectuur

### Functies en verantwoordelijkheden

| Functie | Rol |
|---|---|
| \`buildDailyPayrollReportData\` | **Data Layer** — Haalt data op, bouwt het rapport-object, voert schema-alignment check en structuurvalidatie uit. Retourneert het volledige JSON rapport. |
| \`generateDailyPayrollReport\` | **PDF Generator** — Bouwt rapportdata op en genereert een landscape A4 PDF met jsPDF. Retourneert base64-encoded PDF. |
| \`downloadDailyPayrollReportJson\` | **JSON Download** — Bouwt rapportdata, voert schema version guard uit, retourneert base64-encoded JSON bestand. |
| \`downloadDailyPayrollSchema\` | **Schema Download** — Serveert het JSON Schema (v2.3) als base64-encoded bestand voor externe validatie. |
| \`sendDailyPayrollReportToAzure\` | **Azure Integration** — Bouwt rapportdata, voert AJV runtime validatie uit, pusht naar Azure endpoint met retry-logica. Dry-run modus bij ontbrekende secrets. |
| \`verifyDeployment\` | **Health Check** — Pingt alle backend functies en rapporteert deployment status. Retourneert altijd HTTP 200. |

### Data Flow

\`\`\`
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Database    │────▶│  Data Layer  │────▶│ Schema          │────▶│  Output      │
│             │     │              │     │ Validation      │     │              │
│ • Employee  │     │ • Filter     │     │ • Version guard │     │ • PDF        │
│ • TimeEntry │     │ • Enrich     │     │ • AJV validate  │     │ • JSON       │
│ • Trip      │     │ • Aggregate  │     │ • additionalPr. │     │ • Azure POST │
│ • Standpl.  │     │ • ISO dates  │     │   = false       │     │              │
│ • Customer  │     │              │     │                 │     │              │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
\`\`\`

**Filter:** Alleen \`status: 'Actief'\` medewerkers en \`status: 'Goedgekeurd'\` tijdregistraties worden opgenomen.

---

## C) JSON Contract

### Root Object

| Veld | Type | Beschrijving |
|---|---|---|
| \`success\` | boolean | Altijd \`true\` bij succesvol rapport |
| \`schemaVersion\` | string | \`"2.3"\` — immutable per release |
| \`reportType\` | string | \`"DAILY_PAYROLL"\` |
| \`metadata\` | object | Bron- en generatie-informatie |
| \`reportDate\` | string | Rapportdatum (YYYY-MM-DD) |
| \`period\` | object | Start- en einddatum |
| \`generatedAt\` | string | ISO 8601 timestamp van generatie |
| \`employeeCount\` | integer | Aantal medewerkers met data |
| \`totals\` | object | Geaggregeerde totalen |
| \`employees\` | array | Medewerkerdetails met entries |

### Metadata Block

\`\`\`json
{
  "sourceSystem": "Interdistri TMS",
  "generatedBy": "buildDailyPayrollReportData",
  "timezone": "Europe/Amsterdam"
}
\`\`\`

### Period Block

\`\`\`json
{
  "startDate": "2026-01-15",
  "endDate": "2026-01-15"
}
\`\`\`

### Totals Block

\`\`\`json
{
  "totalHours": 48.5,
  "overtimeHours": 4.0,
  "nightHours": 8.0,
  "weekendHours": 0,
  "holidayHours": 0,
  "subsistenceAllowance": 12.50,
  "advancedCosts": 0,
  "meals": 0,
  "wkr": 0,
  "totalTripKilometers": 320,
  "totalStandplaatsHours": 2.5
}
\`\`\`

### Employee Object

Elk employee-object bevat:

| Veld | Type |
|---|---|
| \`employeeNumber\` | string \\| null |
| \`employeeId\` | string |
| \`name\` | string |
| \`department\` | string \\| null |
| \`totals\` | object (zelfde structuur als root totals) |
| \`timeEntries\` | array |
| \`trips\` | array |
| \`standplaatsWerk\` | array |

### TimeEntry velden (selectie)

\`startDateTimeISO\`, \`endDateTimeISO\`, \`date\`, \`end_date\`, \`start_time\`, \`end_time\`, \`break_minutes\`, \`total_hours\`, \`overtime_hours\`, \`night_hours\`, \`weekend_hours\`, \`holiday_hours\`, \`shift_type\`, \`subsistence_allowance\`, \`advanced_costs\`, \`meals\`, \`wkr\`, \`travel_allowance_multiplier\`, \`status\`, \`submission_id\`, \`edit_history\`

### Schema Enforcement

\`\`\`json
{
  "additionalProperties": false
}
\`\`\`

Elk veld dat niet in het schema staat wordt **afgewezen** door AJV validatie.

### Voorbeeld JSON Fragment

\`\`\`json
{
  "success": true,
  "schemaVersion": "2.3",
  "reportType": "DAILY_PAYROLL",
  "metadata": {
    "sourceSystem": "Interdistri TMS",
    "generatedBy": "buildDailyPayrollReportData",
    "timezone": "Europe/Amsterdam"
  },
  "reportDate": "2026-01-15",
  "period": { "startDate": "2026-01-15", "endDate": "2026-01-15" },
  "generatedAt": "2026-01-15T14:30:00.000Z",
  "employeeCount": 1,
  "totals": {
    "totalHours": 8.0,
    "overtimeHours": 0,
    "nightHours": 0,
    "weekendHours": 0,
    "holidayHours": 0,
    "subsistenceAllowance": 0,
    "advancedCosts": 0,
    "meals": 0,
    "wkr": 0,
    "totalTripKilometers": 120,
    "totalStandplaatsHours": 0
  },
  "employees": [
    {
      "employeeNumber": "001",
      "employeeId": "abc123",
      "name": "Jan van der Berg",
      "department": "Transport",
      "totals": { "totalHours": 8.0, "..." : "..." },
      "timeEntries": [
        {
          "id": "te_001",
          "date": "2026-01-15",
          "start_time": "06:00",
          "end_time": "14:30",
          "startDateTimeISO": "2026-01-15T06:00:00+01:00",
          "endDateTimeISO": "2026-01-15T14:30:00+01:00",
          "total_hours": 8.0,
          "status": "Goedgekeurd"
        }
      ],
      "trips": [],
      "standplaatsWerk": []
    }
  ]
}
\`\`\`

---

## D) Datetime Policy

### Implementatie

Alle datum-tijd velden worden gegenereerd met **Luxon** (\`npm:luxon@3\`):

\`\`\`javascript
function buildISO(dateStr, timeStr) {
  const dt = DateTime.fromISO(
    \\\`\\\${dateStr}T\\\${hh}:\\\${mm}:\\\${ss}\\\`,
    { zone: 'Europe/Amsterdam' }
  );
  return dt.toISO(); // e.g. "2026-01-15T06:00:00+01:00"
}
\`\`\`

### Regels

| Regel | Beschrijving |
|---|---|
| Timezone | Altijd \`Europe/Amsterdam\` |
| Library | Luxon (niet handmatig) |
| DST-aware | Automatisch: +01:00 (winter) / +02:00 (zomer) |
| Geen handmatige offset | Offset wordt **nooit** handmatig geconcateneerd |
| Output formaat | ISO 8601 met offset (\`2026-01-15T06:00:00+01:00\`) |

### DST voorbeelden

| Datum | Offset | Reden |
|---|---|---|
| 2026-01-15 (winter) | \`+01:00\` | CET |
| 2026-07-15 (zomer) | \`+02:00\` | CEST |

### Geteste velden

- \`startDateTimeISO\` — start van de dienst
- \`endDateTimeISO\` — einde van de dienst (respecteert \`end_date\` bij nachtdienst)

---

## E) Schema Validation Policy

### Twee-lagen validatie

**Laag 1: Version Guard**

\`\`\`javascript
const EXPECTED_SCHEMA_VERSION = "2.3";

if (reportData.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
  return Response.json({
    error: 'SCHEMA_VERSION_MISMATCH',
    expected: EXPECTED_SCHEMA_VERSION,
    actual: reportData.schemaVersion,
  }, { status: 422 });
}
\`\`\`

**Laag 2: AJV Runtime Validatie**

\`\`\`javascript
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateReport = ajv.compile(REPORT_SCHEMA);

const valid = validateReport(reportData);
if (!valid) {
  return Response.json({
    error: 'SCHEMA_VALIDATION_FAILED',
    details: validateReport.errors,
  }, { status: 422 });
}
\`\`\`

### Foutafhandeling

| HTTP Status | Error Code | Oorzaak |
|---|---|---|
| 422 | \`SCHEMA_VERSION_MISMATCH\` | \`schemaVersion\` in data ≠ \`EXPECTED_SCHEMA_VERSION\` |
| 422 | \`SCHEMA_VALIDATION_FAILED\` | AJV detecteert structuurfout (onbekend veld, verkeerd type, etc.) |

### Bewezen door test

Een \`fakeField\` injectie werd succesvol geblokkeerd met:
\`\`\`json
{
  "error": "SCHEMA_VALIDATION_FAILED",
  "details": [{ "keyword": "additionalProperties", "params": { "additionalProperty": "fakeField" } }]
}
\`\`\`

---

## F) Azure Integratie

### Configuratie

| Secret | Beschrijving |
|---|---|
| \`AZURE_PAYROLL_ENDPOINT\` | Azure HTTP endpoint URL |
| \`AZURE_PAYROLL_API_KEY\` | API key voor authenticatie |

### Dry-Run Modus

Wanneer een of beide secrets ontbreken retourneert de functie:

\`\`\`json
{
  "success": false,
  "error": "AZURE_NOT_CONFIGURED",
  "dryRun": true,
  "message": "Azure endpoint en/of API key zijn niet geconfigureerd...",
  "reportDate": "2026-01-15",
  "employeeCount": 1,
  "totals": { "..." }
}
\`\`\`

Dit maakt het mogelijk om de volledige pipeline te testen zonder Azure-connectie.

### Retry Policy

| Instelling | Waarde |
|---|---|
| Max pogingen | 3 |
| Backoff | Lineair: 1s, 2s, 3s |
| Bij falen | HTTP 502 met \`AZURE_PUSH_FAILED\` |

### Request formaat

\`\`\`
POST {AZURE_PAYROLL_ENDPOINT}
Content-Type: application/json
x-api-key: {AZURE_PAYROLL_API_KEY}
Body: <volledig rapport JSON>
\`\`\`

---

## G) Deployment Guarantees

### verifyDeployment

- **Retourneert altijd HTTP 200** — ook bij individuele functiefouten
- Pingt alle bekende backend functies met een lichtgewicht payload
- Categoriseert per functie: \`OK\`, \`ERROR\`, \`NOT_DEPLOYED\`
- Rapporteert totaal aantal fouten en deployment health

### Schema Mismatch Guard

Elke export-functie bevat een onafhankelijke \`EXPECTED_SCHEMA_VERSION\` constante. Als de gegenereerde data een afwijkende versie bevat, wordt de export geblokkeerd met HTTP 422.

### Backward Compatibility

- Schema v2.3 is **niet** backward compatible met v2.2 (toevoeging van \`startDateTimeISO\` / \`endDateTimeISO\`)
- Consumenten moeten hun validatie updaten bij major/minor version bumps
- Het schema (\`downloadDailyPayrollSchema\`) is altijd beschikbaar als referentie

---

## H) Versioning Strategie

| Type wijziging | Actie | Voorbeeld |
|---|---|---|
| Nieuw verplicht veld toevoegen | **Major bump** (breaking) | v2.3 → v3.0 |
| Optioneel veld toevoegen | **Minor bump** (non-breaking) | v2.3 → v2.4 |
| Veld verwijderen | **Major bump** (breaking) | v2.3 → v3.0 |
| Veldtype wijzigen | **Major bump** (breaking) | v2.3 → v3.0 |
| Layout/styling PDF wijziging | **Geen schema bump** | v2.3 → v2.3 |
| Bugfix in berekening | **Patch** (geen schema bump) | v2.3 → v2.3 |

### Synchronisatie-eis

Bij elke schema bump moeten **alle vijf functies** dezelfde \`EXPECTED_SCHEMA_VERSION\` / \`schemaVersion\` waarde hebben:

1. \`buildDailyPayrollReportData\`
2. \`generateDailyPayrollReport\`
3. \`downloadDailyPayrollReportJson\`
4. \`downloadDailyPayrollSchema\`
5. \`sendDailyPayrollReportToAzure\`

---

## I) Known Limitations

| Beperking | Impact | Mitigatie |
|---|---|---|
| **Luxon cold start** | Eerste aanroep kan ~50-100ms extra kosten door module-initialisatie | Acceptabel voor dagelijkse batch; geen impact op eindgebruiker |
| **Geen caching layer** | Elk verzoek haalt alle data opnieuw op uit de database | Overwegen voor toekomstige versie bij hoog volume |
| **Geen async queue voor Azure** | Push is synchroon binnen het request; bij Azure timeout wacht de caller | Retry policy (3x) vangt tijdelijke fouten op |
| **Geen delta/incremental export** | Altijd volledige dag-export, geen diff met vorige run | Voldoende voor huidig volume |
| **Single-tenant** | Geen tenant-filtering in payroll export | Tenant-aware filtering gepland voor fase 2 |

---

## Bijlage: Test Resultaten (2026-02-23)

| Test | Resultaat |
|---|---|
| Winter DST (2026-01-15) | ✅ \`+01:00\` offset correct |
| Zomer DST (2026-07-15) | ✅ \`+02:00\` offset correct |
| Schema versie check | ✅ Alle 5 functies op v2.3 |
| fakeField injectie | ✅ HTTP 422 SCHEMA_VALIDATION_FAILED |
| Dry-run zonder Azure secrets | ✅ AZURE_NOT_CONFIGURED met rapport-totalen |
| Normaal functioneren na cleanup | ✅ HTTP 200 met correcte data |

---

*Document gegenereerd: 2026-02-23 — Interdistri TMS Daily Payroll Export v2.3*
`;

export default function DailyPayrollExportDocs() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <ReactMarkdown
          className="prose prose-slate max-w-none
            prose-headings:text-slate-900
            prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-3
            prose-h2:text-xl prose-h2:mt-8
            prose-h3:text-base
            prose-table:text-sm
            prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2
            prose-td:px-3 prose-td:py-2
            prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg"
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto border border-slate-200 rounded-lg my-4">
                <table className="min-w-full">{children}</table>
              </div>
            ),
          }}
        >
          {DOC}
        </ReactMarkdown>
      </div>
    </div>
  );
}