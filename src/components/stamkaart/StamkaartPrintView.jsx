import React from "react";
import { getFullName } from "@/components/utils/employeeUtils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

function formatDate(val) {
  if (!val) return "—";
  try {
    return format(new Date(val), "d MMMM yyyy", { locale: nl });
  } catch {
    return val;
  }
}

function Row({ label, value }) {
  if (!label) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 py-[3px] text-[11pt]">
      <span className="font-semibold text-slate-800">{label}</span>
      <span className="text-slate-700">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="border-b border-slate-300 pb-1 mb-2">
        <h3 className="text-[12pt] font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function StamkaartPrintView({ employee }) {
  if (!employee) return null;

  const fullName = getFullName(employee);
  const lhLabel = employee.loonheffing_toepassen === "ja" ? "Ja" : employee.loonheffing_toepassen === "nee" ? "Nee" : "Niet ingevuld";

  return (
    <div className="stamkaart-print bg-white" style={{ width: "210mm", margin: "0 auto", padding: "15mm", fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#1e293b" }}>
      <style>{`
        @media print {
          body { width: 210mm; margin: 0; padding: 0; }
          .stamkaart-print { padding: 15mm !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          .stamkaart-print { max-width: 210mm; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-slate-800">
        <div>
          <h1 className="text-[16pt] font-bold text-slate-900">Stamkaart</h1>
          <p className="text-[11pt] text-slate-600">{fullName}</p>
        </div>
        <div className="text-right text-[9pt] text-slate-500">
          <p className="font-semibold text-slate-700">Van Dooren Transport Zeeland B.V.</p>
          <p>Fleerbosseweg 19, 4421 RR Kapelle</p>
          <p>Afdrukdatum: {format(new Date(), "d MMMM yyyy", { locale: nl })}</p>
        </div>
      </div>

      {/* Pagina 1 */}
      <Section title="Persoonlijke gegevens">
        <Row label="Voornaam" value={employee.first_name} />
        <Row label="Tussenvoegsel" value={employee.prefix} />
        <Row label="Achternaam" value={employee.last_name} />
        <Row label="Voorletters" value={employee.initials} />
        <Row label="Geboortedatum" value={formatDate(employee.date_of_birth)} />
        <Row label="BSN" value={employee.bsn} />
        <Row label="E-mail" value={employee.email} />
        <Row label="Telefoon" value={employee.phone} />
        <Row label="Adres" value={employee.address} />
        <Row label="Postcode" value={employee.postal_code} />
        <Row label="Woonplaats" value={employee.city} />
        <Row label="IBAN" value={employee.bank_account} />
        <Row label="Noodcontact" value={employee.emergency_contact_name} />
        <Row label="Noodcontact telefoon" value={employee.emergency_contact_phone} />
        <Row label="Relatie noodcontact" value={employee.emergency_contact_relation} />
      </Section>

      <Section title="Identificatie & Rijbewijs">
        <Row label="Nummer ID-kaart/paspoort" value={employee.id_document_number} />
        <Row label="Geldig tot" value={formatDate(employee.id_document_expiry)} />
        <Row label="Rijbewijsnummer" value={employee.drivers_license_number} />
        <Row label="Rijbewijscategorieën" value={Array.isArray(employee.drivers_license_categories) ? employee.drivers_license_categories.join(", ") : employee.drivers_license_categories} />
        <Row label="Rijbewijs vervaldatum" value={formatDate(employee.drivers_license_expiry)} />
        <Row label="Code 95 vervaldatum" value={formatDate(employee.code95_expiry)} />
      </Section>

      {/* Pagina 2 */}
      <div className="page-break" />

      <Section title="Gegevens dienstverband">
        <Row label="Personeelsnummer" value={employee.employee_number} />
        <Row label="Afdeling" value={employee.department} />
        <Row label="Functie" value={employee.function} />
        <Row label="In dienst sinds" value={formatDate(employee.in_service_since)} />
        <Row label="Uit dienst datum" value={formatDate(employee.out_of_service_date)} />
        <Row label="Contract type" value={employee.contract_type} />
        <Row label="Contracturen per week" value={employee.contract_hours ? `${employee.contract_hours} uur` : undefined} />
        <Row label="Loonschaal" value={employee.salary_scale} />
        <Row label="Bruto uurloon" value={employee.hourly_rate ? `€ ${Number(employee.hourly_rate).toFixed(2)}` : undefined} />
      </Section>

      <Section title="Loonheffingskorting">
        <Row label="Loonheffingskorting" value={lhLabel} />
        <Row label="Datum" value={formatDate(employee.loonheffing_datum)} />
        {employee.loonheffing_handtekening_url && (
          <div className="mt-2">
            <span className="font-semibold text-[11pt] text-slate-800">Handtekening:</span>
            <img src={employee.loonheffing_handtekening_url} alt="Handtekening" className="h-12 mt-1 border rounded" />
          </div>
        )}
      </Section>

      <Section title="Ondertekening">
        <div className="grid grid-cols-2 gap-8 mt-4">
          <div>
            <p className="text-[10pt] text-slate-600 mb-8">Datum:</p>
            <div className="border-b border-slate-400 w-full" />
          </div>
          <div>
            <p className="text-[10pt] text-slate-600 mb-8">Handtekening medewerker:</p>
            <div className="border-b border-slate-400 w-full" />
          </div>
        </div>
      </Section>

      <Section title="Financiële situatie">
        <Row label="Uit uitkeringssituatie (LKV)" value={employee.lkv_uitkering === "ja" ? "Ja, doelgroepverklaring aanvragen" : "Nee"} />
        <Row label="Bijzonderheden" value={employee.financiele_situatie} />
      </Section>
    </div>
  );
}