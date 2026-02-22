import React, { useEffect } from "react";
import { CheckCircle2, XCircle, Key } from "lucide-react";

const fmtDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  } catch { return val; }
};

const Section = ({ title, children }) => (
  <div className="mb-4 break-inside-avoid">
    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 border-b border-slate-300 pb-1 mb-2">{title}</h3>
    {children}
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex text-xs leading-relaxed">
    <span className="w-48 min-w-[12rem] text-slate-500 pr-2 text-right shrink-0">{label}</span>
    <span className="text-slate-800">{value || '—'}</span>
  </div>
);

const CheckItem = ({ label, done }) => (
  <div className={`flex items-center gap-2 text-xs py-0.5 ${done ? 'text-green-700' : 'text-slate-400'}`}>
    {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
    <span>{label}</span>
  </div>
);

export default function OnboardingPrintView({ employeeData, onboardingData, onClose }) {
  const emp = employeeData;
  const ob = onboardingData;
  const fullName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
  const cats = Array.isArray(emp.drivers_license_categories) ? emp.drivers_license_categories.join(', ') : (emp.drivers_license_categories || '—');

  const lhLabel = ob.loonheffing_toepassen === 'ja' ? 'Ja' : ob.loonheffing_toepassen === 'nee' ? 'Nee' : 'Niet ingevuld';

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-[720px] mx-auto p-4 bg-white text-sm print:p-0">
      {/* Close button — hidden in print */}
      <div className="print:hidden mb-4 flex justify-end">
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800 border px-3 py-1 rounded">Sluiten</button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-1 mb-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Onboarding Dossier</h1>
          <p className="text-xs text-slate-500">{fullName} — Nr. {emp.employee_number || '—'}</p>
        </div>
        <div className="text-right text-[9px] text-slate-500 leading-tight">
          <div className="font-semibold text-slate-700">Interdistri B.V.</div>
          <div>Fleerbosseweg 19, 4421 RR Kapelle</div>
          <div>Afdrukdatum: {new Date().toLocaleDateString('nl-NL')}</div>
        </div>
      </div>

      {/* Werknemer gegevens */}
      <Section title="Werknemer gegevens">
        <Row label="Voorletters" value={emp.initials} />
        <Row label="Voornaam" value={emp.first_name} />
        <Row label="Tussenvoegsel" value={emp.prefix} />
        <Row label="Achternaam" value={emp.last_name} />
        <Row label="Geboortedatum" value={fmtDate(emp.date_of_birth)} />
        <Row label="Adres" value={emp.address} />
        <Row label="Postcode en woonplaats" value={`${emp.postal_code || ''} ${emp.city || ''}`} />
        <Row label="E-mailadres" value={emp.email} />
        <Row label="Telefoon" value={emp.phone} />
        <Row label="IBAN" value={emp.bank_account} />
        <Row label="Noodcontact" value={`${emp.emergency_contact_name || '—'} ${emp.emergency_contact_phone || ''}`} />
      </Section>

      {/* Identiteitsbewijs */}
      <Section title="Identiteitsbewijs">
        <Row label="BSN" value={emp.bsn} />
        <Row label="Nr. ID-kaart/paspoort" value={emp.id_document_number} />
        <Row label="Geldig tot" value={fmtDate(emp.id_document_expiry)} />
      </Section>

      {/* Rijbewijs */}
      <Section title="Rijbewijs">
        <Row label="Rijbewijsnummer" value={emp.drivers_license_number} />
        <Row label="Categorieën" value={cats} />
        <Row label="Vervaldatum rijbewijs" value={fmtDate(emp.drivers_license_expiry)} />
        <Row label="Vervaldatum Code 95" value={fmtDate(emp.code95_expiry)} />
      </Section>

      {/* Dienstverband */}
      <Section title="Gegevens dienstverband">
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <Row label="Datum in dienst" value={fmtDate(emp.in_service_since)} />
            <Row label="Functie" value={emp.function} />
            <Row label="Afdeling" value={emp.department} />
          </div>
          <div>
            <Row label="Contract type" value={emp.contract_type} />
            <Row label="Contracturen" value={emp.contract_hours ? `${emp.contract_hours} uur` : '—'} />
            <Row label="Loonschaal" value={emp.salary_scale} />
            <Row label="Bruto uurloon" value={emp.hourly_rate ? `€ ${Number(emp.hourly_rate).toFixed(2)}` : '—'} />
          </div>
        </div>
      </Section>

      {/* Loonheffing */}
      <Section title="Loonheffingskorting">
        <Row label="Loonheffingskorting?" value={lhLabel} />
        {ob.loonheffing_datum && <Row label="Vanaf datum" value={fmtDate(ob.loonheffing_datum)} />}
      </Section>

      {/* Verklaringen */}
      <Section title="Verklaringen">
        <CheckItem label="Ontvangstverklaring Pincode Sleutelkast" done={ob.pincode_verklaring_signed} />
        <CheckItem label="Sleutelverklaring Pand & Hek" done={ob.sleutel_verklaring_signed} />
        {ob.sleutel_nummer && <Row label="Sleutelnummer" value={ob.sleutel_nummer} />}
        {ob.sleutel_toegang && <Row label="Toegang tot" value={ob.sleutel_toegang} />}
        <CheckItem label="Toestemming GPS Buddy" done={ob.gps_buddy_toestemming} />
        <CheckItem label="Verklaring Dienstbetrekking" done={ob.dienstbetrekking_signed} />
        <CheckItem label="Bedrijfsreglement ontvangen" done={ob.bedrijfsreglement_ontvangen} />
      </Section>

      {/* Pincode */}
      {ob.pincode_sleutelkast && (
        <Section title="Pincode Sleutelkast">
          <div className="flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-slate-500" />
            <span className="font-mono font-bold tracking-widest text-lg">{ob.pincode_sleutelkast}</span>
          </div>
        </Section>
      )}

      {/* Contract */}
      {ob.contract_generated && ob.contract_settings && (
        <Section title="Contractgegevens">
          <Row label="Type" value={ob.contract_settings.contract_type} />
          <Row label="Startdatum" value={fmtDate(ob.contract_settings.start_date)} />
          {ob.contract_settings.end_date && <Row label="Einddatum" value={fmtDate(ob.contract_settings.end_date)} />}
          <Row label="Proeftijd" value={ob.contract_settings.proeftijd} />
        </Section>
      )}

      {/* Handtekening */}
      <Section title="Handtekening medewerker">
        {ob.employee_signature_url ? (
          <img src={ob.employee_signature_url} alt="Handtekening" className="max-h-24 border rounded" />
        ) : (
          <p className="text-xs text-slate-400 italic">Geen handtekening</p>
        )}
        {ob.loonheffing_handtekening_url && ob.loonheffing_handtekening_url !== ob.employee_signature_url && (
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-1">Handtekening loonheffingsverklaring</p>
            <img src={ob.loonheffing_handtekening_url} alt="Handtekening LH" className="max-h-24 border rounded" />
          </div>
        )}
      </Section>

      {/* Status */}
      <Section title="Status">
        <Row label="Uitnodiging verzonden" value={ob.mobile_invite_sent ? 'Ja' : 'Nee'} />
        <Row label="Welkomstmail verzonden" value={ob.welcome_email_sent ? 'Ja' : 'Nee'} />
      </Section>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t text-center text-[9px] text-slate-400">
        Dit document is vertrouwelijk en uitsluitend bestemd voor HR-administratie.
      </div>
    </div>
  );
}