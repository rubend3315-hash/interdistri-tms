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
import { Switch } from "@/components/ui/switch";
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
  Heart,
  IdCard,
  User,
  Smartphone
} from "lucide-react";
import { format, addMonths, isBefore } from 'date-fns';
import { getFullName, getDisplayName } from '@/components/utils/employeeUtils';

const statuses = ['Actief', 'Inactief', 'Uit dienst'];

export default function Employees() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('Actief');
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date')
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter({ status: 'Actief' }, 'sort_order')
  });

  const { data: functionOptions = [] } = useQuery({
    queryKey: ['functions_list'],
    queryFn: () => base44.entities.Function.filter({ status: 'Actief' }, 'sort_order')
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

  const openViewDialog = (employee) => {
    setSelectedEmployee({ ...employee, viewOnly: true });
    setShowDialog(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase();
    const fullName = getFullName(emp).toLowerCase();
    const matchesSearch = !search ||
      fullName.includes(search) ||
      emp.first_name?.toLowerCase().includes(search) ||
      emp.last_name?.toLowerCase().includes(search) ||
      emp.prefix?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.employee_number?.toLowerCase().includes(search);
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
            <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle>
                  {selectedEmployee?.viewOnly ? 'Medewerker Inzien' : selectedEmployee ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}
                </DialogTitle>
                {selectedEmployee?.viewOnly && (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setSelectedEmployee({ ...selectedEmployee, viewOnly: false })}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Bewerken
                  </Button>
                )}
              </DialogHeader>
            <Tabs defaultValue={selectedEmployee?.viewOnly ? "profiel" : selectedEmployee ? "profiel" : "algemeen"} className="w-full">
              <TabsList className={`grid w-full ${selectedEmployee ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {selectedEmployee && (
                  <TabsTrigger value="profiel">Profiel</TabsTrigger>
                )}
                <TabsTrigger value="algemeen">Algemene Gegevens</TabsTrigger>
                <TabsTrigger value="weekrooster">Weekrooster en contracten</TabsTrigger>
              </TabsList>
              {selectedEmployee && (
                <TabsContent value="profiel">
                  <ProfielTab employee={selectedEmployee} viewOnly={selectedEmployee.viewOnly} />
                </TabsContent>
              )}
              <TabsContent value="algemeen">
                <EmployeeForm
                  employee={selectedEmployee}
                  onSubmit={handleSubmit}
                  isSubmitting={createMutation.isPending || updateMutation.isPending}
                  viewOnly={selectedEmployee?.viewOnly}
                  departments={departments}
                  functionOptions={functionOptions}
                />
              </TabsContent>
              <TabsContent value="weekrooster">
                <WeekroosterTab
                  employee={selectedEmployee}
                  onSubmit={handleSubmit}
                  isSubmitting={createMutation.isPending || updateMutation.isPending}
                  viewOnly={selectedEmployee?.viewOnly}
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
                placeholder="Zoek op naam, personeelsnummer of email..."
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
                  <SelectItem key={dept.id} value={dept.name}>{dept.label}</SelectItem>
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
        <div className="space-y-6">
          {(() => {
            // Group by department, sort employees by employee_number within each group
            const grouped = {};
            const departmentOrder = departments.map(d => d.name);
            filteredEmployees.forEach(emp => {
              const dept = emp.department || 'Overig';
              if (!grouped[dept]) grouped[dept] = [];
              grouped[dept].push(emp);
            });
            // Sort each group by employee_number
            Object.keys(grouped).forEach(dept => {
              grouped[dept].sort((a, b) => 
                (a.employee_number || '').localeCompare(b.employee_number || '', undefined, { numeric: true })
              );
            });
            // Order departments
            const sortedDepts = [...departmentOrder.filter(d => grouped[d]), ...Object.keys(grouped).filter(d => !departmentOrder.includes(d))];

            return sortedDepts.map(dept => (
              <div key={dept}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-slate-800">{dept}</h2>
                  <Badge variant="secondary" className="text-xs">{grouped[dept].length}</Badge>
                </div>
                <div className="space-y-2">
                  {grouped[dept].map(employee => (
                    <Card
                      key={employee.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openViewDialog(employee)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-900/10 rounded-xl flex items-center justify-center shrink-0">
                              {employee.photo_url ? (
                                <img src={employee.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                              ) : (
                                <Users className="w-6 h-6 text-blue-900" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-lg">
                                  {employee.employee_number && (
                                    <span className="text-slate-500 font-semibold mr-2">{employee.employee_number}</span>
                                  )}
                                  {getFullName(employee)}
                                </h3>
                                <Badge className={getStatusBadge(employee.status)}>
                                  {employee.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-600">
                                {employee.function && <span>{employee.function}</span>}
                                {employee.email && (
                                  <>
                                    {employee.function && <span className="text-slate-300">|</span>}
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      {employee.email}
                                    </span>
                                  </>
                                )}
                                {employee.phone && (
                                  <>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {employee.phone}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm shrink-0">
                            {employee.drivers_license_expiry && (() => {
                              const status = checkExpiry(employee.drivers_license_expiry);
                              if (status === 'expired') return <Badge variant="destructive">Rijbewijs verlopen</Badge>;
                              if (status === 'warning') return <Badge className="bg-amber-500">Rijbewijs verloopt</Badge>;
                              return null;
                            })()}
                            {employee.code95_expiry && (() => {
                              const status = checkExpiry(employee.code95_expiry);
                              if (status === 'expired') return <Badge variant="destructive">Code 95 verlopen</Badge>;
                              if (status === 'warning') return <Badge className="bg-amber-500">Code 95 verloopt</Badge>;
                              return null;
                            })()}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); openViewDialog(employee); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function ProfielTab({ employee, viewOnly }) {
    return (
      <div className="space-y-6 py-4">
      {/* Header met foto en status */}
      <div className="flex items-start justify-between p-6 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-4">
          {employee.photo_url ? (
            <img 
              src={employee.photo_url} 
              alt={getFullName(employee)}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold">
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {getFullName(employee)}
            </h2>
            {employee.employee_number && (
              <p className="text-sm text-slate-500 font-medium">Personeelsnummer: {employee.employee_number}</p>
            )}
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
                {(() => {
                  const inServiceDate = employee.in_service_since || employee.contract_start_date;
                  if (inServiceDate) return format(new Date(inServiceDate), 'dd MMMM yyyy');
                  // Fallback: earliest contractregel startdatum
                  const earliest = (employee.contractregels || [])
                    .filter(c => c.startdatum)
                    .sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0];
                  return earliest ? format(new Date(earliest.startdatum), 'dd MMMM yyyy') : '-';
                })()}
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

function EmployeeForm({ employee, onSubmit, isSubmitting, viewOnly = false, departments = [], functionOptions = [] }) {
  const defaults = {
    employee_number: '',
    initials: '',
    first_name: '',
    prefix: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    in_service_since: '',
    out_of_service_date: '',
    address: '',
    postal_code: '',
    city: '',
    department: 'Transport',
    function: '',
    drivers_license_number: '',
    drivers_license_categories: '',
    drivers_license_expiry: '',
    code95_expiry: '',
    contract_start_date: '',
    contract_end_date: '',
    hourly_rate: '',
    status: 'Actief',
    bsn: '',
    bank_account: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    photo_url: '',
    supervisor_notities: '',
    mobile_entry_type: 'single_day',
    mobile_shift_department: '',
    is_chauffeur: true,
    tonen_in_planner: true,
    opnemen_in_loonrapport: true
  };

  // Merge employee data with defaults, replacing null/undefined with ''
  const [formData, setFormData] = useState(() => {
    if (!employee) return defaults;
    const merged = { ...defaults };
    Object.keys(defaults).forEach(key => {
      merged[key] = employee[key] != null ? employee[key] : defaults[key];
    });
    // Auto-fill "in dienst sinds" from earliest contract start date if not set
    if (!merged.in_service_since && Array.isArray(employee.contractregels) && employee.contractregels.length > 0) {
      const earliest = employee.contractregels
        .filter(c => c.startdatum && c.status !== 'Inactief')
        .sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0];
      if (earliest) {
        merged.in_service_since = earliest.startdatum;
      }
    }
    return merged;
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
    if (!viewOnly) {
      const cleanedData = { ...formData };
      
      delete cleanedData.viewOnly;

      // Remove contract_type/contract_hours — contractregels is single source of truth
      delete cleanedData.contract_type;
      delete cleanedData.contract_hours;

      const numericFields = ['hourly_rate', 'travel_allowance_per_km', 'travel_distance_km'];

      Object.keys(cleanedData).forEach(key => {
        const value = cleanedData[key];

        if (typeof value === 'string' && value.trim() === '') {
          cleanedData[key] = null;
        }

        if (numericFields.includes(key)) {
          if (cleanedData[key] === null) {
            // already null from empty string conversion
          } else if (typeof cleanedData[key] === 'string') {
            const numValue = Number(cleanedData[key]);
            cleanedData[key] = isNaN(numValue) ? null : numValue;
          }
        }

        if (key === 'drivers_license_categories') {
          if (typeof value === 'string' && value.trim() !== '') {
            cleanedData[key] = value.split(',').map(item => item.trim());
          } else {
            cleanedData[key] = null;
          }
        }
      });

      if (cleanedData.mobile_shift_department === '' || cleanedData.mobile_shift_department === '_none') {
        cleanedData.mobile_shift_department = null;
      }
      
      onSubmit(cleanedData);
    }
  };

  if (viewOnly) {
    return (
      <div className="space-y-4 pt-4">
        {/* Pasfoto */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
          <div>
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
          <div>
            <Label className="text-sm font-medium">Pasfoto</Label>
            <p className="text-sm text-slate-600 mt-2">{formData.photo_url ? 'Foto aanwezig' : 'Geen foto'}</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Personeelsnr.</Label>
            <Input value={formData.employee_number || '-'} readOnly className="bg-slate-50 font-semibold" />
          </div>
          <div className="space-y-2">
            <Label>Voorletter(s)</Label>
            <Input value={formData.initials} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Voornaam</Label>
            <Input value={formData.first_name} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Tussenvoegsel</Label>
            <Input value={formData.prefix} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Achternaam</Label>
            <Input value={formData.last_name} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Input value={formData.status} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Afdeling</Label>
            <Input value={formData.department} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Functie</Label>
            <Input value={formData.function} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={formData.email} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Telefoon</Label>
            <Input value={formData.phone} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Geboortedatum</Label>
            <Input type="date" value={formData.date_of_birth} readOnly />
          </div>
          <div className="space-y-2">
            <Label>BSN</Label>
            <Input value={formData.bsn || '-'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>IBAN</Label>
            <Input value={formData.bank_account || '-'} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>In dienst sinds</Label>
            <Input type="date" value={formData.in_service_since} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Uit dienst datum</Label>
            <Input type="date" value={formData.out_of_service_date} readOnly />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Adres</Label>
          <Input value={formData.address} readOnly />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Postcode</Label>
            <Input value={formData.postal_code} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Plaats</Label>
            <Input value={formData.city} readOnly />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Overige gegevens</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Chauffeur</Label>
              <span className="text-sm text-slate-600">{formData.is_chauffeur !== false ? 'Ja' : 'Nee'}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Opnemen in loonrapport</Label>
              <span className="text-sm text-slate-600">{formData.opnemen_in_loonrapport !== false ? 'Ja' : 'Nee'}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Tonen in planner</Label>
              <span className="text-sm text-slate-600">{formData.tonen_in_planner !== false ? 'Ja' : 'Nee'}</span>
            </div>
            <div className="space-y-2">
              <Label>Type mobiele app</Label>
              <Input value={formData.mobile_entry_type === 'multi_day' ? 'Meerdaagse diensten' : 'Standaard (enkele dag)'} readOnly />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Identificatie</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nummer ID-kaart of paspoort</Label>
              <Input value={formData.id_document_number || '-'} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Geldig tot (ID-kaart/paspoort)</Label>
              <Input type="date" value={formData.id_document_expiry} readOnly />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Rijbewijs & Certificaten</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rijbewijsnummer</Label>
              <Input value={formData.drivers_license_number} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Rijbewijs categorie</Label>
              <Input value={formData.drivers_license_categories} readOnly />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Rijbewijs vervaldatum</Label>
              <Input type="date" value={formData.drivers_license_expiry} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Code 95 vervaldatum</Label>
              <Input type="date" value={formData.code95_expiry} readOnly />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Noodcontact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input value={formData.emergency_contact_name} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Telefoon</Label>
              <Input value={formData.emergency_contact_phone} readOnly />
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      {formData.employee_number && (
        <div className="space-y-2">
          <Label>Personeelsnummer</Label>
          <Input value={formData.employee_number} readOnly className="bg-slate-50 font-semibold w-40" />
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
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
          <Label>Tussenvoegsel</Label>
          <Input
            value={formData.prefix}
            onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
            placeholder="bijv. van, de"
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
                <SelectItem key={dept.id} value={dept.name}>{dept.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Functie</Label>
          <Select 
            value={formData.function || '_placeholder'} 
            onValueChange={(v) => setFormData({ ...formData, function: v === '_placeholder' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer functie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_placeholder" disabled>Selecteer functie</SelectItem>
              {functionOptions.map(func => (
                <SelectItem key={func.id} value={func.name}>{func.name}</SelectItem>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Geboortedatum</Label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>BSN</Label>
          <Input
            value={formData.bsn}
            onChange={(e) => setFormData({ ...formData, bsn: e.target.value })}
            placeholder="BSN nummer"
          />
        </div>
        <div className="space-y-2">
          <Label>IBAN</Label>
          <Input
            value={formData.bank_account}
            onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
            placeholder="NL00 BANK 0000 0000 00"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>In dienst sinds</Label>
          <Input
            type="date"
            value={formData.in_service_since}
            onChange={(e) => setFormData({ ...formData, in_service_since: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Uit dienst datum</Label>
          <Input
            type="date"
            value={formData.out_of_service_date}
            onChange={(e) => setFormData({ ...formData, out_of_service_date: e.target.value })}
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
        <h3 className="font-medium mb-3">Overige gegevens</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Chauffeur</Label>
              <Switch
                checked={formData.is_chauffeur !== false}
                onCheckedChange={(v) => setFormData({ ...formData, is_chauffeur: v })}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Bepaalt of nachttoeslag berekend wordt</p>
          </div>
          <div className="flex items-center justify-between">
            <Label>Opnemen in loonrapport</Label>
            <Switch
              checked={formData.opnemen_in_loonrapport !== false}
              onCheckedChange={(v) => setFormData({ ...formData, opnemen_in_loonrapport: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Tonen in planner</Label>
            <Switch
              checked={formData.tonen_in_planner !== false}
              onCheckedChange={(v) => setFormData({ ...formData, tonen_in_planner: v })}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Mobiele App
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type mobiele app</Label>
            <Select 
              value={formData.mobile_entry_type || 'single_day'} 
              onValueChange={(v) => setFormData({ ...formData, mobile_entry_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_day">Standaard (enkele dag)</SelectItem>
                <SelectItem value="multi_day">Meerdaagse diensten</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Bepaalt welke mobiele app de medewerker ziet</p>
          </div>
          <div className="space-y-2">
            <Label>Shifttijden van andere afdeling tonen</Label>
            <Select 
              value={formData.mobile_shift_department || '_none'} 
              onValueChange={(v) => setFormData({ ...formData, mobile_shift_department: v === '_none' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Eigen afdeling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Eigen afdeling</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.name}>{dept.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Indien ingesteld, ziet deze medewerker de shifttijden van de gekozen afdeling in de mobiele app</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Identificatie</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nummer ID-kaart of paspoort</Label>
            <Input
              value={formData.id_document_number}
              onChange={(e) => setFormData({ ...formData, id_document_number: e.target.value })}
              placeholder="Documentnummer"
            />
          </div>
          <div className="space-y-2">
            <Label>Geldig tot (ID-kaart/paspoort)</Label>
            <Input
              type="date"
              value={formData.id_document_expiry}
              onChange={(e) => setFormData({ ...formData, id_document_expiry: e.target.value })}
            />
          </div>
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

function WeekroosterTab({ employee, onSubmit, isSubmitting, viewOnly = false }) {
    const [contractregels, setContractregels] = useState(() => {
      if (Array.isArray(employee?.contractregels) && employee.contractregels.length > 0) {
        return employee.contractregels;
      }
      return [];
    });
    const [reiskostenregels, setReiskostenregels] = useState(() => {
      if (Array.isArray(employee?.reiskostenregels) && employee.reiskostenregels.length > 0) {
        return employee.reiskostenregels;
      }
      return [];
    });
    const [showContractDialog, setShowContractDialog] = useState(false);
    const [showReiskostenDialog, setShowReiskostenDialog] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [editingReiskosten, setEditingReiskosten] = useState(null);
    const queryClient = useQueryClient();
    const updateMutation = useMutation({
      mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    });

    useEffect(() => {
      if (employee && Array.isArray(employee.contractregels) && employee.contractregels.length > 0) {
        setContractregels(employee.contractregels);
      }
      if (employee && Array.isArray(employee.reiskostenregels) && employee.reiskostenregels.length > 0) {
        setReiskostenregels(employee.reiskostenregels);
      }
    }, [employee]);

    const handleSaveContract = (newContractregels) => {
      setContractregels(newContractregels);
      updateMutation.mutate({
        id: employee.id,
        data: { contractregels: newContractregels, reiskostenregels }
      });
    };

    const handleSaveReiskosten = (newReiskostenregels) => {
      setReiskostenregels(newReiskostenregels);
      updateMutation.mutate({
        id: employee.id,
        data: { reiskostenregels: newReiskostenregels }
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
            {!viewOnly && (
              <Button 
                size="sm"
                className="bg-blue-900"
                onClick={() => {
                  const lastActiveContract = contractregels
                    .filter(c => c.status !== 'Inactief')
                    .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0];
                  setEditingContract(null);
                  if (lastActiveContract) {
                    const prevContractIndex = contractregels.indexOf(lastActiveContract);
                    setShowContractDialog({ 
                      startdatum: lastActiveContract.startdatum,
                      prevContractIndex: prevContractIndex 
                    });
                  } else {
                    setShowContractDialog(true);
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Contractregel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contractregels.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Nog geen contractregels toegevoegd</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Startdatum</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Einddatum</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Contract</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Loonschaal</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Uren/week</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Status</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {contractregels && contractregels.length > 0 && contractregels.filter(c => c.status !== 'Inactief').sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum)).map((contract, index) => {
                    const statusValue = contract.status || 'Actief';
                    const isBeëindigd = statusValue === 'Beëindigd';
                    const isActief = statusValue === 'Actief' && !(contract.einddatum && isBefore(new Date(contract.einddatum), new Date()));
                    const isInactive = !isActief;
                    const textColor = isInactive ? 'text-slate-400' : 'text-slate-900';
                    const bgColor = isActief ? 'bg-emerald-50/50' : '';

                    return (
                      <React.Fragment key={index}>
                        <tr className={`border-b ${bgColor} hover:opacity-75`}>
                          <td className={`py-2 px-3 ${textColor}`}>
                            {contract.startdatum && format(new Date(contract.startdatum), 'dd-MM-yyyy')}
                          </td>
                          <td className={`py-2 px-3 ${textColor}`}>
                            {contract.einddatum ? format(new Date(contract.einddatum), 'dd-MM-yyyy') : '-'}
                          </td>
                          <td className={`py-2 px-3 ${textColor}`}>{contract.type_contract}</td>
                          <td className={`py-2 px-3 ${textColor}`}>{contract.loonschaal || '-'}</td>
                          <td className={`py-2 px-3 ${textColor}`}>{contract.uren_per_week}</td>
                          <td className="py-2 px-3">
                            {isBeëindigd ? (
                              <Badge className="bg-slate-100 text-slate-600 text-xs">Beëindigd</Badge>
                            ) : isActief ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">Actief</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">Beëindigd</Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {!viewOnly && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingContract({ ...contract, index: contractregels.indexOf(contract) });
                                  setShowContractDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                        <tr className={`${bgColor} border-b opacity-75`}>
                          <td colSpan="6" className="py-2 px-3">
                            <div className="inline-flex gap-6 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Week 1 (oneven):</span>
                                <div className="flex gap-1">
                                  {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].map((day, idx) => {
                                    const isWorking = contract.week1?.[day];
                                    const dayLabel = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'][idx];
                                    const week1Days = contract.week1 ? Object.values(contract.week1).filter(Boolean).length : 0;
                                    const hoursPerDay = contract.uren_per_week && week1Days > 0
                                      ? (contract.uren_per_week / week1Days).toFixed(4)
                                      : 0;
                                    return (
                                      <div key={idx} className={`px-2 py-1 rounded text-xs font-medium ${
                                        isWorking 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-slate-100 text-slate-400'
                                      }`}>
                                        {dayLabel} {isWorking ? hoursPerDay : '-'}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Week 2 (even):</span>
                                <div className="flex gap-1">
                                  {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].map((day, idx) => {
                                    const isWorking = contract.week2?.[day];
                                    const dayLabel = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'][idx];
                                    const week2Days = contract.week2 ? Object.values(contract.week2).filter(Boolean).length : 0;
                                    const hoursPerDay = contract.uren_per_week && week2Days > 0
                                      ? (contract.uren_per_week / week2Days).toFixed(4)
                                      : 0;
                                    return (
                                      <div key={idx} className={`px-2 py-1 rounded text-xs font-medium ${
                                        isWorking 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-slate-100 text-slate-400'
                                      }`}>
                                        {dayLabel} {isWorking ? hoursPerDay : '-'}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
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
            {!viewOnly && (
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
            )}
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
                    {!viewOnly && (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-save happens on individual save, no button needed */}

      {/* Dialogs */}
      <ContractDialog
        open={showContractDialog === true || typeof showContractDialog === 'object'}
        onOpenChange={(open) => {
          if (!open) setShowContractDialog(false);
        }}
        contract={editingContract}
        preFilledData={typeof showContractDialog === 'object' ? showContractDialog : null}
        contractList={contractregels}
        onSave={(contract) => {
          let newContracts;
          if (editingContract?.index !== undefined) {
            newContracts = [...contractregels];
            newContracts[editingContract.index] = contract;
          } else {
            // Voor nieuw contract: update vorig contract met einddatum + status Beëindigd
            if (typeof showContractDialog === 'object' && showContractDialog.prevContractIndex !== undefined) {
              newContracts = [...contractregels];
              newContracts[showContractDialog.prevContractIndex] = {
                ...newContracts[showContractDialog.prevContractIndex],
                einddatum: contract.startdatum,
                status: 'Beëindigd'
              };
              newContracts.push(contract);
            } else {
              newContracts = [...contractregels, contract];
            }
          }
          handleSaveContract(newContracts);
          setShowContractDialog(false);
        }}
      />

      <ReiskostenDialog
        open={showReiskostenDialog}
        onOpenChange={setShowReiskostenDialog}
        reiskosten={editingReiskosten}
        employee={employee}
        onSave={(regel) => {
          let newRegels;
          if (editingReiskosten?.index !== undefined) {
            newRegels = [...reiskostenregels];
            newRegels[editingReiskosten.index] = regel;
          } else {
            newRegels = [...reiskostenregels, regel];
          }
          handleSaveReiskosten(newRegels);
          setShowReiskostenDialog(false);
        }}
      />
    </div>
  );
}

// ContractDialog and ReiskostenDialog imported from components/employees/