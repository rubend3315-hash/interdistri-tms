import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronLeft, Loader2, UserPlus, Key, DoorOpen, Satellite, FileText, BookOpen, Shield, Smartphone } from "lucide-react";

const CHECKLIST = [
  { key: "employee_created", label: "Medewerker aangemaakt", icon: UserPlus },
  { key: "stamkaart_completed", label: "Stamkaart ingevuld", icon: FileText },
  { key: "pincode_verklaring_signed", label: "Ontvangstverklaring pincode", icon: Key },
  { key: "sleutel_verklaring_signed", label: "Sleutelverklaring pand & hek", icon: DoorOpen },
  { key: "gps_buddy_toestemming", label: "Toestemming GPS Buddy", icon: Satellite },
  { key: "dienstbetrekking_signed", label: "Verklaring van dienstbetrekking", icon: FileText },
  { key: "bedrijfsreglement_ontvangen", label: "Ontvangst bedrijfsreglement", icon: BookOpen },
  { key: "employee_signature_url", label: "Handtekening medewerker", icon: Shield },
  { key: "contract_generated", label: "Contract afgehandeld", icon: FileText },
  { key: "mobile_invite_sent", label: "Uitnodiging Mobile Entry", icon: Smartphone },
];

export default function Step5Summary({ employeeData, onboardingData, onBack, onComplete, isSubmitting }) {
  const getStatus = (key) => {
    if (key === "employee_created") return true;
    if (key === "stamkaart_completed") return true;
    if (key === "employee_signature_url") return !!onboardingData.employee_signature_url;
    return !!onboardingData[key];
  };

  const completedCount = CHECKLIST.filter(item => getStatus(item.key)).length;
  const allComplete = completedCount === CHECKLIST.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Onboarding Overzicht
          </CardTitle>
          <p className="text-sm text-slate-500">
            {employeeData.first_name} {employeeData.prefix ? employeeData.prefix + ' ' : ''}{employeeData.last_name} — {employeeData.department}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Voortgang</span>
              <Badge className={allComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {completedCount} / {CHECKLIST.length}
              </Badge>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${allComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${(completedCount / CHECKLIST.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Pincode info */}
          {onboardingData.pincode_sleutelkast && (
            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
              <Key className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700">Pincode sleutelkast:</p>
                <p className="font-mono font-bold text-lg text-blue-900 tracking-widest">{onboardingData.pincode_sleutelkast}</p>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-2">
            {CHECKLIST.map((item) => {
              const done = getStatus(item.key);
              return (
                <div key={item.key} className={`flex items-center gap-3 p-3 rounded-lg ${done ? 'bg-green-50' : 'bg-red-50'}`}>
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${done ? 'text-green-600' : 'text-red-400'}`} />
                  <span className={`text-sm ${done ? 'text-green-800' : 'text-red-700'}`}>{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Signature preview */}
          {onboardingData.employee_signature_url && (
            <div className="border rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Handtekening medewerker</p>
              <img src={onboardingData.employee_signature_url} alt="Handtekening" className="max-h-20 rounded" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button
          onClick={onComplete}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Onboarding Afronden
        </Button>
      </div>
    </div>
  );
}