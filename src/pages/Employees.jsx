import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Car,
  AlertTriangle,
  Edit,
  Trash2,
  FileText,
  Clock,
  Euro,
  X
} from "lucide-react";

const departments = ["Management", "Transport", "PakketDistributie", "Charters"];
const contractTypes = ["Vast", "Tijdelijk", "Oproep", "Uitzend"];
const statuses = ["Actief", "Inactief", "Uit dienst"];
const licenseCategories = ["AM", "A1", "A2", "A", "B", "BE", "C1", "C1E", "C", "CE", "D1", "D1E", "D", "DE"];

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
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
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    postal_code: "",
    city: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    department: "",
    function: "",
    drivers_license_number: "",
    drivers_license_categories: [],
    drivers_license_expiry: "",
    code95_expiry: "",
    contract_type: "",
    contract_start_date: "",
    contract_end_date: "",
    contract_hours: "",
    hourly_rate: "",
    salary_scale: "",
    travel_allowance_per_km: 0.23,
    travel_distance_km: "",
    travel_allowance_start_date: "",
    travel_allowance_end_date: "",
    status: "Actief",
    bsn: "",
    bank_account: ""
  });

  const resetForm = () => {
    setFormData({
      employee_number: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      address: "",
      postal_code: "",
      city: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relation: "",
      department: "",
      function: "",
      drivers_license_number: "",
      drivers_license_categories: [],
      drivers_license_expiry: "",
      code95_expiry: "",
      contract_type: "",
      contract_start_date: "",
      contract_end_date: "",
      contract_hours: "",
      hourly_rate: "",
      salary_scale: "",
      travel_allowance_per_km: 0.23,
      travel_distance_km: "",
      travel_allowance_start_date: "",
      travel_allowance_end_date: "",
      status: "Actief",
      bsn: "",
      bank_account: ""
    });
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      ...employee,
      drivers_license_categories: employee.drivers_license_categories || [],
      contract_hours: employee.contract_hours || "",
      hourly_rate: employee.hourly_rate || "",
      travel_allowance_per_km: employee.travel_allowance_per_km || 0.23,
      travel_distance_km: employee.travel_distance_km || ""
    });
    setActiveTab("personal");
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedEmployee(null);
    resetForm();
    setActiveTab("personal");
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      contract_hours: formData.contract_hours ? Number(formData.contract_hours) : null,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
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
      emp.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getExpiryBadge = (date) => {
    if (!date) return null;
    const daysUntil = differenceInDays(new Date(date), new Date());
    if (daysUntil < 0) return <Badge variant="destructive">Verlopen</Badge>;
    if (daysUntil <= 30) return <Badge className="bg-amber-500">Verloopt binnenkort</Badge>;
    return <Badge variant="outline" className="text-emerald-600 border-emerald-200">{format(new Date(date), "d MMM yyyy", { locale: nl })}</Badge>;
  };

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
                placeholder="Zoek op naam, nummer of email..."
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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen medewerkers gevonden</h3>
          <p className="text-slate-500 mt-1">Pas je zoekcriteria aan of voeg een nieuwe medewerker toe.</p>
        </Card>
      ) : (
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
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-lg">
                      {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-sm text-slate-500">{employee.function || employee.department}</p>
                      </div>
                      <Badge variant={employee.status === 'Actief' ? 'success' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 space-y-1.5">
                      {employee.employee_number && (
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          {employee.employee_number}
                        </p>
                      )}
                      {employee.department && (
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          {employee.department}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {employee.drivers_license_expiry && (
                        <div className="text-xs">
                          {getExpiryBadge(employee.drivers_license_expiry)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedEmployee ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}</span>
              {selectedEmployee && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je deze medewerker wilt verwijderen?')) {
                      deleteMutation.mutate(selectedEmployee.id);
                      setIsDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6">
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="personal">Persoonlijk</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="license">Rijbewijs</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                  <TabsTrigger value="salary">Loon</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-[50vh] px-6 py-4">
                <TabsContent value="personal" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Personeelsnummer</Label>
                      <Input
                        value={formData.employee_number}
                        onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                      />
                    </div>
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
                          {statuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>BSN</Label>
                      <Input
                        value={formData.bsn}
                        onChange={(e) => setFormData({ ...formData, bsn: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Afdeling *</Label>
                      <Select 
                        value={formData.department} 
                        onValueChange={(v) => setFormData({ ...formData, department: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer afdeling" />
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
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mailadres</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefoonnummer</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    <h4 className="font-medium text-slate-900 mb-4">Noodcontact</h4>
                    <div className="grid grid-cols-3 gap-4">
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
                      <div className="space-y-2">
                        <Label>Relatie</Label>
                        <Input
                          value={formData.emergency_contact_relation}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                          placeholder="bijv. Partner, Ouder"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="license" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rijbewijsnummer</Label>
                      <Input
                        value={formData.drivers_license_number}
                        onChange={(e) => setFormData({ ...formData, drivers_license_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rijbewijs vervaldatum</Label>
                      <Input
                        type="date"
                        value={formData.drivers_license_expiry}
                        onChange={(e) => setFormData({ ...formData, drivers_license_expiry: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rijbewijscategorieën</Label>
                    <div className="flex flex-wrap gap-2">
                      {licenseCategories.map(cat => (
                        <Badge
                          key={cat}
                          variant={formData.drivers_license_categories?.includes(cat) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const current = formData.drivers_license_categories || [];
                            if (current.includes(cat)) {
                              setFormData({ 
                                ...formData, 
                                drivers_license_categories: current.filter(c => c !== cat) 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                drivers_license_categories: [...current, cat] 
                              });
                            }
                          }}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Code 95 vervaldatum</Label>
                    <Input
                      type="date"
                      value={formData.code95_expiry}
                      onChange={(e) => setFormData({ ...formData, code95_expiry: e.target.value })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="contract" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contracttype</Label>
                      <Select 
                        value={formData.contract_type} 
                        onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer type" />
                        </SelectTrigger>
                        <SelectContent>
                          {contractTypes.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contract uren per week</Label>
                      <Input
                        type="number"
                        value={formData.contract_hours}
                        onChange={(e) => setFormData({ ...formData, contract_hours: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Startdatum contract</Label>
                      <Input
                        type="date"
                        value={formData.contract_start_date}
                        onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Einddatum contract</Label>
                      <Input
                        type="date"
                        value={formData.contract_end_date}
                        onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="salary" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loonschaal</Label>
                      <Input
                        value={formData.salary_scale}
                        onChange={(e) => setFormData({ ...formData, salary_scale: e.target.value })}
                        placeholder="bijv. A1, B2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Uurloon (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN</Label>
                    <Input
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      placeholder="NL00 BANK 0000 0000 00"
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-slate-900 mb-4">Reiskosten</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vergoeding per km (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.travel_allowance_per_km}
                          onChange={(e) => setFormData({ ...formData, travel_allowance_per_km: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reisafstand enkele reis (km)</Label>
                        <Input
                          type="number"
                          value={formData.travel_distance_km}
                          onChange={(e) => setFormData({ ...formData, travel_distance_km: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>Startdatum reiskosten</Label>
                        <Input
                          type="date"
                          value={formData.travel_allowance_start_date}
                          onChange={(e) => setFormData({ ...formData, travel_allowance_start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Einddatum reiskosten</Label>
                        <Input
                          type="date"
                          value={formData.travel_allowance_end_date}
                          onChange={(e) => setFormData({ ...formData, travel_allowance_end_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="flex justify-end gap-3 p-6 border-t bg-slate-50">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}