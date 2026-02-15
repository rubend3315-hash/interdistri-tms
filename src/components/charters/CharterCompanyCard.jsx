import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Pencil, Trash2, Phone, Mail } from "lucide-react";

export default function CharterCompanyCard({ company, employees, onEdit, onDelete }) {
  const companyEmployees = employees.filter(e => e.charter_company_id === company.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{company.company_name}</CardTitle>
              <Badge className={company.status === "Actief" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                {company.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(company)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(company)} className="text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {company.contact_person && (
          <p className="text-sm text-slate-600">{company.contact_person}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {company.phone && (
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{company.phone}</span>
          )}
          {company.email && (
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{company.email}</span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {companyEmployees.length} chauffeur{companyEmployees.length !== 1 ? 's' : ''}
          </span>
        </div>
        {companyEmployees.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {companyEmployees.map(emp => (
              <Badge key={emp.id} variant="outline" className="text-xs">
                {emp.first_name} {emp.last_name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}