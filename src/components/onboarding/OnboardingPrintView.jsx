import React from "react";
import ReactDOM from "react-dom";

const fmtDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return val; }
};

const Section = ({ title, children }) => (
  <div className="mb-5 break-inside-avoid">
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-400 pb-1 mb-2">{title}</h3>
    {children}
  </div>
);

const DataGrid = ({ children }) => (
  <div className="grid grid-cols-3 gap-x-6 gap-y-1">{children}</div>
);

const Field = ({ label, value, wide }) => (
  <div className={`text-xs ${wide ? 'col-span-2' : ''}`}>
    <span className="text-slate-400 block leading-tight">{label}</span>
    <span className="text-slate-900 font-medium block leading-snug">{value || '—'}</span>
  </div>
);

const StatusItem = ({ label, done }) => (
  <div className="flex items-center gap-2 text-xs py-0.5">
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${done ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {done ? '✓' : '✗'}
    </span>
    <span className={done ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
  </div>
);

/**
 * Hidden print-only component. Rendered off-screen, becomes visible only during window.print().
 * Parent should call window.print() to trigger printing.
 */
export default function OnboardingPrintView({ employeeData, onboardingData }) {
  const emp = employeeData;
  const ob = onboardingData;
  const fullName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
  const cats = Array.isArray(emp.drivers_license_categories) ? emp.drivers_license_categories.join(', ') : (emp.drivers_license_categories || '—');

  return ReactDOM.createPortal(
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          body > #onboarding-print-root { display: block !important; position: static !important; }
          #onboarding-print-root * { visibility: visible !important; }
        }
      `}</style>

      {/* Hidden container portaled to body — only visible during print */}
      <div
        id="onboarding-print-root"
        style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden' }}
      >
        <div className="max-w-[780px] mx-auto bg-white text-sm p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2 mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Onboarding Dossier</h1>
              <p className="text-xs text-slate-500 mt-0.5">{fullName} — Nr. {emp.employee_number || '—'}</p>
            </div>
            <div className="text-right text-[9px] text-slate-500 leading-tight">
              <div className="font-semibold text-slate-700">Interdistri B.V.</div>
              <div>Fleerbosseweg 19, 4421 RR Kapelle</div>
              <div>Afdrukdatum: {new Date().toLocaleDateString('nl-NL')}</div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3 mb-4 text-xs">
            <span className={`px-2 py-0.5 rounded font-semibold ${ob.status === 'Afgerond' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {ob.status || 'In behandeling'}
            </span>
            <span className="text-slate-500">
              Nr. {emp.employee_number || '—'} · {ob.completed_date ? `Afgerond ${fmtDate(ob.completed_date)}` : `Gestart ${fmtDate(ob.created_date)}`}
            </span>
          </div>

          {/* WERKNEMER GEGEVENS */}
          <Section title="Werknemer gegevens">
            <DataGrid>
              <Field label="Voornaam" value={emp.first_name} />
              <Field label="E-mail" value={emp.email} />
              <Field label="Noodcontact" value={emp.emergency_contact_name ? `${emp.emergency_contact_name} ${emp.emergency_contact_phone || ''}` : null} />
              <Field label="Tussenvoegsel" value={emp.prefix} />
              <Field label="Telefoon" value={emp.phone} />
              <Field label="" value="" />
              <Field label="Achternaam" value={emp.last_name} />
              <Field label="Adres" value={emp.address} />
              <Field label="" value="" />
              <Field label="Voorletters" value={emp.initials} />
              <Field label="Postcode / Plaats" value={`${emp.postal_code || ''} ${emp.city || ''}`.trim() || '—'} />
              <Field label="" value="" />
              <Field label="Geboortedatum" value={fmtDate(emp.date_of_birth)} />
              <Field label="IBAN" value={emp.bank_account} />
              <Field label="" value="" />
              <Field label="BSN" value={emp.bsn} />
              <Field label="Noodcontact relatie" value={emp.emergency_contact_relation} />
              <Field label="" value="" />
            </DataGrid>
          </Section>

          {/* IDENTITEITSBEWIJS */}
          <Section title="Identiteitsbewijs">
            <DataGrid>
              <Field label="Nr. ID-kaart/paspoort" value={emp.id_document_number} />
              <Field label="Geldig tot" value={fmtDate(emp.id_document_expiry)} />
              <Field label="" value="" />
            </DataGrid>
          </Section>

          {/* RIJBEWIJS */}
          <Section title="Rijbewijs">
            <DataGrid>
              <Field label="Rijbewijsnummer" value={emp.drivers_license_number} />
              <Field label="Vervaldatum rijbewijs" value={fmtDate(emp.drivers_license_expiry)} />
              <Field label="" value="" />
              <Field label="Categorieën" value={cats} />
              <Field label="Code 95 vervaldatum" value={fmtDate(emp.code95_expiry)} />
              <Field label="" value="" />
            </DataGrid>
          </Section>

          {/* DIENSTVERBAND */}
          <Section title="Dienstverband">
            <DataGrid>
              <Field label="Datum in dienst" value={fmtDate(emp.in_service_since)} />
              <Field label="Loonschaal" value={emp.salary_scale} />
              <Field label="" value="" />
              <Field label="Functie" value={emp.function} />
              <Field label="Uurloon" value={emp.hourly_rate ? `€ ${Number(emp.hourly_rate).toFixed(2)}` : '—'} />
              <Field label="" value="" />
              <Field label="Afdeling" value={emp.department} />
              <Field label="Status" value={emp.status || 'Actief'} />
              <Field label="" value="" />
            </DataGrid>
          </Section>

          {/* LOONHEFFING */}
          {(ob.loonheffing_toepassen || emp.loonheffing_toepassen) && (
            <Section title="Loonheffingskorting">
              <DataGrid>
                <Field label="Loonheffingskorting toepassen" value={
                  (ob.loonheffing_toepassen || emp.loonheffing_toepassen) === 'ja' ? 'Ja' :
                  (ob.loonheffing_toepassen || emp.loonheffing_toepassen) === 'nee' ? 'Nee' : 'Niet ingevuld'
                } />
                <Field label="Vanaf datum" value={fmtDate(ob.loonheffing_datum || emp.loonheffing_datum)} />
                <Field label="" value="" />
              </DataGrid>
            </Section>
          )}

          {/* CONTRACT */}
          {ob.contract_generated && ob.contract_settings && (
            <Section title="Contractgegevens">
              <DataGrid>
                <Field label="Contracttype" value={ob.contract_settings.contract_type} />
                <Field label="Startdatum" value={fmtDate(ob.contract_settings.start_date)} />
                <Field label="Proeftijd" value={ob.contract_settings.proeftijd} />
                {ob.contract_settings.end_date && <Field label="Einddatum" value={fmtDate(ob.contract_settings.end_date)} />}
                <Field label="Uren per week" value={ob.contract_settings.hours_per_week ?? emp.contract_hours ?? '—'} />
              </DataGrid>
            </Section>
          )}

          {/* VERKLARINGEN & STAPPEN */}
          <Section title="Verklaringen & stappen">
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
              <StatusItem label="Stamkaart afgerond" done={ob.stamkaart_completed} />
              <StatusItem label="Sleutelkast verklaring" done={ob.pincode_verklaring_signed} />
              <StatusItem label="Sleutelverklaring" done={ob.sleutel_verklaring_signed} />
              <StatusItem label="GPS Buddy toestemming" done={ob.gps_buddy_toestemming} />
              <StatusItem label="Verklaring dienstbetrekking" done={ob.dienstbetrekking_signed} />
              <StatusItem label="Bedrijfsreglement ontvangen" done={ob.bedrijfsreglement_ontvangen} />
              <StatusItem label="Contract aangemaakt" done={ob.contract_generated} />
              <StatusItem label="Mobile Entry uitnodiging" done={ob.mobile_invite_sent} />
            </div>
            {ob.sleutel_nummer && (
              <div className="mt-2 text-xs text-slate-500">
                Sleutelnummer: <span className="font-medium text-slate-700">{ob.sleutel_nummer}</span>
                {ob.sleutel_toegang && <> · Toegang tot: <span className="font-medium text-slate-700">{ob.sleutel_toegang}</span></>}
              </div>
            )}
          </Section>

          {/* HANDTEKENING */}
          {ob.employee_signature_url && (
            <Section title="Handtekening medewerker">
              <img src={ob.employee_signature_url} alt="Handtekening" className="max-h-20 border rounded" />
              {ob.loonheffing_handtekening_url && ob.loonheffing_handtekening_url !== ob.employee_signature_url && (
                <div className="mt-2">
                  <span className="text-xs text-slate-400 block mb-1">Handtekening loonheffingsverklaring</span>
                  <img src={ob.loonheffing_handtekening_url} alt="Handtekening LH" className="max-h-20 border rounded" />
                </div>
              )}
            </Section>
          )}

          {/* Footer */}
          <div className="mt-6 pt-2 border-t text-center text-[9px] text-slate-400">
            Dit document is vertrouwelijk en uitsluitend bestemd voor HR-administratie.
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}