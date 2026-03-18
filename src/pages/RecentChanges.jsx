import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, ChevronDown, ChevronRight, Shield, Zap, Bug, Wrench,
  Rocket, Server, Palette, FileCode, Tag
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { APP_VERSION, RELEASE_DATE } from "@/components/utils/appVersion";
import { CHANGELOG } from "@/components/changelog/changelogData";

const TYPE_CONFIG = {
  major:    { label: "Major",    color: "bg-blue-100 text-blue-700",   icon: Rocket },
  minor:    { label: "Minor",    color: "bg-green-100 text-green-700", icon: Zap },
  patch:    { label: "Patch",    color: "bg-slate-100 text-slate-700", icon: Wrench },
  hotfix:   { label: "Hotfix",   color: "bg-orange-100 text-orange-700", icon: Bug },
  security: { label: "Security", color: "bg-red-100 text-red-700",    icon: Shield },
};

const CAT_CONFIG = {
  Feature:     { color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Bugfix:      { color: "bg-red-50 text-red-700 border-red-200" },
  Security:    { color: "bg-purple-50 text-purple-700 border-purple-200" },
  Performance: { color: "bg-amber-50 text-amber-700 border-amber-200" },
  Refactor:    { color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  Backend:     { color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  UI:          { color: "bg-pink-50 text-pink-700 border-pink-200" },
  Deployment:  { color: "bg-slate-50 text-slate-700 border-slate-200" },
};

export default function RecentChanges() {
  const [search, setSearch] = useState("");
  const [expandedVersions, setExpandedVersions] = useState(new Set([CHANGELOG[0]?.version]));

  const filtered = useMemo(() => {
    if (!search) return CHANGELOG;
    const q = search.toLowerCase();
    return CHANGELOG.filter(release =>
      release.version.includes(q) ||
      release.title.toLowerCase().includes(q) ||
      release.changes.some(c =>
        c.description.toLowerCase().includes(q) ||
        (c.files || []).some(f => f.toLowerCase().includes(q))
      )
    );
  }, [search]);

  const toggleVersion = (version) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      next.has(version) ? next.delete(version) : next.add(version);
      return next;
    });
  };

  const totalChanges = CHANGELOG.reduce((sum, r) => sum + r.changes.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Versiehistorie</h1>
        <p className="text-sm text-slate-500 mt-1">
          Huidige versie: <span className="font-mono font-semibold text-slate-700">v{APP_VERSION}</span>
          {" · "}{CHANGELOG.length} releases · {totalChanges} wijzigingen
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Zoek op versie, beschrijving of bestandsnaam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Geen releases gevonden voor "{search}"
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {filtered.map((release, idx) => {
              const isExpanded = expandedVersions.has(release.version);
              const isCurrent = release.version === APP_VERSION;
              const typeConf = TYPE_CONFIG[release.type] || TYPE_CONFIG.patch;
              const TypeIcon = typeConf.icon;

              return (
                <div key={release.version} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className={`absolute left-2.5 top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                    isCurrent ? "bg-blue-600" : "bg-slate-300"
                  }`} />

                  <Card className={`${isCurrent ? "border-blue-200 shadow-md" : ""}`}>
                    <button
                      className="w-full text-left px-5 py-4 flex items-start gap-4"
                      onClick={() => toggleVersion(release.version)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold font-mono text-slate-900">
                            v{release.version}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-blue-600 text-white text-[10px]">HUIDIG</Badge>
                          )}
                          <Badge className={`text-[10px] ${typeConf.color}`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {typeConf.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{release.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(new Date(release.date + "T12:00:00"), "d MMMM yyyy", { locale: nl })}
                          {" · "}{release.changes.length} wijziging{release.changes.length !== 1 ? "en" : ""}
                        </p>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                        : <ChevronRight className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-slate-100">
                        <div className="mt-3 space-y-2.5">
                          {release.changes.map((change, ci) => {
                            const catConf = CAT_CONFIG[change.category] || CAT_CONFIG.Feature;
                            return (
                              <div key={ci} className="flex items-start gap-3">
                                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex-shrink-0 mt-0.5 ${catConf.color}`}>
                                  {change.category}
                                </Badge>
                                <div className="min-w-0">
                                  <p className="text-sm text-slate-700">{change.description}</p>
                                  {change.files && change.files.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {change.files.map((file, fi) => (
                                        <span
                                          key={fi}
                                          className="inline-flex items-center gap-1 text-[10px] font-mono bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded"
                                        >
                                          <FileCode className="w-2.5 h-2.5" />
                                          {file}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}