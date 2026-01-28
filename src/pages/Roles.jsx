import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Edit, Save, X, AlertCircle } from "lucide-react";

const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', category: 'Basis' },
  { id: 'timetracking', label: 'Tijdregistratie', category: 'Basis' },
  { id: 'trips', label: 'Ritten', category: 'Basis' },
  { id: 'planning', label: 'Planning', category: 'Basis' },
  { id: 'approvals', label: 'Goedkeuringen', category: 'Beheer' },
  { id: 'shifttime', label: 'Dienst-Shifttijd', category: 'Beheer' },
  { id: 'employees', label: 'Medewerkers', category: 'Beheer' },
  { id: 'users', label: 'Gebruikers', category: 'Admin' },
  { id: 'vehicles', label: 'Voertuigen', category: 'Beheer' },
  { id: 'niwo', label: 'NIWO Vergunningen', category: 'Beheer' },
  { id: 'customers', label: 'Klanten', category: 'Beheer' },
  { id: 'projects', label: 'Projecten', category: 'Beheer' },
  { id: 'cao', label: 'CAO-regels', category: 'Admin' },
  { id: 'salary', label: 'Loontabellen', category: 'Admin' },
  { id: 'holidays', label: 'Feestdagen', category: 'Admin' },
  { id: 'reports', label: 'Loonrapporten', category: 'Rapportage' },
  { id: 'mobile', label: 'Mobiele App', category: 'Basis' }
];

export default function RolesPage() {
  const [editingRole, setEditingRole] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list('-created_date')
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, data }) => {
      return base44.entities.Role.update(roleId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDialog(false);
      setEditingRole(null);
      alert('Rol bijgewerkt!');
    }
  });

  const handleEditRole = (role) => {
    setEditingRole({ ...role });
    setShowDialog(true);
  };

  const handleSaveRole = () => {
    if (!editingRole || !editingRole.id) return;
    updateRoleMutation.mutate({
      roleId: editingRole.id,
      data: {
        label: editingRole.label,
        description: editingRole.description,
        permissions: editingRole.permissions || []
      }
    });
  };

  const togglePermission = (permissionId) => {
    if (!editingRole) return;
    const perms = editingRole.permissions || [];
    setEditingRole({
      ...editingRole,
      permissions: perms.includes(permissionId)
        ? perms.filter(p => p !== permissionId)
        : [...perms, permissionId]
    });
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Geen toegang</h2>
            <p className="text-red-700">Alleen administrators kunnen rollen beheren.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Rollenbeheer</h1>
        <p className="text-slate-500">Beheer rollen en hun permissies</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{role.label}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                  </div>
                  <Dialog open={showDialog && editingRole?.id === role.id} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRole(role)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Bewerken
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Rol bewerken - {editingRole?.label}</DialogTitle>
                      </DialogHeader>
                      {editingRole && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Rolnaam</Label>
                            <Input
                              value={editingRole.label}
                              onChange={(e) => setEditingRole({ ...editingRole, label: e.target.value })}
                              disabled={editingRole.is_system}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Beschrijving</Label>
                            <Textarea
                              value={editingRole.description}
                              onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-base font-semibold">Permissies</Label>
                            {['Basis', 'Beheer', 'Rapportage', 'Admin'].map(category => (
                              <div key={category} className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-700">{category}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {ALL_PERMISSIONS.filter(p => p.category === category).map(permission => (
                                    <div key={permission.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={permission.id}
                                        checked={editingRole.permissions?.includes(permission.id) || false}
                                        onCheckedChange={() => togglePermission(permission.id)}
                                      />
                                      <label htmlFor={permission.id} className="text-sm cursor-pointer">
                                        {permission.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setShowDialog(false);
                                setEditingRole(null);
                              }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Annuleren
                            </Button>
                            <Button
                              className="flex-1 bg-blue-900"
                              onClick={handleSaveRole}
                              disabled={updateRoleMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {updateRoleMutation.isPending ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    <strong>Permissies:</strong> {role.permissions?.length || 0} van {ALL_PERMISSIONS.length}
                  </p>
                  {role.is_system && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                      Systeemrol
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}