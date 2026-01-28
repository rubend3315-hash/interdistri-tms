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
import { Users, Plus, Mail, Shield, User, Search } from "lucide-react";
import { format } from "date-fns";

export default function UsersPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleInvite = () => {
    if (!inviteData.email) {
      alert('Vul een email adres in');
      return;
    }
    inviteUserMutation.mutate(inviteData);
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-700'
      : 'bg-blue-100 text-blue-700';
  };

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
          <p className="text-slate-500">Beheer gebruikers en uitnodigingen</p>
        </div>
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
                    <SelectItem value="user">Gebruiker</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Administrators hebben volledige toegang tot alle functies
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

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Over gebruikersbeheer</p>
              <p className="text-blue-700">
                Uitgenodigde gebruikers ontvangen een email met een link om hun account te activeren.
                Je kunt hier alleen nieuwe gebruikers uitnodigen. Om gebruikersgegevens te bewerken,
                ga naar de Medewerkers pagina.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Zoek op naam of email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                    {user.role === 'admin' ? 'Administrator' : 'Gebruiker'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-slate-600">
                  <span className="text-slate-500">Aangemaakt:</span>{' '}
                  {user.created_date ? format(new Date(user.created_date), 'dd-MM-yyyy') : '-'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}