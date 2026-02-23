import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Server, Clock } from "lucide-react";

export default function DeploymentStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("verifyDeployment", {});
      const d = res.data;
      // Normalize: backend returns checkedFunctions, UI expects results
      if (d && d.checkedFunctions && !d.results) {
        d.results = d.checkedFunctions.map(f => ({
          function: f.name,
          status: f.status,
          message: f.errorMessage || null,
        }));
      }
      setData(d);
    } catch (err) {
      setError(err?.message || "Onbekende fout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deployment Status</h1>
          <p className="text-sm text-slate-500 mt-1">Verificatie van alle backend functies</p>
        </div>
        <Button onClick={runCheck} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Controleren..." : data ? "Opnieuw controleren" : "Start verificatie"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Fout: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-2xl font-bold">{data.summary.total}</p>
                    <p className="text-xs text-slate-500">Totaal functies</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{data.summary.ok}</p>
                    <p className="text-xs text-slate-500">Gecontroleerd & OK</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{data.summary.failed}</p>
                    <p className="text-xs text-slate-500">Fouten</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-mono font-medium">{data.version}</p>
                    <p className="text-xs text-slate-500">{new Date(data.timestamp).toLocaleString("nl-NL")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall status */}
          <Card className={data.summary.allHealthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {data.summary.allHealthy
                  ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                  : <AlertTriangle className="w-6 h-6 text-red-600" />
                }
                <span className={`text-lg font-semibold ${data.summary.allHealthy ? "text-green-800" : "text-red-800"}`}>
                  {data.summary.allHealthy
                    ? "Alle functies zijn correct gedeployed"
                    : `${data.summary.failed} functie(s) niet gedeployed`
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Function table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Functie Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">#</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Functie</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.results || []).map((row, idx) => (
                      <tr key={row.function} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">{row.function}</td>
                        <td className="py-3 px-4">
                          <Badge className={row.status === "OK"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-red-100 text-red-800 hover:bg-red-100"
                          }>
                            {row.status === "OK" ? "✓ Deployed" : "✗ " + row.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{row.message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <Server className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Klik op "Start verificatie" om alle backend functies te controleren.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}