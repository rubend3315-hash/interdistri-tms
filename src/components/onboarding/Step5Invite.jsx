import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Smartphone, Send, CheckCircle2, Loader2, AlertCircle, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Step5Invite({ employeeData, onboardingData, onChange, onNext, onBack }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const invited = onboardingData.mobile_invite_sent;
  const welcomeSent = onboardingData.welcome_email_sent;

  const handleInvite = async () => {
    if (!employeeData.email) {
      setError("Geen e-mailadres ingevuld bij medewerkergegevens.");
      return;
    }
    setSending(true);
    setError(null);

    // 1. Invite user
    await base44.users.inviteUser(employeeData.email, "user");

    // 2. Send welcome email (only if not already sent)
    let welcomeSuccess = false;
    if (!onboardingData.welcome_email_sent) {
      // We need an employee_id; if temp employee exists use that, otherwise skip
      const empId = onboardingData._temp_employee_id;
      if (empId) {
        const res = await base44.functions.invoke('sendWelcomeEmail', { employee_id: empId });
        welcomeSuccess = res.data?.success === true;
      }

      // Audit log
      try {
        await base44.functions.invoke('auditService', {
          entity_type: 'OnboardingProcess',
          action_type: 'send',
          category: 'Medewerkers',
          description: `Welkomstmail verzonden vanuit onboarding naar ${employeeData.email}`,
          metadata: { type: 'welcome_mail_sent_from_onboarding', email: employeeData.email },
        });
      } catch (_) {}
    }

    onChange({
      ...onboardingData,
      mobile_invite_sent: true,
      welcome_email_sent: welcomeSuccess || onboardingData.welcome_email_sent || false,
      invite_sent_date: new Date().toISOString(),
      welcome_email_sent_date: welcomeSuccess ? new Date().toISOString() : onboardingData.welcome_email_sent_date,
    });
    setSending(false);
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-500" /> Uitnodiging Mobile Entry
        </h3>

        <div className="text-sm text-slate-600 mb-3">
          <p>De medewerker ontvangt een uitnodiging per e-mail om in te loggen op de Mobile Entry app.</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Email: <strong className="text-slate-700">{employeeData.email || "—"}</strong></span>
            <span>App: <strong className="text-slate-700">{employeeData.mobile_entry_type === "multi_day" ? "Meerdaagse diensten" : "Standaard"}</strong></span>
          </div>
        </div>

        {invited ? (
          <div className="space-y-2">
            <div className="bg-green-50 p-3 rounded flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-sm text-green-800">Uitnodiging en welkomstmail succesvol verzonden</p>
                <p className="text-xs text-green-600">Email verstuurd naar {employeeData.email}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 pl-1">
              {onboardingData.invite_sent_date && <p>Uitnodiging verzonden op: {new Date(onboardingData.invite_sent_date).toLocaleString('nl-NL')}</p>}
              {onboardingData.welcome_email_sent_date && <p>Welkomstmail verzonden op: {new Date(onboardingData.welcome_email_sent_date).toLocaleString('nl-NL')}</p>}
              {onboardingData.welcome_email_sent === false && <p className="text-amber-600">Welkomstmail kon niet worden verzonden (medewerker nog niet opgeslagen).</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <div className="bg-red-50 p-2 rounded flex items-center gap-1.5 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </div>
            )}
            <Button onClick={handleInvite} disabled={sending || !employeeData.email} className="bg-blue-600 hover:bg-blue-700">
              {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Uitnodiging Versturen
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3 pt-3 border-t">U kunt deze stap ook overslaan en de medewerker later uitnodigen via de Gebruikers pagina.</p>
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Volgende: Overzicht <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}