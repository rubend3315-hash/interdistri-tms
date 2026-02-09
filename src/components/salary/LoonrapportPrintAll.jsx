import React, { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, FileDown, Loader2 } from "lucide-react";
import LoonrapportPrintItem from "./LoonrapportPrintItem";
import { format } from "date-fns";

export default function LoonrapportPrintAll({
  year, selectedPeriode, periodes, employees, timeEntries, holidays, salaryTables
}) {
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef(null);

  const activeEmployees = useMemo(() =>
    employees
      .filter(e => e.status === "Actief" && e.department !== "Charters")
      .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "")),
    [employees]
  );

  const currentPeriode = periodes.find(p => p.periode === selectedPeriode) || periodes[0];
  const today = format(new Date(), "dd-MM-yyyy");
  const fileName = `loonrapport_periode-${String(selectedPeriode).padStart(2, "0")}_${today}`;

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      const printContent = printRef.current;
      if (!printContent) return;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; }
              @media print {
                .print-report-item { page-break-after: always; }
                .print-report-item:last-child { page-break-after: avoid; }
              }
              @page { margin: 10mm; }
              table { width: 100%; border-collapse: collapse; }
              td { vertical-align: top; }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setShowPreview(false);
      }, 500);
    }, 300);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="w-4 h-4 mr-1" />
        Print alle rapporten
      </Button>

      {/* Hidden render container */}
      {showPreview && (
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          <div ref={printRef}>
            {activeEmployees.map(emp => (
              <LoonrapportPrintItem
                key={emp.id}
                employee={emp}
                year={year}
                selectedPeriode={selectedPeriode}
                periodes={periodes}
                timeEntries={timeEntries}
                holidays={holidays}
                salaryTables={salaryTables}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}