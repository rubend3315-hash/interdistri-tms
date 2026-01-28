import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, Edit2, Check, Power } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import TIModelRouteForm from "./TIModelRouteForm";

export default function TIModelRoutesTab({ customerId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const queryClient = useQueryClient();

  const { data: routes = [] } = useQuery({
    queryKey: ["ti_model_routes", customerId],
    queryFn: () => base44.entities.TIModelRoute.filter({ customer_id: customerId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TIModelRoute.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ti_model_routes", customerId] });
      setShowForm(false);
      setEditingRoute(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TIModelRoute.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ti_model_routes", customerId] });
      setShowForm(false);
      setEditingRoute(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TIModelRoute.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ti_model_routes", customerId] });
    },
  });

  const handleSubmit = (data) => {
    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data });
    } else {
      createMutation.mutate({ ...data, customer_id: customerId });
    }
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setShowForm(true);
  };

  const handleToggleStatus = (route) => {
   toggleStatusMutation.mutate({ id: route.id, is_active: !route.is_active });
  };

  const avgNormValue = routes.length > 0
    ? (routes.reduce((sum, r) => sum + (r.calculated_norm_per_hour || 0), 0) / routes.length)
    : 0;

  const totalStops = routes.reduce((sum, r) => sum + (r.number_of_stops || 0), 0);
  const totalParcels = routes.reduce((sum, r) => sum + (r.number_of_parcels || 0), 0);

  const exportToPDF = async () => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 12;
    const leftMargin = 15;

    // Title
    pdf.setFontSize(22);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("TI Model Ritten Rapportage", leftMargin, yPos);
    yPos += 8;

    // Generated date
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    const generatedDate = new Date().toLocaleDateString('nl-NL');
    pdf.text(`Gegenereerd: ${generatedDate}`, leftMargin, yPos);
    yPos += 10;

    // Samenvatting title
    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Samenvatting", leftMargin, yPos);
    yPos += 6;

    // Summary stats - two columns
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    const col1X = leftMargin;
    const col2X = 110;

    pdf.text(`Totaal ritten: ${routes.length}`, col1X, yPos);
    pdf.text(`Gemiddelde norm/uur: ${avgNormValue.toFixed(2)}`, col2X, yPos);
    yPos += 5;

    pdf.text(`Totaal stops: ${totalStops}`, col1X, yPos);
    pdf.text(`Gemiddelde norm/besteluur: ${(totalStops / Math.max(routes.length, 1)).toFixed(2)}`, col2X, yPos);
    yPos += 5;

    pdf.text(`Totaal stuks: ${totalParcels}`, col1X, yPos);
    yPos += 10;

    // Table configuration
    const tableColumns = [
      { header: "Ritcode", key: "route_code", width: 11 },
      { header: "Ritnaam", key: "route_name", width: 26 },
      { header: "Rittijd (u)", key: "total_time_hours", width: 13 },
      { header: "Rittijd (HH:MM)", key: "total_time_hhmm", width: 15 },
      { header: "Stops", key: "number_of_stops", width: 9 },
      { header: "Stuks", key: "number_of_parcels", width: 9 },
      { header: "Norm/uur", key: "calculated_norm_per_hour", width: 11 },
      { header: "Norm/besteluur", key: "manual_norm_per_hour", width: 13 },
      { header: "Periode", key: "start_date", width: 11 },
    ];

    const headerH = 7;
    const rowH = 6;
    let tableY = yPos;
    const tableX = leftMargin;

    // Draw header
    pdf.setFillColor(34, 47, 102);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(9);

    let xOffset = tableX;
    tableColumns.forEach(col => {
      pdf.rect(xOffset, tableY, col.width, headerH, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(col.header, xOffset + 1, tableY + 4.5);
      xOffset += col.width;
    });
    tableY += headerH;

    // Draw rows
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);

    routes.forEach((route, idx) => {
      // Check if need new page
      if (tableY + rowH > pageHeight - 10) {
        pdf.addPage();
        tableY = 15;
        
        // Redraw header
        pdf.setFillColor(34, 47, 102);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(9);
        xOffset = tableX;
        tableColumns.forEach(col => {
          pdf.rect(xOffset, tableY, col.width, headerH, "F");
          pdf.text(col.header, xOffset + 1, tableY + 4.5);
          xOffset += col.width;
        });
        tableY += headerH;
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(0, 0, 0);
      }

      // Draw row background (alternating)
      if (idx % 2 === 1) {
        pdf.setFillColor(240, 243, 248);
        xOffset = tableX;
        tableColumns.forEach(col => {
          pdf.rect(xOffset, tableY, col.width, rowH, "F");
          xOffset += col.width;
        });
      }

      // Draw row borders
      pdf.setDrawColor(200, 200, 200);
      xOffset = tableX;
      tableColumns.forEach(col => {
        pdf.rect(xOffset, tableY, col.width, rowH);
        xOffset += col.width;
      });

      // Draw row data
      pdf.setTextColor(0, 0, 0);
      xOffset = tableX;
      tableColumns.forEach(col => {
        let val = route[col.key] || "";
        if (typeof val === "number") val = val.toFixed(2);
        pdf.text(String(val), xOffset + 0.8, tableY + 4);
        xOffset += col.width;
      });
      tableY += rowH;
    });

    pdf.save("ti-model-ritten.pdf");
  };

  const avgNorm = avgNormValue.toFixed(2);
  const activeRoutes = routes.filter(r => r.is_active);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-slate-600 mb-1">Totaal ritten</p>
          <p className="text-2xl font-bold text-slate-900">{routes.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-slate-600 mb-1">Totaal stops</p>
          <p className="text-2xl font-bold text-slate-900">{totalStops}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-slate-600 mb-1">Totaal stuks</p>
          <p className="text-2xl font-bold text-slate-900">{totalParcels}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-slate-600 mb-1">Gem. norm/uur</p>
          <p className="text-2xl font-bold text-slate-900">{avgNorm}</p>
        </div>
      </div>

      {/* Header with Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">TI Model Ritten</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Rit
          </Button>
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ritcode</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ritnaam</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Rittijd (uren)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Rittijd (HH:MM)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Stops</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Stuks</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Berekende norm/uur</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Norm/besteluur</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Periode</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    Geen ritten gevonden
                  </td>
                </tr>
              ) : (
                routes.map((route) => (
                  <tr key={route.id} className={`border-b hover:bg-slate-50 ${!route.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${route.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {route.is_active ? <Check className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                        {route.is_active ? 'Actief' : 'Inactief'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{route.route_code}</td>
                    <td className="px-4 py-3 text-slate-700">{route.route_name}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{route.total_time_hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{route.total_time_hhmm}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{route.number_of_stops}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{route.number_of_parcels}</td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">
                      {route.calculated_norm_per_hour?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {route.manual_norm_per_hour?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      {route.start_date && new Date(route.start_date).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(route)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(route)}
                          className={route.is_active ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}
                          title={route.is_active ? "Inactiveren" : "Activeren"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Rit bewerken" : "Nieuwe Rit"}</DialogTitle>
          </DialogHeader>
          <TIModelRouteForm
            route={editingRoute}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingRoute(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}