import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Download, Loader2, Clock, Printer } from "lucide-react";

export default function SecureDownload() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [html, setHtml] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("Geen geldig token opgegeven.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await base44.functions.invoke("secureDownload", {
          action: "download",
          token,
        });
        if (res.data?.success && res.data?.html) {
          setHtml(res.data.html);
        } else {
          setError(res.data?.error || "Er is een fout opgetreden bij het ophalen van het document.");
        }
      } catch (err) {
        const errMsg = err?.response?.data?.error || err.message || "Er is een fout opgetreden.";
        setError(errMsg);
      }
      setLoading(false);
    })();
  }, []);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

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
            <p className="text-xs text-slate-400 mt-4">
              Neem contact op met uw HR-contactpersoon voor een nieuwe link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Security header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Beveiligd document</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Deze link verloopt automatisch na 48 uur
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" /> Afdrukken
        </Button>
      </div>

      {/* Document */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full border-0"
            style={{ minHeight: "80vh" }}
            title="Beveiligd document"
          />
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-2">
        <p>⚠️ Dit document bevat vertrouwelijke persoonsgegevens. Niet delen met onbevoegden.</p>
      </div>
    </div>
  );
}