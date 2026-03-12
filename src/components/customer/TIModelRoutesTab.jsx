import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, Edit2, Check, Power, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import TIModelRouteForm from "./TIModelRouteForm";

export default function TIModelRoutesTab({ customerId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
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

  const handleSubmit = async (data) => {
    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data });
    } else {
      // Bij nieuwe rit: zoek bestaande actieve rit met zelfde route_code
      // en stel automatisch de end_date in op de dag vóór de start_date van de nieuwe rit
      if (data.start_date && data.route_code) {
        const existingActive = routes.filter(
          r => r.route_code === data.route_code && r.is_active && !r.end_date
        );
        for (const existing of existingActive) {
          const newStart = new Date(data.start_date);
          const dayBefore = new Date(newStart);
          dayBefore.setDate(dayBefore.getDate() - 1);
          const endDateStr = dayBefore.toISOString().split('T')[0];
          await base44.entities.TIModelRoute.update(existing.id, { end_date: endDateStr });
        }
      }
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

  const filteredRoutes = statusFilter === "active"
    ? routes.filter(r => r.is_active !== false)
    : statusFilter === "inactive"
      ? routes.filter(r => r.is_active === false)
      : routes;

  const avgNormValue = filteredRoutes.length > 0
    ? (filteredRoutes.reduce((sum, r) => sum + (r.calculated_norm_per_hour || 0), 0) / filteredRoutes.length)
    : 0;

  const totalStops = filteredRoutes.reduce((sum, r) => sum + (r.number_of_stops || 0), 0);
  const totalParcels = filteredRoutes.reduce((sum, r) => sum + (r.number_of_parcels || 0), 0);

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const m = 12;
    let y = 12;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("TI Model Ritten Rapportage", m, y);
    y += 6;

    // Date
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(`Gegenereerd: ${new Date().toLocaleDateString('nl-NL')}`, m, y);
    y += 8;

    // Summary
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Samenvatting", m, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(`Totaal ritten: ${routes.length}`, m, y);
    doc.text(`Gemiddelde norm/uur: ${avgNormValue.toFixed(2)}`, 120, y);
    y += 4;
    doc.text(`Totaal stops: ${totalStops}`, m, y);
    doc.text(`Gemiddelde norm/besteluur: ${(totalStops / Math.max(routes.length, 1)).toFixed(2)}`, 120, y);
    y += 4;
    doc.text(`Totaal stuks: ${totalParcels}`, m, y);
    y += 8;

    // Table setup
    const cols = [
      { w: 11, label: "Ritcode", key: "route_code" },
      { w: 25, label: "Ritnaam", key: "route_name" },
      { w: 12, label: "Rittijd (u)", key: "total_time_hours" },
      { w: 13, label: "Rittijd (HH:MM)", key: "total_time_hhmm" },
      { w: 10, label: "Stops", key: "number_of_stops" },
      { w: 10, label: "Stuks", key: "number_of_parcels" },
      { w: 10, label: "Norm/uur", key: "calculated_norm_per_hour" },
      { w: 12, label: "Norm/besteluur", key: "manual_norm_per_hour" },
      { w: 10, label: "Periode", key: "start_date" },
    ];

    const hH = 6;
    const rH = 5;

    // Draw header
    doc.setFillColor(47, 67, 132);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(8);

    let x = m;
    for (const col of cols) {
      doc.rect(x, y, col.w, hH, "F");
      doc.text(col.label, x + 0.5, y + 3.8);
      x += col.w;
    }
    y += hH;

    // Data rows
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    routes.forEach((route, idx) => {
      if (y + rH > 200) {
        doc.addPage();
        y = 15;
        
        doc.setFillColor(47, 67, 132);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "bold");
        doc.setFontSize(8);
        x = m;
        for (const col of cols) {
          doc.rect(x, y, col.w, hH, "F");
          doc.text(col.label, x + 0.5, y + 3.8);
          x += col.w;
        }
        y += hH;
        doc.setFont(undefined, "normal");
        doc.setTextColor(0, 0, 0);
      }

      // Row background
      if (idx % 2 === 0) {
        doc.setFillColor(242, 242, 242);
        x = m;
        for (const col of cols) {
          doc.rect(x, y, col.w, rH, "F");
          x += col.w;
        }
      }

      // Row borders
      doc.setDrawColor(220, 220, 220);
      x = m;
      for (const col of cols) {
        doc.rect(x, y, col.w, rH);
        x += col.w;
      }

      // Row data
      doc.setTextColor(0, 0, 0);
      x = m;
      for (const col of cols) {
        let val = route[col.key] || "";
        if (typeof val === "number") val = val.toFixed(2);
        doc.text(String(val), x + 0.5, y + 3.5);
        x += col.w;
      }
      y += rH;
    });

    doc.save("ti-model-ritten.pdf");
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
                [...routes].sort((a, b) => {
                  const codeA = parseInt((a.route_code || '0').replace(/^0+/, '')) || 0;
                  const codeB = parseInt((b.route_code || '0').replace(/^0+/, '')) || 0;
                  return codeA - codeB;
                }).map((route) => (
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
                      {route.end_date && (
                        <span className="text-slate-400"> t/m {new Date(route.end_date).toLocaleDateString("nl-NL")}</span>
                      )}
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