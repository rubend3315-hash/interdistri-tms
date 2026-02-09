import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function HRImportUploader({ onDataExtracted, isProcessing }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            personeelsnummer: { type: "string", description: "Personeelsnummer / Employee number" },
            voorletters: { type: "string", description: "Voorletters / Initials" },
            voornaam: { type: "string", description: "Voornaam / First name" },
            tussenvoegsel: { type: "string", description: "Tussenvoegsel / Prefix (van, de, etc.)" },
            achternaam: { type: "string", description: "Achternaam / Last name" },
            geboortedatum: { type: "string", description: "Geboortedatum / Date of birth (YYYY-MM-DD)" },
            email: { type: "string", description: "E-mailadres" },
            telefoon: { type: "string", description: "Telefoonnummer" },
            adres: { type: "string", description: "Straat en huisnummer" },
            postcode: { type: "string", description: "Postcode" },
            woonplaats: { type: "string", description: "Woonplaats / City" },
            afdeling: { type: "string", description: "Afdeling / Department" },
            functie: { type: "string", description: "Functie / Function" },
            in_dienst_sinds: { type: "string", description: "In dienst sinds / Start date (YYYY-MM-DD)" },
            contract_type: { type: "string", description: "Contracttype (Vast, Tijdelijk, Oproep)" },
            uren_per_week: { type: "number", description: "Contracturen per week" },
            loonschaal: { type: "string", description: "Loonschaal / Salary scale" },
            bsn: { type: "string", description: "BSN nummer" },
            iban: { type: "string", description: "IBAN bankrekeningnummer" },
            noodcontact_naam: { type: "string", description: "Naam noodcontact" },
            noodcontact_telefoon: { type: "string", description: "Telefoon noodcontact" },
            status: { type: "string", description: "Status (Actief, Inactief, Uit dienst)" }
          }
        }
      }
    });

    setUploading(false);

    if (result.status === "success" && result.output) {
      const rows = Array.isArray(result.output) ? result.output : [result.output];
      onDataExtracted(rows, file.name);
    } else {
      alert("Fout bij uitlezen bestand: " + (result.details || "Onbekende fout"));
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-sm text-slate-600 mb-4">
            Upload een Excel of CSV bestand met personeelsgegevens uit Loket.nl
          </p>
          <div className="flex items-center justify-center gap-3">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="max-w-xs"
            />
          </div>
          {file && (
            <p className="text-sm text-blue-600 mt-2 font-medium">{file.name}</p>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <Label className="text-xs font-semibold text-slate-500 uppercase">Ondersteunde velden uit Loket.nl</Label>
          <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-slate-600">
            <span>• Personeelsnummer</span>
            <span>• Naam (voor/achter)</span>
            <span>• Geboortedatum</span>
            <span>• Email</span>
            <span>• Telefoon</span>
            <span>• Adres/Postcode/Plaats</span>
            <span>• Afdeling</span>
            <span>• Functie</span>
            <span>• In dienst sinds</span>
            <span>• Contracttype</span>
            <span>• Uren per week</span>
            <span>• Loonschaal</span>
            <span>• BSN</span>
            <span>• IBAN</span>
            <span>• Noodcontact</span>
          </div>
        </div>

        <Button
          className="w-full bg-blue-900 hover:bg-blue-800"
          onClick={handleUpload}
          disabled={!file || uploading || isProcessing}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bestand verwerken...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Gegevens uitlezen</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}