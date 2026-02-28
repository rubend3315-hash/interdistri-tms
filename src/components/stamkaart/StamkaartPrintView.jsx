import React from "react";
import { getFullName } from "@/components/utils/employeeUtils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ StamkaartPrintView — SINGLE SOURCE OF TRUTH                ║
 * ║                                                            ║
 * ║ Dit component is de enige document-template voor:          ║
 * ║ - Printweergave (Stamkaart pagina)                         ║
 * ║ - StamkaartDocument pagina (schoon, zonder layout)         ║
 * ║ - Onboarding preview                                      ║
 * ║                                                            ║
 * ║ De email HTML (stamkaartEmailHtml.js) volgt exact          ║
 * ║ dezelfde sectie-indeling, veldvolgorde en structuur.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Props:
 * - employee: employee data object (required)
 * - onboardingData: (optional) loonheffing data from onboarding
 */

function fmtDate(val) {
  if (!val) return "—";
  try { return format(new Date(val), "d-M-yyyy", { locale: nl }); } catch { return val; }
}

function SectionTitle({ title }) {
  return (
    <div className="border-b border-slate-200" style={{ marginTop: 6, marginBottom: 2, paddingBottom: 1 }}>
      <span style={{ fontSize: 11 }} className="font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
    </div>
  );
}

function Row({ label, compact, children }) {
  const w = compact ? 150 : 240;
  return (
    <div className="flex items-center" style={{ minHeight: 26 }}>
      <span style={{ fontSize: 13, lineHeight: 1.3, width: w, minWidth: w, paddingRight: 8, textAlign: 'right' }} className="text-slate-600 truncate">{label}</span>
      <span className="text-xs text-slate-800 flex-1 min-w-0">{children || "—"}</span>
    </div>
  );
}

export default function StamkaartPrintView({ employee, onboardingData }) {
  if (!employee) return null;

  const fullName = getFullName ? getFullName(employee) :
    `${employee.first_name || ''} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name || ''}`.trim();

  // Resolve loonheffing data: onboarding → employee
  const lhToepassen = onboardingData?.loonheffing_toepassen || employee.loonheffing_toepassen || "";
  const lhDatum = onboardingData?.loonheffing_datum || employee.loonheffing_datum || "";
  const lhSignatureUrl = onboardingData?.loonheffing_handtekening_url || employee.loonheffing_handtekening_url || "";
  const lhLabel = lhToepassen === "ja" ? "Ja" : lhToepassen === "nee" ? "Nee" : "Niet ingevuld";

  const cats = Array.isArray(employee.drivers_license_categories)
    ? employee.drivers_license_categories.join(", ")
    : (employee.drivers_license_categories || "");

  return (
    <div className="mx-auto bg-white" style={{ maxWidth: 720, fontSize: "10pt", lineHeight: 1.35, paddingBottom: 4 }}>

      {/* ═══ DOCUMENT HEADER ═══ */}
      <div className="flex items-start justify-between border-b-2 border-slate-800" style={{ paddingBottom: 2, marginBottom: 4 }}>
        <div>
          <span className="text-sm font-bold text-slate-800">Stamkaart werknemers</span>
          <br />
          <span className="text-xs text-slate-600">{fullName} — Nr. {employee.employee_number || '—'}</span>
        </div>
        <div className="text-right text-[9px] text-slate-500 leading-tight">
          <div className="font-semibold text-slate-700">Interdistri B.V.</div>
          <div>Fleerbosseweg 19, 4421 RR Kapelle</div>
          <div>K.v.K. nr: 20150449</div>
          <div>Afdrukdatum: {new Date().toLocaleDateString('nl-NL')}</div>
        </div>
      </div>

      {/* ═══ WERKNEMER GEGEVENS ═══ */}
      <SectionTitle title="Werknemer gegevens" />
      <div className="space-y-0">
        <Row label="Voorletters">{employee.initials}</Row>
        <Row label="Voornaam">{employee.first_name}</Row>
        <Row label="Tussenvoegsel">{employee.prefix}</Row>
        <Row label="Achternaam">{employee.last_name}</Row>
        <Row label="Geboortedatum">{fmtDate(employee.date_of_birth)}</Row>
        <Row label="Adres">{employee.address}</Row>
        <Row label="Postcode en woonplaats">{employee.postal_code} {employee.city}</Row>
        <Row label="E-mailadres">{employee.email}</Row>
        <Row label="Telefoon">{employee.phone}</Row>
        <Row label="IBAN">{employee.bank_account}</Row>
        <Row label="Noodcontact (naam / telefoon)">{employee.emergency_contact_name} {employee.emergency_contact_phone}</Row>
      </div>

      {/* ═══ IDENTITEITSBEWIJS ═══ */}
      <SectionTitle title="Identiteitsbewijs" />
      <div className="space-y-0">
        <Row label="Burger Service Nummer">{employee.bsn}</Row>
        <Row label="Nr. ID-kaart/paspoort">{employee.id_document_number}</Row>
        <Row label="Geldig tot">{fmtDate(employee.id_document_expiry)}</Row>
      </div>

      {/* ═══ RIJBEWIJS ═══ */}
      <SectionTitle title="Rijbewijs" />
      <div className="space-y-0">
        <Row label="Rijbewijsnummer">{employee.drivers_license_number}</Row>
        <Row label="Categorieën">{cats}</Row>
        <Row label="Vervaldatum rijbewijs">{fmtDate(employee.drivers_license_expiry)}</Row>
        <Row label="Vervaldatum Code 95">{fmtDate(employee.code95_expiry)}</Row>
      </div>

      {/* ═══ DIENSTVERBAND ═══ */}
      <SectionTitle title="Gegevens dienstverband" />
      <div className="grid grid-cols-2 gap-x-6 overflow-hidden">
        {/* Kolom 1 */}
        <div className="space-y-0">
          <Row label="Datum in dienst" compact>{fmtDate(employee.in_service_since)}</Row>
          <Row label="Functie" compact>{employee.function}</Row>
          <Row label="Afdeling" compact>{employee.department}</Row>
        </div>
        {/* Kolom 2 */}
        <div className="space-y-0">
          <Row label="Contract type" compact>{(() => {
            const ar = (employee.contractregels || [])
              .filter(r => r.status !== 'Inactief' && r.status !== 'Beëindigd')
              .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0];
            return ar?.type_contract || '—';
          })()}</Row>
          <Row label="Contracturen" compact>{(() => {
            const ar = (employee.contractregels || [])
              .filter(r => r.status !== 'Inactief' && r.status !== 'Beëindigd')
              .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0];
            return ar ? `${ar.uren_per_week ?? 0} uur` : null;
          })()}</Row>
          <Row label="Loonschaal" compact>{employee.salary_scale}</Row>
          <Row label="Bruto uurloon (€)" compact>{employee.hourly_rate ? `€ ${Number(employee.hourly_rate).toFixed(2)}` : null}</Row>
        </div>
      </div>

      {/* ═══ LOONHEFFINGSKORTING & ONDERTEKENING ═══ */}
      <SectionTitle title="Loonheffingskorting & ondertekening" />
      <div className="grid" style={{ gridTemplateColumns: "1fr 270px", columnGap: 24 }}>
        {/* LINKERKOLOM */}
        <div className="space-y-0">
          <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 22 }}>
            <span className="text-xs text-slate-600">Loonheffingskorting?</span>
            <span className="text-xs text-slate-800">{lhLabel}</span>
          </div>
          {lhToepassen && (
            <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 22 }}>
              <span className="text-xs text-slate-600">Vanaf datum</span>
              <span className="text-xs text-slate-800">{fmtDate(lhDatum)}</span>
            </div>
          )}
          <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 22 }}>
            <span className="text-xs text-slate-600">LKV (WW, WAO, WIA)?</span>
            <span className="text-xs text-slate-800">{employee.lkv_uitkering === "ja" ? "Ja, doelgroepverklaring" : "Nee"}</span>
          </div>
          <div className="grid items-start" style={{ gridTemplateColumns: "45% 55%", minHeight: 100 }}>
            <span className="text-xs text-slate-600" style={{ paddingTop: 4 }}>Bijzonderheden</span>
            <div className="text-xs text-slate-800 border border-slate-400/60 bg-white min-h-[100px] px-2 py-1.5" style={{ whiteSpace: 'pre-wrap' }}>{employee.financiele_situatie || "—"}</div>
          </div>
        </div>

        {/* RECHTERKOLOM — Handtekening */}
        <div style={{ maxWidth: 270 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
            <span className="text-xs text-slate-600">Handtekening werknemer</span>
            <span style={{ fontSize: 11 }} className="text-slate-500">Datum: {fmtDate(lhDatum) !== "—" ? fmtDate(lhDatum) : new Date().toLocaleDateString('nl-NL')}</span>
          </div>
          {lhSignatureUrl ? (
            <img src={lhSignatureUrl} alt="Handtekening" className="border border-slate-400/60 w-full object-contain bg-white" style={{ height: 80 }} />
          ) : (
            <div className="border border-slate-400/60 bg-white flex items-center justify-center" style={{ height: 80 }}>
              <span className="text-xs text-slate-400 italic">Niet getekend</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="text-center border-t border-slate-200" style={{ marginTop: 8, paddingTop: 4 }}>
        <span className="text-[9px] text-slate-400">Dit document is vertrouwelijk en uitsluitend bestemd voor de loonadministratie.</span>
      </div>
    </div>
  );
}