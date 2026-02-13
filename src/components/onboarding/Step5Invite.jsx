import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Smartphone, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Step5Invite({ employeeData, onboardingData, onChange, onNext, onBack }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const invited = onboardingData.mobile_invite_sent;

  const handleInvite = async () => {
    if (!employeeData.email) {
      setError("Geen e-mailadres ingevuld bij medewerkergegevens.");
      return;
    }
    setSending(true);
    setError(null);
    await base44.users.inviteUser(employeeData.email, "user");
    onChange({ ...onboardingData, mobile_invite_sent: true });
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            Uitnodiging Mobile Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
            <p className="text-slate-700">
              De medewerker ontvangt een uitnodiging per e-mail om in te loggen op de Mobile Entry app.
              Hiermee kan de medewerker uren registreren, ritten invoeren en het bedrijfsreglement raadplegen.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-500">E-mailadres:</span>
              <span className="font-medium">{employeeData.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">App type:</span>
              <span className="font-medium">{employeeData.mobile_entry_type === "multi_day" ? "Meerdaagse diensten" : "Standaard (enkele dag)"}</span>
            </div>
          </div>

          {invited ? (
            <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Uitnodiging verzonden</p>
                <p className="text-sm text-green-600">De medewerker ontvangt een e-mail met inloggegevens op {employeeData.email}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <div className="bg-red-50 p-3 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <Button
                onClick={handleInvite}
                disabled={sending || !employeeData.email}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Uitnodiging Versturen
              </Button>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-xs text-slate-400">
              U kunt deze stap ook overslaan en de medewerker later uitnodigen via de Gebruikers pagina.
            </p>
          </div>
        </CardContent>
      </Card>

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