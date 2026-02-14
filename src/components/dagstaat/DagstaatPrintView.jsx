import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";

export default function DagstaatPrintView({
  employee,
  date,
  endDate,
  timeEntries,
  trips,
  vehicles,
  customers,
  onBack,
}) {
  const formattedDate = date ? format(new Date(date), "d MMMM yyyy", { locale: nl }) : "";
  const formattedEndDate = endDate ? format(new Date(endDate), "d MMMM yyyy", { locale: nl }) : "";
  const periodLabel = date && endDate && date !== endDate
    ? `${formattedDate} t/m ${formattedEndDate}`
    : formattedDate;
  const totalHours = timeEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);
  const totalBreak = timeEntries.reduce((sum, te) => sum + (te.break_minutes || 0), 0);
  const totalTrips = trips.length;
  const isEmpty = !employee;

  const getVehicleName = (id) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.license_plate} (${v.brand} ${v.model || ""})` : id || "-";
  };

  const getCustomerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? c.company_name : id || "-";
  };

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @page { size: A4 landscape; margin: 6mm; }
        @media print {
          .no-print { display: none !important; }
          body, html { margin: 0; padding: 0; }
          .dagstaat-page {
            width: 283mm;
            max-height: 193mm;
            padding: 4mm 6mm;
            margin: 0 auto;
            font-size: 7pt;
            color: #000 !important;
            background: white !important;
          }
          .dagstaat-page * {
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dagstaat-header-bar {
            background-color: transparent !important;
            border-bottom: 2px solid #000 !important;
          }
          .dagstaat-header-bar * { color: #000 !important; }
          aside, nav, .lg\\:hidden { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          main > div { padding: 0 !important; }
          main > div > .dagstaat-print-wrapper { display: block !important; }
          main > div > .dagstaat-print-wrapper * { visibility: visible !important; }
          .dagstaat-table th, .dagstaat-table td {
            border: 1px solid #000 !important;
            padding: 2px 4px !important;
          }
          .dagstaat-table th { background-color: #f1f5f9 !important; }
          .signature-box {
            border: 1px solid #000 !important;
            min-height: 15mm;
          }
          .correction-field {
            border-bottom: 1px solid #000 !important;
            min-height: 6mm;
          }
        }
        /* Screen preview */
        @media screen {
          .dagstaat-page {
            width: 297mm;
            min-height: 190mm;
            padding: 6mm 8mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-size: 7pt;
          }
          .dagstaat-table th, .dagstaat-table td {
            border: 1px solid #334155;
            padding: 2px 4px;
          }
          .dagstaat-table th { background-color: #f1f5f9; }
          .signature-box {
            border: 1px solid #334155;
            min-height: 15mm;
          }
          .correction-field {
            border-bottom: 1px solid #94a3b8;
            min-height: 6mm;
          }
        }
      `}</style>

      {/* Back button - only on screen */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => window.print()}>
          Printen
        </Button>
      </div>

      {/* A4 Dagstaat */}
      <div className="dagstaat-print-wrapper dagstaat-page">
        {/* Header */}
        <div className="dagstaat-header-bar px-1 py-1 mb-2" style={{ borderBottom: "2px solid #1e293b" }}>
          <div className="flex justify-between items-center">
            <h1 className="text-base font-bold" style={{ color: "#1e293b" }}>
              DAGSTAAT — Interdistri Transport Management
            </h1>
            <span className="text-sm" style={{ color: "#475569" }}>{isEmpty ? "" : periodLabel}</span>
          </div>
        </div>

        {/* Medewerker gegevens */}
        <div className="mb-2">
          <h2 style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px", color: "#475569" }}>
            Medewerkergegevens
          </h2>
          <table className="dagstaat-table w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="font-semibold w-1/4">Naam</td>
                <td className="w-1/4">{employee ? getFullName(employee) : ""}</td>
                <td className="font-semibold w-1/4">Personeelsnr.</td>
                <td className="w-1/4">{employee?.employee_number || ""}</td>
              </tr>
              <tr>
                <td className="font-semibold">Afdeling</td>
                <td>{employee?.department || ""}</td>
                <td className="font-semibold">Functie</td>
                <td>{employee?.function || ""}</td>
              </tr>
              <tr>
                <td className="font-semibold">Periode</td>
                <td colSpan={3}>{isEmpty ? "" : periodLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tijdregistratie */}
        <div className="mb-2">
          <h2 style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px", color: "#475569" }}>
            Tijdregistratie <span style={{ fontWeight: "normal", fontSize: "6pt", textTransform: "none", letterSpacing: "normal", color: "#64748b" }}>— Starttijd kan nooit voor de aan u gecommuniceerde begin diensttijd liggen.</span>
          </h2>
          <table className="dagstaat-table w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="text-left">Begin datum</th>
                <th className="text-left">Starttijd</th>
                <th className="text-left">Eind datum</th>
                <th className="text-left">Eindtijd</th>
                <th className="text-left">Pauze (min)</th>
                <th className="text-left">Totaal uren</th>
                <th className="text-left">Diensttype</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.length > 0 ? timeEntries.map((te, idx) => (
                <tr key={idx}>
                  <td>{te.date ? format(new Date(te.date), "dd-MM-yyyy") : "-"}</td>
                  <td>{te.start_time || "-"}</td>
                  <td>{(te.end_date || te.date) ? format(new Date(te.end_date || te.date), "dd-MM-yyyy") : "-"}</td>
                  <td>{te.end_time || "-"}</td>
                  <td>{te.break_minutes ?? 0}</td>
                  <td className="font-semibold">{te.total_hours ?? "-"}</td>
                  <td>{te.shift_type || "-"}</td>
                  <td>{te.status || "-"}</td>
                </tr>
              )) : (
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              )}
              <tr>
                <td className="text-xs" style={{ borderTop: "2px solid #475569" }}>Correctie:</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td colSpan={2}><span className="text-xs">Reden:</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ritten & Kilometerstanden */}
        <div className="mb-2">
          <h2 style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px", color: "#475569" }}>
            Rittenregistratie & Kilometerstanden <span style={{ fontWeight: "normal", fontSize: "6pt", textTransform: "none", letterSpacing: "normal", color: "#64748b" }}>— De rittijden moeten tussen de starttijd en eindtijd tijdregistratie liggen.</span>
          </h2>
          <table className="dagstaat-table w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="text-left">Datum</th>
                <th className="text-left">Voertuig</th>
                <th className="text-left">Klant</th>
                <th className="text-left">Route</th>
                <th className="text-left">Vertrek</th>
                <th className="text-left">Aankomst</th>
                <th className="text-left">Begin km</th>
                <th className="text-left">Eind km</th>
                <th className="text-left">Totaal km</th>
              </tr>
            </thead>
            <tbody>
              {trips.length > 0 ? (
                <>
                  {trips.map((trip, idx) => (
                    <tr key={idx}>
                      <td>{trip.date ? format(new Date(trip.date), "dd-MM-yyyy") : "-"}</td>
                      <td>{getVehicleName(trip.vehicle_id)}</td>
                      <td>{getCustomerName(trip.customer_id)}</td>
                      <td>{trip.route_name || "-"}</td>
                      <td>{trip.departure_time || "-"}</td>
                      <td>{trip.arrival_time || "-"}</td>
                      <td>{trip.start_km ?? "-"}</td>
                      <td>{trip.end_km ?? "-"}</td>
                      <td>{trip.total_km ?? "-"}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - trips.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  ))}
                </>
              ) : (
                <>
                  {[0,1,2,3,4].map(i => (
                    <tr key={`empty-${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  ))}
                </>
              )}
              <tr>
                <td colSpan={8} className="font-bold text-right">Totaal km:</td>
                <td className="font-bold">{isEmpty ? "" : trips.reduce((sum, t) => sum + (t.total_km || 0), 0) || ""}</td>
              </tr>
            </tbody>
          </table>

          {/* Tankregistratie */}
          <table className="dagstaat-table w-full text-sm" style={{ borderCollapse: "collapse", marginTop: "2px" }}>
            <thead>
              <tr>
                <th className="text-left" style={{ width: "25%" }}>Kenteken</th>
                <th className="text-left" style={{ width: "25%" }}>Brandstof (liter)</th>
                <th className="text-left" style={{ width: "25%" }}>AdBlue (liter)</th>
                <th className="text-left" style={{ width: "25%" }}>Km stand bij tanken</th>
              </tr>
            </thead>
            <tbody>
              {trips.length > 0 && trips.some(t => t.fuel_liters || t.adblue_liters || t.fuel_km) ? (
                trips.filter(t => t.fuel_liters || t.adblue_liters || t.fuel_km).map((trip, idx) => {
                  const v = vehicles.find(v => v.id === trip.vehicle_id);
                  return (
                    <tr key={idx}>
                      <td>{v?.license_plate || "-"}</td>
                      <td>{trip.fuel_liters ?? ""}</td>
                      <td>{trip.adblue_liters ?? ""}</td>
                      <td>{trip.fuel_km ?? ""}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Verklaringen met checkbox */}
        <div style={{ marginTop: "2mm", marginBottom: "1mm", display: "flex", flexDirection: "column", gap: "1px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="text-xs" style={{ color: "#1e293b" }}>
              Ik verklaar dat ik geen schade aan mijn voertuig heb veroorzaakt en deze schoon en opgeruimd heb geparkeerd.
            </span>
            <div style={{ width: "12px", height: "12px", border: "1.5px solid #334155", borderRadius: "2px", flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="text-xs" style={{ color: "#1e293b" }}>
              Ik verklaar de dagstaat volledig en naar waarheid te hebben ingevuld.
            </span>
            <div style={{ width: "12px", height: "12px", border: "1.5px solid #334155", borderRadius: "2px", flexShrink: 0 }} />
          </div>
        </div>

        {/* Opmerkingen + Handtekeningen naast elkaar */}
        <div style={{ display: "flex", gap: "8px", marginTop: "2mm" }}>
          {/* Links: Opmerkingen */}
          <div className="signature-box rounded" style={{ flex: 1, padding: "3px 6px", minHeight: "35mm" }}>
            <span className="text-xs" style={{ color: "#94a3b8" }}>Opmerkingen</span>
          </div>

          {/* Rechts: Handtekeningen boven elkaar, samen zelfde hoogte als opmerkingen */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", minHeight: "35mm" }}>
            <div className="signature-box rounded" style={{ flex: 1, padding: "3px 6px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span className="text-xs" style={{ color: "#94a3b8" }}>Handtekening medewerker</span>
              <span style={{ fontSize: "6pt", color: "#94a3b8", lineHeight: "1.3" }}>Zonder uw handtekening kunnen wij uw dagstaat niet verwerken. Totdat de handtekening is geplaatst, heeft u slechts aanspraak op uw basisloon.</span>
            </div>
            <div className="signature-box rounded" style={{ flex: 1, padding: "3px 6px" }}>
              <span className="text-xs" style={{ color: "#94a3b8" }}>Handtekening leidinggevende</span>
            </div>
          </div>
        </div>

        {!isEmpty && (
          <div style={{ marginTop: "2mm", paddingTop: "1mm", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: "6pt", color: "#94a3b8" }}>
              Dagstaat gegenereerd op {format(new Date(), "d MMMM yyyy 'om' HH:mm", { locale: nl })} — Interdistri TMS
            </p>
          </div>
        )}
      </div>
    </>
  );
}