import React from "react";
import ReactMarkdown from "react-markdown";

const DOC = `
# Daily Payroll Export — API Consumer Specification

**Schema Version:** 2.3  
**Datum:** 2026-02-23  
**Status:** Productie  
**Doelgroep:** Externe integrators, Azure-ontwikkelaars, API-consumenten  

---

## A) Endpoint

### Request

\`\`\`
POST /sendDailyPayrollReportToAzure
\`\`\`

Het Interdistri TMS stuurt het dagelijkse loonrapport als JSON payload naar het geconfigureerde Azure endpoint. Dit document beschrijft het **exacte formaat** van die payload zodat de ontvangende partij deze kan valideren en verwerken.

### Richting

\`\`\`
Interdistri TMS ──POST──▶ Azure / Extern systeem
\`\`\`

Het externe systeem is de **ontvanger** (consumer). De TMS is de **zender** (producer).

---

## B) Headers

| Header | Waarde | Verplicht |
|---|---|---|
| \`Content-Type\` | \`application/json\` | ✅ Ja |
| \`x-api-key\` | \`{AZURE_PAYROLL_API_KEY}\` | ✅ Ja |

### Authenticatie

De API key wordt meegezonden in de \`x-api-key\` header. Het ontvangende systeem moet deze key valideren voordat de payload wordt verwerkt.

\`\`\`
POST https://your-azure-endpoint.com/api/payroll
Content-Type: application/json
x-api-key: sk_live_abc123...
\`\`\`

---

## C) JSON Structuur (v2.3)

### Root Object

| Veld | Type | Verplicht | Beschrijving |
|---|---|---|---|
| \`success\` | boolean | ✅ | Altijd \`true\` bij geldige payload |
| \`schemaVersion\` | string | ✅ | Vast: \`"2.3"\` |
| \`reportType\` | string | ✅ | Vast: \`"DAILY_PAYROLL"\` |
| \`metadata\` | object | ✅ | Bron- en contextinformatie |
| \`reportDate\` | string | ✅ | Rapportdatum (YYYY-MM-DD) |
| \`period\` | object | ✅ | Periode van het rapport |
| \`generatedAt\` | string | ✅ | ISO 8601 timestamp van generatie |
| \`employeeCount\` | integer | ✅ | Aantal medewerkers in rapport (≥ 0) |
| \`totals\` | object | ✅ | Geaggregeerde totalen over alle medewerkers |
| \`employees\` | array | ✅ | Medewerkergegevens met detailregels |

### metadata

| Veld | Type | Verplicht | Beschrijving |
|---|---|---|---|
| \`sourceSystem\` | string | ✅ | Altijd \`"Interdistri TMS"\` |
| \`generatedBy\` | string | ✅ | Naam van de genererende functie |
| \`timezone\` | string | ✅ | Altijd \`"Europe/Amsterdam"\` |

### period

| Veld | Type | Verplicht | Beschrijving |
|---|---|---|---|
| \`startDate\` | string | ✅ | YYYY-MM-DD |
| \`endDate\` | string | ✅ | YYYY-MM-DD |

### totals

| Veld | Type | Verplicht | Beschrijving |
|---|---|---|---|
| \`totalHours\` | number | ✅ | Totaal gewerkte uren |
| \`overtimeHours\` | number | ❌ | Overuren |
| \`nightHours\` | number | ❌ | Nachturen |
| \`weekendHours\` | number | ❌ | Weekenduren |
| \`holidayHours\` | number | ❌ | Feestdaguren |
| \`subsistenceAllowance\` | number | ❌ | Verblijfskosten (€) |
| \`advancedCosts\` | number | ❌ | Voorgeschoten kosten (€) |
| \`meals\` | number | ❌ | Inhoudingen (€) |
| \`wkr\` | number | ❌ | Werkkostenregeling (€) |
| \`totalTripKilometers\` | number | ✅ | Totaal gereden km |
| \`totalStandplaatsHours\` | number | ✅ | Totaal standplaatswerk uren |

### employees[]

| Veld | Type | Verplicht | Beschrijving |
|---|---|---|---|
| \`employeeNumber\` | string \\| null | ❌ | Personeelsnummer |
| \`employeeId\` | string | ✅ | Unieke medewerker-ID |
| \`name\` | string | ✅ | Volledige naam |
| \`department\` | string \\| null | ❌ | Afdeling |
| \`totals\` | object | ✅ | Zelfde structuur als root \`totals\` |
| \`timeEntries\` | array | ✅ | Tijdregistraties |
| \`trips\` | array | ✅ | Ritten |
| \`standplaatsWerk\` | array | ✅ | Standplaatswerkzaamheden |

### employees[].timeEntries[]

| Veld | Type | Beschrijving |
|---|---|---|
| \`id\` | string | Unieke registratie-ID |
| \`date\` | string | Startdatum (YYYY-MM-DD) |
| \`end_date\` | string | Einddatum (bij nachtdienst: volgende dag) |
| \`start_time\` | string | Starttijd (HH:MM) |
| \`end_time\` | string | Eindtijd (HH:MM) |
| \`startDateTimeISO\` | string \\| null | ISO 8601 met offset (DST-aware) |
| \`endDateTimeISO\` | string \\| null | ISO 8601 met offset (DST-aware) |
| \`break_minutes\` | number | Pauze in minuten |
| \`total_hours\` | number | Netto gewerkte uren |
| \`overtime_hours\` | number | Overuren |
| \`night_hours\` | number | Nachturen |
| \`weekend_hours\` | number | Weekenduren |
| \`holiday_hours\` | number | Feestdaguren |
| \`shift_type\` | string | Type dienst |
| \`subsistence_allowance\` | number | Verblijfskosten (€) |
| \`advanced_costs\` | number | Voorgeschoten kosten (€) |
| \`meals\` | number | Inhoudingen (€) |
| \`wkr\` | number | Werkkostenregeling (€) |
| \`travel_allowance_multiplier\` | number | Reiskosten multiplier |
| \`status\` | string | Altijd \`"Goedgekeurd"\` |
| \`submission_id\` | string | Unieke submit-ID |
| \`notes\` | string | Opmerkingen |

### employees[].trips[]

| Veld | Type | Beschrijving |
|---|---|---|
| \`id\` | string | Unieke rit-ID |
| \`date\` | string | Datum (YYYY-MM-DD) |
| \`vehicle_id\` | string | Voertuig-ID |
| \`start_km\` | number | Begin kilometerstand |
| \`end_km\` | number | Eind kilometerstand |
| \`total_km\` | number | Totaal gereden km |
| \`fuel_liters\` | number | Getankte liters |
| \`departure_time\` | string | Vertrektijd |
| \`arrival_time\` | string | Aankomsttijd |
| \`route_name\` | string | Routenaam |
| \`status\` | string | Ritstatus |

### employees[].standplaatsWerk[]

| Veld | Type | Beschrijving |
|---|---|---|
| \`id\` | string | Uniek ID |
| \`date\` | string | Datum (YYYY-MM-DD) |
| \`employee_id\` | string | Medewerker-ID |
| \`start_time\` | string | Starttijd (HH:MM) |
| \`end_time\` | string | Eindtijd (HH:MM) |
| \`location\` | string | Locatie |

---

## D) Validatieregels

### Schema Enforcement

| Regel | Waarde |
|---|---|
| \`additionalProperties\` | \`false\` — onbekende velden worden **afgewezen** |
| \`schemaVersion\` | Moet exact \`"2.3"\` zijn |
| Validatie-engine | AJV v8 met \`allErrors: true\` |

### Datetime

| Regel | Beschrijving |
|---|---|
| Formaat | ISO 8601 met timezone offset |
| Timezone | Altijd \`Europe/Amsterdam\` |
| Winter | Offset \`+01:00\` (CET) |
| Zomer | Offset \`+02:00\` (CEST) |
| Library | Luxon v3 (server-side) |

### Data Filtering

| Filter | Beschrijving |
|---|---|
| Medewerkers | Alleen \`status: "Actief"\` |
| Tijdregistraties | Alleen \`status: "Goedgekeurd"\` |
| Ritten | Alle ritten voor de datum |
| Standplaatswerk | Alle records voor de datum |

---

## E) Response Codes

### Vanuit Interdistri TMS (zender)

De onderstaande codes worden geretourneerd door de TMS aan de interne caller:

| HTTP Status | Error Code | Beschrijving |
|---|---|---|
| **200** | — | Rapport succesvol verzonden naar Azure |
| **200** | \`AZURE_NOT_CONFIGURED\` | Dry-run: rapport gegenereerd maar niet verzonden (secrets ontbreken) |
| **400** | — | \`date\` parameter ontbreekt in request |
| **401** | — | Gebruiker niet geauthenticeerd |
| **403** | — | Gebruiker is geen admin of hr_admin |
| **422** | \`SCHEMA_VERSION_MISMATCH\` | Schema versie in data ≠ verwachte versie |
| **422** | \`SCHEMA_VALIDATION_FAILED\` | AJV validatie gefaald (onbekend veld, verkeerd type, etc.) |
| **500** | — | Onverwachte serverfout |
| **502** | \`AZURE_PUSH_FAILED\` | Azure endpoint niet bereikbaar na 3 pogingen |

### Verwachte response van Azure (ontvanger)

Het ontvangende systeem moet reageren met:

| HTTP Status | Betekenis |
|---|---|
| **200** of **201** | Payload succesvol ontvangen en verwerkt |
| **400** | Payload ongeldig (consumer-side validatiefout) |
| **401** | API key ongeldig |
| **500** | Interne fout bij ontvanger |

### Retry Beleid

| Parameter | Waarde |
|---|---|
| Max pogingen | 3 |
| Backoff | Lineair: 1s → 2s → 3s |
| Bij permanent falen | HTTP 502 \`AZURE_PUSH_FAILED\` naar caller |

---

## F) Versioning Policy

### Versienummering

Het schema volgt een **major.minor** versienummering:

| Wijziging | Impact | Actie |
|---|---|---|
| Optioneel veld toevoegen | Non-breaking | **Minor bump** (2.3 → 2.4) |
| Verplicht veld toevoegen | Breaking | **Major bump** (2.3 → 3.0) |
| Veld verwijderen | Breaking | **Major bump** |
| Veldtype wijzigen | Breaking | **Major bump** |
| PDF layout wijziging | Geen impact op JSON | Geen schema bump |

### Backward Compatibility Contract

- Bij een **minor bump** (bijv. 2.3 → 2.4): bestaande consumers hoeven **niet** aangepast te worden. Nieuwe velden zijn optioneel.
- Bij een **major bump** (bijv. 2.x → 3.0): consumers **moeten** hun validatie en verwerking bijwerken.

### Schema Version Check

Consumers wordt aangeraden de \`schemaVersion\` te valideren bij ontvangst:

\`\`\`javascript
// Consumer-side validatie voorbeeld
if (payload.schemaVersion !== "2.3") {
  console.warn("Onbekende schema versie:", payload.schemaVersion);
  // Optioneel: afwijzen of waarschuwen
}
\`\`\`

### Schema Download

Het volledige JSON Schema is beschikbaar via de \`downloadDailyPayrollSchema\` functie voor consumer-side validatie.

---

## G) Volledig Voorbeeld

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
  "period": {
    "startDate": "2026-01-15",
    "endDate": "2026-01-15"
  },
  "generatedAt": "2026-01-15T14:30:00.000Z",
  "employeeCount": 2,
  "totals": {
    "totalHours": 16.5,
    "overtimeHours": 1.5,
    "nightHours": 0,
    "weekendHours": 0,
    "holidayHours": 0,
    "subsistenceAllowance": 0,
    "advancedCosts": 0,
    "meals": 0,
    "wkr": 0,
    "totalTripKilometers": 245,
    "totalStandplaatsHours": 2.0
  },
  "employees": [
    {
      "employeeNumber": "001",
      "employeeId": "emp_abc123",
      "name": "Jan van der Berg",
      "department": "Transport",
      "totals": {
        "totalHours": 9.0,
        "overtimeHours": 1.0,
        "nightHours": 0,
        "weekendHours": 0,
        "holidayHours": 0,
        "subsistenceAllowance": 0,
        "advancedCosts": 0,
        "meals": 0,
        "wkr": 0,
        "totalTripKilometers": 180,
        "totalStandplaatsHours": 0
      },
      "timeEntries": [
        {
          "id": "te_001",
          "date": "2026-01-15",
          "end_date": "2026-01-15",
          "start_time": "06:00",
          "end_time": "15:30",
          "startDateTimeISO": "2026-01-15T06:00:00+01:00",
          "endDateTimeISO": "2026-01-15T15:30:00+01:00",
          "break_minutes": 30,
          "total_hours": 9.0,
          "overtime_hours": 1.0,
          "night_hours": 0,
          "weekend_hours": 0,
          "holiday_hours": 0,
          "shift_type": "Dag",
          "subsistence_allowance": 0,
          "advanced_costs": 0,
          "meals": 0,
          "wkr": 0,
          "travel_allowance_multiplier": 0,
          "status": "Goedgekeurd",
          "submission_id": "sub_xyz789",
          "notes": ""
        }
      ],
      "trips": [
        {
          "id": "trip_001",
          "date": "2026-01-15",
          "vehicle_id": "veh_truck01",
          "start_km": 45200,
          "end_km": 45380,
          "total_km": 180,
          "fuel_liters": 45,
          "departure_time": "06:15",
          "arrival_time": "15:00",
          "route_name": "Amsterdam - Rotterdam",
          "status": "Voltooid"
        }
      ],
      "standplaatsWerk": []
    },
    {
      "employeeNumber": "002",
      "employeeId": "emp_def456",
      "name": "Pieter de Vries",
      "department": "PakketDistributie",
      "totals": {
        "totalHours": 7.5,
        "overtimeHours": 0.5,
        "nightHours": 0,
        "weekendHours": 0,
        "holidayHours": 0,
        "subsistenceAllowance": 0,
        "advancedCosts": 0,
        "meals": 0,
        "wkr": 0,
        "totalTripKilometers": 65,
        "totalStandplaatsHours": 2.0
      },
      "timeEntries": [
        {
          "id": "te_002",
          "date": "2026-01-15",
          "end_date": "2026-01-15",
          "start_time": "07:00",
          "end_time": "15:00",
          "startDateTimeISO": "2026-01-15T07:00:00+01:00",
          "endDateTimeISO": "2026-01-15T15:00:00+01:00",
          "break_minutes": 30,
          "total_hours": 7.5,
          "overtime_hours": 0.5,
          "night_hours": 0,
          "weekend_hours": 0,
          "holiday_hours": 0,
          "shift_type": "Dag",
          "subsistence_allowance": 0,
          "advanced_costs": 0,
          "meals": 0,
          "wkr": 0,
          "travel_allowance_multiplier": 0,
          "status": "Goedgekeurd",
          "submission_id": "sub_abc456",
          "notes": ""
        }
      ],
      "trips": [
        {
          "id": "trip_002",
          "date": "2026-01-15",
          "vehicle_id": "veh_van03",
          "start_km": 12000,
          "end_km": 12065,
          "total_km": 65,
          "fuel_liters": 8,
          "departure_time": "07:15",
          "arrival_time": "14:30",
          "route_name": "Utrecht Centrum",
          "status": "Voltooid"
        }
      ],
      "standplaatsWerk": [
        {
          "id": "sw_001",
          "date": "2026-01-15",
          "employee_id": "emp_def456",
          "start_time": "12:00",
          "end_time": "14:00",
          "location": "Depot Utrecht"
        }
      ]
    }
  ]
}
\`\`\`

---

## H) Implementatie Checklist voor Consumers

Gebruik deze checklist bij het aansluiten op de Daily Payroll Export:

- [ ] Valideer \`x-api-key\` header bij ontvangst
- [ ] Controleer \`schemaVersion === "2.3"\`
- [ ] Verwerk \`employees[]\` array (kan leeg zijn als \`employeeCount === 0\`)
- [ ] Gebruik \`startDateTimeISO\` / \`endDateTimeISO\` voor tijdsberekeningen (DST-proof)
- [ ] Accepteer \`null\` waarden voor \`employeeNumber\` en \`department\`
- [ ] Retourneer HTTP 200 of 201 bij succesvolle verwerking
- [ ] Retourneer HTTP 400 met foutomschrijving bij validatiefouten
- [ ] Log de \`reportDate\` en \`generatedAt\` voor traceability

---

*API Consumer Specification v2.3 — Interdistri TMS — 2026-02-23*
`;

export default function PayrollDocApiSpec() {
  return (
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
  );
}