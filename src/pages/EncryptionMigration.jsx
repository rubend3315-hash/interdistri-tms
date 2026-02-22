import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function EncryptionMigration() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigrate = async () => {
    if (!confirm("Weet je zeker dat je alle BSN en IBAN velden wilt versleutelen? Dit kan niet ongedaan worden gemaakt.")) return;
    setMigrating(true);
    setResult(null);
    const res = await base44.functions.invoke("encryptionService", { action: "migrate" });
    setResult(res.data);
    setMigrating(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          BSN/IBAN Encryptie Migratie
        </h1>
        <p className="text-slate-500 mt-1">Versleutel bestaande plaintext BSN en IBAN velden in de database</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Migratie uitvoeren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Let op</p>
                <ul className="mt-1 space-y-1">
                  <li>• Deze actie versleutelt alle BSN en IBAN velden met AES-256-GCM</li>
                  <li>• Reeds versleutelde velden worden overgeslagen</li>
                  <li>• Maak eerst een back-up voordat je deze migratie uitvoert</li>
                  <li>• De APP_ENCRYPTION_KEY is vereist en mag nooit verloren gaan</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleMigrate}
            disabled={migrating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {migrating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Migratie bezig...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" /> Encryptie migratie starten</>
            )}
          </Button>

          {result && (
            <Card className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-sm">
                    {result.success ? "Migratie voltooid" : "Migratie mislukt"}
                  </span>
                </div>
                {result.success && (
                  <div className="flex gap-3 text-sm">
                    <Badge className="bg-green-100 text-green-800">{result.migrated} versleuteld</Badge>
                    <Badge variant="outline">{result.skipped} overgeslagen</Badge>
                    {result.errors > 0 && <Badge className="bg-red-100 text-red-800">{result.errors} fouten</Badge>}
                    <Badge variant="outline">{result.total} totaal</Badge>
                  </div>
                )}
                {result.error && <p className="text-sm text-red-700 mt-1">{result.error}</p>}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}