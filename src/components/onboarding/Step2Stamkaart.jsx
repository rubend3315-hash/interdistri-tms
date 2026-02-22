import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send, Loader2, AlertTriangle } from "lucide-react";
import StamkaartForm, { STAMKAART_REQUIRED_FIELDS } from "../stamkaart/StamkaartForm";

/**
 * Step2Stamkaart — thin wrapper around StamkaartForm in onboarding mode.
 * No duplicate field definitions. StamkaartForm is the single source of truth.
 */
export default function Step2Stamkaart({ employeeData, onboardingData, onOnboardingChange, onChange, onNext, onBack }) {
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const payrollConfig = payrollSettings[0] || null;

  // Validation for send & next
  const signaturePresent = !!(onboardingData?.loonheffing_handtekening_url || onboardingData?.employee_signature_url);
  const loonheffingChosen = !!onboardingData?.loonheffing_toepassen;
  const idValid = !!employeeData.id_document_expiry;
  const ibanFilled = !!employeeData.bank_account;
  const canSend = signaturePresent && loonheffingChosen && idValid && ibanFilled;

  const missingForSend = [];
  if (!signaturePresent) missingForSend.push("Handtekening");
  if (!loonheffingChosen) missingForSend.push("Loonheffingskorting keuze");
  if (!idValid) missingForSend.push("ID geldig tot");
  if (!ibanFilled) missingForSend.push("IBAN");

  const handleSendToPayroll = async () => {
    if (!payrollConfig?.payroll_email) {
      alert("Stel eerst het e-mailadres van de loonadministratie in via HRM-instellingen → Loonadministratie.");
      return;
    }
    setSendingEmail(true);
    const fullName = `${employeeData.first_name} ${employeeData.prefix ? employeeData.prefix + ' ' : ''}${employeeData.last_name}`;
    const subjectBase = payrollConfig.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens";
    const subject = `${subjectBase} - ${fullName}`;
    const response = await base44.functions.invoke('sendStamkaartEmail', {
      to: payrollConfig.payroll_email,
      cc: payrollConfig.payroll_cc_email || "",
      subject,
      employee_id: employeeData.id,
      employee_name: fullName,
      download_type: "stamkaart",
      template_key: "stamkaart",
      placeholders: {
        naam: fullName,
        afdeling: employeeData.department || '—',
        functie: employeeData.function || '—',
      },
    });
    setSendingEmail(false);
    const result = response.data;
    if (result?.success && result?.messageId) {
      alert("Beveiligde stamkaart-link verzonden naar " + payrollConfig.payroll_email + (payrollConfig.payroll_cc_email ? ` (CC: ${payrollConfig.payroll_cc_email})` : ""));
    } else if (result?.skipped) {
      alert("Deze stamkaart is al eerder verzonden (duplicate voorkomen).");
    } else {
      alert("Verzending mislukt: " + (result?.error || "Onbekende fout. Controleer de e-mail log."));
    }
  };

  const handleNext = () => {
    const missing = STAMKAART_REQUIRED_FIELDS
      .filter(f => !employeeData[f.key] || String(employeeData[f.key]).trim() === "")
      .map(f => f.label);
    if (missing.length > 0) {
      alert("Vul de volgende verplichte velden in:\n\n• " + missing.join("\n• "));
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-3">
      {/* The single StamkaartForm in onboarding mode */}
      <StamkaartForm
        employee={employeeData}
        mode="onboarding"
        onChange={onChange}
        onboardingData={onboardingData}
        onOnboardingChange={onOnboardingChange}
        hideActions
      />

      {/* Onboarding-specific actions */}
      <div className="mx-auto flex flex-wrap items-center gap-3 border-t border-slate-300 pt-2" style={{ maxWidth: 880 }}>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={handleSendToPayroll} disabled={sendingEmail || !canSend} className="h-7 text-xs px-3">
            {sendingEmail ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Versturen naar Loonadministratie
          </Button>
        </div>
        {!canSend && missingForSend.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3.5 h-3.5" />
            Ontbreekt: {missingForSend.join(", ")}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between" style={{ maxWidth: 880, margin: '0 auto' }}>
        <Button variant="outline" onClick={onBack} className="h-8 text-xs">
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
          Volgende: Verklaringen <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}