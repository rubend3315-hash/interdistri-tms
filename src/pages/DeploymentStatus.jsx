import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Server, Clock, ChevronDown, ChevronRight, Shield, BookOpen } from "lucide-react";

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

      {/* Registry Integrity Section */}
      <RegistryIntegritySection />

      {/* Self-Healing Status */}
      <SelfHealingSection />

      {/* Full Publish Protocol */}
      <FullPublishProtocol />

      {/* Self-Healing Protocol */}
      <SelfHealingProtocol />
    </div>
  );
}

function RegistryIntegritySection() {
  const [loading, setLoading] = useState(false);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['registryIntegrity-detail'],
    queryFn: async () => {
      const res = await base44.functions.invoke('verifyFunctionRegistry');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = async () => {
    setLoading(true);
    await refetch();
    setLoading(false);
  };

  const isGreen = data?.status === 'GREEN';
  const missing = data?.missing_functions || [];
  const brokenDeps = data?.broken_dependencies || [];
  const warnings = data?.warnings || [];
  const spinning = isLoading || loading;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Registry Integrity</h2>
          {data && (
            <Badge className={isGreen
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-red-100 text-red-800 hover:bg-red-100"
            }>
              {isGreen ? 'PASS' : `FAIL — ${missing.length} missing`}
            </Badge>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={spinning} size="sm" variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
          Check
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{data.manifest_count}</p>
              <p className="text-xs text-slate-500">Manifest functies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-green-700">{data.deployed_count}</p>
              <p className="text-xs text-slate-500">Deployed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className={`text-2xl font-bold ${missing.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{missing.length}</p>
              <p className="text-xs text-slate-500">Missing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className={`text-2xl font-bold ${brokenDeps.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{brokenDeps.length}</p>
              <p className="text-xs text-slate-500">Broken deps</p>
            </CardContent>
          </Card>
        </div>
      )}

      {missing.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-800">Ontbrekende functies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {missing.map(fn => (
                <div key={fn.name} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-mono text-sm text-red-800">{fn.name}</span>
                  {fn.error && <span className="text-xs text-red-600 truncate">— {fn.error}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {brokenDeps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800">Broken Dependencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {brokenDeps.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-mono text-sm text-amber-800">{d.parent} → {d.child}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800">Waarschuwingen</CardTitle>
          </CardHeader>
          <CardContent>
            {warnings.map((w, i) => (
              <div key={i} className="text-xs font-mono text-amber-700">
                {w.name}: {w.warning}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data?.timestamp && (
        <p className="text-xs text-slate-400">
          Laatste check: {new Date(data.timestamp).toLocaleString("nl-NL")} — Version: {data.version}
        </p>
      )}
    </div>
  );
}

function FullPublishProtocol() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mt-8">
      <CardHeader>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-700 hover:text-slate-900"
        >
          {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <BookOpen className="w-5 h-5 text-blue-600" />
          Full Publish Protocol
        </button>
      </CardHeader>
      {open && (
        <CardContent className="prose prose-sm prose-slate max-w-none">
          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mt-0">Wanneer uitvoeren?</h3>
              <ul className="text-blue-800 mb-0">
                <li>Na elke wijziging aan backend functies</li>
                <li>Na een platform-update van Base44</li>
                <li>Wanneer de hourly verification een RED status rapporteert</li>
                <li>Bij onverklaarbare "function not found" errors in ClientSubmitLog</li>
              </ul>
            </div>

            <h3 className="font-bold text-slate-900">Stap-voor-stap Protocol</h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="font-semibold">Pre-check</p>
                  <p className="text-slate-600">Ga naar <strong>Deployment Status</strong> en klik "Start verificatie". Noteer welke functies RED zijn.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">2</span>
                <div>
                  <p className="font-semibold">Full Publish</p>
                  <p className="text-slate-600">Ga naar <strong>Dashboard → Code → Functions</strong>. Open elke ontbrekende functie en klik <strong>"Deploy"</strong>. Of voer een bulk deploy uit via "Publish All".</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">3</span>
                <div>
                  <p className="font-semibold">Registry Integrity Check</p>
                  <p className="text-slate-600">Klik op "Check" bij <strong>Registry Integrity</strong> hierboven. Alle {`{manifest_count}`} functies moeten GREEN zijn.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">4</span>
                <div>
                  <p className="font-semibold">Dependency Verificatie</p>
                  <p className="text-slate-600">Controleer dat er 0 "Broken deps" zijn. Elke parent-functie moet zijn child-functies beschikbaar hebben.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">5</span>
                <div>
                  <p className="font-semibold">Smoke Test</p>
                  <p className="text-slate-600">Test een mobiele submit met een testmedewerker om te bevestigen dat het complete pipeline werkt (submit → recalc → DB).</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">6</span>
                <div>
                  <p className="font-semibold">Post-check</p>
                  <p className="text-slate-600">Wacht 1 uur. De hourly verification automation zal automatisch bevestigen dat alle functies nog steeds deployed zijn.</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <h3 className="font-bold text-amber-900 mt-0">⚠️ Bekende oorzaken van deployment drift</h3>
              <ul className="text-amber-800 mb-0">
                <li><strong>Cold start timeout:</strong> Platform kan functies na lange inactiviteit deregistreren</li>
                <li><strong>Partial deploy:</strong> Alleen gewijzigde functies worden gedeployed, ongewijzigde functies kunnen verouderen</li>
                <li><strong>Platform update:</strong> Base44 platform updates kunnen function containers resetten</li>
                <li><strong>Dependency mismatch:</strong> Parent-functie gedeployed zonder child-functies</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mt-0">✓ Automatische bewaking</h3>
              <ul className="text-green-800 mb-0">
                <li><strong>Hourly Verification:</strong> Controleert elk uur de kritieke functies</li>
                <li><strong>Registry Integrity:</strong> Vergelijkt deployed functies met het manifest</li>
                <li><strong>Admin Notifications:</strong> Urgent notification bij ontbrekende functies</li>
                <li><strong>Audit Log:</strong> Alle integrity-failures worden gelogd</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}