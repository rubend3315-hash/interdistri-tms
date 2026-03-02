import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Loader2, Clock, CheckCircle2 } from "lucide-react";
import StamkaartSignatureView from "../components/stamkaart/StamkaartSignatureView";

export default function StamkaartSignature() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [existingSignatureUrl, setExistingSignatureUrl] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const [fillOnboarding, setFillOnboarding] = useState(false);
  const [token, setToken] = useState(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);

    if (!t) {
      setError("Geen geldig token opgegeven.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const functionUrl = `${window.location.origin}/functions/submitStamkaartSignature`;
        const res = await fetch(functionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "validate", token: t }),
        });
        const data = await res.json();

        if (data?.already_signed) {
          setAlreadySigned(true);
          setExistingSignatureUrl(data.signature_url);
        } else if (data?.success) {
          setEmployeeData(data.employee);
          setEmployeeName(data.employee_name);
          setFillOnboarding(data.fill_onboarding_fields);
        } else {
          setError(data?.error || "Er is een fout opgetreden.");
        }
      } catch (err) {
        setError(err.message || "Er is een fout opgetreden.");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-slate-600">Document wordt geladen...</p>
            <p className="text-xs text-slate-400 mt-2">Beveiligde verbinding wordt geverifieerd</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Toegang geweigerd</h2>
            <p className="text-slate-600">{error}</p>
            <p className="text-xs text-slate-400 mt-4">Neem contact op met uw HR-contactpersoon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Reeds ondertekend</h2>
            <p className="text-slate-600">Dit document is al ondertekend.</p>
            {existingSignatureUrl && (
              <img src={existingSignatureUrl} alt="Handtekening" className="max-h-16 border rounded mx-auto mt-4" />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Bedankt!</h2>
            <p className="text-slate-600">Je stamkaart is succesvol ondertekend.</p>
            <p className="text-sm text-slate-500 mt-2">De handtekening is opgeslagen. Je kunt dit venster sluiten.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <StamkaartSignatureView
      employee={employeeData}
      employeeName={employeeName}
      token={token}
      fillOnboarding={fillOnboarding}
      onSigned={() => setSigned(true)}
    />
  );
}