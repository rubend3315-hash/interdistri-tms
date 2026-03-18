import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, Search, Filter, RefreshCw, User, FileText, Shield, Truck,
  Calendar, Database, Mail, Users, AlertTriangle, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow, subHours } from "date-fns";
import { nl } from "date-fns/locale";

const CATEGORY_ICONS = {
  Gebruikers: Users,
  Permissies: Shield,
  Medewerkers: Users,
  Contracten: FileText,
  Tijdregistratie: Clock,
  Planning: Calendar,
  Systeem: Database,
  Data: Database,
  Communicatie: Mail,
  Security: Shield,
  HR: Users,
};

const CATEGORY_COLORS = {
  Gebruikers: "bg-blue-100 text-blue-700",
  Permissies: "bg-purple-100 text-purple-700",
  Medewerkers: "bg-green-100 text-green-700",
  Contracten: "bg-amber-100 text-amber-700",
  Tijdregistratie: "bg-indigo-100 text-indigo-700",
  Planning: "bg-cyan-100 text-cyan-700",
  Systeem: "bg-slate-100 text-slate-700",
  Data: "bg-gray-100 text-gray-700",
  Communicatie: "bg-pink-100 text-pink-700",
  Security: "bg-red-100 text-red-700",
  HR: "bg-emerald-100 text-emerald-700",
};

const ACTION_LABELS = {
  create: "Aangemaakt",
  update: "Gewijzigd",
  delete: "Verwijderd",
  send: "Verzonden",
  approve: "Goedgekeurd",
  reject: "Afgekeurd",
  login: "Ingelogd",
  role_change: "Rol gewijzigd",
  sign: "Ondertekend",
  export: "Geëxporteerd",
  import: "Geïmporteerd",
};

const ACTION_COLORS = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  approve: "bg-green-100 text-green-700",
  reject: "bg-red-100 text-red-700",
  send: "bg-purple-100 text-purple-700",
};

export default function RecentChanges() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [hoursBack, setHoursBack] = useState(48);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const cutoff = useMemo(() => subHours(new Date(), hoursBack).toISOString(), [hoursBack]);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recentChanges", hoursBack],
    queryFn: async () => {
      const all = await base44.entities.AuditLog.filter(
        { created_date: { $gte: cutoff } },
        "-created_date",
        200
      );
      return all;
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (categoryFilter !== "all" && log.category !== categoryFilter) return false;
      if (actionFilter !== "all" && log.action_type !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          (log.description || "").toLowerCase().includes(q) ||
          (log.performed_by_email || "").toLowerCase().includes(q) ||
          (log.performed_by_name || "").toLowerCase().includes(q) ||
          (log.target_entity || "").toLowerCase().includes(q) ||
          (log.target_name || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, categoryFilter, actionFilter, search]);

  const categories = useMemo(() => [...new Set(logs.map((l) => l.category).filter(Boolean))].sort(), [logs]);
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action_type).filter(Boolean))].sort(), [logs]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((log) => {
      const day = format(new Date(log.created_date), "yyyy-MM-dd");
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Versiehistorie</h1>
          <p className="text-sm text-slate-500 mt-1">
            Alle systeemwijzigingen van de afgelopen {hoursBack} uur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(hoursBack)} onValueChange={(v) => setHoursBack(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 uur</SelectItem>
              <SelectItem value="24">24 uur</SelectItem>
              <SelectItem value="48">48 uur</SelectItem>
              <SelectItem value="72">72 uur</SelectItem>
              <SelectItem value="168">7 dagen</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Ververs
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Totaal wijzigingen" value={logs.length} icon={Database} />
        <SummaryCard label="Aangemaakt" value={logs.filter((l) => l.action_type === "create").length} icon={FileText} color="text-green-600" />
        <SummaryCard label="Gewijzigd" value={logs.filter((l) => l.action_type === "update").length} icon={RefreshCw} color="text-blue-600" />
        <SummaryCard label="Unieke gebruikers" value={new Set(logs.map((l) => l.performed_by_email)).size} icon={Users} color="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Zoek op beschrijving, gebruiker, entiteit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Actie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle acties</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            Geen wijzigingen gevonden voor de geselecteerde filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <h3 className="text-sm font-semibold text-slate-500 mb-2 sticky top-0 bg-slate-50 py-1 z-10">
                {format(new Date(day + "T12:00:00"), "EEEE d MMMM yyyy", { locale: nl })}
                <span className="ml-2 text-xs font-normal text-slate-400">({items.length} wijzigingen)</span>
              </h3>
              <div className="space-y-1">
                {items.map((log) => (
                  <LogEntry
                    key={log.id}
                    log={log}
                    expanded={expandedIds.has(log.id)}
                    onToggle={() => toggleExpand(log.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color = "text-slate-700" }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LogEntry({ log, expanded, onToggle }) {
  const Icon = CATEGORY_ICONS[log.category] || Database;
  const catColor = CATEGORY_COLORS[log.category] || "bg-slate-100 text-slate-700";
  const actColor = ACTION_COLORS[log.action_type] || "bg-slate-100 text-slate-600";
  const actLabel = ACTION_LABELS[log.action_type] || log.action_type;
  const time = format(new Date(log.created_date), "HH:mm:ss");
  const ago = formatDistanceToNow(new Date(log.created_date), { locale: nl, addSuffix: true });

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={onToggle}
      >
        <div className={`mt-0.5 p-1.5 rounded-md ${catColor}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 leading-snug line-clamp-2">{log.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge className={`text-[10px] px-1.5 py-0 ${actColor}`}>{actLabel}</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.category}</Badge>
            {log.target_entity && (
              <span className="text-[10px] text-slate-400">{log.target_entity}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <div>
            <p className="text-xs font-mono text-slate-600">{time}</p>
            <p className="text-[10px] text-slate-400">{ago}</p>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <Detail label="Uitgevoerd door" value={log.performed_by_name || log.performed_by_email} />
            <Detail label="Email" value={log.performed_by_email} />
            <Detail label="Rol" value={log.performed_by_role} />
            <Detail label="Entiteit" value={log.target_entity} />
            <Detail label="Target ID" value={log.target_id} />
            <Detail label="Target naam" value={log.target_name} />
          </div>
          {log.old_value && <Detail label="Oude waarde" value={log.old_value} full />}
          {log.new_value && <Detail label="Nieuwe waarde" value={log.new_value} full />}
          {log.metadata && (
            <div>
              <span className="text-slate-400">Metadata:</span>
              <pre className="mt-1 bg-slate-50 rounded p-2 text-[10px] overflow-x-auto max-h-32">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full }) {
  if (!value) return null;
  return (
    <div className={full ? "col-span-2" : ""}>
      <span className="text-slate-400">{label}: </span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}