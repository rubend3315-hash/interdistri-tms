import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Power, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RouteForm from "./RouteForm";

export default function RoutesTab({ customerId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const queryClient = useQueryClient();

  const { data: routes = [] } = useQuery({
    queryKey: ["routes", customerId],
    queryFn: () => base44.entities.Route.filter({ customer_id: customerId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Route.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", customerId] });
      setShowForm(false);
      setEditingRoute(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Route.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", customerId] });
      setShowForm(false);
      setEditingRoute(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Route.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes", customerId] });
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

  return (
    <div className="space-y-4">
      {/* Header with Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">Ritten</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Rit
        </Button>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Begindatum</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Einddatum</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Opmerkingen</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
                    <td className="px-4 py-3 text-slate-700">
                      {route.start_date ? new Date(route.start_date).toLocaleDateString("nl-NL") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {route.end_date ? new Date(route.end_date).toLocaleDateString("nl-NL") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                      {route.notes || "-"}
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
          <RouteForm
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