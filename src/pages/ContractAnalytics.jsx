import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

import ContractTypeChart from "../components/analytics/ContractTypeChart";
import ContractDurationStats from "../components/analytics/ContractDurationStats";
import ExpiringContracts from "../components/analytics/ExpiringContracts";
import ProeftijdStats from "../components/analytics/ProeftijdStats";
import TemplateUsage from "../components/analytics/TemplateUsage";
import EmployeeContractOverview from "../components/analytics/EmployeeContractOverview";

export default function ContractAnalytics() {
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts-analytics'],
    queryFn: () => base44.entities.Contract.list('-created_date', 500)
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-analytics'],
    queryFn: () => base44.entities.Employee.list()
  });

  const isLoading = loadingContracts || loadingEmployees;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Contract Analytics
        </h1>
        <p className="text-slate-500 mt-1">Inzicht in contractgegevens, ketenregeling en proeftijden</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContractTypeChart contracts={contracts} />
        <ContractDurationStats contracts={contracts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringContracts contracts={contracts} employees={employees} />
        <ProeftijdStats contracts={contracts} />
      </div>

      <TemplateUsage contracts={contracts} />

      <EmployeeContractOverview contracts={contracts} employees={employees} />
    </div>
  );
}