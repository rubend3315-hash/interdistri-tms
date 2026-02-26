import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import SnapshotOverview from "../components/rbac-audit/SnapshotOverview";
import RoleChangeDetector from "../components/rbac-audit/RoleChangeDetector";
import InvariantWarnings from "../components/rbac-audit/InvariantWarnings";
import IntegrityReports from "../components/rbac-audit/IntegrityReports";
import MonitoringPolicy from "../components/rbac-audit/MonitoringPolicy";
import SubmissionLogs from "../components/rbac-audit/SubmissionLogs";
import PerformanceTab from "../components/rbac-audit/PerformanceTab";

export default function RBACAudit({ currentUser }) {
  // Audit log: track dashboard view
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      base44.entities.AuditLog.create({
        action_type: 'login',
        category: 'Security',
        description: 'Viewed RBAC Audit Dashboard',
        performed_by_email: currentUser.email,
        performed_by_name: currentUser.full_name,
        performed_by_role: currentUser.role,
        metadata: { page: 'RBACAudit', timestamp: new Date().toISOString() }
      }).catch(() => {}); // fire-and-forget
    }
  }, [currentUser?.id]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Geen toegang</h2>
            <p className="text-red-700">Deze pagina is alleen beschikbaar voor administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-xl">
          <Shield className="w-6 h-6 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">RBAC Audit Dashboard</h1>
          <p className="text-sm text-slate-500">Read-only overzicht van user roles, snapshots en RBAC beslissingen</p>
        </div>
      </div>

      <Tabs defaultValue="snapshots" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
          <TabsTrigger value="changes">Wijzigingen</TabsTrigger>
          <TabsTrigger value="invariants">Invariants</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots">
          <SnapshotOverview />
        </TabsContent>

        <TabsContent value="changes">
          <RoleChangeDetector />
        </TabsContent>

        <TabsContent value="integrity">
          <IntegrityReports currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="invariants">
          <InvariantWarnings />
        </TabsContent>

        <TabsContent value="submissions">
          <SubmissionLogs />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>

        <TabsContent value="policy">
          <MonitoringPolicy />
        </TabsContent>
      </Tabs>
    </div>
  );
}