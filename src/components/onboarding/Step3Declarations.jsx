import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronLeft, ChevronRight, Key, DoorOpen, Satellite, FileText, BookOpen, CheckCircle2, Shield } from "lucide-react";
import SignatureCanvas from "../contracts/SignatureCanvas";
import { base44 } from "@/api/base44Client";

export default function Step3Declarations({ onboardingData, onChange, onNext, onBack, employeeName }) {
  const [signing, setSigning] = useState(false);

  // Pincode is no longer generated during onboarding — managed via HR Pincodebeheer

  const update = (field, value) => {
    onChange({ ...onboardingData, [field]: value });
  };

  const handleSignature = async (dataUrl) => {
    setSigning(true);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "handtekening_onboarding.jpg", { type: "image/jpeg" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("employee_signature_url", file_url);
    setSigning(false);
  };

  const allDeclarationsConfirmed = onboardingData.pincode_verklaring_signed &&
    onboardingData.sleutel_verklaring_signed &&
    onboardingData.gps_buddy_toestemming &&
    onboardingData.dienstbetrekking_signed &&
    onboardingData.bedrijfsreglement_ontvangen;

  const allComplete = allDeclarationsConfirmed && !!onboardingData.employee_signature_url;

  const declarations = [
    { key: "pincode_verklaring_signed", icon: Key, title: "Ontvangstverklaring Sleutelkast", done: onboardingData.pincode_verklaring_signed },
    { key: "sleutel_verklaring_signed", icon: DoorOpen, title: "Sleutelverklaring", done: onboardingData.sleutel_verklaring_signed },
    { key: "gps_buddy_toestemming", icon: Satellite, title: "Toestemming GPS", done: onboardingData.gps_buddy_toestemming },
    { key: "dienstbetrekking_signed", icon: FileText, title: "Verklaring Dienstbetrekking", done: onboardingData.dienstbetrekking_signed },
    { key: "bedrijfsreglement_ontvangen", icon: BookOpen, title: "Bedrijfsreglement", done: onboardingData.bedrijfsreglement_ontvangen },
  ];

  const completedCount = declarations.filter(d => d.done).length;

  return (
    <div className="max-w-[880px] mx-auto space-y-3">
      {/* Progress summary */}
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>{completedCount}/{declarations.length} verklaringen afgerond</span>
        {onboardingData.employee_signature_url && (
          <Badge className="bg-green-100 text-green-700 text-xs">Handtekening ✓</Badge>
        )}
      </div>

      {/* Accordion verklaringen */}
      <section className="border rounded-lg bg-white overflow-hidden">
        <Accordion type="single" collapsible className="w-full">
          {/* Sleutelkast verklaring (geen pincode meer) */}
          <AccordionItem value="pincode" className="border-b last:border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                {onboardingData.pincode_verklaring_signed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <Key className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-sm font-medium">Ontvangstverklaring Sleutelkast</span>
                <Badge variant="outline" className={`text-xs ml-auto mr-2 ${onboardingData.pincode_verklaring_signed ? "bg-green-50 text-green-700" : ""}`}>
                  {onboardingData.pincode_verklaring_signed ? "Afgerond" : "Openstaand"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded mb-3">
                <p>De medewerker ontvangt een persoonlijke pincode voor de sleutelkast. Deze valt onder eigen verantwoordelijkheid.</p>
                <p className="mt-1">De pincode wordt afzonderlijk verstrekt en is uitsluitend bekend bij de medewerker.</p>
                <ul className="list-decimal pl-4 mt-2 space-y-0.5">
                  <li>De pincode mag aan niemand anders verstrekt worden.</li>
                  <li>Sleutels uitgenomen onder deze pincode vallen onder verantwoordelijkheid van de medewerker.</li>
                  <li>Bij verlies dient de medewerker zelf aangifte te doen.</li>
                  <li>Kosten van vermiste sleutels worden op netto salaris ingehouden.</li>
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={onboardingData.pincode_verklaring_signed || false} onCheckedChange={(v) => update("pincode_verklaring_signed", v)} />
                <Label className="text-sm">{employeeName} gaat akkoord</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sleutel */}
          <AccordionItem value="sleutel" className="border-b last:border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                {onboardingData.sleutel_verklaring_signed ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <DoorOpen className="w-4 h-4 text-slate-400 shrink-0" />}
                <span className="text-sm font-medium">Sleutelverklaring Pand & Hek</span>
                <Badge variant="outline" className={`text-xs ml-auto mr-2 ${onboardingData.sleutel_verklaring_signed ? "bg-green-50 text-green-700" : ""}`}>
                  {onboardingData.sleutel_verklaring_signed ? "Afgerond" : "Openstaand"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sleutelnummer</Label>
                  <Input className="h-10" value={onboardingData.sleutel_nummer || ""} onChange={(e) => update("sleutel_nummer", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sleutel geeft toegang tot</Label>
                  <Input className="h-10" value={onboardingData.sleutel_toegang || ""} onChange={(e) => update("sleutel_toegang", e.target.value)} placeholder="bijv. Pand + hek" />
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5 mb-3 bg-slate-50 p-2 rounded">
                <p>• Het is verboden een kopie te (laten) maken.</p>
                <p>• Diefstal of verlies direct melden bij leidinggevende.</p>
                <p>• Bij einde dienstverband uiterlijk op laatste werkdag inleveren.</p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={onboardingData.sleutel_verklaring_signed || false} onCheckedChange={(v) => update("sleutel_verklaring_signed", v)} />
                <Label className="text-sm">{employeeName} gaat akkoord</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* GPS */}
          <AccordionItem value="gps" className="border-b last:border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                {onboardingData.gps_buddy_toestemming ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Satellite className="w-4 h-4 text-slate-400 shrink-0" />}
                <span className="text-sm font-medium">Toestemmingsverklaring GPS Buddy</span>
                <Badge variant="outline" className={`text-xs ml-auto mr-2 ${onboardingData.gps_buddy_toestemming ? "bg-green-50 text-green-700" : ""}`}>
                  {onboardingData.gps_buddy_toestemming ? "Afgerond" : "Openstaand"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded mb-3">
                <p>Ondergetekende geeft toestemming voor GPS-Buddy ritregistratiesysteem in het voertuig van Interdistri.</p>
                <p>Verwerkersverantwoordelijke gebruikt de data uitsluitend werkgerelateerd. Gegevens worden 7 jaar bewaard.</p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={onboardingData.gps_buddy_toestemming || false} onCheckedChange={(v) => update("gps_buddy_toestemming", v)} />
                <Label className="text-sm">{employeeName} geeft toestemming</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Dienstbetrekking */}
          <AccordionItem value="dienstbetrekking" className="border-b last:border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                {onboardingData.dienstbetrekking_signed ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <FileText className="w-4 h-4 text-slate-400 shrink-0" />}
                <span className="text-sm font-medium">Verklaring van Dienstbetrekking</span>
                <Badge variant="outline" className={`text-xs ml-auto mr-2 ${onboardingData.dienstbetrekking_signed ? "bg-green-50 text-green-700" : ""}`}>
                  {onboardingData.dienstbetrekking_signed ? "Afgerond" : "Openstaand"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded mb-3">
                <p className="font-medium">Artikel 2.11 Wet wegvervoer goederen</p>
                <p>Vergunninghouder: Interdistri, Fleerbosseweg 19, 4421RR Kapelle</p>
                <p>Chauffeur: {employeeName}</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>Vervoer voor rekening en risico vergunninghouder</li>
                  <li>Loons- en gezagsverhouding aanwezig</li>
                  <li>Gegevens naar waarheid ingevuld</li>
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={onboardingData.dienstbetrekking_signed || false} onCheckedChange={(v) => update("dienstbetrekking_signed", v)} />
                <Label className="text-sm">{employeeName} bevestigt de verklaring</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Bedrijfsreglement */}
          <AccordionItem value="reglement" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                {onboardingData.bedrijfsreglement_ontvangen ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />}
                <span className="text-sm font-medium">Ontvangst Bedrijfsreglement</span>
                <Badge variant="outline" className={`text-xs ml-auto mr-2 ${onboardingData.bedrijfsreglement_ontvangen ? "bg-green-50 text-green-700" : ""}`}>
                  {onboardingData.bedrijfsreglement_ontvangen ? "Afgerond" : "Openstaand"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-xs text-slate-600 mb-3">Het bedrijfsreglement is beschikbaar via de mobiele app. De medewerker bevestigt ontvangst en kennisneming.</p>
              <div className="flex items-center gap-2">
                <Checkbox checked={onboardingData.bedrijfsreglement_ontvangen || false} onCheckedChange={(v) => update("bedrijfsreglement_ontvangen", v)} />
                <Label className="text-sm">{employeeName} bevestigt ontvangst</Label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Handtekening – single, locked until all declarations confirmed */}
      <section className={`border rounded-lg p-3 bg-white ${!allDeclarationsConfirmed ? 'opacity-60' : ''}`}>
        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" /> Handtekening Medewerker
        </h3>

        {!allDeclarationsConfirmed && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2">
            Bevestig eerst alle verklaringen hierboven voordat u kunt ondertekenen.
          </p>
        )}

        {onboardingData.employee_signature_url ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Handtekening ontvangen</span>
            </div>
            <img src={onboardingData.employee_signature_url} alt="Handtekening" className="border rounded max-h-[100px]" />
            <Button variant="outline" size="sm" onClick={() => update("employee_signature_url", "")}>Opnieuw tekenen</Button>
          </div>
        ) : allDeclarationsConfirmed ? (
          <div style={{ maxWidth: 400 }}>
            <SignatureCanvas onSign={handleSignature} signing={signing} />
          </div>
        ) : null}
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={onNext} disabled={!allComplete} className="bg-blue-600 hover:bg-blue-700">
          Volgende: Contract <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}