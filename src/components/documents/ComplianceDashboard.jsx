import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, XCircle, Shield, Users, ChevronRight } from "lucide-react";
import { differenceInDays } from "date-fns";

// Required document types per department
const REQUIRED_DOCS = {
  Transport: ["Rijbewijs", "Code 95", "Identiteitsbewijs", "Arbeidsovereenkomst", "Tachograafkaart"],
  PakketDistributie: ["Rijbewijs", "Identiteitsbewijs", "Arbeidsovereenkomst"],
  Charters: ["Rijbewijs", "Code 95", "Identiteitsbewijs", "Arbeidsovereenkomst", "Tachograafkaart", "ADR Certificaat"],
  Management: ["Identiteitsbewijs", "Arbeidsovereenkomst"],
};

export default function ComplianceDashboard({ documents, employees }) {
  const [deptFilter, setDeptFilter] = useState("all");

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === "Actief"), [employees]);

  const filteredEmployees = useMemo(() =>
    deptFilter === "all" ? activeEmployees : activeEmployees.filter(e => e.department === deptFilter),
    [activeEmployees, deptFilter]);

  const complianceData = useMemo(() => {
    const today = new Date();
    return filteredEmployees.map(emp => {
      const dept = emp.department || "Management";
      const required = REQUIRED_DOCS[dept] || REQUIRED_DOCS.Management;
      const empDocs = documents.filter(d => d.linked_employee_id === emp.id && d.status !== "Gearchiveerd");

      const docStatus = required.map(docType => {
        const doc = empDocs.find(d => d.document_type === docType);
        if (!doc) return { type: docType, status: "missing", doc: null };
        if (doc.status === "Verlopen") return { type: docType, status: "expired", doc };
        if (doc.expiry_date) {
          const days = differenceInDays(new Date(doc.expiry_date), today);
          if (days < 0) return { type: docType, status: "expired", doc };
          if (days <= 30) return { type: docType, status: "expiring", doc, daysLeft: days };
        }
        return { type: docType, status: "valid", doc };
      });

      const valid = docStatus.filter(d => d.status === "valid").length;
      const score = required.length > 0 ? Math.round((valid / required.length) * 100) : 100;

      return {
        employee: emp,
        department: dept,
        required,
        docStatus,
        score,
        missing: docStatus.filter(d => d.status === "missing").length,
        expired: docStatus.filter(d => d.status === "expired").length,
        expiring: docStatus.filter(d => d.status === "expiring").length,
      };
    }).sort((a, b) => a.score - b.score);
  }, [filteredEmployees, documents]);

  const overallStats = useMemo(() => {
    const total = complianceData.length;
    const fullyCompliant = complianceData.filter(c => c.score === 100).length;
    const withIssues = complianceData.filter(c => c.missing > 0 || c.expired > 0).length;
    const avgScore = total > 0 ? Math.round(complianceData.reduce((s, c) => s + c.score, 0) / total) : 0;
    return { total, fullyCompliant, withIssues, avgScore };
  }, [complianceData]);

  const departments = [...new Set(activeEmployees.map(e => e.department).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallStats.avgScore}%</p>
              <p className="text-xs text-slate-500">Gem. compliance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallStats.fullyCompliant}</p>
              <p className="text-xs text-slate-500">Volledig compliant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallStats.withIssues}</p>
              <p className="text-xs text-slate-500">Met problemen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallStats.total}</p>
              <p className="text-xs text-slate-500">Medewerkers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Alle afdelingen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afdelingen</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Employee Compliance List */}
      <div className="space-y-3">
        {complianceData.map(({ employee, department, docStatus, score, missing, expired, expiring }) => (
          <Card key={employee.id} className={score < 50 ? "border-red-200" : score < 100 ? "border-amber-200" : "border-green-200"}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                {/* Employee info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{employee.first_name} {employee.prefix ? employee.prefix + ' ' : ''}{employee.last_name}</span>
                    <Badge variant="outline" className="text-xs">{department}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {missing > 0 && <span className="text-red-600 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />{missing} ontbrekend</span>}
                    {expired > 0 && <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{expired} verlopen</span>}
                    {expiring > 0 && <span className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{expiring} verloopt binnenkort</span>}
                    {missing === 0 && expired === 0 && expiring === 0 && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Alles in orde</span>}
                  </div>
                </div>

                {/* Score bar */}
                <div className="w-32">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${score === 100 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              </div>

              {/* Document chips */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {docStatus.map(({ type, status, daysLeft }) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className={
                      status === "valid" ? "bg-green-50 text-green-700 border-green-200" :
                      status === "expiring" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      status === "expired" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-slate-50 text-slate-500 border-slate-200 border-dashed"
                    }
                  >
                    {status === "valid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {status === "expiring" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {status === "expired" && <XCircle className="w-3 h-3 mr-1" />}
                    {status === "missing" && <XCircle className="w-3 h-3 mr-1" />}
                    {type}
                    {status === "expiring" && daysLeft !== undefined && ` (${daysLeft}d)`}
                    {status === "missing" && " — ontbreekt"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {complianceData.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            Geen medewerkers gevonden.
          </div>
        )}
      </div>
    </div>
  );
}