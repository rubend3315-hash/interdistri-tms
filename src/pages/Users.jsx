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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Mail, Shield, User, Search, Edit, CheckSquare, Save, X, ExternalLink, Link2 } from "lucide-react";
import { format } from "date-fns";
import { logAuditEvent } from "../components/utils/auditLogger";
import UserEmployeeLinkTab from "../components/users/UserEmployeeLinkTab";

const ROLES = {
  admin: {
    label: 'Administrator',
    color: 'bg-purple-100 text-purple-700',
    description: 'Volledige toegang tot alle functies'
  },
  user: {
    label: 'Medewerker',
    color: 'bg-slate-100 text-slate-700',
    description: 'Toegang op basis van toegewezen permissies'
  }
};

const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'timetracking', 'trips', 'planning', 'approvals', 'shifttime',
    'employees', 'users', 'vehicles', 'niwo', 'customers', 'projects', 'cao', 
    'salary', 'holidays', 'reports', 'mobile', 'messages', 'charters', 
    'hrmsettings', 'documents', 'contracts', 'hrimport'
  ],
  user: ['dashboard', 'timetracking', 'trips', 'mobile']
};

const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', category: 'Basis' },
  { id: 'timetracking', label: 'Tijdregistratie', category: 'Basis' },
  { id: 'trips', label: 'Ritten', category: 'Basis' },
  { id: 'mobile', label: 'Mobiele App', category: 'Basis' },
  { id: 'planning', label: 'Planning', category: 'Beheer' },
  { id: 'approvals', label: 'Goedkeuringen', category: 'Beheer' },
  { id: 'shifttime', label: 'Dienst-Shifttijd', category: 'Beheer' },
  { id: 'employees', label: 'Medewerkers', category: 'Beheer' },
  { id: 'vehicles', label: 'Voertuigen', category: 'Beheer' },
  { id: 'niwo', label: 'NIWO Vergunningen', category: 'Beheer' },
  { id: 'customers', label: 'Klanten', category: 'Beheer' },
  { id: 'projects', label: 'Projecten', category: 'Beheer' },
  { id: 'messages', label: 'Berichten', category: 'Beheer' },
  { id: 'charters', label: 'Charters', category: 'Beheer' },
  { id: 'documents', label: 'Documentenbeheer', category: 'Beheer' },
  { id: 'contracts', label: 'Contracten', category: 'HR' },
  { id: 'hrimport', label: 'HR Import', category: 'HR' },
  { id: 'hrmsettings', label: 'HRM-instellingen', category: 'HR' },
  { id: 'cao', label: 'CAO-regels', category: 'Admin' },
  { id: 'salary', label: 'Loontabellen', category: 'Admin' },
  { id: 'holidays', label: 'Feestdagen', category: 'Admin' },
  { id: 'reports', label: 'Loonrapporten', category: 'Rapportage' },
  { id: 'users', label: 'Gebruikers', category: 'Admin' },
];

export default function UsersPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-invite'],
    queryFn: () => base44.entities.Employee.list('last_name'),
  });

  // Filter employees that don't have a user account yet
  const uninvitedEmployees = employees.filter(emp => 
    emp.email && !users.some(u => u.email?.toLowerCase() === emp.email?.toLowerCase())
  );

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'user',
    selectedEmployeeId: ''
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.users.inviteUser(data.email, data.role);
      // Stuur welkomstmail via Gmail (met CC naar admin) als er een gekoppelde medewerker is
      if (data.selectedEmployeeId) {
        try {
          await base44.functions.invoke('sendWelcomeEmail', { employee_id: data.selectedEmployeeId });
        } catch (emailErr) {
          console.warn('Welkomstmail kon niet verstuurd worden:', emailErr);
        }
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteDialog(false);
      setInviteData({ email: '', role: 'user', selectedEmployeeId: '' });
      alert(data.selectedEmployeeId 
        ? 'Uitnodiging verstuurd + welkomstmail verzonden (CC naar ruben@interdistri.nl)!' 
        : 'Uitnodiging verstuurd!');
      logAuditEvent({
        action: 'user_invited',
        category: 'Gebruikers',
        description: `Gebruiker ${data.email} uitgenodigd met rol ${ROLES[data.role]?.label || data.role}`,
        targetEntity: 'User',
        targetName: data.email,
        newValue: ROLES[data.role]?.label || data.role,
      });
    },
    onError: (error) => {
      alert('Fout bij uitnodigen: ' + error.message);
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions, userName, oldPermissions }) => {
      await base44.entities.User.update(userId, { permissions });
      return { userId, permissions, userName, oldPermissions };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowPermissionsDialog(false);
      setSelectedUser(null);
      alert('Permissies bijgewerkt!');
      const oldLabels = (data.oldPermissions || []).map(p => ALL_PERMISSIONS.find(a => a.id === p)?.label || p).join(', ');
      const newLabels = (data.permissions || []).map(p => ALL_PERMISSIONS.find(a => a.id === p)?.label || p).join(', ');
      logAuditEvent({
        action: 'permissions_updated',
        category: 'Permissies',
        description: `Permissies van ${data.userName} bijgewerkt`,
        targetEntity: 'User',
        targetId: data.userId,
        targetName: data.userName,
        oldValue: oldLabels || 'Geen',
        newValue: newLabels || 'Geen',
      });
    },
    onError: (error) => {
      alert('Fout bij bijwerken: ' + error.message);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, userName, oldRole }) => {
      await base44.entities.User.update(userId, { role });
      return { userId, role, userName, oldRole };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('Rol bijgewerkt!');
      logAuditEvent({
        action: 'role_changed',
        category: 'Gebruikers',
        description: `Rol van ${data.userName} gewijzigd van ${ROLES[data.oldRole]?.label || data.oldRole} naar ${ROLES[data.role]?.label || data.role}`,
        targetEntity: 'User',
        targetId: data.userId,
        targetName: data.userName,
        oldValue: ROLES[data.oldRole]?.label || data.oldRole,
        newValue: ROLES[data.role]?.label || data.role,
      });
    },
    onError: (error) => {
      alert('Fout bij bijwerken rol: ' + error.message);
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
    const originalUser = users.find(u => u.id === selectedUser.id);
    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      permissions: selectedUser.permissions || [],
      userName: selectedUser.full_name || selectedUser.email || 'Onbekend',
      oldPermissions: originalUser?.permissions || []
    });
  };

  const handleRoleChange = (userId, newRole) => {
    const targetUser = users.find(u => u.id === userId);
    if (confirm(`Wil je deze gebruiker de rol "${ROLES[newRole]?.label || newRole}" geven?`)) {
      updateRoleMutation.mutate({ 
        userId, 
        role: newRole, 
        userName: targetUser?.full_name || targetUser?.email || 'Onbekend',
        oldRole: targetUser?.role || 'user'
      });
    }
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

  const toggleCategoryPermissions = (category, enable) => {
    if (!selectedUser) return;
    const categoryPerms = ALL_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const currentPermissions = selectedUser.permissions || [];
    const newPermissions = enable
      ? [...new Set([...currentPermissions, ...categoryPerms])]
      : currentPermissions.filter(p => !categoryPerms.includes(p));
    setSelectedUser({ ...selectedUser, permissions: newPermissions });
  };

  const getCategorySelectState = (category) => {
    if (!selectedUser) return 'none';
    const categoryPerms = ALL_PERMISSIONS.filter(p => p.category === category).map(p => p.id);
    const selected = categoryPerms.filter(p => selectedUser.permissions?.includes(p)).length;
    if (selected === 0) return 'none';
    if (selected === categoryPerms.length) return 'all';
    return 'some';
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
                {uninvitedEmployees.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selecteer medewerker</Label>
                    <Select
                      value={inviteData.selectedEmployeeId}
                      onValueChange={(empId) => {
                        const emp = employees.find(e => e.id === empId);
                        if (emp) {
                          setInviteData({ ...inviteData, selectedEmployeeId: empId, email: emp.email, role: 'user' });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een medewerker..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uninvitedEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.prefix ? emp.prefix + ' ' : ''}{emp.last_name} — {emp.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Alleen medewerkers zonder gebruikersaccount worden getoond
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="gebruiker@voorbeeld.nl"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value, selectedEmployeeId: '' })}
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

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Gebruikers</TabsTrigger>
          <TabsTrigger value="koppelingen" className="gap-1">
            <Link2 className="w-4 h-4" />
            Koppelingen
          </TabsTrigger>
          <TabsTrigger value="roles">Rollen</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Over gebruikersbeheer</p>
                  <p className="text-blue-700">
                    Beheer gebruikers en hun permissies. Gebruikers erven permissies van hun rol.
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
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">Medewerker</SelectItem>
                          </SelectContent>
                        </Select>
                        {user.role === 'admin' && user.email === 'rubend3315@gmail.com' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <a href="https://tms.interdistri.nl/workspace" target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
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
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-slate-500">Rol wijzigen:</span>
                  <Select
                    value={user.role}
                    onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Medewerker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {user.role === 'admin' && user.email === 'rubend3315@gmail.com' && (
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <a href="https://tms.interdistri.nl/workspace" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Base44 Workspace
                      </a>
                    </Button>
                  </div>
                )}
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
       </TabsContent>

       <TabsContent value="koppelingen" className="space-y-4">
         <UserEmployeeLinkTab />
       </TabsContent>

       <TabsContent value="roles" className="space-y-4">
         <RolesTab />
       </TabsContent>
      </Tabs>

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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Zoeken in permissies..."
                value={permissionSearchTerm}
                onChange={(e) => setPermissionSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyRolePermissions('user')}
                className="justify-start"
              >
                <Shield className="w-4 h-4 mr-2" />
                Standaard medewerker
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedUser) return;
                  setSelectedUser({ ...selectedUser, permissions: [...ALL_PERMISSIONS.map(p => p.id)] });
                }}
                className="justify-start"
              >
                <Shield className="w-4 h-4 mr-2" />
                Alle permissies
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedUser) return;
                  setSelectedUser({ ...selectedUser, permissions: [] });
                }}
                className="justify-start text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Alles verwijderen
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Modules per categorie</Label>
              {['Basis', 'Beheer', 'HR', 'Rapportage', 'Admin'].map(category => {
                const categoryPerms = ALL_PERMISSIONS.filter(p => p.category === category);
                const filteredPerms = categoryPerms.filter(p => 
                  p.label.toLowerCase().includes(permissionSearchTerm.toLowerCase())
                );
                const selectState = getCategorySelectState(category);
                
                if (permissionSearchTerm && filteredPerms.length === 0) return null;
                
                return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700">{category}</h4>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleCategoryPermissions(category, true)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          selectState === 'none' 
                            ? 'text-blue-600 hover:bg-blue-50' 
                            : 'text-blue-600 font-medium'
                        }`}
                      >
                        Alles
                      </button>
                      <button
                        onClick={() => toggleCategoryPermissions(category, false)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          selectState === 'all'
                            ? 'text-slate-600 hover:bg-slate-100'
                            : 'text-slate-600 font-medium'
                        }`}
                      >
                        Geen
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredPerms.map(permission => (
                       <div
                         key={permission.id}
                         className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                           selectedUser?.permissions?.includes(permission.id)
                             ? 'bg-blue-50 border-blue-300'
                             : 'bg-white border-slate-200 hover:bg-slate-50'
                         }`}
                         onClick={() => togglePermission(permission.id)}
                       >
                         <div className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                           selectedUser?.permissions?.includes(permission.id)
                             ? 'bg-blue-600 text-white'
                             : 'bg-slate-200'
                         }`}>
                           {selectedUser?.permissions?.includes(permission.id) && '✓'}
                         </div>
                         <span className="text-sm">{permission.label}</span>
                        </div>
                        ))}
                        </div>
                        </div>
                        );
                        })}
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

function RolesTab() {
  const [editingRole, setEditingRole] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list('-created_date')
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

  return (
    <>
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
                            {['Basis', 'Beheer', 'HR', 'Rapportage', 'Admin'].map(category => (
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
    </>
  );
}