import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SignatureCanvas from "../contracts/SignatureCanvas";

function fmtDate(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  } catch { return val; }
}

function Section({ title, children }) {
  return (
    <div>
      <div className="border-b border-slate-200 mt-4 mb-2 pb-1">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex py-0.5">
      <span className="text-xs text-slate-500 w-48 min-w-[12rem] text-right pr-3">{label}</span>
      <span className="text-xs text-slate-800 flex-1">{children || "—"}</span>
    </div>
  );
}

export default function StamkaartSignatureView({ employee, employeeName, token, fillOnboarding, onSigned }) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  if (!employee) return null;

  const e = employee;
  const cats = Array.isArray(e.drivers_license_categories)
    ? e.drivers_license_categories.join(", ")
    : (e.drivers_license_categories || "—");

  const lhLabel = e.loonheffing_toepassen === "ja" ? "Ja" : e.loonheffing_toepassen === "nee" ? "Nee" : "Niet ingevuld";

  const handleSign = async (dataUrl) => {
    setSigning(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('submitStamkaartSignature', {
        action: "sign",
        token,
        signature_data_url: dataUrl,
      });
      const data = response.data;
      if (data?.success) {
        onSigned();
      } else {
        setError(data?.error || "Er is een fout opgetreden bij het opslaan.");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message;
      setError(errMsg);
    }
    setSigning(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Stamkaart ter ondertekening</h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Beveiligde link — verloopt automatisch
              </p>
            </div>
          </div>
        </div>

        {/* Document */}
        <Card>
          <CardContent className="pt-6 pb-4">
            {/* Document header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2 mb-4">
              <div>
                <span className="text-sm font-bold text-slate-800">Stamkaart werknemers</span>
                <br />
                <span className="text-xs text-slate-600">{employeeName} — Nr. {e.employee_number || '—'}</span>
              </div>
              <div className="text-right text-[9px] text-slate-500">
                <div className="font-semibold text-slate-700">Interdistri B.V.</div>
                <div>Fleerbosseweg 19, 4421 RR Kapelle</div>
              </div>
            </div>

            {/* Employee data — read only */}
            <Section title="Werknemer gegevens">
              <Row label="Voorletters">{e.initials}</Row>
              <Row label="Voornaam">{e.first_name}</Row>
              <Row label="Tussenvoegsel">{e.prefix}</Row>
              <Row label="Achternaam">{e.last_name}</Row>
              <Row label="Geboortedatum">{fmtDate(e.date_of_birth)}</Row>
              <Row label="Adres">{e.address}</Row>
              <Row label="Postcode en woonplaats">{e.postal_code} {e.city}</Row>
              <Row label="E-mailadres">{e.email}</Row>
              <Row label="Telefoon">{e.phone}</Row>
              <Row label="BSN">{e.bsn_masked}</Row>
              <Row label="IBAN">{e.iban_masked}</Row>
              <Row label="Noodcontact">{e.emergency_contact_name} {e.emergency_contact_phone}</Row>
            </Section>

            <Section title="Identiteitsbewijs">
              <Row label="Nr. ID-kaart/paspoort">{e.id_document_number}</Row>
              <Row label="Geldig tot">{fmtDate(e.id_document_expiry)}</Row>
            </Section>

            <Section title="Rijbewijs">
              <Row label="Rijbewijsnummer">{e.drivers_license_number}</Row>
              <Row label="Categorieën">{cats}</Row>
              <Row label="Vervaldatum rijbewijs">{fmtDate(e.drivers_license_expiry)}</Row>
              <Row label="Vervaldatum Code 95">{fmtDate(e.code95_expiry)}</Row>
            </Section>

            <Section title="Gegevens dienstverband">
              <Row label="Datum in dienst">{fmtDate(e.in_service_since)}</Row>
              <Row label="Functie">{e.function}</Row>
              <Row label="Afdeling">{e.department}</Row>
              <Row label="Contract type">{e.contract_type}</Row>
              <Row label="Contracturen">{e.contract_hours ? `${e.contract_hours} uur` : '—'}</Row>
              <Row label="Loonschaal">{e.salary_scale}</Row>
              <Row label="Bruto uurloon">{e.hourly_rate ? `€ ${Number(e.hourly_rate).toFixed(2)}` : '—'}</Row>
            </Section>

            <Section title="Loonheffingskorting">
              <Row label="Loonheffingskorting?">{lhLabel}</Row>
              {e.loonheffing_datum && <Row label="Vanaf datum">{fmtDate(e.loonheffing_datum)}</Row>}
            </Section>
          </CardContent>
        </Card>

        {/* Signature section */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Ondertekening</h3>
            <p className="text-xs text-slate-500 mb-4">
              Door te ondertekenen bevestig je dat bovenstaande gegevens juist zijn
              {fillOnboarding && " en ga je akkoord met alle onboarding verklaringen"}.
            </p>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded mb-3">
                {error}
              </div>
            )}

            <div style={{ maxWidth: 400 }}>
              <SignatureCanvas onSign={handleSign} signing={signing} />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-2">
          <p>⚠️ Dit document bevat vertrouwelijke persoonsgegevens. Niet delen met onbevoegden.</p>
        </div>
      </div>
    </div>
  );
}