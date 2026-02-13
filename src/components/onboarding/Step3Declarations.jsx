import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Key, DoorOpen, Satellite, FileText, BookOpen, CheckCircle2, Shield } from "lucide-react";
import SignatureCanvas from "../contracts/SignatureCanvas";
import { base44 } from "@/api/base44Client";

export default function Step3Declarations({ onboardingData, onChange, onNext, onBack, employeeName }) {
  const [signing, setSigning] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const generatedPin = useMemo(() => {
    if (onboardingData.pincode_sleutelkast) return onboardingData.pincode_sleutelkast;
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    onChange({ ...onboardingData, pincode_sleutelkast: pin });
    return pin;
  }, []);

  const update = (field, value) => {
    onChange({ ...onboardingData, [field]: value });
  };

  const handleSignature = async (dataUrl) => {
    setSigning(true);
    // Convert base64 to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "handtekening_onboarding.jpg", { type: "image/jpeg" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("employee_signature_url", file_url);
    setSigning(false);
  };

  const allComplete = onboardingData.pincode_verklaring_signed &&
    onboardingData.sleutel_verklaring_signed &&
    onboardingData.gps_buddy_toestemming &&
    onboardingData.dienstbetrekking_signed &&
    onboardingData.bedrijfsreglement_ontvangen &&
    onboardingData.employee_signature_url;

  const declarations = [
    {
      key: "pincode_verklaring_signed",
      icon: Key,
      title: "Ontvangstverklaring Pincode Sleutelkast",
      done: onboardingData.pincode_verklaring_signed,
    },
    {
      key: "sleutel_verklaring_signed",
      icon: DoorOpen,
      title: "Sleutelverklaring Pand & Hek",
      done: onboardingData.sleutel_verklaring_signed,
    },
    {
      key: "gps_buddy_toestemming",
      icon: Satellite,
      title: "Toestemmingsverklaring GPS Buddy",
      done: onboardingData.gps_buddy_toestemming,
    },
    {
      key: "dienstbetrekking_signed",
      icon: FileText,
      title: "Verklaring van Dienstbetrekking",
      done: onboardingData.dienstbetrekking_signed,
    },
    {
      key: "bedrijfsreglement_ontvangen",
      icon: BookOpen,
      title: "Ontvangst Bedrijfsreglement",
      done: onboardingData.bedrijfsreglement_ontvangen,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {declarations.map((decl) => (
          <Card
            key={decl.key}
            className={`cursor-pointer transition-all hover:shadow-md ${activeSection === decl.key ? 'ring-2 ring-blue-500' : ''} ${decl.done ? 'border-green-200 bg-green-50/50' : ''}`}
            onClick={() => setActiveSection(activeSection === decl.key ? null : decl.key)}
          >
            <CardContent className="py-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${decl.done ? 'bg-green-100' : 'bg-slate-100'}`}>
                {decl.done ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <decl.icon className="w-5 h-5 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 truncate">{decl.title}</p>
                <Badge variant="outline" className={decl.done ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500"}>
                  {decl.done ? "Afgerond" : "Openstaand"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pincode verklaring */}
      {activeSection === "pincode_verklaring_signed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Key className="w-5 h-5 text-blue-600" />Ontvangstverklaring Pincode Sleutelkast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">Gegenereerde pincode:</p>
              <p className="text-4xl font-mono font-bold text-blue-900 tracking-widest">{onboardingData.pincode_sleutelkast || generatedPin}</p>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p>1. Dit is de eigen unieke pincode van de medewerker.</p>
              <p>2. De pincode mag aan niemand anders verstrekt worden.</p>
              <p>3. De medewerker draagt zorg dat niemand de pincode afkijkt bij invoeren.</p>
              <p>4. Sleutels uitgenomen onder deze pincode vallen onder verantwoordelijkheid van de medewerker.</p>
              <p>5. Bij verlies dient de medewerker zelf aangifte te doen.</p>
              <p>6. Kosten van vermiste sleutels incl. programmeerkosten worden op netto salaris ingehouden.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                checked={onboardingData.pincode_verklaring_signed || false}
                onCheckedChange={(v) => update("pincode_verklaring_signed", v)}
              />
              <Label className="text-sm">{employeeName} heeft kennis genomen van de verklaring en gaat akkoord</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleutelverklaring + GPS Buddy (gecombineerd) */}
      {activeSection === "sleutel_verklaring_signed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><DoorOpen className="w-5 h-5 text-blue-600" />Sleutelverklaring Pand & Hek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sleutelnummer</Label>
                <Input value={onboardingData.sleutel_nummer || ""} onChange={(e) => update("sleutel_nummer", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sleutel geeft toegang tot</Label>
                <Input value={onboardingData.sleutel_toegang || ""} onChange={(e) => update("sleutel_toegang", e.target.value)} placeholder="bijv. Pand + hek" />
              </div>
            </div>
            <div className="text-sm text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg">
              <p>• Sleutelhouder houdt zich aan geldende regels en veiligheidsvoorschriften.</p>
              <p>• Het is verboden een kopie te (laten) maken.</p>
              <p>• Sleutelhouder is verantwoordelijk voor schade door misbruik.</p>
              <p>• Diefstal of verlies direct melden bij leidinggevende.</p>
              <p>• Bij einde dienstverband uiterlijk op laatste werkdag inleveren.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                checked={onboardingData.sleutel_verklaring_signed || false}
                onCheckedChange={(v) => update("sleutel_verklaring_signed", v)}
              />
              <Label className="text-sm">{employeeName} gaat akkoord met de sleutelverklaring</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GPS Buddy */}
      {activeSection === "gps_buddy_toestemming" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Satellite className="w-5 h-5 text-blue-600" />Toestemmingsverklaring GPS Buddy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
              <p>Ondergetekende geeft toestemming voor de aanwezigheid van een GPS-Buddy ritregistratiesysteem in het door hem/haar te gebruiken voertuig van Interdistri.</p>
              <p>Verwerkersverantwoordelijke gebruikt de geregistreerde data uitsluitend voor werkgerelateerde zaken. GPS-Buddy verwerkt de data uitsluitend voor de uitvoer van de overeenkomst.</p>
              <p>Beide partijen dragen zorg voor naleving van de AVG en nadere privacy regelgeving.</p>
              <p>Gegevens worden 7 jaar bewaard voor de Belastingdienst. Verkregen gegevens worden zonder toestemming niet aan derden verstrekt, tenzij wettelijk verplicht.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                checked={onboardingData.gps_buddy_toestemming || false}
                onCheckedChange={(v) => update("gps_buddy_toestemming", v)}
              />
              <Label className="text-sm">{employeeName} geeft toestemming voor GPS Buddy ritregistratie</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verklaring van dienstbetrekking */}
      {activeSection === "dienstbetrekking_signed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-600" />Verklaring van Dienstbetrekking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
              <p className="font-medium">Als bedoeld in artikel 2.11, eerste lid van de Wet wegvervoer goederen</p>
              <p>Vergunninghouder: <strong>Interdistri</strong>, Fleerbosseweg 19, 4421RR Kapelle</p>
              <p>Chauffeur: <strong>{employeeName}</strong></p>
              <p className="mt-2">Verklaren:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>dat het vervoer met de door de chauffeur bestuurde vrachtauto voor rekening en risico van de vergunninghouder wordt verricht;</li>
                <li>dat er sprake is van een loons- en gezagsverhouding;</li>
                <li>de vermelde gegevens naar waarheid te hebben ingevuld.</li>
              </ul>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                checked={onboardingData.dienstbetrekking_signed || false}
                onCheckedChange={(v) => update("dienstbetrekking_signed", v)}
              />
              <Label className="text-sm">{employeeName} bevestigt de verklaring van dienstbetrekking</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bedrijfsreglement */}
      {activeSection === "bedrijfsreglement_ontvangen" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="w-5 h-5 text-blue-600" />Ontvangst Bedrijfsreglement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
              <p>Het bedrijfsreglement is beschikbaar via de mobiele app (Mobile Entry). De medewerker bevestigt hierbij dat het bedrijfsreglement is ontvangen en gelezen.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                checked={onboardingData.bedrijfsreglement_ontvangen || false}
                onCheckedChange={(v) => update("bedrijfsreglement_ontvangen", v)}
              />
              <Label className="text-sm">{employeeName} bevestigt ontvangst van het bedrijfsreglement</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handtekening */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-blue-600" />
            Handtekening Medewerker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onboardingData.employee_signature_url ? (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Handtekening ontvangen</span>
              </div>
              <img src={onboardingData.employee_signature_url} alt="Handtekening" className="border rounded-lg max-h-32" />
              <Button variant="outline" size="sm" onClick={() => update("employee_signature_url", "")}>
                Opnieuw tekenen
              </Button>
            </div>
          ) : (
            <SignatureCanvas onSign={handleSignature} signing={signing} />
          )}
        </CardContent>
      </Card>

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