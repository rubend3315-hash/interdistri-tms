import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Button to send stamkaart signature request to employee via secure link.
 * 
 * Props:
 * - employee: { id, email, first_name, prefix, last_name }
 * - fillOnboardingFields: boolean — also fill all onboarding signature fields
 * - onboardingProcessId: string — link to specific onboarding process
 * - size: "sm" | "default" — button size
 * - variant: button variant
 */
export default function SendStamkaartSignatureButton({
  employee,
  fillOnboardingFields = false,
  onboardingProcessId,
  size = "sm",
  variant = "outline",
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!employee?.email) return null;

  const fullName = `${employee.first_name || ''} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name || ''}`.trim();

  const handleSend = async () => {
    if (!confirm(`Stamkaart ter ondertekening versturen naar ${employee.email}?`)) return;

    setSending(true);
    try {
      const response = await base44.functions.invoke('sendStamkaartSignatureRequest', {
        employee_id: employee.id,
        employee_name: fullName,
        employee_email: employee.email,
        fill_onboarding_fields: fillOnboardingFields,
        onboarding_process_id: onboardingProcessId || null,
      });
      const result = response.data;
      if (result?.success) {
        toast.success(`Ondertekeningsverzoek verzonden naar ${employee.email}`);
        setSent(true);
      } else {
        toast.error("Verzending mislukt: " + (result?.error || "Onbekende fout"));
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message || "Onbekende fout";
      toast.error("Verzending mislukt: " + errMsg);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Button size={size} variant={variant} disabled className="text-green-600">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verzonden
      </Button>
    );
  }

  return (
    <Button size={size} variant={variant} onClick={handleSend} disabled={sending}>
      {sending ? (
        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
      ) : (
        <Send className="w-3.5 h-3.5 mr-1" />
      )}
      Ter ondertekening versturen
    </Button>
  );
}