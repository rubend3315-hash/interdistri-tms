import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Plus,
  Edit,
  Search,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  MapPin,
  FileText,
  Clock,
  Heart,
  IdCard,
  User
} from "lucide-react";
import { format, addMonths, isBefore } from 'date-fns';

const departments = ['Management', 'Transport', 'PakketDistributie', 'Charters'];
const contractTypes = ['Vast', 'Tijdelijk', 'Oproep', 'Uitzend'];
const statuses = ['Actief', 'Inactief', 'Uit dienst'];
const licenseCategories = ['B', 'C', 'CE', 'D', 'DE'];
const functions = [
  'Chauffeur',
  'Pakketbezorger/Folderbezorger',
  'Magazijnmedewerker',
  'Planner',
  'Manager',
  'Administratie',
  'Overig'
];

export default function Employees() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setSelectedEmployee(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setSelectedEmployee(null);
    }
  });



  const handleSubmit = (formData) => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openNewDialog = () => {
    setSelectedEmployee(null);
    setShowDialog(true);
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setShowDialog(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const colors = {
      'Actief': 'bg-emerald-100 text-emerald-700',
      'Inactief': 'bg-slate-100 text-slate-700',
      'Uit dienst': 'bg-red-100 text-red-700'
    };
    return colors[status] || colors['Actief'];
  };

  const checkExpiry = (date) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const warningDate = addMonths(new Date(), 1);
    
    if (isBefore(expiryDate, new Date())) {
      return 'expired';
    } else if (isBefore(expiryDate, warningDate)) {
      return 'warning';
    }
    return 'valid';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medewerkers</h1>
          <p className="text-slate-500">Beheer medewerkergegevens en contracten</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Medewerker
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEmployee ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue={selectedEmployee ? "profiel" : "algemeen"} className="w-full">
              <TabsList className={`grid w-full ${selectedEmployee ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {selectedEmployee && (
                  <TabsTrigger value="profiel">Profiel</TabsTrigger>
                )}
                <TabsTrigger value="algemeen">Algemene Gegevens</TabsTrigger>
                <TabsTrigger value="weekrooster">Weekrooster en contracten</TabsTrigger>
              </TabsList>
              {selectedEmployee && (
                <TabsContent value="profiel">
                  <ProfielTab employee={selectedEmployee} />
                </TabsContent>
              )}
              <TabsContent value="algemeen">
                <EmployeeForm
                  employee={selectedEmployee}
                  onSubmit={handleSubmit}
                  isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
              </TabsContent>
              <TabsContent value="weekrooster">
                <WeekroosterTab
                  employee={selectedEmployee}
                  onSubmit={handleSubmit}
                  isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Zoek op naam of email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Afdeling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Geen medewerkers gevonden</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => {
            const driverLicenseStatus = checkExpiry(employee.drivers_license_expiry);
            const code95Status = checkExpiry(employee.code95_expiry);

            return (
              <Card key={employee.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-900/10 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-blue-900" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {employee.first_name} {employee.last_name}
                        </CardTitle>
                        <p className="text-sm text-slate-500">{employee.function}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusBadge(employee.status)}>
                        {employee.status}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {employee.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-700">{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-700">{employee.phone}</span>
                      </div>
                    )}
                  </div>

                  {employee.department === 'Transport' && (
                    <div className="space-y-2 pt-2 border-t">
                      {employee.drivers_license_expiry && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Rijbewijs:
                          </span>
                          <span className={`flex items-center gap-1 ${
                            driverLicenseStatus === 'expired' ? 'text-red-600 font-medium' :
                            driverLicenseStatus === 'warning' ? 'text-yellow-600 font-medium' :
                            'text-slate-700'
                          }`}>
                            {driverLicenseStatus === 'expired' && <AlertCircle className="w-3 h-3" />}
                            {format(new Date(employee.drivers_license_expiry), 'dd-MM-yyyy')}
                          </span>
                        </div>
                      )}
                      {employee.code95_expiry && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Code 95:</span>
                          <span className={`flex items-center gap-1 ${
                            code95Status === 'expired' ? 'text-red-600 font-medium' :
                            code95Status === 'warning' ? 'text-yellow-600 font-medium' :
                            'text-slate-700'
                          }`}>
                            {code95Status === 'expired' && <AlertCircle className="w-3 h-3" />}
                            {format(new Date(employee.code95_expiry), 'dd-MM-yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfielTab({ employee }) {
  return (
    <div className="space-y-6 py-4">
      {/* Header met foto en status */}
      <div className="flex items-start justify-between p-6 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-4">
          {employee.photo_url ? (
            <img 
              src={employee.photo_url} 
              alt={`${employee.first_name} ${employee.last_name}`}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold">
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {employee.first_name} {employee.last_name}
            </h2>
            <p className="text-lg text-slate-600">{employee.function || 'Geen functie'}</p>
            <p className="text-sm text-slate-500">{employee.department}</p>
          </div>
        </div>
        <Badge className={
          employee.status === 'Actief' ? 'bg-emerald-100 text-emerald-700' :
          employee.status === 'Inactief' ? 'bg-slate-100 text-slate-700' :
          'bg-red-100 text-red-700'
        }>
          {employee.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Contactgegevens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contactgegevens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <a href={`mailto:${employee.email}`} className="text-blue-600 hover:underline">
                {employee.email || '-'}
              </a>
            </div>
            <div>
              <p className="text-xs text-slate-500">Telefoon</p>
              <a href={`tel:${employee.phone}`} className="text-blue-600 hover:underline">
                {employee.phone || '-'}
              </a>
            </div>
            <div>
              <p className="text-xs text-slate-500">Adres</p>
              <p className="text-slate-900">
                {employee.address || '-'}
                {employee.address && <br />}
                {employee.postal_code && employee.city && `${employee.postal_code} ${employee.city}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Geboortedatum</p>
              <p className="text-slate-900">
                {employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd MMMM yyyy') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">In dienst sinds</p>
              <p className="text-slate-900">
                {employee.contract_start_date ? format(new Date(employee.contract_start_date), 'dd MMMM yyyy') : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rijbewijs & Certificaten */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IdCard className="w-5 h-5" />
              Rijbewijs & Certificaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Rijbewijsnummer</p>
              <p className="text-slate-900">{employee.drivers_license_number || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Categorieën</p>
              <p className="text-slate-900">
                {employee.drivers_license_categories?.join(', ') || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Rijbewijs verloopt</p>
              <p className="text-slate-900">
                {employee.drivers_license_expiry 
                  ? format(new Date(employee.drivers_license_expiry), 'dd-MM-yyyy')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Code 95 verloopt</p>
              <p className="text-slate-900">
                {employee.code95_expiry 
                  ? format(new Date(employee.code95_expiry), 'dd-MM-yyyy')
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Noodcontact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Noodcontact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Naam</p>
              <p className="text-slate-900">{employee.emergency_contact_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Telefoon</p>
              <p className="text-slate-900">{employee.emergency_contact_phone || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Supervisor Notities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Supervisor Notities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 italic">
              {employee.supervisor_notities || 'Geen notities beschikbaar'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeForm({ employee, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState(employee || {
    employee_number: '',
    initials: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    in_service_since: '',
    address: '',
    postal_code: '',
    city: '',
    department: 'Transport',
    function: '',
    drivers_license_number: '',
    drivers_license_categories: '',
    drivers_license_expiry: '',
    code95_expiry: '',
    contract_type: 'Vast',
    contract_start_date: '',
    contract_end_date: '',
    contract_hours: 40,
    hourly_rate: '',
    status: 'Actief',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    photo_url: '',
    supervisor_notities: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Bestand is te groot. Maximaal 5MB toegestaan.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Alleen afbeeldingen zijn toegestaan.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    } catch (error) {
      alert('Fout bij uploaden: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      {/* Pasfoto Upload */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
        <div className="relative">
          {formData.photo_url ? (
            <img 
              src={formData.photo_url} 
              alt="Pasfoto" 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-300"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-8 h-8 text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <Label className="text-sm font-medium">Pasfoto</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">Maximaal 5MB</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Voorletter(s)</Label>
          <Input
            value={formData.initials}
            onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
            placeholder="bijv. R.J."
          />
        </div>
        <div className="space-y-2">
          <Label>Voornaam *</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Achternaam *</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(v) => setFormData({ ...formData, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Afdeling *</Label>
          <Select 
            value={formData.department} 
            onValueChange={(v) => setFormData({ ...formData, department: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Functie</Label>
          <Select 
            value={formData.function} 
            onValueChange={(v) => setFormData({ ...formData, function: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer functie" />
            </SelectTrigger>
            <SelectContent>
              {functions.map(func => (
                <SelectItem key={func} value={func}>{func}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Telefoon</Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Geboortedatum</Label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>In dienst sinds</Label>
          <Input
            type="date"
            value={formData.in_service_since}
            onChange={(e) => setFormData({ ...formData, in_service_since: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Adres</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Postcode</Label>
          <Input
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Plaats</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Rijbewijs & Certificaten</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rijbewijsnummer</Label>
            <Input
              value={formData.drivers_license_number}
              onChange={(e) => setFormData({ ...formData, drivers_license_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Rijbewijs categorie</Label>
            <Input
              value={formData.drivers_license_categories}
              onChange={(e) => setFormData({ ...formData, drivers_license_categories: e.target.value })}
              placeholder="bijv. B, C, CE"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Rijbewijs vervaldatum</Label>
            <Input
              type="date"
              value={formData.drivers_license_expiry}
              onChange={(e) => setFormData({ ...formData, drivers_license_expiry: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Code 95 vervaldatum</Label>
            <Input
              type="date"
              value={formData.code95_expiry}
              onChange={(e) => setFormData({ ...formData, code95_expiry: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Supervisor Notities</h3>
        <div className="space-y-2">
          <Label>Notities (alleen voor managers)</Label>
          <Textarea
            value={formData.supervisor_notities}
            onChange={(e) => setFormData({ ...formData, supervisor_notities: e.target.value })}
            rows={3}
            placeholder="Interne notities..."
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Noodcontact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Naam</Label>
            <Input
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefoon</Label>
            <Input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full bg-blue-900" disabled={isSubmitting}>
        {isSubmitting ? 'Opslaan...' : 'Opslaan'}
      </Button>
    </form>
  );
}

function WeekroosterTab({ employee, onSubmit, isSubmitting }) {
  const [contractregels, setContractregels] = useState(employee?.contractregels || []);
  const [reiskostenregels, setReiskostenregels] = useState(employee?.reiskostenregels || []);
  const [weekroosters, setWeekrewkoosters] = useState(employee?.weekroosters || []);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showReiskostenDialog, setShowReiskostenDialog] = useState(false);
  const [showWeekroosterDialog, setShowWeekroosterDialog] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [editingReiskosten, setEditingReiskosten] = useState(null);
  const [editingWeekrooster, setEditingWeekrooster] = useState(null);

  const handleSaveAll = () => {
    onSubmit({
      ...employee,
      contractregels,
      reiskostenregels,
      weekroosters
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Contractregels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contractregels
            </CardTitle>
            <Button 
              size="sm"
              className="bg-blue-900"
              onClick={() => {
                setEditingContract(null);
                setShowContractDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Contractregel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contractregels.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Nog geen contractregels toegevoegd</p>
          ) : (
           <div className="space-y-2">
             {contractregels.filter(c => c.status !== 'Inactief').map((contract, index) => (
               <div key={index} className="p-3 border rounded-lg">
                 <div className="flex justify-between items-start">
                   <div>
                     <div className="flex items-center gap-2">
                       <p className="font-medium">{contract.type_contract}</p>
                       {contract.status === 'Inactief' && (
                         <Badge className="bg-slate-100 text-slate-700">Inactief</Badge>
                       )}
                     </div>
                     <p className="text-sm text-slate-600">
                       {contract.startdatum && format(new Date(contract.startdatum), 'dd-MM-yyyy')}
                       {contract.einddatum && ` - ${format(new Date(contract.einddatum), 'dd-MM-yyyy')}`}
                     </p>
                     <p className="text-sm text-slate-600">{contract.uren_per_week} uur/week</p>
                   </div>
                   <Button 
                     variant="ghost" 
                     size="icon"
                     onClick={() => {
                       setEditingContract({ ...contract, index: contractregels.indexOf(contract) });
                       setShowContractDialog(true);
                     }}
                   >
                     <Edit className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
             ))}
           </div>
          )}
        </CardContent>
      </Card>

      {/* Reiskostenvergoeding */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Reiskostenvergoeding
            </CardTitle>
            <Button 
              size="sm"
              className="bg-blue-900"
              onClick={() => {
                setEditingReiskosten(null);
                setShowReiskostenDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Reiskostenregel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reiskostenregels.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Nog geen reiskostenregels</p>
          ) : (
            <div className="space-y-2">
              {reiskostenregels.filter(r => r.status !== 'Inactief').map((regel, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{regel.afstand_km} km enkele reis</p>
                        {regel.status === 'Inactief' && (
                          <Badge className="bg-slate-100 text-slate-700">Inactief</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {regel.startdatum && format(new Date(regel.startdatum), 'dd-MM-yyyy')}
                        {regel.einddatum && ` - ${format(new Date(regel.einddatum), 'dd-MM-yyyy')}`}
                      </p>
                      <p className="text-sm text-slate-600">€{regel.vergoeding_per_dag}/dag</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingReiskosten({ ...regel, index: reiskostenregels.indexOf(regel) });
                        setShowReiskostenDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekroosters per Periode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Weekroosters per Periode
            </CardTitle>
            <Button 
              size="sm"
              className="bg-blue-900"
              onClick={() => {
                setEditingWeekrooster(null);
                setShowWeekroosterDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuw Weekrooster
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {weekroosters.length === 0 ? (
            <div>
              <p className="text-center text-slate-500 py-4">Nog geen weekroosters ingesteld</p>
              <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
                Weekroosters per periode: Voeg periodes toe om aan te geven welke dagen je beschikbaar bent. Elk weekrooster heeft een startdatum en optioneel een einddatum.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {weekroosters.filter(w => w.status !== 'Inactief').map((rooster, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {rooster.startdatum && format(new Date(rooster.startdatum), 'dd-MM-yyyy')}
                          {rooster.einddatum && ` - ${format(new Date(rooster.einddatum), 'dd-MM-yyyy')}`}
                          {!rooster.einddatum && ' - doorlopend'}
                        </p>
                        {rooster.status === 'Inactief' && (
                          <Badge className="bg-slate-100 text-slate-700">Inactief</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-slate-600 font-medium">Week 1 (Oneven):</p>
                          <p className="text-slate-700">
                            {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
                              .filter(d => rooster.week1?.[d])
                              .map(d => d.substring(0, 2))
                              .join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600 font-medium">Week 2 (Even):</p>
                          <p className="text-slate-700">
                            {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
                              .filter(d => rooster.week2?.[d])
                              .map(d => d.substring(0, 2))
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingWeekrooster({ ...rooster, index: weekroosters.indexOf(rooster) });
                        setShowWeekroosterDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button 
        className="w-full bg-blue-900" 
        onClick={handleSaveAll}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Opslaan...' : 'Beschikbaarheid Opslaan'}
      </Button>

      {/* Dialogs */}
      <ContractDialog
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        contract={editingContract}
        onSave={(contract) => {
          if (editingContract?.index !== undefined) {
            const newContracts = [...contractregels];
            newContracts[editingContract.index] = contract;
            setContractregels(newContracts);
          } else {
            setContractregels([...contractregels, contract]);
          }
          setShowContractDialog(false);
        }}
        onDelete={(index) => {
          const newContracts = [...contractregels];
          newContracts[index] = { ...newContracts[index], status: 'Inactief' };
          setContractregels(newContracts);
          setShowContractDialog(false);
        }}
      />

      <ReiskostenDialog
        open={showReiskostenDialog}
        onOpenChange={setShowReiskostenDialog}
        reiskosten={editingReiskosten}
        employee={employee}
        onSave={(regel) => {
          if (editingReiskosten?.index !== undefined) {
            const newRegels = [...reiskostenregels];
            newRegels[editingReiskosten.index] = regel;
            setReiskostenregels(newRegels);
          } else {
            setReiskostenregels([...reiskostenregels, regel]);
          }
          setShowReiskostenDialog(false);
        }}
        onDelete={(index) => {
          const newRegels = [...reiskostenregels];
          newRegels[index] = { ...newRegels[index], status: 'Inactief' };
          setReiskostenregels(newRegels);
          setShowReiskostenDialog(false);
        }}
      />

      <WeekroosterDialog
        open={showWeekroosterDialog}
        onOpenChange={setShowWeekroosterDialog}
        weekrooster={editingWeekrooster}
        onSave={(rooster) => {
          if (editingWeekrooster?.index !== undefined) {
            const newRoosters = [...weekroosters];
            newRoosters[editingWeekrooster.index] = rooster;
            setWeekrewkoosters(newRoosters);
          } else {
            setWeekrewkoosters([...weekroosters, rooster]);
          }
          setShowWeekroosterDialog(false);
        }}
        onDelete={(index) => {
          const newRoosters = [...weekroosters];
          newRoosters[index] = { ...newRoosters[index], status: 'Inactief' };
          setWeekrewkoosters(newRoosters);
          setShowWeekroosterDialog(false);
        }}
      />
    </div>
  );
}

function ContractDialog({ open, onOpenChange, contract, onSave, onDelete }) {
  const [formData, setFormData] = useState(contract || {
    startdatum: '',
    einddatum: '',
    type_contract: 'Vast Contract',
    loonschaal: '',
    uren_per_week: 40,
    week1: { maandag: true, dinsdag: true, woensdag: true, donderdag: true, vrijdag: true, zaterdag: false, zondag: false },
    week2: { maandag: true, dinsdag: true, woensdag: true, donderdag: true, vrijdag: true, zaterdag: false, zondag: false },
    reiskostenvergoeding: 'Woon-werkverkeer',
    status: 'Actief'
  });

  useEffect(() => {
    if (contract) {
      setFormData(contract);
    }
  }, [contract]);

  const calculateWeekTotal = (week) => {
    const daysChecked = Object.values(week).filter(Boolean).length;
    return daysChecked > 0 ? Math.floor(formData.uren_per_week / 2) : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe Contractregel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Input
                type="date"
                value={formData.startdatum}
                onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input
                type="date"
                value={formData.einddatum}
                onChange={(e) => setFormData({ ...formData, einddatum: e.target.value })}
              />
              <p className="text-xs text-slate-500">Leeg laten voor doorlopend contract</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type Contract *</Label>
              <Select 
                value={formData.type_contract}
                onValueChange={(v) => setFormData({ ...formData, type_contract: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vast Contract">Vast Contract</SelectItem>
                  <SelectItem value="Tijdelijk Contract">Tijdelijk Contract</SelectItem>
                  <SelectItem value="Oproepcontract">Oproepcontract</SelectItem>
                  <SelectItem value="Uitzendcontract">Uitzendcontract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loonschaal CAO *</Label>
              <Input
                value={formData.loonschaal}
                onChange={(e) => setFormData({ ...formData, loonschaal: e.target.value })}
                placeholder="Selecteer loonschaal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contractuele Uren per Week</Label>
            <Input
              type="number"
              value={formData.uren_per_week}
              onChange={(e) => setFormData({ ...formData, uren_per_week: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-4">
            <Label>Weekrooster (verdeling van uren)</Label>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Week 1 (Oneven weken)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day, i) => {
                    const key = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'][i];
                    return (
                      <div key={i} className="space-y-1">
                        <Label className="text-xs">{day}</Label>
                        <Input
                          type="number"
                          className="h-8 text-center"
                          value={formData.week1[key] ? 8 : 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData({
                              ...formData,
                              week1: { ...formData.week1, [key]: val > 0 }
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Totaal week 1: <strong>{calculateWeekTotal(formData.week1)}u</strong>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Week 2 (Even weken)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day, i) => {
                    const key = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'][i];
                    return (
                      <div key={i} className="space-y-1">
                        <Label className="text-xs">{day}</Label>
                        <Input
                          type="number"
                          className="h-8 text-center"
                          value={formData.week2[key] ? 8 : 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData({
                              ...formData,
                              week2: { ...formData.week2, [key]: val > 0 }
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Totaal week 2: <strong>{calculateWeekTotal(formData.week2)}u</strong>
                </p>
              </CardContent>
            </Card>

            <p className="text-sm text-slate-600">
              Gemiddelde per week: <strong>{formData.uren_per_week}.0u</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Reiskostenvergoeding</Label>
            <Select 
              value={formData.reiskostenvergoeding}
              onValueChange={(v) => setFormData({ ...formData, reiskostenvergoeding: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Woon-werkverkeer">Woon-werkverkeer</SelectItem>
                <SelectItem value="Geen">Geen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status || 'Actief'}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Actief">Actief</SelectItem>
                <SelectItem value="Inactief">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {contract?.index !== undefined && onDelete && (
              <Button 
                variant="destructive" 
                onClick={() => onDelete(contract.index)}
              >
                Inactiveren
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button 
              className="flex-1 bg-blue-900" 
              onClick={() => onSave(formData)}
              disabled={!formData.startdatum || !formData.type_contract}
            >
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReiskostenDialog({ open, onOpenChange, reiskosten, employee, onSave, onDelete }) {
  const [formData, setFormData] = useState(reiskosten || {
    startdatum: '',
    einddatum: '',
    afstand_km: 0,
    vergoeding_per_dag: 0,
    status: 'Actief'
  });

  useEffect(() => {
    if (reiskosten) {
      setFormData(reiskosten);
    }
  }, [reiskosten]);

  const berekenVergoeding = () => {
    const afstand = Number(formData.afstand_km) || 0;
    const tarief = 0.23; // €0.23 per km
    const berekend = afstand * 2 * tarief; // Enkele reis x 2
    setFormData({ ...formData, vergoeding_per_dag: Number(berekend.toFixed(2)) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe Reiskostenregel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">Standplaats</p>
            <p className="text-sm text-slate-600">Fleerbosseweg 19, 4421 RR Kapelle</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">Woonadres medewerker</p>
            <p className="text-sm text-slate-600">
              {employee?.address && employee?.postal_code && employee?.city
                ? `${employee.address}, ${employee.postal_code} ${employee.city}`
                : 'Geen adres ingevuld'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Input
                type="date"
                value={formData.startdatum}
                onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input
                type="date"
                value={formData.einddatum}
                onChange={(e) => setFormData({ ...formData, einddatum: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Afstand enkele reis (km)</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={berekenVergoeding}
              >
                Bereken
              </Button>
            </div>
            <Input
              type="number"
              step="0.1"
              value={formData.afstand_km}
              onChange={(e) => setFormData({ ...formData, afstand_km: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Berekende vergoeding (afstand × €0,23)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.vergoeding_per_dag}
              readOnly
              className="bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Vergoeding enkele reis (handmatig aanpasbaar)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.vergoeding_per_dag}
              onChange={(e) => setFormData({ ...formData, vergoeding_per_dag: e.target.value })}
            />
            <p className="text-xs text-slate-500">Dit is de eindvergoeding die gebruikt wordt voor berekeningen</p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status || 'Actief'}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Actief">Actief</SelectItem>
                <SelectItem value="Inactief">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {reiskosten?.index !== undefined && onDelete && (
              <Button 
                variant="destructive" 
                onClick={() => onDelete(reiskosten.index)}
              >
                Inactiveren
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button 
              className="flex-1 bg-blue-900" 
              onClick={() => onSave(formData)}
              disabled={!formData.startdatum}
            >
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WeekroosterDialog({ open, onOpenChange, weekrooster, onSave, onDelete }) {
  const [formData, setFormData] = useState(weekrooster || {
    startdatum: '',
    einddatum: '',
    week1: { maandag: true, dinsdag: true, woensdag: true, donderdag: true, vrijdag: true, zaterdag: false, zondag: false },
    week2: { maandag: true, dinsdag: true, woensdag: true, donderdag: true, vrijdag: true, zaterdag: false, zondag: false },
    status: 'Actief'
  });

  useEffect(() => {
    if (weekrooster) {
      setFormData(weekrooster);
    }
  }, [weekrooster]);

  const toggleDay = (week, day) => {
    setFormData({
      ...formData,
      [week]: { ...formData[week], [day]: !formData[week][day] }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw Weekrooster</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Input
                type="date"
                value={formData.startdatum}
                onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input
                type="date"
                value={formData.einddatum}
                onChange={(e) => setFormData({ ...formData, einddatum: e.target.value })}
              />
              <p className="text-xs text-slate-500">Leeg laten voor doorlopend</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-600">Week 1 (Oneven weken)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].map(day => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.week1[day]}
                    onChange={() => toggleDay('week1', day)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-600">Week 2 (Even weken)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].map(day => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.week2[day]}
                    onChange={() => toggleDay('week2', day)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status || 'Actief'}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Actief">Actief</SelectItem>
                <SelectItem value="Inactief">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {weekrooster?.index !== undefined && onDelete && (
              <Button 
                variant="destructive" 
                onClick={() => onDelete(weekrooster.index)}
              >
                Inactiveren
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button 
              className="flex-1 bg-blue-900" 
              onClick={() => onSave(formData)}
              disabled={!formData.startdatum}
            >
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}