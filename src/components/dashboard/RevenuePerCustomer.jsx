import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Clock, TrendingUp } from "lucide-react";
import { startOfWeek, endOfWeek, format, getISOWeek, getYear } from "date-fns";
import { nl } from "date-fns/locale";

export default function RevenuePerCustomer() {
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const currentYear = getYear(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'Actief' })
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'Actief' })
  });

  const { data: timeEntries = [], isLoading: loadingTE } = useQuery({
    queryKey: ['dashboard-te-week', currentWeek, currentYear],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: currentWeek, year: currentYear })
  });

  const { data: importResults = [], isLoading: loadingImports } = useQuery({
    queryKey: ['dashboard-imports-week', weekStartStr, weekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.list('-created_date', 500);
      return all.filter(r => {
        const d = r.datum || r.data?.Datum;
        return d && d >= weekStartStr && d <= weekEndStr;
      });
    }
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['dashboard-articles'],
    queryFn: () => base44.entities.Article.filter({ status: 'Actief' })
  });

  const isLoading = loadingCustomers || loadingProjects || loadingTE || loadingImports;

  const customerData = useMemo(() => {
    if (isLoading) return [];

    const customerMap = {};
    customers.forEach(c => {
      customerMap[c.id] = { 
        name: c.company_name, 
        hours: 0, 
        revenue: 0,
        entries: 0
      };
    });

    // Map projects to customers
    const projectCustomerMap = {};
    projects.forEach(p => {
      if (p.customer_id) projectCustomerMap[p.id] = p.customer_id;
    });

    // Aggregate time entries per customer
    timeEntries.forEach(te => {
      const custId = te.customer_id || projectCustomerMap[te.project_id];
      if (custId && customerMap[custId]) {
        customerMap[custId].hours += te.total_hours || 0;
        customerMap[custId].entries += 1;
      }
    });

    // Calculate PostNL revenue from imports
    const postNLCustomer = customers.find(c => c.company_name?.toLowerCase().includes('postnl'));
    if (postNLCustomer && customerMap[postNLCustomer.id]) {
      const custArticles = articles.filter(a => a.customer_id === postNLCustomer.id);
      
      const getPrice = (article) => {
        if (!article?.price_rules?.length) return 0;
        const now = new Date();
        const valid = article.price_rules
          .filter(r => new Date(r.start_date) <= now && (!r.end_date || new Date(r.end_date) >= now))
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        return valid.length > 0 ? valid[0].price : 0;
      };

      const stopArticle = custArticles.find(a => a.description?.toLowerCase().includes('stop'));
      const stukArticle = custArticles.find(a => a.description?.toLowerCase().includes('stuk') || a.description?.toLowerCase().includes('pakket'));
      const stopPrice = getPrice(stopArticle);
      const stukPrice = getPrice(stukArticle);

      importResults.forEach(r => {
        const data = r.data || {};
        const stops = Number(data['Aantal tijdens route - stops']) || 0;
        const stuks = Number(data['Geleverde stops']) || Number(data['Aantal stuks afgehaald/ gecollecteerd']) || 0;
        customerMap[postNLCustomer.id].revenue += (stops * stopPrice) + (stuks * stukPrice);
      });
    }

    return Object.entries(customerMap)
      .filter(([_, v]) => v.hours > 0 || v.revenue > 0)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.revenue + b.hours) - (a.revenue + a.hours));
  }, [customers, projects, timeEntries, importResults, articles, isLoading]);

  const totalHours = customerData.reduce((s, c) => s + c.hours, 0);
  const totalRevenue = customerData.reduce((s, c) => s + c.revenue, 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Omzet & Uren per Klant — Week {currentWeek}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : customerData.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            Geen data deze week
          </p>
        ) : (
          <div className="space-y-3">
            {customerData.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.entries} registraties</p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  {c.revenue > 0 && (
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3" />
                      € {c.revenue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {c.hours.toFixed(1)} uur
                  </p>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 mt-2">
              <p className="font-semibold text-blue-900">Totaal</p>
              <div className="text-right space-y-0.5">
                {totalRevenue > 0 && (
                  <p className="text-sm font-bold text-emerald-700">
                    € {totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                <p className="text-sm font-semibold text-blue-800">{totalHours.toFixed(1)} uur</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}