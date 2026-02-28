import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Server, Clock, ChevronDown, ChevronRight } from "lucide-react";

function StatusBadge({ fn }) {
  if (fn.skipped) {
    return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">— Overgeslagen</Badge>;
  }
  if (fn.deployed === false) {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">✗ Niet gedeployed</Badge>;
  }
  if (fn.error_message) {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">⚠ Deployed (met waarschuwing)</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✓ Deployed</Badge>;
}

function HttpBadge({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const color = status < 400 ? "text-green-700" : status < 500 ? "text-amber-700" : "text-red-700";
  return <span className={`font-mono text-xs font-semibold ${color}`}>{status}</span>;
}

export default function DeploymentStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("verifyDeployment", {});
      setData(res.data);
    } catch (err) {
      // Even if the call itself fails, show it gracefully
      setData({
        success: false,
        functions: [],
        summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 1 },
        outer_error: err?.message || "Onbekende fout bij aanroep verifyDeployment",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const critical = data?.functions?.filter(f => !f.skipped) || [];
  const skipped = data?.functions?.filter(f => f.skipped) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deployment Status</h1>
          <p className="text-sm text-slate-500 mt-1">Verificatie van alle backend functies (Promise.allSettled, error-geïsoleerd)</p>
        </div>
        <Button onClick={runCheck} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Controleren..." : data ? "Opnieuw controleren" : "Start verificatie"}
        </Button>
      </div>

      {data?.outer_error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Systeem fout: {data.outer_error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.auth_error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Auth fout: {data.auth_error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-2xl font-bold">{data.summary.checked}</p>
                    <p className="text-xs text-slate-500">Gecontroleerd</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{data.summary.deployed}</p>
                    <p className="text-xs text-slate-500">Deployed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{data.summary.not_deployed}</p>
                    <p className="text-xs text-slate-500">Niet gedeployed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{data.summary.errors}</p>
                    <p className="text-xs text-slate-500">Waarschuwingen</p>
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

          {/* Overall status banner */}
          <Card className={data.summary.all_deployed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {data.summary.all_deployed
                  ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                  : <AlertTriangle className="w-6 h-6 text-red-600" />
                }
                <span className={`text-lg font-semibold ${data.summary.all_deployed ? "text-green-800" : "text-red-800"}`}>
                  {data.summary.all_deployed
                    ? `Alle ${data.summary.checked} kritieke functies zijn gedeployed`
                    : `${data.summary.not_deployed} functie(s) NIET gedeployed`
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Critical functions table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kritieke Functies ({critical.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 w-8">#</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Functie</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Deployed</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 w-20">HTTP</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {critical.map((fn, idx) => (
                      <tr key={fn.name} className={`border-b border-slate-100 hover:bg-slate-50 ${fn.deployed === false ? "bg-red-50" : ""}`}>
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono text-slate-800 text-xs">{fn.name}</td>
                        <td className="py-3 px-4"><StatusBadge fn={fn} /></td>
                        <td className="py-3 px-4"><HttpBadge status={fn.http_status} /></td>
                        <td className="py-3 px-4 text-slate-500 text-xs max-w-xs truncate">{fn.error_message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Skipped functions (collapsible) */}
          {skipped.length > 0 && (
            <Card>
              <CardHeader>
                <button
                  onClick={() => setShowSkipped(!showSkipped)}
                  className="flex items-center gap-2 text-lg font-semibold text-slate-700 hover:text-slate-900"
                >
                  {showSkipped ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  Overige Functies ({skipped.length}) — niet gecontroleerd
                </button>
              </CardHeader>
              {showSkipped && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {skipped.map(fn => (
                      <div key={fn.name} className="text-xs font-mono text-slate-500 py-1">{fn.name}</div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}

      {!data && !loading && (
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