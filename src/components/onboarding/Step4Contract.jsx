import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function Step4Contract({ employeeData, onboardingData, onChange, onNext, onBack, employeeId }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Arbeidsovereenkomst
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Contractgegevens samenvatting</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Naam:</span> {employeeData.first_name} {employeeData.prefix ? employeeData.prefix + ' ' : ''}{employeeData.last_name}</div>
              <div><span className="text-slate-500">Afdeling:</span> {employeeData.department}</div>
              <div><span className="text-slate-500">Functie:</span> {employeeData.function || '—'}</div>
              <div><span className="text-slate-500">Contract type:</span> {employeeData.contract_type || '—'}</div>
              <div><span className="text-slate-500">Uren/week:</span> {employeeData.contract_hours || '—'}</div>
              <div><span className="text-slate-500">Loonschaal:</span> {employeeData.salary_scale || '—'}</div>
              <div><span className="text-slate-500">In dienst:</span> {employeeData.in_service_since || '—'}</div>
            </div>
          </div>

          {onboardingData.contract_generated ? (
            <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Contract is aangemaakt</p>
                <p className="text-sm text-green-600">Het contract kan worden beheerd vanuit de Contracten pagina.</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 p-4 rounded-lg space-y-3">
              <p className="text-sm text-amber-800">
                Na het afronden van de onboarding kunt u een contract aanmaken via de Contracten pagina.
                De medewerkergegevens worden automatisch overgenomen.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onChange({ ...onboardingData, contract_generated: true })}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Markeer als afgehandeld
                </Button>
                <Link to={createPageUrl("Contracts")} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" /> Naar Contracten
                  </Button>
                </Link>
              </div>
            </div>
          )}
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