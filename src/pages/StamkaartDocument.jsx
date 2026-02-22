import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import StamkaartPrintView from "@/components/stamkaart/StamkaartPrintView";

/**
 * StamkaartDocument — schone documentweergave zonder navigatie, knoppen of app-header.
 * Bedoeld als officieel document voor printen/PDF en als bijlage voor loonadministratie.
 * Wordt buiten de Layout gerenderd (zie Layout.js bypass).
 * 
 * URL params: ?id=<employee_id>
 */
export default function StamkaartDocument() {
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get("id");

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['stamkaart_document', employeeId],
    queryFn: async () => {
      const results = await base44.entities.Employee.filter({ id: employeeId });
      return results[0] || null;
    },
    enabled: !!employeeId,
  });

  if (!employeeId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Geen medewerker opgegeven.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Document laden...</p>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Medewerker niet gevonden.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '20px 0' }}>
      <style>{`
        @page { margin: 10mm; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body, html { margin: 0; padding: 0; background: #fff; }
        }
        body { background: #fff !important; }
      `}</style>
      <StamkaartPrintView employee={employee} />
    </div>
  );
}