import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, BookOpen, Server, Gauge, Fuel, Zap, Thermometer, Radio } from "lucide-react";

const STATUS = {
  ok: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Beschikbaar" },
  no: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Niet beschikbaar" },
  partial: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", label: "Beperkt / altijd null" },
};

function StatusBadge({ status }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <Badge className={`${s.bg} ${s.color} text-xs gap-1`}>
      <Icon className="w-3 h-3" /> {s.label}
    </Badge>
  );
}

function ApiEndpoint({ name, status, description, fields }) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <code className="text-sm font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{name}</code>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-slate-600">{description}</p>
      {fields && (
        <div className="text-xs text-slate-500 space-y-0.5">
          <p className="font-medium text-slate-700">Beschikbare velden:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {fields.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function SensorTable({ title, sensors }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2 border-b">Sensor naam</th>
              <th className="text-left p-2 border-b">Type</th>
              <th className="text-left p-2 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((s, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-2 font-mono">{s.name}</td>
                <td className="p-2 text-slate-500">{s.type}</td>
                <td className="p-2"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NaitonApiDocs() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Naiton / GPS Buddy — API Documentatie</h1>
        <p className="text-sm text-slate-500 mt-1">Technische bevindingen van de API-audit op 20 maart 2026</p>
      </div>

      {/* Samenvatting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" /> Samenvatting</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-3">
          <p>
            De Naiton Data Exchange API (<code className="bg-slate-100 px-1 rounded">dawa-prod.naiton.com/datad/execute</code>) 
            biedt toegang tot voertuigdata via ClientId/ClientSecret authenticatie. Na uitgebreide tests is vastgesteld dat 
            de beschikbare data <strong>beperkt</strong> is tot basisritgegevens en sensormetadata.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
            <strong>Vermoedelijke oorzaak:</strong> GPS Buddy/Naiton hanteert twee abonnementsvormen. 
            De webapp toont uitgebreide sensorgrafiek-data (brandstof, temperatuur, motortoerental) die <em>niet</em> via 
            de Data Exchange API beschikbaar is. Deze grafiekdata zit vermoedelijk achter een hoger abonnementsniveau 
            of een aparte sessie-geauthenticeerde webapp-API.
          </div>
        </CardContent>
      </Card>

      {/* Beschikbare endpoints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Server className="w-4 h-4" /> API Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ApiEndpoint
            name="dataexchange_assets"
            status="ok"
            description="Voertuiglijst met GPS-IDs, kentekens, namen en attributen."
            fields={["gpsassetid", "assetname", "licenceplate", "gpsattributeid", "inactief-status"]}
          />
          <ApiEndpoint
            name="dataexchange_trips"
            status="ok"
            description="Rit-segmenten (drive/stop) met GPS-coördinaten, km-standen en chauffeuridentificatie."
            fields={[
              "type (Drive/Stop), start, stop, startlat/lon, stoplat/lon",
              "odometerstartkm, odometerstopkm, distance",
              "additionaldata.Driver (chauffeurnaam)",
              "totalfuelusedstart, totalfuelusedstop → altijd null"
            ]}
          />
          <ApiEndpoint
            name="dataexchange_assetsensors"
            status="partial"
            description="Lijst van beschikbare sensoren per voertuig (naam + laatste timestamp). Geeft alleen metadata, geen historische waarden."
            fields={["sensorname, value (laatste meting), timestamp, sensortype"]}
          />
          <ApiEndpoint
            name="dataexchange_currentpositions"
            status="partial"
            description="Huidige positie van alle voertuigen. Velocity en flagsjson zijn altijd null."
            fields={["latitude, longitude, timestamp — velocity/flagsjson/health: altijd null"]}
          />
          <ApiEndpoint
            name="dataexchange_users"
            status="ok"
            description="Gebruikersregister met chauffeurkoppelingen."
            fields={["firstname, lastname, tachocardnumber, tagid, personid, isdriver"]}
          />
          <ApiEndpoint
            name="dataexchange_sensordata / sensorhistory"
            status="no"
            description="Historische sensorwaarden (grafiekdata). Dit endpoint bestaat niet in de Data Exchange API."
          />
        </CardContent>
      </Card>

      {/* Sensor mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Gauge className="w-4 h-4" /> Sensormapping per voertuigtype</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <p className="text-slate-600">
            Via <code className="bg-slate-100 px-1 rounded">dataexchange_assetsensors</code> is vastgesteld welke sensoren 
            per voertuig beschikbaar zijn. <strong>Alleen metadata</strong> (sensornaam + laatste waarde), geen historische reeksen.
          </p>

          <SensorTable
            title="Vrachtwagen (bijv. 91-BSP-6 — DAF)"
            sensors={[
              { name: "Fuel consumption", type: "Brandstofverbruik", status: "partial" },
              { name: "Engine speed in rpm", type: "Motortoerental", status: "partial" },
              { name: "Engine load", type: "Motorbelasting %", status: "partial" },
              { name: "Odometer", type: "Kilometerstand", status: "partial" },
              { name: "Digital input 1 (ignition)", type: "Contact/ignition", status: "no" },
            ]}
          />
          <SensorTable
            title="Bestelbus/Elektrisch (bijv. V-10-LVJ)"
            sensors={[
              { name: "Battery Pack Remaining Charge", type: "Accu %", status: "partial" },
              { name: "Odometer", type: "Kilometerstand", status: "partial" },
              { name: "Fuel consumption / Engine speed", type: "Motor", status: "no" },
            ]}
          />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
            <strong>Let op:</strong> "Beperkt" betekent dat de sensor als metadata verschijnt (naam + laatste waarde), 
            maar dat er geen historische reeks opvraagbaar is via de API. De grafiek in de GPS Buddy webapp 
            toont deze historische data wel, maar via een ander (niet-publiek) API-endpoint.
          </div>
        </CardContent>
      </Card>

      {/* Niet beschikbaar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Niet beschikbaar via API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { icon: Zap, label: "Ignition/Contact status", desc: "Niet als directe sensor. Geen enkel endpoint levert een expliciet contact-signaal. Oplossing: afgeleid uit snelheid/motorbelasting of stilstand-samenvoeging." },
              { icon: Fuel, label: "Brandstof per rit", desc: "totalfuelusedstart/totalfuelusedstop bestaan als velden maar zijn altijd null voor alle voertuigen." },
              { icon: Gauge, label: "Realtime snelheid", desc: "velocity in currentpositions is altijd null." },
              { icon: Thermometer, label: "Historische sensorgrafieken", desc: "Geen endpoint voor tijdreeks-data van sensoren (de webapp heeft dit wel)." },
              { icon: Radio, label: "Webhooks / realtime events", desc: "Niet ondersteund via de Data Exchange API." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-3 bg-red-50/50 rounded-lg">
                <item.icon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Aanbevelingen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aanbevelingen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-3">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Navraag bij GPS Buddy/Naiton:</strong> Vraag of er een <code className="bg-slate-100 px-1 rounded">dataexchange_sensordata</code> of 
              <code className="bg-slate-100 px-1 rounded">dataexchange_sensorhistory</code> functie geactiveerd kan worden (mogelijk hoger abonnement).
            </li>
            <li>
              <strong>Stilstand-samenvoeging:</strong> Geïmplementeerd in sync-engine v25. Opeenvolgende stop-segmenten 
              op dezelfde GPS-locatie (&lt;200m) worden samengevoegd tot één logische stop. Dit compenseert het ontbreken van 
              een ignition-signaal en geeft nauwkeurigere stilstandtijden.
            </li>
            <li>
              <strong>Sensormetadata op voertuigdetailpagina:</strong> De beschikbare sensorlijst per voertuig kan getoond 
              worden als informatief element, zelfs zonder historische data.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Technische details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Technische details</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-500 space-y-2">
          <p><strong>API Base URL:</strong> <code>https://dawa-prod.naiton.com/datad/execute</code></p>
          <p><strong>Auth:</strong> ClientId + ClientSecret headers</p>
          <p><strong>Protocol:</strong> POST met JSON body array van functie-aanroepen</p>
          <p><strong>Rate limiting:</strong> Niet waargenomen, maar bulk-aanroepen worden aanbevolen</p>
          <p><strong>Audit datum:</strong> 20 maart 2026</p>
          <p><strong>Geteste voertuigen:</strong> 91-BSP-6 (DAF vrachtwagen), V-10-LVJ (elektrisch), VLV-78-K, en 17 andere assets</p>
          <p><strong>Geteste REST-paden:</strong> /datad/sensors/*, /api/sensors/*, /datad/asset/*/sensors — allen 404</p>
        </CardContent>
      </Card>
    </div>
  );
}