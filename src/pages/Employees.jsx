import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Clock,
  Euro,
  X,
  CreditCard,
  IdCard,
  Trash2
} from "lucide-react";

const departments = ["Management", "Transport", "PakketDistributie", "Charters"];
const contractTypes = ["Vast Contract", "Tijdelijk", "Oproep", "Uitzend"];
const statuses = ["Actief", "Inactief", "Uit dienst"];

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setSelectedEmployee(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setSelectedEmployee(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    postal_code: "",
    city: "",
    department: "",
    function: "",
    status: "Actief",
    drivers_license_number: "",
    drivers_license_categories: "",
    drivers_license_expiry: "",
    code95_expiry: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    contract_type: "",
    contract_start_date: "",
    contract_hours: "",
    salary_scale: "",
    travel_allowance_per_km: 0.23,
    travel_distance_km: "",
    week_schedule: {}
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      address: "",
      postal_code: "",
      city: "",
      department: "",
      function: "",
      status: "Actief",
      drivers_license_number: "",
      drivers_license_categories: "",
      drivers_license_expiry: "",
      code95_expiry: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      contract_type: "",
      contract_start_date: "",
      contract_hours: "",
      salary_scale: "",
      travel_allowance_per_km: 0.23,
      travel_distance_km: "",
      week_schedule: {}
    });
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      ...employee,
      drivers_license_categories: employee.drivers_license_categories?.join(", ") || "",
      travel_allowance_per_km: employee.travel_allowance_per_km || 0.23,
      week_schedule: employee.week_schedule || {}
    });
    setActiveTab("profile");
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedEmployee(null);
    resetForm();
    setActiveTab("profile");
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      contract_hours: formData.contract_hours ? Number(formData.contract_hours) : null,
      travel_allowance_per_km: formData.travel_allowance_per_km ? Number(formData.travel_allowance_per_km) : null,
      travel_distance_km: formData.travel_distance_km ? Number(formData.travel_distance_km) : null
    };

    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medewerkers</h1>
          <p className="text-slate-500 mt-1">{employees.length} medewerkers in het systeem</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Medewerker
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op naam of email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Alle afdelingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map(employee => (
          <Card 
            key={employee.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openEditDialog(employee)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={employee.photo_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                    {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-slate-600">{employee.function || employee.department}</p>
                      <p className="text-xs text-slate-500 mt-1">{employee.department}</p>
                    </div>
                    <Badge 
                      variant={employee.status === 'Actief' ? 'default' : 'secondary'}
                      className={employee.status === 'Actief' ? 'bg-emerald-500' : ''}
                    >
                      {employee.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl">Medewerker Bewerken</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-4 bg-slate-100">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <IdCard className="w-4 h-4" />
                  Profiel
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Algemene Gegevens
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Weekrooster en contracten
                </TabsTrigger>
                <TabsTrigger value="balance" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Urenbalans
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[60vh]">
              <form onSubmit={handleSubmit} className="px-6 py-6">
                {/* Profile Tab */}
                <TabsContent value="profile" className="mt-0 space-y-6">
                  <div className="flex items-start gap-6 pb-6 border-b">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={selectedEmployee?.photo_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-semibold">
                        {formData.first_name?.charAt(0)}{formData.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-blue-900">
                        {formData.first_name} {formData.last_name}
                      </h2>
                      <p className="text-slate-600 mt-1">{formData.function}</p>
                      <p className="text-slate-500 text-sm">{formData.department}</p>
                      <div className="mt-3 flex gap-2">
                        <Badge 
                          variant={formData.status === 'Actief' ? 'default' : 'secondary'}
                          className={formData.status === 'Actief' ? 'bg-emerald-500' : ''}
                        >
                          {formData.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Contactgegevens
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <a href={`mailto:${formData.email}`} className="text-blue-600 hover:underline">
                            {formData.email || "-"}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{formData.phone || "-"}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <div>{formData.address || "-"}</div>
                            <div>{formData.postal_code} {formData.city}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            {formData.date_of_birth ? format(new Date(formData.date_of_birth), "d MMMM yyyy", { locale: nl }) : "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm pt-3 border-t">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            In dienst sinds {formData.contract_start_date ? format(new Date(formData.contract_start_date), "d januari yyyy") : "-"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Rijbewijs & Certificaten
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Rijbewijsnummer</p>
                          <p className="text-sm font-medium">{formData.drivers_license_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Categorieën</p>
                          <p className="text-sm font-medium">{formData.drivers_license_categories || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Rijbewijs verloopt</p>
                          <p className="text-sm font-medium">
                            {formData.drivers_license_expiry ? format(new Date(formData.drivers_license_expiry), "d MMM yyyy", { locale: nl }) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Code 95 verloopt</p>
                          <p className="text-sm font-medium">
                            {formData.code95_expiry ? format(new Date(formData.code95_expiry), "d MMM yyyy", { locale: nl }) : "-"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Supervisor Notities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-500 italic">Geen notities beschikbaar</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Noodcontact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{formData.emergency_contact_name || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{formData.emergency_contact_phone || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Voorletter(s)</Label>
                      <Input
                        value={formData.first_name?.split(' ').map(n => n.charAt(0)).join('.') + '.'}
                        disabled
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
                          <SelectItem value="Actief">Actief</SelectItem>
                          <SelectItem value="Inactief">Inactief</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Afdeling</Label>
                      <Select 
                        value={formData.department} 
                        onValueChange={(v) => setFormData({ ...formData, department: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="PakketDistributie" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Functie</Label>
                      <Input
                        value={formData.function}
                        onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                        placeholder="Pakketbezorger/Folderbezorger"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefoon</Label>
                      <Input
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
                        value={formData.contract_start_date}
                        onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
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
                      <Label>Woonplaats</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">Rijbewijs & Certificaten</h4>
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

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">Noodcontact</h4>
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
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">Supervisor Notities</h4>
                    <p className="text-xs text-slate-500 mb-2">Notities (alleen voor managers)</p>
                    <Textarea
                      rows={3}
                      placeholder="Interne notities..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Opmerkingen</Label>
                    <Textarea
                      rows={3}
                      placeholder="Algemene opmerkingen..."
                    />
                  </div>
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Contractregels
                      </CardTitle>
                      <Button variant="default" size="sm" className="bg-blue-900">
                        <Plus className="w-4 h-4 mr-1" />
                        Nieuwe Contractregel
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Nog geen contractregels toegevoegd</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Reiskostenvergoeding
                      </CardTitle>
                      <Button variant="default" size="sm" className="bg-blue-900">
                        <Plus className="w-4 h-4 mr-1" />
                        Reiskostenregel
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-slate-500">
                        <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Nog geen reiskostenregels</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Weekroosters per Periode
                      </CardTitle>
                      <Button variant="default" size="sm" className="bg-blue-900">
                        <Plus className="w-4 h-4 mr-1" />
                        Nieuw Weekrooster
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-slate-500">
                        <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Nog geen weekroosters ingesteld</p>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Weekroosters per periode:</strong> Voeg periodes toe om te geven welke dagen je beschikbaar bent. 
                          Elk weekrooster heeft een startdatum en optioneel een einddatum.
                        </p>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <Card className="bg-slate-50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Week 1 (Huidige/Actief)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-slate-500">Geen actief weekrooster</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-slate-50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Week 2 (Huidige/Actief)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-slate-500">Geen actief weekrooster</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Clock className="w-4 h-4 inline mr-2 text-slate-400" />
                          <span className="text-slate-600">Contractuele uren per week:</span>
                          <span className="font-semibold ml-2">{formData.contract_hours || 40}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Geen actieve contractregel</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Verlof & Afwezigheid
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Toevoegen
                      </Button>
                      <div className="text-center py-8 text-slate-500">
                        <p className="text-sm">Geen verlof periodes ingepland</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Balance Tab */}
                <TabsContent value="balance" className="mt-0 space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-8 h-8 text-slate-400" />
                          <div>
                            <h3 className="font-semibold text-lg">Totale Urenbalans</h3>
                            <p className="text-sm text-slate-500">Cumulatief saldo van gewerkte uren ten opzichte van contracturen</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-lg px-4 py-2">-177.1 uur</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Urenbalans per Maand
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Per Week</Button>
                        <Button variant="default" size="sm" className="bg-slate-900">Per Maand</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="border-b pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">januari 2026</h4>
                            <Badge variant="destructive">-177.1 uur</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Gewerkte uren</p>
                              <p className="font-semibold">0.0</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Contracturen</p>
                              <p className="font-semibold">177.1</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Verschil</p>
                              <p className="font-semibold text-red-600">-177.1</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Let op:</strong> De urenbalans wordt automatisch berekend op basis van goedgekeurde tijdregistraties 
                          en de contractuele uren per week. Positief saldo betekent meeruren, negatief betekent minuren.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-900 hover:bg-blue-800"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}