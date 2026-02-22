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

const DeclarationBlock = ({ title, done, extra, children }) => (
  <div className="mb-3 pb-3 border-b border-slate-200 last:border-b-0 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
    <div className="flex items-center justify-between mb-1.5">
      <h4 className="text-xs font-semibold text-slate-800">{title}</h4>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${done ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {done ? '✓ Akkoord' : '✗ Niet akkoord'}
      </span>
    </div>
    {extra}
    <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
  </div>
);

export default function OnboardingPrintView({ employeeData, onboardingData, onClose }) {
  const emp = employeeData;
  const ob = onboardingData;
  const fullName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
  const cats = Array.isArray(emp.drivers_license_categories) ? emp.drivers_license_categories.join(', ') : (emp.drivers_license_categories || '—');

  const lhLabel = ob.loonheffing_toepassen === 'ja' ? 'Ja' : ob.loonheffing_toepassen === 'nee' ? 'Nee' : 'Niet ingevuld';
  const allDeclarationsDone = ob.pincode_verklaring_signed && ob.sleutel_verklaring_signed && ob.gps_buddy_toestemming && ob.dienstbetrekking_signed && ob.bedrijfsreglement_ontvangen;

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

      {/* Verklaringen — volledig statisch uitgeschreven */}
      <Section title="Verklaringen">
        {!allDeclarationsDone && (
          <div className="bg-amber-50 border border-amber-300 rounded p-2 mb-3 text-xs font-semibold text-amber-800">
            LET OP: Niet alle verklaringen zijn afgerond.
          </div>
        )}

        <DeclarationBlock
          title="Ontvangstverklaring Pincode Sleutelkast"
          done={ob.pincode_verklaring_signed}
          extra={ob.pincode_sleutelkast ? (
            <div className="bg-slate-50 p-2 rounded mb-2">
              <span className="text-xs text-slate-500">Gegenereerde pincode: </span>
              <span className="font-mono font-bold tracking-widest text-base">{"••••"}</span>
              <p className="text-[10px] text-slate-400 italic mt-0.5">Pincode is uitsluitend bekend bij medewerker.</p>
            </div>
          ) : null}
        >
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Dit is de eigen unieke pincode van de medewerker.</li>
            <li>De pincode mag aan niemand anders verstrekt worden.</li>
            <li>Sleutels uitgenomen onder deze pincode vallen onder verantwoordelijkheid van de medewerker.</li>
            <li>Bij verlies dient de medewerker zelf aangifte te doen.</li>
            <li>Kosten van vermiste sleutels worden op netto salaris ingehouden.</li>
          </ol>
        </DeclarationBlock>

        <DeclarationBlock
          title="Sleutelverklaring Pand & Hek"
          done={ob.sleutel_verklaring_signed}
          extra={
            (ob.sleutel_nummer || ob.sleutel_toegang) ? (
              <div className="bg-slate-50 p-2 rounded mb-2 text-xs space-y-0.5">
                {ob.sleutel_nummer && <div><span className="text-slate-500">Sleutelnummer:</span> <span className="font-medium">{ob.sleutel_nummer}</span></div>}
                {ob.sleutel_toegang && <div><span className="text-slate-500">Toegang tot:</span> <span className="font-medium">{ob.sleutel_toegang}</span></div>}
              </div>
            ) : null
          }
        >
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Het is verboden een kopie te (laten) maken.</li>
            <li>Diefstal of verlies direct melden bij leidinggevende.</li>
            <li>Bij einde dienstverband uiterlijk op laatste werkdag inleveren.</li>
          </ul>
        </DeclarationBlock>

        <DeclarationBlock
          title="Toestemmingsverklaring GPS Buddy"
          done={ob.gps_buddy_toestemming}
        >
          <p>Ondergetekende geeft toestemming voor het GPS-Buddy ritregistratiesysteem in het voertuig van Interdistri.</p>
          <p className="mt-1">Verwerkersverantwoordelijke gebruikt de data uitsluitend werkgerelateerd. Gegevens worden 7 jaar bewaard.</p>
        </DeclarationBlock>

        <DeclarationBlock
          title="Verklaring van Dienstbetrekking"
          done={ob.dienstbetrekking_signed}
        >
          <p className="font-medium mb-1">Artikel 2.11 Wet wegvervoer goederen</p>
          <p>Vergunninghouder: Interdistri, Fleerbosseweg 19, 4421RR Kapelle</p>
          <p>Chauffeur: {fullName}</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Vervoer voor rekening en risico vergunninghouder</li>
            <li>Loons- en gezagsverhouding aanwezig</li>
            <li>Gegevens naar waarheid ingevuld</li>
          </ul>
        </DeclarationBlock>

        <DeclarationBlock
          title="Ontvangst Bedrijfsreglement"
          done={ob.bedrijfsreglement_ontvangen}
        >
          <p>Het bedrijfsreglement is beschikbaar via de mobiele app. De medewerker bevestigt ontvangst en kennisneming van het bedrijfsreglement van Interdistri B.V.</p>
        </DeclarationBlock>
      </Section>

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