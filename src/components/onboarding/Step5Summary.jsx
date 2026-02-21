import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronLeft, Loader2, Key } from "lucide-react";

const CHECKLIST = [
  { key: "employee_created", label: "Medewerker aangemaakt" },
  { key: "stamkaart_completed", label: "Stamkaart ingevuld" },
  { key: "pincode_verklaring_signed", label: "Pincode verklaring" },
  { key: "sleutel_verklaring_signed", label: "Sleutelverklaring" },
  { key: "gps_buddy_toestemming", label: "GPS Buddy toestemming" },
  { key: "dienstbetrekking_signed", label: "Verklaring dienstbetrekking" },
  { key: "bedrijfsreglement_ontvangen", label: "Bedrijfsreglement" },
  { key: "employee_signature_url", label: "Handtekening" },
  { key: "contract_generated", label: "Contract afgehandeld" },
  { key: "mobile_invite_sent", label: "Mobile Entry uitnodiging" },
];

export default function Step5Summary({ employeeData, onboardingData, onBack, onComplete, isSubmitting }) {
  const getStatus = (key) => {
    if (key === "employee_created") return true;
    if (key === "stamkaart_completed") return true;
    if (key === "employee_signature_url") return !!onboardingData.employee_signature_url;
    return !!onboardingData[key];
  };

  const completedCount = CHECKLIST.filter(item => getStatus(item.key)).length;
  const fullName = `${employeeData.first_name} ${employeeData.prefix ? employeeData.prefix + ' ' : ''}${employeeData.last_name}`;

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Onboarding Overzicht</h3>
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

        {/* Pincode */}
        {onboardingData.pincode_sleutelkast && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 rounded text-sm">
            <Key className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Pincode:</span>
            <span className="font-mono font-bold tracking-widest">{onboardingData.pincode_sleutelkast}</span>
          </div>
        )}

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