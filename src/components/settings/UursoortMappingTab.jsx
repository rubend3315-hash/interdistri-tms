import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import {
  DEFAULT_UURSOORT_MAPPING,
  LOONCOMPONENT_BESCHRIJVINGEN,
  validateMapping,
} from "@/components/utils/uursoortMapping";

export default function UursoortMappingTab() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [mapping, setMapping] = useState({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["payrollSettings"],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });

  const { data: urensoorten = [] } = useQuery({
    queryKey: ["urensoorten"],
    queryFn: () => base44.entities.Urensoort.list(),
  });

  const existing = settings[0] || null;

  useEffect(() => {
    if (existing?.looncomponent_uursoort_mapping) {
      setMapping(existing.looncomponent_uursoort_mapping);
    } else {
      setMapping({ ...DEFAULT_UURSOORT_MAPPING });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existing) {
        return base44.entities.PayrollSettings.update(existing.id, {
          looncomponent_uursoort_mapping: data,
        });
      } else {
        return base44.entities.PayrollSettings.create({
          payroll_email: "niet-ingesteld@example.com",
          looncomponent_uursoort_mapping: data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrollSettings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    const missing = validateMapping(mapping);
    if (missing.length > 0) {
      alert(`Let op: de volgende looncomponenten missen een uursoortcode:\n\n${missing.map(k => LOONCOMPONENT_BESCHRIJVINGEN[k] || k).join("\n")}`);
      return;
    }
    saveMutation.mutate(mapping);
  };

  const handleReset = () => {
    setMapping({ ...DEFAULT_UURSOORT_MAPPING });
  };

  const updateMapping = (key, value) => {
    setMapping((prev) => ({ ...prev, [key]: value.toUpperCase().trim() }));
  };

  const missingKeys = validateMapping(mapping);
  const activeUrensoorten = urensoorten.filter((u) => u.status === "Actief");

  if (isLoading) return <p className="text-slate-500">Laden...</p>;

  const componentKeys = Object.keys(DEFAULT_UURSOORT_MAPPING);

  // Groepeer componenten
  const groups = [
    {
      label: "Basis & Overwerk",
      keys: ["basis_100", "overwerk_130", "variabele_uren_100", "compensatie_uren", "aanvulling_contract"],
    },
    {
      label: "Zaterdag",
      keys: ["diensturen_zaterdag_150", "toeslag_za_50", "overwerk_zaterdag_150"],
    },
    {
      label: "Zondag",
      keys: ["diensturen_zondag_200", "toeslag_zo_100", "overwerk_zondag_200"],
    },
    {
      label: "Feestdag",
      keys: ["diensturen_feestdag_200", "toeslag_feestdag_100", "feestdag_overwerk_200", "feestdag"],
    },
    {
      label: "Nacht & Toeslagen",
      keys: ["toeslagenmatrix_19", "nachturen"],
    },
    {
      label: "Verlof & Ziek",
      keys: ["verlof", "ziek", "atv", "bijzonder_verlof", "partner_verlof", "onbetaald_verlof", "ouderschapsverlof_betaald", "ouderschapsverlof_onbetaald", "partnerverlof_week"],
    },
    {
      label: "Vergoedingen",
      keys: ["verblijfkosten"],
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Uursoort Mapping
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Koppel looncomponenten aan uursoortcodes voor export en rapportage.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-3 h-3 mr-1" /> Standaardwaarden
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4 mr-1 text-green-200" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {saved ? "Opgeslagen ✓" : "Opslaan"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {missingKeys.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">{missingKeys.length} looncomponent(en) zonder uursoortcode</p>
                <p className="text-amber-700 mt-0.5">Export en rapportage zullen falen voor ontbrekende mappings.</p>
              </div>
            </div>
          )}

          {activeUrensoorten.length > 0 && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Beschikbare uursoorten in systeem:</p>
              <div className="flex flex-wrap gap-1.5">
                {activeUrensoorten.map((u) => (
                  <Badge key={u.id} variant="outline" className="text-xs">
                    {u.code} — {u.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 border-b pb-1">{group.label}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.keys.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600 flex-1 min-w-0 truncate" title={LOONCOMPONENT_BESCHRIJVINGEN[key]}>
                        {LOONCOMPONENT_BESCHRIJVINGEN[key]}
                      </Label>
                      <Input
                        value={mapping[key] || ""}
                        onChange={(e) => updateMapping(key, e.target.value)}
                        className={`w-28 text-center font-mono text-sm ${!mapping[key] ? "border-amber-400 bg-amber-50" : ""}`}
                        placeholder="CODE"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}