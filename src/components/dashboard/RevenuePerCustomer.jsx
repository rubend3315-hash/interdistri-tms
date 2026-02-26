import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { startOfWeek, endOfWeek, format, getISOWeek, getYear, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";

function fmt(n) {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Delta({ delta, pct, prefix = "", suffix = "" }) {
  if (delta === 0 && (pct === null || pct === 0)) {
    return <span className="text-slate-400 text-[10px]"><Minus className="w-2.5 h-2.5 inline" /></span>;
  }
  const positive = delta > 0;
  const color = positive ? "text-emerald-600" : "text-red-500";
  const Arrow = positive ? TrendingUp : TrendingDown;
  const sign = positive ? "+" : "";
  return (
    <span className={`${color} text-[10px] inline-flex items-center gap-0.5 whitespace-nowrap`}>
      <Arrow className="w-2.5 h-2.5" />
      {prefix}{sign}{suffix === "%" ? (pct !== null ? pct.toFixed(1) + "%" : "nieuw") : fmt(delta)}{suffix !== "%" ? suffix : ""}
    </span>
  );
}

function DeltaGroup({ delta, pct, prefix = "", suffix = "" }) {
  return (
    <span className="inline-flex items-center gap-1.5 ml-1">
      <Delta delta={delta} pct={pct} prefix={prefix} suffix={suffix === "uur" ? "" : suffix} />
      {pct !== null && <Delta delta={delta} pct={pct} prefix="" suffix="%" />}
    </span>
  );
}

export default function RevenuePerCustomer() {
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const currentYear = getYear(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);
  const prevWeek = getISOWeek(prevWeekStart);
  const prevYear = getYear(prevWeekStart);

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const prevWeekStartStr = format(prevWeekStart, "yyyy-MM-dd");
  const prevWeekEndStr = format(prevWeekEnd, "yyyy-MM-dd");

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => base44.entities.Customer.filter({ status: "Actief" }),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: () => base44.entities.Project.filter({ status: "Actief" }),
  });

  // Current week entries
  const { data: timeEntries = [], isLoading: loadingTE } = useQuery({
    queryKey: ["dashboard-te-week", currentWeek, currentYear],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: currentWeek, year: currentYear }),
  });

  // Previous week entries
  const { data: prevTimeEntries = [], isLoading: loadingPrevTE } = useQuery({
    queryKey: ["dashboard-te-week", prevWeek, prevYear],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: prevWeek, year: prevYear }),
  });

  const { data: importResults = [], isLoading: loadingImports } = useQuery({
    queryKey: ["dashboard-imports-week", weekStartStr, weekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.list("-created_date", 500);
      return all.filter((r) => {
        const d = r.datum || r.data?.Datum;
        return d && d >= weekStartStr && d <= weekEndStr;
      });
    },
  });

  const { data: prevImportResults = [] } = useQuery({
    queryKey: ["dashboard-imports-week", prevWeekStartStr, prevWeekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.list("-created_date", 500);
      return all.filter((r) => {
        const d = r.datum || r.data?.Datum;
        return d && d >= prevWeekStartStr && d <= prevWeekEndStr;
      });
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["dashboard-articles"],
    queryFn: () => base44.entities.Article.filter({ status: "Actief" }),
  });

  const isLoading = loadingCustomers || loadingProjects || loadingTE || loadingPrevTE || loadingImports;

  // Helper to build week aggregation
  const buildWeekMap = (entries, imports, custList, projList) => {
    const customerMap = {};
    custList.forEach((c) => {
      customerMap[c.id] = { name: c.company_name, hours: 0, revenue: 0, entries: 0 };
    });

    const projectCustomerMap = {};
    projList.forEach((p) => {
      if (p.customer_id) projectCustomerMap[p.id] = p.customer_id;
    });

    entries.forEach((te) => {
      if (te.status !== "Goedgekeurd") return;
      const custId = te.customer_id || projectCustomerMap[te.project_id];
      if (custId && customerMap[custId]) {
        customerMap[custId].hours += te.total_hours || 0;
        customerMap[custId].entries += 1;
      }
    });

    // PostNL revenue
    const postNLCustomer = custList.find((c) => c.company_name?.toLowerCase().includes("postnl"));
    if (postNLCustomer && customerMap[postNLCustomer.id]) {
      const custArticles = articles.filter((a) => a.customer_id === postNLCustomer.id);
      const getPrice = (article) => {
        if (!article?.price_rules?.length) return 0;
        const now = new Date();
        const valid = article.price_rules
          .filter((r) => new Date(r.start_date) <= now && (!r.end_date || new Date(r.end_date) >= now))
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        return valid.length > 0 ? valid[0].price : 0;
      };
      const stopArticle = custArticles.find((a) => a.description?.toLowerCase().includes("stop"));
      const stukArticle = custArticles.find((a) => a.description?.toLowerCase().includes("stuk") || a.description?.toLowerCase().includes("pakket"));
      const stopPrice = getPrice(stopArticle);
      const stukPrice = getPrice(stukArticle);
      imports.forEach((r) => {
        const data = r.data || {};
        const stops = Number(data["Aantal tijdens route - stops"]) || 0;
        const stuks = Number(data["Geleverde stops"]) || Number(data["Aantal stuks afgehaald/ gecollecteerd"]) || 0;
        customerMap[postNLCustomer.id].revenue += stops * stopPrice + stuks * stukPrice;
      });
    }

    return customerMap;
  };

  const { customerData, totals } = useMemo(() => {
    if (isLoading) return { customerData: [], totals: null };

    const currentMap = buildWeekMap(timeEntries, importResults, customers, projects);
    const prevMap = buildWeekMap(prevTimeEntries, prevImportResults, customers, projects);

    const merged = Object.entries(currentMap)
      .filter(([_, v]) => v.hours > 0 || v.revenue > 0 || (prevMap[_] && (prevMap[_].hours > 0 || prevMap[_].revenue > 0)))
      .map(([id, cur]) => {
        const prev = prevMap[id] || { hours: 0, revenue: 0, entries: 0 };
        const curRate = cur.hours > 0 ? cur.revenue / cur.hours : 0;
        const prevRate = prev.hours > 0 ? prev.revenue / prev.hours : 0;
        return {
          id,
          name: cur.name,
          entries: cur.entries,
          hours: cur.hours,
          revenue: cur.revenue,
          rate: curRate,
          hoursDelta: cur.hours - prev.hours,
          hoursPct: prev.hours > 0 ? ((cur.hours - prev.hours) / prev.hours) * 100 : null,
          revenueDelta: cur.revenue - prev.revenue,
          revenuePct: prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : null,
          rateDelta: curRate - prevRate,
          ratePct: prevRate > 0 ? ((curRate - prevRate) / prevRate) * 100 : null,
        };
      })
      .filter((c) => c.hours > 0 || c.revenue > 0)
      .sort((a, b) => b.revenue + b.hours - (a.revenue + a.hours));

    // Totals
    const curTotalH = merged.reduce((s, c) => s + c.hours, 0);
    const curTotalR = merged.reduce((s, c) => s + c.revenue, 0);
    const curTotalRate = curTotalH > 0 ? curTotalR / curTotalH : 0;

    const prevTotalH = Object.values(prevMap).reduce((s, c) => s + c.hours, 0);
    const prevTotalR = Object.values(prevMap).reduce((s, c) => s + c.revenue, 0);
    const prevTotalRate = prevTotalH > 0 ? prevTotalR / prevTotalH : 0;

    return {
      customerData: merged,
      totals: {
        hours: curTotalH,
        revenue: curTotalR,
        rate: curTotalRate,
        hoursDelta: curTotalH - prevTotalH,
        hoursPct: prevTotalH > 0 ? ((curTotalH - prevTotalH) / prevTotalH) * 100 : null,
        revenueDelta: curTotalR - prevTotalR,
        revenuePct: prevTotalR > 0 ? ((curTotalR - prevTotalR) / prevTotalR) * 100 : null,
        rateDelta: curTotalRate - prevTotalRate,
        ratePct: prevTotalRate > 0 ? ((curTotalRate - prevTotalRate) / prevTotalRate) * 100 : null,
      },
    };
  }, [customers, projects, timeEntries, prevTimeEntries, importResults, prevImportResults, articles, isLoading]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Omzet & Uren per Klant — Week {currentWeek}
        </CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">Δ = verschil t.o.v. week {currentWeek - 1 > 0 ? currentWeek - 1 : 52} (alleen goedgekeurde uren)</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : customerData.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Geen data deze week</p>
        ) : (
          <div className="space-y-3">
            {customerData.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.entries} registraties</p>
                    </div>
                  </div>
                </div>
                {/* Metrics row */}
                <div className="mt-2 grid grid-cols-3 gap-2 pl-[52px]">
                  {/* Uren */}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Uren</p>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.hours.toFixed(1)}
                    </p>
                    <DeltaGroup delta={c.hoursDelta} pct={c.hoursPct} suffix="uur" />
                  </div>
                  {/* Omzet */}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Omzet</p>
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />€ {fmt(c.revenue)}
                    </p>
                    <DeltaGroup delta={c.revenueDelta} pct={c.revenuePct} prefix="€ " />
                  </div>
                  {/* Gem. €/uur */}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">€/uur</p>
                    <p className="text-sm font-semibold text-slate-700">€ {fmt(c.rate)}</p>
                    <DeltaGroup delta={c.rateDelta} pct={c.ratePct} prefix="€ " />
                  </div>
                </div>
              </div>
            ))}

            {/* Totals */}
            {totals && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mt-2">
                <p className="font-semibold text-blue-900 mb-2">Totaal</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase tracking-wide">Uren</p>
                    <p className="text-sm font-bold text-blue-800">{totals.hours.toFixed(1)}</p>
                    <DeltaGroup delta={totals.hoursDelta} pct={totals.hoursPct} suffix="uur" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase tracking-wide">Omzet</p>
                    <p className="text-sm font-bold text-emerald-700">€ {fmt(totals.revenue)}</p>
                    <DeltaGroup delta={totals.revenueDelta} pct={totals.revenuePct} prefix="€ " />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase tracking-wide">€/uur (gew.)</p>
                    <p className="text-sm font-bold text-blue-800">€ {fmt(totals.rate)}</p>
                    <DeltaGroup delta={totals.rateDelta} pct={totals.ratePct} prefix="€ " />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}