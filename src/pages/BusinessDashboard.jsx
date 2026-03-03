import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import DashboardFilters from "@/components/business-dashboard/DashboardFilters";
import KPICards from "@/components/business-dashboard/KPICards";
import RevenueByCustomerChart from "@/components/business-dashboard/RevenueByCustomerChart";
import HoursTrendChart from "@/components/business-dashboard/HoursTrendChart";
import KmOverviewChart from "@/components/business-dashboard/KmOverviewChart";
import CustomerRevenueTable from "@/components/business-dashboard/CustomerRevenueTable";

const currentYear = new Date().getFullYear();

export default function BusinessDashboard() {
  const [filters, setFilters] = useState({
    year: currentYear,
    month: "all",
    viewMode: "weekly",
    customerId: "all",
    employeeId: "all",
  });

  const cOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

  // Load reference data
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-active"],
    queryFn: () => base44.entities.Customer.filter({ status: "Actief" }),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }),
    ...cOpts,
  });

  // Load weekly customer summaries
  const { data: weeklyCustomer = [], isLoading: loadingWC } = useQuery({
    queryKey: ["wcs", filters.year],
    queryFn: () => base44.entities.WeeklyCustomerSummary.filter({ year: filters.year }, "week_number", 500),
    ...cOpts,
  });

  // Load weekly employee summaries
  const { data: weeklyEmployee = [], isLoading: loadingWE } = useQuery({
    queryKey: ["wes", filters.year],
    queryFn: () => base44.entities.WeeklyEmployeeSummary.filter({ year: filters.year }, "week_number", 500),
    ...cOpts,
  });

  // Load monthly customer summaries
  const { data: monthlyCustomer = [], isLoading: loadingMC } = useQuery({
    queryKey: ["mcs", filters.year],
    queryFn: () => base44.entities.MonthlyCustomerSummary.filter({ year: filters.year }, "month", 500),
    ...cOpts,
  });

  const isLoading = loadingWC || loadingWE || loadingMC;

  // Apply filters and compute derived data
  const computed = useMemo(() => {
    // Filter customer summaries
    let filteredWC = weeklyCustomer;
    let filteredMC = monthlyCustomer;
    let filteredWE = weeklyEmployee;

    if (filters.customerId !== "all") {
      filteredWC = filteredWC.filter((r) => r.customer_id === filters.customerId);
      filteredMC = filteredMC.filter((r) => r.customer_id === filters.customerId);
    }

    if (filters.employeeId !== "all") {
      filteredWE = filteredWE.filter((r) => r.employee_id === filters.employeeId);
    }

    if (filters.viewMode === "monthly" && filters.month !== "all") {
      const m = Number(filters.month);
      filteredMC = filteredMC.filter((r) => r.month === m);
      // For weekly: approximate — filter weeks that fall in selected month
      // A rough mapping: month M covers roughly weeks (M-1)*4+1 to M*4
      const startWeek = (m - 1) * 4 + 1;
      const endWeek = m === 12 ? 53 : m * 4 + 1;
      filteredWC = filteredWC.filter((r) => r.week_number >= startWeek && r.week_number <= endWeek);
      filteredWE = filteredWE.filter((r) => r.week_number >= startWeek && r.week_number <= endWeek);
    }

    // KPI totals (use customer data for revenue/km/trips, employee data for hours)
    const custSource = filters.viewMode === "monthly" ? filteredMC : filteredWC;
    const empSource = filteredWE;

    const totalRevenue = custSource.reduce((s, r) => s + (r.calculated_revenue || 0), 0);
    const totalHours = empSource.reduce((s, r) => s + (r.total_hours || 0), 0);
    const totalKm = custSource.reduce((s, r) => s + (r.total_km || 0), 0);
    const totalTrips = custSource.reduce((s, r) => s + (r.trip_count || 0), 0);

    // Revenue by customer (aggregated)
    const custMap = {};
    custSource.forEach((r) => {
      if (!custMap[r.customer_name]) {
        custMap[r.customer_name] = {
          name: r.customer_name,
          hour_revenue: 0, km_revenue: 0, other_revenue: 0,
          total_hours: 0, total_km: 0, trip_count: 0, calculated_revenue: 0,
        };
      }
      const c = custMap[r.customer_name];
      c.hour_revenue += r.hour_revenue || 0;
      c.km_revenue += r.km_revenue || 0;
      c.other_revenue += r.other_revenue || 0;
      c.total_hours += r.total_hours || 0;
      c.total_km += r.total_km || 0;
      c.trip_count += r.trip_count || 0;
      c.calculated_revenue += r.calculated_revenue || 0;
    });
    const revenueByCustomer = Object.values(custMap).sort((a, b) => b.calculated_revenue - a.calculated_revenue);

    // Hours trend (from employee weekly summaries)
    const hoursTrend = [];
    if (filters.viewMode === "weekly") {
      const weekMap = {};
      filteredWE.forEach((r) => {
        const w = r.week_number;
        if (!weekMap[w]) weekMap[w] = { period: `Wk ${w}`, total_hours: 0, night_hours: 0, overtime_hours: 0 };
        weekMap[w].total_hours += r.total_hours || 0;
        weekMap[w].night_hours += r.night_hours || 0;
        weekMap[w].overtime_hours += r.overtime_hours || 0;
      });
      Object.keys(weekMap).sort((a, b) => Number(a) - Number(b)).forEach((k) => hoursTrend.push(weekMap[k]));
    } else {
      // Monthly: aggregate weekly employee data by rough month
      const monthMap = {};
      filteredWE.forEach((r) => {
        const m = Math.min(12, Math.ceil(r.week_number / 4.345));
        if (!monthMap[m]) monthMap[m] = { period: `Mnd ${m}`, total_hours: 0, night_hours: 0, overtime_hours: 0 };
        monthMap[m].total_hours += r.total_hours || 0;
        monthMap[m].night_hours += r.night_hours || 0;
        monthMap[m].overtime_hours += r.overtime_hours || 0;
      });
      Object.keys(monthMap).sort((a, b) => Number(a) - Number(b)).forEach((k) => hoursTrend.push(monthMap[k]));
    }

    // Km trend
    const kmTrend = [];
    if (filters.viewMode === "weekly") {
      const weekMap = {};
      filteredWC.forEach((r) => {
        const w = r.week_number;
        if (!weekMap[w]) weekMap[w] = { period: `Wk ${w}`, total_km: 0 };
        weekMap[w].total_km += r.total_km || 0;
      });
      Object.keys(weekMap).sort((a, b) => Number(a) - Number(b)).forEach((k) => kmTrend.push(weekMap[k]));
    } else {
      const monthMap = {};
      filteredMC.forEach((r) => {
        const m = r.month;
        if (!monthMap[m]) monthMap[m] = { period: `Mnd ${m}`, total_km: 0 };
        monthMap[m].total_km += r.total_km || 0;
      });
      Object.keys(monthMap).sort((a, b) => Number(a) - Number(b)).forEach((k) => kmTrend.push(monthMap[k]));
    }

    return { totalRevenue, totalHours, totalKm, totalTrips, revenueByCustomer, hoursTrend, kmTrend };
  }, [weeklyCustomer, weeklyEmployee, monthlyCustomer, filters]);

  const years = [2025, 2026];

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          KPI-overzicht op basis van wekelijkse en maandelijkse samenvattingen
        </p>
      </div>

      <DashboardFilters
        filters={filters}
        onFilterChange={setFilters}
        customers={customers}
        employees={employees}
        years={years}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Laden...</span>
        </div>
      ) : (
        <>
          <KPICards data={{
            totalRevenue: computed.totalRevenue,
            totalHours: computed.totalHours,
            totalKm: computed.totalKm,
            totalTrips: computed.totalTrips,
          }} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueByCustomerChart data={computed.revenueByCustomer} />
            <HoursTrendChart data={computed.hoursTrend} viewMode={filters.viewMode} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KmOverviewChart data={computed.kmTrend} viewMode={filters.viewMode} />
            <CustomerRevenueTable data={computed.revenueByCustomer} />
          </div>
        </>
      )}
    </div>
  );
}