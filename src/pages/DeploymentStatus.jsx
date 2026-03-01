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
  if (fn.error_message && fn.http_status !== 429) {
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
      const status = err?.response?.status || err?.status;
      const isTimeout = status === 504 || status === 502;
      setData({
        success: false,
        functions: [],
        summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 1 },
        outer_error: isTimeout
          ? `Timeout (${status}) — de verificatie duurde te lang. Probeer het opnieuw, of gebruik de Registry Integrity check hieronder.`
          : (err?.message || "Onbekende fout bij aanroep verifyDeployment"),
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

      {/* Operational Deployment Protocol */}
      <OperationalDeploymentProtocol />

      {/* Publish & Registry Drift Docs */}
      <PublishRegistryDriftDocs />

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

function SelfHealingSection() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: healLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['autoHealLogs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter(
        { target_id: 'auto-heal-registry' },
        '-created_date',
        10
      );
      return logs;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const handleManualHeal = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('autoHealRegistry', {});
      setResult(res.data);
      refetchLogs();
    } catch (err) {
      setResult({ action: 'SYSTEM_ERROR', error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const healResults = healLogs?.filter(l => l.metadata?.phase === 'HEAL_RESULT') || [];
  const healAttempts = healLogs?.filter(l => l.metadata?.phase === 'HEAL_START') || [];
  const rateLimited = healLogs?.filter(l => l.target_id === 'auto-heal-rate-limited') || [];
  const consecutiveFailures = (() => {
    let count = 0;
    for (const log of healResults) {
      if (!log.metadata?.heal_success) count++;
      else break;
    }
    return count;
  })();

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-900">Self-Healing Status</h2>
          {consecutiveFailures > 0 && (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              {consecutiveFailures}x consecutive failure
            </Badge>
          )}
        </div>
        <Button onClick={handleManualHeal} disabled={loading} size="sm" variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Manual Heal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{healAttempts.length}</p>
            <p className="text-xs text-slate-500">Heal attempts (recent)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-700">{healResults.filter(l => l.metadata?.heal_success).length}</p>
            <p className="text-xs text-slate-500">Successful heals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className={`text-2xl font-bold ${consecutiveFailures > 0 ? 'text-red-700' : 'text-green-700'}`}>{consecutiveFailures}</p>
            <p className="text-xs text-slate-500">Consecutive failures</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-amber-700">{rateLimited.length}</p>
            <p className="text-xs text-slate-500">Rate limited</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual heal result */}
      {result && (
        <Card className={
          result.action === 'HEAL_SUCCESS' || result.action === 'NO_DRIFT'
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        }>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {result.action === 'HEAL_SUCCESS' || result.action === 'NO_DRIFT'
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <AlertTriangle className="w-5 h-5 text-red-600" />
              }
              <div>
                <p className="font-semibold">{result.action}</p>
                {result.healed_functions?.length > 0 && (
                  <p className="text-sm text-green-700">Hersteld: {result.healed_functions.join(', ')}</p>
                )}
                {result.still_missing?.length > 0 && (
                  <p className="text-sm text-red-700">Nog steeds missing: {result.still_missing.join(', ')}</p>
                )}
                {result.rate_limited && (
                  <p className="text-sm text-amber-700">Rate limited — max 1 heal per uur</p>
                )}
                {result.error && (
                  <p className="text-sm text-red-700">{result.error}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent heal log */}
      {healLogs && healLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recente Heal Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-mono flex-shrink-0 w-32">
                    {new Date(log.created_date).toLocaleString("nl-NL")}
                  </span>
                  <span className={
                    log.metadata?.heal_success === true ? "text-green-700" :
                    log.metadata?.heal_success === false ? "text-red-700" :
                    log.metadata?.rate_limited ? "text-amber-700" :
                    "text-slate-600"
                  }>
                    {log.description}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SelfHealingProtocol() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mt-4">
      <CardHeader>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-700 hover:text-slate-900"
        >
          {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <Shield className="w-5 h-5 text-purple-600" />
          Self-Healing Protocol Documentatie
        </button>
      </CardHeader>
      {open && (
        <CardContent className="prose prose-sm prose-slate max-w-none">
          <div className="space-y-4 text-sm">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-bold text-purple-900 mt-0">Hoe werkt Self-Healing?</h3>
              <p className="text-purple-800 mb-0">
                Het <code>autoHealRegistry</code> systeem draait elk uur via de automation en detecteert deployment drift.
                Bij ontbrekende functies wordt automatisch een <strong>warm-ping heal</strong> uitgevoerd:
                elke missing function wordt 3× gepinged met 3 seconden pauze, gevolgd door 5 seconden stabilisatie.
                Daarna wordt de registry opnieuw gecontroleerd.
              </p>
            </div>

            <h3 className="font-bold text-slate-900">Heal Flow</h3>
            <div className="space-y-2">
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <p><strong>Check:</strong> <code>verifyFunctionRegistry</code> vergelijkt manifest met deployed functies</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <p><strong>Rate limit:</strong> Max 1 heal per 60 minuten (via AuditLog timestamp)</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <p><strong>Warm-ping:</strong> 3 rondes × ping alle missing functies, 3s delay per ronde</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                <p><strong>Verify:</strong> 5s wachten, dan re-run <code>verifyFunctionRegistry</code></p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">5</span>
                <p><strong>Notify:</strong> SUCCESS = medium notification, FAILED = urgent notification</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-amber-900 mt-0">⚠️ Beperkingen</h3>
              <ul className="text-amber-800 mb-0">
                <li>Warm-ping kan alleen functies herstellen die <strong>gepauzeerd/cold</strong> zijn door het platform</li>
                <li>Als een functie daadwerkelijk <strong>verwijderd of corrupt</strong> is, is handmatige re-deploy nodig</li>
                <li>Rate limit: max 1 heal per uur om cascade-effecten te voorkomen</li>
                <li>Bij 3+ consecutive failures: handmatig Full Publish Protocol uitvoeren</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mt-0">✓ Automatische escalatie</h3>
              <ul className="text-green-800 mb-0">
                <li><strong>GREEN (geen drift):</strong> Stille AuditLog entry, geen notification</li>
                <li><strong>HEAL SUCCESS:</strong> Medium priority notification + AuditLog</li>
                <li><strong>HEAL FAILED:</strong> Urgent notification + AuditLog</li>
                <li><strong>RATE LIMITED:</strong> Urgent notification (handmatige actie vereist)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function OperationalDeploymentProtocol() {
  const [open, setOpen] = useState(true);

  return (
    <Card className="mt-8 border-2 border-indigo-300 shadow-md">
      <CardHeader className="bg-indigo-50 rounded-t-xl">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-lg font-bold text-indigo-900 hover:text-indigo-700 w-full"
        >
          {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <Shield className="w-5 h-5 text-indigo-700" />
          Operational Deployment Protocol (Verplicht)
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-4 space-y-5">
          {/* Waarschuwing */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 text-sm">Dit protocol is verplicht bij ALLE backend wijzigingen, ook kleine.</p>
              <p className="text-red-700 text-xs mt-1">Niet-naleving kan leiden tot registry drift, ontbrekende functies en productieverstoringen.</p>
            </div>
          </div>

          {/* 1. Backend Changes Bundelen */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="font-bold text-slate-900 text-sm">Backend Changes — Bundelen</h3>
            </div>
            <ul className="text-sm text-slate-700 space-y-1 ml-8 list-disc">
              <li>Backend wijzigingen <strong>bundelen in één sessie</strong>.</li>
              <li>Geen meerdere incremental saves achter elkaar.</li>
              <li>Voer alle gerelateerde wijzigingen in één keer door, dan publiceren.</li>
            </ul>
          </div>

          {/* 2. Verplichte Deploy Procedure */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-bold text-indigo-900 text-sm">Verplichte Deploy Procedure</h3>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { step: "1", text: 'Klik Publish.' },
                { step: "2", text: 'Wacht tot "Publish completed".' },
                { step: "3", text: 'Wacht extra 10–15 seconden (functies warmen op).' },
                { step: "4", text: "Controleer RegistryIntegrityCard → status GREEN, missing_count = 0." },
                { step: "5", text: "Voer één echte test uit (bijv. submitTimeEntry via mobiele app)." },
              ].map(s => (
                <div key={s.step} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{s.step}</span>
                  <p className="text-sm text-indigo-900">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Tijdens Productie-uren */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-amber-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="font-bold text-amber-900 text-sm">Tijdens Productie-uren</h3>
            </div>
            <ul className="text-sm text-amber-800 space-y-1 ml-8 list-disc">
              <li><strong>Geen backend wijzigingen</strong> tijdens productie-uren.</li>
              <li>Alleen frontend aanpassingen (pages, components, layout) zijn veilig.</li>
              <li>Backend changes uitsluitend buiten piekuren plannen.</li>
            </ul>
          </div>

          {/* 4. Na Grote Refactors */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-purple-600 text-white text-xs font-bold flex items-center justify-center">4</span>
              <h3 className="font-bold text-purple-900 text-sm">Na Grote Refactors</h3>
            </div>
            <div className="space-y-2 ml-4">
              {[
                "Publish uitvoeren.",
                "Registry verify (RegistryIntegrityCard → GREEN).",
                "Test submitTimeEntry (mobiele app).",
                "Test approveTimeEntry (goedkeuringspagina).",
                "Test autoHealRegistry (Manual Heal knop).",
              ].map((text, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <p className="text-sm text-purple-900">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Bij "function not deployed" */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">5</span>
              <h3 className="font-bold text-red-900 text-sm">Bij "function not deployed"</h3>
            </div>
            <div className="space-y-2 ml-4">
              {[
                "STOP alle wijzigingen onmiddellijk.",
                "Handmatige Publish uitvoeren.",
                "Registry check (RegistryIntegrityCard → GREEN).",
                "Pas daarna verder werken.",
              ].map((text, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <p className="text-sm text-red-900">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function PublishRegistryDriftDocs() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mt-8">
      <CardHeader>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-700 hover:text-slate-900"
        >
          {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Publish Types & Registry Drift
        </button>
      </CardHeader>
      {open && (
        <CardContent className="prose prose-sm prose-slate max-w-none">
          <div className="space-y-5 text-sm">

            {/* Incremental Publish */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mt-0">1. Incremental Publish (standaard)</h3>
              <p className="text-blue-800 mb-2">
                Elke keer dat een <strong>individueel bestand</strong> wordt opgeslagen of gewijzigd (via chat of editor), 
                wordt <strong>alleen dat bestand</strong> opnieuw gedeployed.
              </p>
              <ul className="text-blue-800 mb-0 space-y-1">
                <li><strong>Frontend</strong> (pages, components, layout): alleen het gewijzigde bestand wordt opnieuw gebundeld.</li>
                <li><strong>Backend functions</strong>: alleen de gewijzigde functie wordt opnieuw gedeployed naar Deno. Andere functies worden <em>niet aangeraakt</em>.</li>
                <li>Dit is het standaard gedrag bij elke wijziging.</li>
              </ul>
            </div>

            {/* Full Rebuild */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mt-0">2. Full Rebuild / Publish</h3>
              <p className="text-green-800 mb-2">
                Een full rebuild vindt plaats wanneer je in het Base44 dashboard handmatig <strong>"Publish"</strong> klikt.
              </p>
              <ul className="text-green-800 mb-0 space-y-1">
                <li><strong>Alle</strong> frontend-bestanden worden opnieuw gebundeld.</li>
                <li><strong>Alle</strong> backend functions worden opnieuw gedeployed.</li>
                <li>Dit is de enige manier om te garanderen dat alle functies consistent zijn.</li>
              </ul>
            </div>

            {/* Function Registry */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-bold text-purple-900 mt-0">3. Function Registry</h3>
              <p className="text-purple-800 mb-2">
                Er is <strong>geen platform-native registry</strong> die automatisch wordt bijgehouden door Base44.
              </p>
              <ul className="text-purple-800 mb-0 space-y-1">
                <li>Functies bestaan als individuele <strong>Deno-isolates</strong> — er is geen centraal manifest op platform-niveau.</li>
                <li>Onze <code>verifyFunctionRegistry</code> en <code>autoHealRegistry</code> zijn <strong>zelfgebouwde verificatielagen</strong> die checken of functies bereikbaar zijn via ping.</li>
                <li>Bij een <strong>full publish</strong> worden alle functies opnieuw gedeployed → daarna zijn ze allemaal bereikbaar.</li>
                <li>Bij een <strong>incremental</strong> publish wordt <em>alleen</em> de gewijzigde functie opnieuw gedeployed.</li>
                <li>De registry wordt dus <strong>niet automatisch opnieuw opgebouwd</strong> — onze functies monitoren en rapporteren de actuele status.</li>
              </ul>
            </div>

            {/* Registry Drift */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-amber-900 mt-0">4. Kan partial publish registry drift veroorzaken?</h3>
              <p className="text-amber-800 mb-2">
                <strong>Ja, absoluut.</strong> Dit is de hoofdoorzaak van drift.
              </p>
              <table className="w-full text-xs border-collapse mb-0">
                <thead>
                  <tr className="border-b border-amber-300">
                    <th className="text-left py-2 pr-3 font-semibold text-amber-900">Oorzaak</th>
                    <th className="text-left py-2 font-semibold text-amber-900">Mechanisme</th>
                  </tr>
                </thead>
                <tbody className="text-amber-800">
                  <tr className="border-b border-amber-200">
                    <td className="py-2 pr-3 font-medium">Deploy-fout bij incremental save</td>
                    <td className="py-2">Functie wordt gewijzigd maar deploy faalt stilletjes (syntax error, timeout). Functie is dan tijdelijk niet bereikbaar.</td>
                  </tr>
                  <tr className="border-b border-amber-200">
                    <td className="py-2 pr-3 font-medium">Cold-start na inactiviteit</td>
                    <td className="py-2">Deno-isolates kunnen na langere inactiviteit "slapen". Eerste ping kan timeout geven.</td>
                  </tr>
                  <tr className="border-b border-amber-200">
                    <td className="py-2 pr-3 font-medium">Platform-onderhoud</td>
                    <td className="py-2">Bij platform-updates worden isolates herstart. Niet alle functies starten tegelijk → kort window van drift.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium">Verwijderde functie</td>
                    <td className="py-2">Bestand verwijderd maar staat nog in het manifest → permanent missing tot manifest update.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Samenvatting */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mt-0">Samenvatting</h3>
              <table className="w-full text-xs border-collapse mb-0">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="text-left py-2 pr-3 font-semibold">Actie</th>
                    <th className="text-left py-2 pr-3 font-semibold">Scope</th>
                    <th className="text-left py-2 font-semibold">Drift risico</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-200">
                    <td className="py-2 pr-3 font-medium">Incremental save</td>
                    <td className="py-2 pr-3">Alleen gewijzigde functie</td>
                    <td className="py-2"><Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">Mogelijk</Badge></td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 pr-3 font-medium">Full publish</td>
                    <td className="py-2 pr-3">Alle functies</td>
                    <td className="py-2"><Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Lost drift op</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium">Registry check</td>
                    <td className="py-2 pr-3">Onze eigen verificatielaag</td>
                    <td className="py-2"><Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]">Detecteert drift</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </CardContent>
      )}
    </Card>
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