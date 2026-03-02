import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronLeft, Loader2, KeyRound, Printer, Send, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFullName } from "@/components/utils/employeeUtils";
import OnboardingPrintView from "./OnboardingPrintView";
import SendStamkaartSignatureButton from "../stamkaart/SendStamkaartSignatureButton";


const CHECKLIST = [
  { key: "employee_created", label: "Medewerker aangemaakt" },
  { key: "stamkaart_completed", label: "Stamkaart ingevuld" },
  { key: "id_document_uploaded", label: "ID-document geüpload" },
  { key: "pincode_verklaring_signed", label: "Sleutelkast verklaring" },
  { key: "sleutel_verklaring_signed", label: "Sleutelverklaring" },
  { key: "gps_buddy_toestemming", label: "GPS Buddy toestemming" },
  { key: "dienstbetrekking_signed", label: "Verklaring dienstbetrekking" },
  { key: "bedrijfsreglement_ontvangen", label: "Bedrijfsreglement" },
  { key: "employee_signature_url", label: "Handtekening" },
  { key: "contract_generated", label: "Contract afgehandeld" },
  { key: "mobile_access_configured", label: "Mobiele toegang geconfigureerd" },
  { key: "mobile_invite_sent", label: "Mobile Entry uitnodiging" },
];

export default function Step5Summary({ employeeData, onboardingData, onBack, onComplete, isSubmitting }) {
  const getStatus = (key) => {
    if (key === "employee_created") return true;
    if (key === "stamkaart_completed") return true;
    if (key === "id_document_uploaded") return !!(onboardingData?.id_document?.file_uri || onboardingData?.id_document?.file_url);
    if (key === "employee_signature_url") return !!onboardingData.employee_signature_url;
    if (key === "mobile_access_configured") return true;
    return !!onboardingData[key];
  };

  const printRef = React.useRef(null);
  const [sendingPayroll, setSendingPayroll] = useState(false);

  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings_summary'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const payrollConfig = payrollSettings[0] || null;

  const completedCount = CHECKLIST.filter(item => getStatus(item.key)).length;
  const fullName = `${employeeData.first_name} ${employeeData.prefix ? employeeData.prefix + ' ' : ''}${employeeData.last_name}`;

  const handleSendToPayroll = async () => {
    if (!payrollConfig?.payroll_email) {
      alert("Stel eerst het e-mailadres van de loonadministratie in via HRM-instellingen → Loonadministratie.");
      return;
    }
    setSendingPayroll(true);
    try {
      const persistedEmployeeId = onboardingData?._temp_employee_id || employeeData.id;
      if (!persistedEmployeeId) {
        alert("De medewerker is nog niet opgeslagen. Ga terug naar Stap 2 en verstuur eerst de stamkaart, of rond de onboarding af.");
        setSendingPayroll(false);
        return;
      }
      const subjectBase = payrollConfig.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens";
      const subject = `${subjectBase} - ${fullName}`;
      const response = await base44.functions.invoke('sendStamkaartEmail', {
        to: payrollConfig.payroll_email,
        cc: payrollConfig.payroll_cc_email || "",
        subject,
        employee_id: persistedEmployeeId,
        employee_name: fullName,
        download_type: "onboarding",
        template_key: "stamkaart",
        placeholders: {
          naam: fullName,
          afdeling: employeeData.department || '—',
          functie: employeeData.function || '—',
        },
      });
      const result = response.data;
      if (result?.success && result?.messageId) {
        alert("Beveiligde onboarding-link verzonden naar " + payrollConfig.payroll_email);
      } else if (result?.skipped) {
        alert("Deze stamkaart is al eerder verzonden (duplicate voorkomen).");
      } else {
        alert("Verzending mislukt: " + (result?.error || "Onbekende fout."));
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message || "Onbekende fout.";
      alert("Verzending mislukt: " + errMsg);
    } finally {
      setSendingPayroll(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <section className="border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-700">Onboarding Overzicht</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-7 text-xs">
              <Printer className="w-3.5 h-3.5 mr-1" /> Afdrukken
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendToPayroll} disabled={sendingPayroll} className="h-7 text-xs">
              {sendingPayroll ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
              Versturen naar loonadministratie
            </Button>
            {employeeData?.email && (onboardingData?._temp_employee_id || employeeData?.id) && (
              <SendStamkaartSignatureButton
                employee={{
                  id: onboardingData?._temp_employee_id || employeeData?.id,
                  email: employeeData.email,
                  first_name: employeeData.first_name,
                  prefix: employeeData.prefix,
                  last_name: employeeData.last_name,
                }}
                fillOnboardingFields={true}
                size="sm"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">{fullName} — {employeeData.department}</p>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${completedCount === CHECKLIST.length ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${(completedCount / CHECKLIST.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">{completedCount}/{CHECKLIST.length}</span>
        </div>

        {/* Pincode status indicator — no actual code shown */}
        <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 rounded text-xs text-slate-500">
          <KeyRound className="w-4 h-4 text-slate-400" />
          <span>Sleutelkastpincode wordt automatisch aangemaakt bij afronden onboarding. Beheer via HR → Instellingen → Pincodebeheer.</span>
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {CHECKLIST.map((item) => {
            const done = getStatus(item.key);
            return (
              <div key={item.key} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${done ? 'text-green-700' : 'text-slate-400'}`}>
                {done ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Signature */}
        {onboardingData.employee_signature_url && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-slate-500 mb-1">Handtekening medewerker</p>
            <img src={onboardingData.employee_signature_url} alt="Handtekening" className="max-h-16 rounded border" />
          </div>
        )}
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={onComplete} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
          Onboarding Afronden
        </Button>
      </div>
    </div>
  );
}