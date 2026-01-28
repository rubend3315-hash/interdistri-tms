import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Mail, Shield, User, Search, Edit, CheckSquare } from "lucide-react";
import { format } from "date-fns";

const ROLES = {
  admin: {
    label: 'Administrator',
    color: 'bg-purple-100 text-purple-700',
    description: 'Volledige toegang tot alle functies'
  },
  supervisor: {
    label: 'Supervisor',
    color: 'bg-blue-100 text-blue-700',
    description: 'Beheer en supervisie'
  },
  editor: {
    label: 'Editor',
    color: 'bg-amber-100 text-amber-700',
    description: 'Gegevens aanpassen'
  },
  user: {
    label: 'Medewerker',
    color: 'bg-slate-100 text-slate-700',
    description: 'Basis toegang'
  }
};

const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'timetracking', 'trips', 'planning', 'approvals', 'shifttime',
    'employees', 'users', 'vehicles', 'niwo', 'customers', 'projects', 'cao', 'salary', 'holidays', 'reports', 'mobile'
  ],
  supervisor: ['dashboard', 'timetracking', 'trips', 'planning', 'approvals', 'employees', 'vehicles', 'projects'],
  editor: ['dashboard', 'timetracking', 'employees', 'vehicles', 'customers', 'projects'],
  user: ['dashboard', 'timetracking', 'trips', 'mobile']
};

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

export default function UsersPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        throw new Error('Alleen admins kunnen gebruikers beheren');
      }
      return base44.entities.User.list('-created_date');
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'user'
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.users.inviteUser(data.email, data.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteDialog(false);
      setInviteData({ email: '', role: 'user' });
      alert('Uitnodiging verstuurd!');
    },
    onError: (error) => {
      alert('Fout bij uitnodigen: ' + error.message);
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }) => {
      return base44.entities.User.update(userId, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowPermissionsDialog(false);
      setSelectedUser(null);
      alert('Permissies bijgewerkt!');
    },
    onError: (error) => {
      alert('Fout bij bijwerken: ' + error.message);
    }
  });

  const handleInvite = () => {
    if (!inviteData.email) {
      alert('Vul een email adres in');
      return;
    }
    inviteUserMutation.mutate(inviteData);
  };

  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;
    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      permissions: selectedUser.permissions || []
    });
  };

  const applyRolePermissions = (role) => {
    if (!selectedUser) return;
    const permissions = ROLE_PERMISSIONS[role] || [];
    setSelectedUser({ ...selectedUser, permissions });
  };

  const togglePermission = (permissionId) => {
    if (!selectedUser) return;
    const currentPermissions = selectedUser.permissions || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(p => p !== permissionId)
      : [...currentPermissions, permissionId];
    setSelectedUser({ ...selectedUser, permissions: newPermissions });
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    return ROLES[role]?.color || 'bg-slate-100 text-slate-700';
  };

  const isUserActive = (user) => user.role !== 'inactive';

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Geen toegang</h2>
            <p className="text-red-700">Alleen administrators kunnen gebruikers beheren.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gebruikersbeheer</h1>
          <p className="text-slate-500">Beheer gebruikers, rollen en permissies</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showRoleMatrix} onOpenChange={setShowRoleMatrix}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Shield className="w-4 h-4" />
                Rol Matrix
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl">
              <RoleMatrixDialog />
            </DialogContent>
          </Dialog>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-900 hover:bg-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Gebruiker Uitnodigen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Gebruiker Uitnodigen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="gebruiker@voorbeeld.nl"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rol *</Label>
                  <Select 
                    value={inviteData.role}
                    onValueChange={(v) => setInviteData({ ...inviteData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="user">Medewerker</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Kies de standaard rol voor deze gebruiker
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Annuleren
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-900"
                    onClick={handleInvite}
                    disabled={inviteUserMutation.isPending}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {inviteUserMutation.isPending ? 'Versturen...' : 'Uitnodigen'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Over gebruikersbeheer</p>
              <p className="text-blue-700">
                Beheer gebruikers met rollen en granulaire permissies. Klik op "Rol Matrix" om alle rollen en hun permissies in te zien.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & View Mode */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Zoek op naam of email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'cards' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Kaarten
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Tabel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : filteredUsers.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Geen gebruikers gevonden</p>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Naam</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Rol</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Aangemaakt</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{user.full_name || 'Naamloos'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleBadge(user.role)}>
                        {ROLES[user.role]?.label || user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        {isUserActive(user) ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="text-xs text-emerald-700">Actief</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-slate-300 rounded-full" />
                            <span className="text-xs text-slate-500">Inactief</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {user.created_date ? format(new Date(user.created_date), 'dd-MM-yyyy') : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPermissions(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-900/10 p-2 rounded-lg">
                      <User className="w-5 h-5 text-blue-900" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {user.full_name || 'Naamloos'}
                      </CardTitle>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge className={getRoleBadge(user.role)}>
                    {ROLES[user.role]?.label || user.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-600">
                  <span className="text-slate-500">Aangemaakt:</span>{' '}
                  {user.created_date ? format(new Date(user.created_date), 'dd-MM-yyyy') : '-'}
                </div>
                {user.role !== 'admin' && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-slate-500">
                      {user.permissions?.length || 0} permissies
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPermissions(user)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Permissies
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissies beheren - {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-700">
                <strong>Rol sjablonen:</strong> Klik op een rol om snel alle permissies in te stellen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {['supervisor', 'editor', 'user'].map(role => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => applyRolePermissions(role)}
                  className="justify-start"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {ROLES[role].label}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Modules per categorie</Label>
              {['Basis', 'Beheer', 'Rapportage', 'Admin'].map(category => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.filter(p => p.category === category).map(permission => (
                      <label
                        key={permission.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedUser?.permissions?.includes(permission.id)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUser?.permissions?.includes(permission.id) || false}
                          onChange={() => togglePermission(permission.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                          selectedUser?.permissions?.includes(permission.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200'
                        }`}>
                          {selectedUser?.permissions?.includes(permission.id) && '✓'}
                        </div>
                        <span className="text-sm">{permission.label}</span>
                      </label>
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
                  setShowPermissionsDialog(false);
                  setSelectedUser(null);
                }}
              >
                Annuleren
              </Button>
              <Button
                className="flex-1 bg-blue-900"
                onClick={handleSavePermissions}
                disabled={updatePermissionsMutation.isPending}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {updatePermissionsMutation.isPending ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleMatrixDialog() {
  const roleOrder = ['admin', 'supervisor', 'editor', 'user'];
  const categories = ['Basis', 'Beheer', 'Rapportage', 'Admin'];
  
  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>Rol-based Permissie Matrix</DialogTitle>
      </DialogHeader>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {roleOrder.map(role => (
          <div key={role} className={`p-2 rounded-lg border-2 text-center ${ROLES[role].color.replace('text-', 'border-').replace('bg-', 'bg-').split(' ')[0]} bg-opacity-10`}>
            <p className="font-semibold text-xs">{ROLES[role].label}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {ROLE_PERMISSIONS[role].length}/{ALL_PERMISSIONS.length}
            </p>
          </div>
        ))}
      </div>

      {/* Matrix by Category */}
      <div className="space-y-3">
        {categories.map(category => {
          const categoryPerms = ALL_PERMISSIONS.filter(p => p.category === category);
          return (
            <div key={category} className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                {category}
              </h3>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {categoryPerms.map(perm => (
                      <tr key={perm.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2 text-slate-700 font-medium text-xs min-w-28">{perm.label}</td>
                        {roleOrder.map(role => (
                          <td key={role} className="py-2 px-1 text-center">
                            {ROLE_PERMISSIONS[role]?.includes(perm.id) ? (
                              <div className="flex justify-center">
                                <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center border border-emerald-300">
                                  <span className="text-emerald-700 font-bold">✓</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200">
                                  <span className="text-slate-300">−</span>
                                </div>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-100 rounded-md border border-emerald-300 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 text-xs font-bold">✓</span>
          </div>
          <span className="text-xs text-slate-600">Toegang</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-300 text-xs">−</span>
          </div>
          <span className="text-xs text-slate-600">Geen toegang</span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
        <p className="text-xs font-medium text-slate-900 mb-1">💡 Rol Overzicht</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-slate-700">
          <div><strong>Admin:</strong> Volledige controle</div>
          <div><strong>Supervisor:</strong> Beheer & supervisie</div>
          <div><strong>Editor:</strong> Gegevens beheren</div>
          <div><strong>User:</strong> Basis functies</div>
        </div>
      </div>
    </div>
  );
}