import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";

export default function DagstaatPrintView({
  employee,
  date,
  timeEntries,
  trips,
  vehicles,
  customers,
  onBack,
}) {
  const formattedDate = date ? format(new Date(date), "EEEE d MMMM yyyy", { locale: nl }) : "";
  const totalHours = timeEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);
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
        @media print {
          /* Hide non-print elements */
          .no-print { display: none !important; }
          /* Reset page */
          body, html { margin: 0; padding: 0; }
          /* A4 sizing */
          .dagstaat-page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            margin: 0 auto;
            font-size: 10pt;
            color: #000 !important;
            background: white !important;
          }
          .dagstaat-page * {
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dagstaat-header-bar {
            background-color: #1e293b !important;
            color: white !important;
          }
          .dagstaat-header-bar * {
            color: white !important;
          }
          /* Hide sidebar and layout */
          aside, nav, .lg\\:hidden { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          /* Table borders */
          .dagstaat-table th, .dagstaat-table td {
            border: 1px solid #000 !important;
            padding: 4px 8px !important;
          }
          .dagstaat-table th {
            background-color: #f1f5f9 !important;
          }
          /* Signature boxes */
          .signature-box {
            border: 1px solid #000 !important;
            min-height: 25mm;
          }
          /* Correction fields */
          .correction-field {
            border-bottom: 1px solid #000 !important;
            min-height: 8mm;
          }
        }
        /* Screen preview */
        @media screen {
          .dagstaat-page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-size: 10pt;
          }
          .dagstaat-table th, .dagstaat-table td {
            border: 1px solid #334155;
            padding: 4px 8px;
          }
          .dagstaat-table th {
            background-color: #f1f5f9;
          }
          .signature-box {
            border: 1px solid #334155;
            min-height: 25mm;
          }
          .correction-field {
            border-bottom: 1px solid #94a3b8;
            min-height: 8mm;
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
      <div className="dagstaat-page">
        {/* Header */}
        <div className="dagstaat-header-bar rounded-lg px-6 py-4 mb-6" style={{ backgroundColor: "#1e293b", color: "white" }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "white" }}>DAGSTAAT</h1>
              <p className="text-sm opacity-80" style={{ color: "#cbd5e1" }}>Interdistri Transport Management</p>
            </div>
            <div className="text-right text-sm">
              <p style={{ color: "white" }}>{isEmpty ? "" : formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Medewerker gegevens */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "#475569" }}>
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
                <td className="font-semibold">Datum</td>
                <td colSpan={3}>{isEmpty ? "" : formattedDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tijdregistratie */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "#475569" }}>
            Tijdregistratie
          </h2>
          <table className="dagstaat-table w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="text-left">Starttijd</th>
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
                  <td>{te.start_time || "-"}</td>
                  <td>{te.end_time || "-"}</td>
                  <td>{te.break_minutes ?? 0}</td>
                  <td className="font-semibold">{te.total_hours ?? "-"}</td>
                  <td>{te.shift_type || "-"}</td>
                  <td>{te.status || "-"}</td>
                </tr>
              )) : (
                <>
                  {[1, 2, 3].map(i => (
                    <tr key={i}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                  ))}
                </>
              )}
              <tr>
                <td colSpan={3} className="font-bold text-right">Totaal gewerkte uren:</td>
                <td className="font-bold">{isEmpty ? "" : totalHours.toFixed(2)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ritten */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "#475569" }}>
            Rittenregistratie
          </h2>
          <table className="dagstaat-table w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="text-left">Voertuig</th>
                <th className="text-left">Klant</th>
                <th className="text-left">Route</th>
                <th className="text-left">Vertrek</th>
                <th className="text-left">Aankomst</th>
                <th className="text-left">Km</th>
              </tr>
            </thead>
            <tbody>
              {trips.length > 0 ? trips.map((trip, idx) => (
                <tr key={idx}>
                  <td>{getVehicleName(trip.vehicle_id)}</td>
                  <td>{getCustomerName(trip.customer_id)}</td>
                  <td>{trip.route_name || "-"}</td>
                  <td>{trip.departure_time || "-"}</td>
                  <td>{trip.arrival_time || "-"}</td>
                  <td>{trip.total_km ?? "-"}</td>
                </tr>
              )) : (
                <>
                  {[1, 2, 3].map(i => (
                    <tr key={i}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                  ))}
                </>
              )}
              <tr>
                <td colSpan={5} className="font-bold text-right">Totaal ritten:</td>
                <td className="font-bold">{isEmpty ? "" : totalTrips}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Correctievelden */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "#475569" }}>
            Correcties (handmatig invullen)
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold mb-1">Correctie werktijden:</p>
              <div className="correction-field"></div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Correctie ritten:</p>
              <div className="correction-field"></div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Opmerkingen:</p>
              <div className="correction-field" style={{ minHeight: "12mm" }}></div>
            </div>
          </div>
        </div>

        {/* Handtekeningen */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#475569" }}>
            Ondertekening
          </h2>
          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ flex: 1 }}>
              <p className="text-xs font-semibold mb-1">Handtekening medewerker:</p>
              <div className="signature-box rounded" style={{ minHeight: "25mm" }}></div>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                Naam: {employee ? getFullName(employee) : "___________________________"}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs font-semibold mb-1">Handtekening leidinggevende:</p>
              <div className="signature-box rounded" style={{ minHeight: "25mm" }}></div>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                Naam: ___________________________
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs">
              <span className="font-semibold">Datum ondertekening:</span>{" "}
              ______ / ______ / ____________
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3" style={{ borderTop: "1px solid #e2e8f0" }}>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Dagstaat gegenereerd op {format(new Date(), "d MMMM yyyy 'om' HH:mm", { locale: nl })} — Interdistri TMS
          </p>
        </div>
      </div>
    </>
  );
}