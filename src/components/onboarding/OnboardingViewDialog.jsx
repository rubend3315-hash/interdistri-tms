import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import OnboardingPrintView from "./OnboardingPrintView";

const fmtDate = (val) => {
  if (!val) return "—";
  try {
    return format(new Date(val), "d MMM yyyy", { locale: nl });
  } catch {
    return val;
  }
};

const Row = ({ label, value }) => (
  <div className="flex text-xs leading-relaxed">
    <span className="w-44 min-w-[11rem] text-slate-500 pr-2 shrink-0">{label}</span>
    <span className="text-slate-800 font-medium">{value || "—"}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-4 break-inside-avoid">
    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 border-b border-slate-300 pb-1 mb-2">
      {title}
    </h3>
    {children}
  </div>
);

const CheckItem = ({ label, done }) => (
  <div className={`flex items-center gap-2 text-xs ${done ? "text-green-700" : "text-slate-400"}`}>
    {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
    <span>{label}</span>
  </div>
);

export default function OnboardingViewDialog({ process, open, onClose }) {
  const { data: employee, isLoading } = useQuery({
    queryKey: ["onboarding_employee", process?.employee_id],
    queryFn: async () => {
      if (!process?.employee_id) return null;
      const results = await base44.entities.Employee.filter({ id: process.employee_id });
      return results[0] || null;
    },
    enabled: open && !!process?.employee_id,
  });

  if (!process) return null;

  const handlePrint = () => {
    window.print();
  };

  const emp = employee || {};
  const ob = process;
  const fullName = ob.employee_name || `${emp.first_name || ""} ${emp.prefix ? emp.prefix + " " : ""}${emp.last_name || ""}`.trim();
  const cats = Array.isArray(emp.drivers_license_categories) ? emp.drivers_license_categories.join(", ") : emp.drivers_license_categories || "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Onboarding Dossier — {fullName}</span>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || !employee}>
              <Printer className="w-4 h-4 mr-1" />
              Afdrukken
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Status */}
            <div className="flex items-center gap-3 mb-3">
              <Badge className={ob.status === "Afgerond" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {ob.status}
              </Badge>
              <span className="text-xs text-slate-500">
                Nr. {emp.employee_number || "—"} · {ob.completed_date ? `Afgerond ${fmtDate(ob.completed_date)}` : `Gestart ${fmtDate(ob.created_date)}`}
              </span>
            </div>

            {/* Werknemer */}
            <Section title="Werknemer gegevens">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <Row label="Voornaam" value={emp.first_name} />
                  <Row label="Tussenvoegsel" value={emp.prefix} />
                  <Row label="Achternaam" value={emp.last_name} />
                  <Row label="Voorletters" value={emp.initials} />
                  <Row label="Geboortedatum" value={fmtDate(emp.date_of_birth)} />
                  <Row label="BSN" value={emp.bsn} />
                </div>
                <div>
                  <Row label="E-mail" value={emp.email} />
                  <Row label="Telefoon" value={emp.phone} />
                  <Row label="Adres" value={emp.address} />
                  <Row label="Postcode / Plaats" value={`${emp.postal_code || ""} ${emp.city || ""}`} />
                  <Row label="IBAN" value={emp.bank_account} />
                  <Row label="Noodcontact" value={`${emp.emergency_contact_name || "—"} ${emp.emergency_contact_phone || ""}`} />
                </div>
              </div>
            </Section>

            {/* Rijbewijs */}
            <Section title="Rijbewijs">
              <Row label="Rijbewijsnummer" value={emp.drivers_license_number} />
              <Row label="Categorieën" value={cats} />
              <Row label="Vervaldatum rijbewijs" value={fmtDate(emp.drivers_license_expiry)} />
              <Row label="Code 95 vervaldatum" value={fmtDate(emp.code95_expiry)} />
            </Section>

            {/* Dienstverband */}
            <Section title="Dienstverband">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <Row label="Datum in dienst" value={fmtDate(emp.in_service_since)} />
                  <Row label="Functie" value={emp.function} />
                  <Row label="Afdeling" value={emp.department} />
                </div>
                <div>
                  <Row label="Loonschaal" value={emp.salary_scale} />
                  <Row label="Uurloon" value={emp.hourly_rate ? `€ ${Number(emp.hourly_rate).toFixed(2)}` : "—"} />
                  <Row label="Status" value={emp.status} />
                </div>
              </div>
            </Section>

            {/* Verklaringen checklist */}
            <Section title="Verklaringen & Stappen">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                <CheckItem label="Stamkaart afgerond" done={ob.stamkaart_completed} />
                <CheckItem label="Sleutelkast verklaring" done={ob.pincode_verklaring_signed} />
                <CheckItem label="Sleutelverklaring" done={ob.sleutel_verklaring_signed} />
                <CheckItem label="GPS Buddy toestemming" done={ob.gps_buddy_toestemming} />
                <CheckItem label="Verklaring dienstbetrekking" done={ob.dienstbetrekking_signed} />
                <CheckItem label="Bedrijfsreglement ontvangen" done={ob.bedrijfsreglement_ontvangen} />
                <CheckItem label="Contract aangemaakt" done={ob.contract_generated} />
                <CheckItem label="Mobile Entry uitnodiging" done={ob.mobile_invite_sent} />
              </div>
              {ob.sleutel_nummer && (
                <div className="mt-2 text-xs text-slate-500">Sleutelnummer: <span className="font-medium text-slate-700">{ob.sleutel_nummer}</span></div>
              )}
              {ob.sleutel_toegang && (
                <div className="text-xs text-slate-500">Toegang tot: <span className="font-medium text-slate-700">{ob.sleutel_toegang}</span></div>
              )}
            </Section>

            {/* Handtekening */}
            {ob.employee_signature_url && (
              <Section title="Handtekening medewerker">
                <img src={ob.employee_signature_url} alt="Handtekening" className="max-h-20 border rounded" />
              </Section>
            )}

            {/* Opmerkingen */}
            {ob.notes && (
              <Section title="Opmerkingen">
                <p className="text-xs text-slate-600">{ob.notes}</p>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}