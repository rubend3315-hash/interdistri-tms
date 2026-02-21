import React from "react";
import { getFullName } from "@/components/utils/employeeUtils";
import { StamkaartRow, StamkaartSectionTitle } from "./StamkaartForm";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

function fmtDate(val) {
  if (!val) return "—";
  try { return format(new Date(val), "d-M-yyyy", { locale: nl }); } catch { return val; }
}

function PrintVal({ children }) {
  return <span className="text-xs text-slate-800">{children || "—"}</span>;
}

/**
 * StamkaartPrintView — read-only A4 representation using EXACT same structure as StamkaartForm.
 * No separate layout logic. Same sections, same field order, same grid.
 * 
 * Props:
 * - employee: employee data object
 * - onboardingData: (optional) if coming from onboarding, loonheffing data lives here
 */
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
    <div className="mx-auto bg-white" style={{ maxWidth: 880, fontSize: "10pt" }}>
      {/* Company header */}
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-1 mb-2">
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
      <StamkaartSectionTitle title="Werknemer gegevens" />
      <div className="space-y-0">
        <StamkaartRow label="Voorletters / voornaam"><PrintVal>{employee.first_name}</PrintVal></StamkaartRow>
        <StamkaartRow label="Achternaam"><PrintVal>{employee.last_name}</PrintVal></StamkaartRow>
        <StamkaartRow label="Geboortedatum"><PrintVal>{fmtDate(employee.date_of_birth)}</PrintVal></StamkaartRow>
        <StamkaartRow label="Burger Service Nummer"><PrintVal>{employee.bsn}</PrintVal></StamkaartRow>
        <StamkaartRow label="Adres"><PrintVal>{employee.address}</PrintVal></StamkaartRow>
        <StamkaartRow label="Postcode en woonplaats"><PrintVal>{employee.postal_code} {employee.city}</PrintVal></StamkaartRow>
        <StamkaartRow label="E-mailadres"><PrintVal>{employee.email}</PrintVal></StamkaartRow>
        <StamkaartRow label="IBAN-rekeningnummer"><PrintVal>{employee.bank_account}</PrintVal></StamkaartRow>
        <StamkaartRow label="Nummer ID-kaart / paspoort"><PrintVal>{employee.id_document_number}</PrintVal></StamkaartRow>
        <StamkaartRow label="Geldigheid ID-kaart / paspoort"><PrintVal>{fmtDate(employee.id_document_expiry)}</PrintVal></StamkaartRow>
        <StamkaartRow label="Rijbewijsnummer"><PrintVal>{employee.drivers_license_number}</PrintVal></StamkaartRow>
        <StamkaartRow label="Rijbewijscategorieën"><PrintVal>{cats}</PrintVal></StamkaartRow>
        <StamkaartRow label="Rijbewijs vervaldatum"><PrintVal>{fmtDate(employee.drivers_license_expiry)}</PrintVal></StamkaartRow>
        <StamkaartRow label="Code 95 vervaldatum"><PrintVal>{fmtDate(employee.code95_expiry)}</PrintVal></StamkaartRow>
        <StamkaartRow label="Telefoon"><PrintVal>{employee.phone}</PrintVal></StamkaartRow>
        <StamkaartRow label="Noodcontact (naam / telefoon)"><PrintVal>{employee.emergency_contact_name} {employee.emergency_contact_phone}</PrintVal></StamkaartRow>
      </div>

      {/* ═══ DIENSTVERBAND ═══ */}
      <StamkaartSectionTitle title="Gegevens dienstverband" />
      <div className="space-y-0">
        <StamkaartRow label="Datum in dienst"><PrintVal>{fmtDate(employee.in_service_since)}</PrintVal></StamkaartRow>
        <StamkaartRow label="Afdeling"><PrintVal>{employee.department}</PrintVal></StamkaartRow>
        <StamkaartRow label="Functie"><PrintVal>{employee.function}</PrintVal></StamkaartRow>
        <StamkaartRow label="Contract type"><PrintVal>{employee.contract_type}</PrintVal></StamkaartRow>
        <StamkaartRow label="Contracturen per week"><PrintVal>{employee.contract_hours ? `${employee.contract_hours} uur` : null}</PrintVal></StamkaartRow>
        <StamkaartRow label="Loonschaal"><PrintVal>{employee.salary_scale}</PrintVal></StamkaartRow>
        <StamkaartRow label="Bruto uurloon (€)"><PrintVal>{employee.hourly_rate ? `€ ${Number(employee.hourly_rate).toFixed(2)}` : null}</PrintVal></StamkaartRow>
      </div>

      {/* ═══ LOONHEFFING, FINANCIEEL & ONDERTEKENING ═══ */}
      <StamkaartSectionTitle title="Loonheffingskorting & ondertekening" />
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* LINKERKOLOM */}
        <div className="space-y-0">
          <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 28 }}>
            <span className="text-xs text-slate-600">Loonheffingskorting?</span>
            <PrintVal>{lhLabel}</PrintVal>
          </div>
          {lhToepassen && (
            <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 28 }}>
              <span className="text-xs text-slate-600">Vanaf datum</span>
              <PrintVal>{fmtDate(lhDatum)}</PrintVal>
            </div>
          )}
          <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 28 }}>
            <span className="text-xs text-slate-600">LKV (WW, WAO, WIA)?</span>
            <PrintVal>{employee.lkv_uitkering === "ja" ? "Ja, doelgroepverklaring" : "Nee"}</PrintVal>
          </div>
          <div className="grid items-center" style={{ gridTemplateColumns: "45% 55%", minHeight: 28 }}>
            <span className="text-xs text-slate-600">Bijzonderheden</span>
            <PrintVal>{employee.financiele_situatie}</PrintVal>
          </div>
        </div>

        {/* RECHTERKOLOM — Handtekening */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">Handtekening werknemer</span>
            <span className="text-xs text-slate-500">Datum: {fmtDate(lhDatum) !== "—" ? fmtDate(lhDatum) : new Date().toLocaleDateString('nl-NL')}</span>
          </div>
          {lhSignatureUrl ? (
            <img src={lhSignatureUrl} alt="Handtekening" className="border border-slate-300 w-full object-contain" style={{ height: 100 }} />
          ) : (
            <div className="border border-slate-300 flex items-center justify-center" style={{ height: 100 }}>
              <span className="text-xs text-slate-400 italic">Niet getekend</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}