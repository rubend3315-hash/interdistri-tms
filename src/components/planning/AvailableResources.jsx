import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, MapPin } from "lucide-react";

export default function AvailableResources({
  employees = [],
  vehicles = [],
  routes = [],
  schedules = [],
  currentWeek = null
}) {
  // Get all scheduled employees, vehicles, and routes for the current week
  const scheduledEmployeeIds = new Set();
  const scheduledVehicleIds = new Set();
  const scheduledRouteIds = new Set();

  schedules.forEach(schedule => {
    if (schedule.week_number === currentWeek) {
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      dayKeys.forEach(day => {
        if (schedule[day] && schedule[day] !== '-' && schedule[day] !== 'Vrij') {
          scheduledEmployeeIds.add(schedule.employee_id);
          if (schedule[`${day}_vehicle_id`]) {
            scheduledVehicleIds.add(schedule[`${day}_vehicle_id`]);
          }
          if (schedule[`${day}_route_id`]) {
            scheduledRouteIds.add(schedule[`${day}_route_id`]);
          }
        }
      });
    }
  });

  const availableEmployees = employees.filter(e => !scheduledEmployeeIds.has(e.id) && e.status === 'Actief');
  const availableVehicles = vehicles.filter(v => !scheduledVehicleIds.has(v.id) && (v.status === 'Beschikbaar' || v.status === 'In onderhoud'));
  const availableRoutes = routes.filter(r => !scheduledRouteIds.has(r.id) && r.is_active);

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-emerald-600">✓</span> Beschikbare resources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Beschikbare Medewerkers */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-slate-900">
                Medewerkers ({availableEmployees.length})
              </h3>
            </div>
            {availableEmployees.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableEmployees.slice(0, 6).map(emp => (
                  <Badge
                    key={emp.id}
                    className="bg-blue-100 text-blue-700 border-blue-200 text-xs cursor-default"
                  >
                    {emp.first_name.substring(0, 1)}. {emp.last_name}
                  </Badge>
                ))}
                {availableEmployees.length > 6 && (
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    +{availableEmployees.length - 6}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Geen beschikbare medewerkers</p>
            )}
          </div>

          {/* Beschikbare Voertuigen */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-sm text-slate-900">
                Voertuigen ({availableVehicles.length})
              </h3>
            </div>
            {availableVehicles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableVehicles.slice(0, 6).map(veh => (
                  <Badge
                    key={veh.id}
                    className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs cursor-default"
                  >
                    {veh.license_plate}
                  </Badge>
                ))}
                {availableVehicles.length > 6 && (
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    +{availableVehicles.length - 6}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Geen beschikbare voertuigen</p>
            )}
          </div>

          {/* Beschikbare Routes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-sm text-slate-900">
                Routes ({availableRoutes.length})
              </h3>
            </div>
            {availableRoutes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableRoutes.slice(0, 6).map(route => (
                  <Badge
                    key={route.id}
                    className="bg-orange-100 text-orange-700 border-orange-200 text-xs cursor-default"
                  >
                    {route.route_code}
                  </Badge>
                ))}
                {availableRoutes.length > 6 && (
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    +{availableRoutes.length - 6}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Geen beschikbare routes</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}