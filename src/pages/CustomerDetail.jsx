import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImportExcelModal from "@/components/customer/ImportExcelModal";
import ImportDataTable from "@/components/customer/ImportDataTable";
import CalculationsTab from "@/components/customer/CalculationsTab";
import ImportHistory from "@/components/customer/ImportHistory";
import ArticleList from "@/components/customer/ArticleList";
import TIModelRoutesTab from "@/components/customer/TIModelRoutesTab";
import {
  ArrowLeft,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  Package,
  FileText,
  Plus,
  Trash2,
  Upload,
  Calculator,
  History,
  X,
  Edit2,
  Calendar
} from "lucide-react";

// Imports Tab Component with period selection
function ImportsTabContent({ imports, onImportModalOpen, onDelete }) {
  const [periodType, setPeriodType] = useState("all"); // all, day, week, period
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  if (imports.length === 0) {
    return (
      <div className="space-y-4">
        <Button 
          onClick={onImportModalOpen}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Excel bestand importeren
        </Button>
        <Card className="p-12 text-center">
          <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen imports</h3>
          <p className="text-slate-500 mt-1">Importeer een Excel bestand om data te beheren.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button 
        onClick={onImportModalOpen}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Upload className="w-4 h-4 mr-2" />
        Excel bestand importeren
      </Button>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Periode selectie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={periodType === "all" ? "default" : "outline"}
              onClick={() => setPeriodType("all")}
              className="flex-1"
            >
              Alles
            </Button>
            <Button
              variant={periodType === "day" ? "default" : "outline"}
              onClick={() => setPeriodType("day")}
              className="flex-1"
            >
              Dag
            </Button>
            <Button
              variant={periodType === "week" ? "default" : "outline"}
              onClick={() => setPeriodType("week")}
              className="flex-1"
            >
              Week
            </Button>
            <Button
              variant={periodType === "period" ? "default" : "outline"}
              onClick={() => setPeriodType("period")}
              className="flex-1"
            >
              Periode
            </Button>
          </div>

          {periodType === "day" && (
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {periodType === "week" && (
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              label="Week beginning"
            />
          )}

          {periodType === "period" && (
            <div className="space-y-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start datum"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End datum"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Import Table with all rows */}
      <ImportDataTable 
        imports={imports}
        onDelete={onDelete}
        periodType={periodType}
        selectedDate={selectedDate}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

export default function CustomerDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerId ? base44.entities.Customer.list().then(customers => 
      customers.find(c => c.id === customerId)
    ) : null,
    enabled: !!customerId
  });

  const { data: imports = [] } = useQuery({
    queryKey: ['customer-imports', customerId],
    queryFn: () => customerId ? base44.entities.CustomerImport.filter({ customer_id: customerId }) : [],
    enabled: !!customerId
  });

  const deleteImportMutation = useMutation({
    mutationFn: (importId) => base44.entities.CustomerImport.delete(importId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-imports', customerId] });
    }
  });

  const [formData, setFormData] = useState({
    company_name: "",
    logo_url: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    postal_code: "",
    city: "",
    country: "Nederland",
    kvk_number: "",
    btw_number: "",
    payment_terms: 30,
    articles: [],
    status: "Actief",
    notes: ""
  });

  React.useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || "",
        logo_url: customer.logo_url || "",
        contact_person: customer.contact_person || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        postal_code: customer.postal_code || "",
        city: customer.city || "",
        country: customer.country || "Nederland",
        kvk_number: customer.kvk_number || "",
        btw_number: customer.btw_number || "",
        payment_terms: customer.payment_terms || 30,
        articles: customer.articles || [],
        status: customer.status || "Actief",
        notes: customer.notes || ""
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
    setIsEditMode(false);
  };

  const addArticle = () => {
    setFormData({
      ...formData,
      articles: [...formData.articles, { name: "", description: "", price: 0, unit: "stuk" }]
    });
  };

  const updateArticle = (index, field, value) => {
    const newArticles = [...formData.articles];
    newArticles[index] = { ...newArticles[index], [field]: value };
    setFormData({ ...formData, articles: newArticles });
  };

  const removeArticle = (index) => {
    setFormData({
      ...formData,
      articles: formData.articles.filter((_, i) => i !== index)
    });
  };

  const isPostNL = customer?.company_name === 'PostNL';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl('Customers'))}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar klanten
        </Button>
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Klant niet gevonden</h3>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl('Customers'))}
          size="icon"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {customer.logo_url && (
          <img src={customer.logo_url} alt={customer.company_name} className="h-16 w-16 object-contain" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{customer.company_name}</h1>
          <p className="text-slate-500 mt-1">{customer.contact_person}</p>
        </div>
        <Badge variant={customer.status === 'Actief' ? 'success' : 'secondary'}>
          {customer.status}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="w-4 h-4" />
            Informatie
          </TabsTrigger>
          <TabsTrigger value="articles" className="gap-2">
            <Package className="w-4 h-4" />
            Artikelen
          </TabsTrigger>
          {isPostNL && (
            <TabsTrigger value="imports" className="gap-2">
              <Upload className="w-4 h-4" />
              Imports ({imports.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Geschiedenis
          </TabsTrigger>
          {isPostNL && (
            <TabsTrigger value="calculations" className="gap-2">
              <Calculator className="w-4 h-4" />
              Berekeningen
            </TabsTrigger>
          )}
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="w-4 h-4" />
            Opmerkingen
          </TabsTrigger>
          {isPostNL && (
            <TabsTrigger value="ti-model" className="gap-2">
              <Package className="w-4 h-4" />
              TI Model Ritten
            </TabsTrigger>
          )}
        </TabsList>

        {/* Informatie Tab */}
        <TabsContent value="info">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Basisgegevens</CardTitle>
                {!isEditMode && (
                  <Button 
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Bewerken
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditMode ? (
                  <>
                    {/* Logo Upload - Edit Mode */}
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      <div className="flex items-center gap-3">
                        {formData.logo_url && (
                          <div className="relative w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                            <img src={formData.logo_url} alt="Logo" className="w-18 h-18 object-contain" />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, logo_url: "" })}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const response = await base44.integrations.Core.UploadFile({ file });
                                setFormData({ ...formData, logo_url: response.file_url });
                              }
                            }}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Fields - Edit Mode */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bedrijfsnaam *</Label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select 
                           value={formData.status || ""} 
                           onValueChange={(v) => setFormData({ ...formData, status: v })}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Selecteer status" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Actief">Actief</SelectItem>
                             <SelectItem value="Inactief">Inactief</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contactpersoon</Label>
                        <Input
                          value={formData.contact_person}
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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

                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Adres</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
                      <div className="space-y-2">
                        <Label>Land</Label>
                        <Input
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>KvK nummer</Label>
                        <Input
                          value={formData.kvk_number}
                          onChange={(e) => setFormData({ ...formData, kvk_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>BTW nummer</Label>
                        <Input
                          value={formData.btw_number}
                          onChange={(e) => setFormData({ ...formData, btw_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Betalingstermijn (dagen)</Label>
                        <Input
                          type="number"
                          value={formData.payment_terms}
                          onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Bedrijfsnaam</p>
                          <p className="text-slate-900 font-medium">{formData.company_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Status</p>
                          <Badge variant={formData.status === 'Actief' ? 'success' : 'secondary'}>
                            {formData.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Contactpersoon</p>
                          <p className="text-slate-900">{formData.contact_person || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Telefoon</p>
                          <p className="text-slate-900">{formData.phone || "-"}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500 mb-1">E-mail</p>
                        <p className="text-slate-900">{formData.email || "-"}</p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500 mb-1">Adres</p>
                        <p className="text-slate-900">{formData.address || "-"}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Postcode</p>
                          <p className="text-slate-900">{formData.postal_code || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Plaats</p>
                          <p className="text-slate-900">{formData.city || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Land</p>
                          <p className="text-slate-900">{formData.country}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">KvK nummer</p>
                          <p className="text-slate-900">{formData.kvk_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">BTW nummer</p>
                          <p className="text-slate-900">{formData.btw_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Betalingstermijn (dagen)</p>
                          <p className="text-slate-900">{formData.payment_terms}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {isEditMode && (
              <div className="flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditMode(false)}
                >
                  Annuleren
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        {/* Artikelen Tab */}
        <TabsContent value="articles">
          <ArticleList customerId={customerId} />
        </TabsContent>

        {/* Imports Tab */}
        <TabsContent value="imports">
          <ImportsTabContent 
            imports={imports}
            onImportModalOpen={() => setIsImportModalOpen(true)}
            onDelete={deleteImportMutation.mutate}
          />
        </TabsContent>

        {/* Geschiedenis Tab */}
        <TabsContent value="history">
          <ImportHistory
            imports={imports}
            onView={(imp) => {}}
            onDelete={deleteImportMutation.mutate}
          />
        </TabsContent>

        {/* Berekeningen Tab */}
        <TabsContent value="calculations">
          <CalculationsTab 
            imports={imports}
            customerArticles={formData.articles}
          />
        </TabsContent>

        {/* Opmerkingen Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Opmerkingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={8}
                placeholder="Voeg opmerkingen toe..."
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TI Model Ritten Tab */}
        <TabsContent value="ti-model">
          <TIModelRoutesTab customerId={customerId} />
        </TabsContent>
      </Tabs>

      {/* Import Modal */}
      <ImportExcelModal 
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        customerId={customerId}
        customerArticles={formData.articles}
      />
    </div>
  );
}