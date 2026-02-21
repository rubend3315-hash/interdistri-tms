import React from "react";

export default function OnboardingPrintView({ employeeData, onboardingData }) {
  const fullName = `${employeeData.first_name || ""} ${employeeData.prefix ? employeeData.prefix + " " : ""}${employeeData.last_name || ""}`.trim();
  const lhLabel = onboardingData?.loonheffing_toepassen === "ja" ? "Ja" : onboardingData?.loonheffing_toepassen === "nee" ? "Nee" : "Niet ingevuld";
  const lhDatum = onboardingData?.loonheffing_toepassen === "ja"
    ? onboardingData?.loonheffing_ja_datum
    : onboardingData?.loonheffing_nee_datum;

  const Field = ({ label, value }) => (
    <div className="flex border-b border-slate-200 py-1">
      <span className="w-[200px] text-slate-500 shrink-0">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );

  return (
    <div className="hidden print:block bg-white text-black p-0" style={{ fontSize: "10pt", lineHeight: "1.4" }}>
      <h1 style={{ fontSize: "14pt", fontWeight: 700, marginBottom: "4px" }}>Stamkaart – {fullName}</h1>
      <p style={{ fontSize: "9pt", color: "#666", marginBottom: "16px" }}>Interdistri B.V. | Gegenereerd: {new Date().toLocaleDateString("nl-NL")}</p>

      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ fontSize: "11pt", fontWeight: 600, borderBottom: "2px solid #1e293b", paddingBottom: "2px", marginBottom: "6px" }}>Persoonlijke gegevens</h2>
        <Field label="Naam" value={fullName} />
        <Field label="Geboortedatum" value={employeeData.date_of_birth} />
        <Field label="E-mail" value={employeeData.email} />
        <Field label="Telefoon" value={employeeData.phone} />
        <Field label="Adres" value={`${employeeData.address || "—"}, ${employeeData.postal_code || ""} ${employeeData.city || ""}`} />
        <Field label="Noodcontact" value={employeeData.emergency_contact_name ? `${employeeData.emergency_contact_name} (${employeeData.emergency_contact_phone || "—"})` : "—"} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ fontSize: "11pt", fontWeight: 600, borderBottom: "2px solid #1e293b", paddingBottom: "2px", marginBottom: "6px" }}>Identificatie</h2>
        <Field label="BSN" value={employeeData.bsn} />
        <Field label="Nr. ID-kaart/paspoort" value={employeeData.id_document_number} />
        <Field label="Geldig tot" value={employeeData.id_document_expiry} />
        <Field label="Rijbewijsnummer" value={employeeData.drivers_license_number} />
        <Field label="Rijbewijscategorieën" value={Array.isArray(employeeData.drivers_license_categories) ? employeeData.drivers_license_categories.join(", ") : employeeData.drivers_license_categories} />
        <Field label="Rijbewijs vervaldatum" value={employeeData.drivers_license_expiry} />
        <Field label="Code 95 vervaldatum" value={employeeData.code95_expiry} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ fontSize: "11pt", fontWeight: 600, borderBottom: "2px solid #1e293b", paddingBottom: "2px", marginBottom: "6px" }}>Dienstverband</h2>
        <Field label="Personeelsnummer" value={employeeData.employee_number} />
        <Field label="Afdeling" value={employeeData.department} />
        <Field label="Functie" value={employeeData.function} />
        <Field label="In dienst sinds" value={employeeData.in_service_since} />
        <Field label="Contracttype" value={employeeData.contract_type} />
        <Field label="Uren per week" value={employeeData.contract_hours} />
        <Field label="Loonschaal" value={employeeData.salary_scale} />
        <Field label="Bruto uurloon" value={employeeData.hourly_rate ? `€ ${Number(employeeData.hourly_rate).toFixed(2)}` : "—"} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ fontSize: "11pt", fontWeight: 600, borderBottom: "2px solid #1e293b", paddingBottom: "2px", marginBottom: "6px" }}>Loonheffingskorting</h2>
        <Field label="Toepassen" value={lhLabel} />
        <Field label="Vanaf datum" value={lhDatum || "—"} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ fontSize: "11pt", fontWeight: 600, borderBottom: "2px solid #1e293b", paddingBottom: "2px", marginBottom: "6px" }}>Financiële gegevens</h2>
        <Field label="IBAN" value={employeeData.bank_account} />
        <Field label="LKV-uitkering" value={employeeData.lkv_uitkering === "ja" ? "Ja" : "Nee"} />
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "11pt", fontWeight: 600, borderBottom: "2px solid #1e293b", paddingBottom: "2px", marginBottom: "8px" }}>Handtekening</h2>
        <div className="flex gap-8 items-end">
          <div>
            <span className="text-slate-500 block mb-1">Handtekening medewerker:</span>
            {onboardingData?.employee_signature_url ? (
              <img src={onboardingData.employee_signature_url} alt="Handtekening" style={{ maxHeight: "60px", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
            ) : onboardingData?.loonheffing_handtekening_url ? (
              <img src={onboardingData.loonheffing_handtekening_url} alt="Handtekening" style={{ maxHeight: "60px", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
            ) : (
              <span className="text-slate-400 italic">Niet getekend</span>
            )}
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Datum:</span>
            <span>{onboardingData?.loonheffing_datum || new Date().toLocaleDateString("nl-NL")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}