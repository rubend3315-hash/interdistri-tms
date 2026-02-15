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
import CalculationsTab from "@/components/customer/CalculationsTab";

import ArticleList from "@/components/customer/ArticleList";
import TIModelRoutesTab from "@/components/customer/TIModelRoutesTab";
import RoutesTab from "@/components/customer/RoutesTab";
import InvoicesTab from "@/components/customer/InvoicesTab";
import ReportGenerator from "@/components/reports/ReportGenerator";
import DataDashboard from "@/components/reports/DataDashboard";
import ProjectExcelImport from "@/components/projecten/ProjectExcelImport";
import PostNLDashboard from "@/components/rapportage/PostNLDashboard";
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

  X,
  Edit2,
  Calendar,
  BarChart3,
  TrendingUp,
  Truck
} from "lucide-react";



export default function CustomerDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerId ? base44.entities.Customer.list().then(customers => 
      customers.find(c => c.id === customerId)
    ) : null,
    enabled: !!customerId
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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: featureConfigs = [] } = useQuery({
    queryKey: ['client-features', customerId],
    queryFn: () => customerId ? base44.entities.ClientFeatureConfig.filter({ customer_id: customerId, is_active: true }) : [],
    enabled: !!customerId
  });

  const hasFeature = (featureKey) => featureConfigs.some(f => f.feature_key === featureKey);
  const getFeatureLabel = (featureKey) => featureConfigs.find(f => f.feature_key === featureKey)?.feature_label || featureKey;

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

  // Feature visibility is now driven by ClientFeatureConfig records

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
      <div className="flex items-center gap-6 print:hidden">
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
        <TabsList className="print:hidden">
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="w-4 h-4" />
            Informatie
          </TabsTrigger>
          <TabsTrigger value="articles" className="gap-2">
            <Package className="w-4 h-4" />
            Artikelen
          </TabsTrigger>
          {hasFeature('imports') && (
            <TabsTrigger value="imports" className="gap-2">
              <Upload className="w-4 h-4" />
              {getFeatureLabel('imports')}
            </TabsTrigger>
          )}
          {hasFeature('import_reports') && (
           <TabsTrigger value="import-reports" className="gap-2">
             <BarChart3 className="w-4 h-4" />
             {getFeatureLabel('import_reports')}
           </TabsTrigger>
          )}
  
          {hasFeature('calculations') && (
            <TabsTrigger value="calculations" className="gap-2">
              <Calculator className="w-4 h-4" />
              {getFeatureLabel('calculations')}
            </TabsTrigger>
          )}

          {hasFeature('dashboard') && (
           <TabsTrigger value="dashboard" className="gap-2">
             <BarChart3 className="w-4 h-4" />
             {getFeatureLabel('dashboard')}
           </TabsTrigger>
          )}
          {hasFeature('ai_reports') && (
           <TabsTrigger value="reports" className="gap-2">
             <TrendingUp className="w-4 h-4" />
             {getFeatureLabel('ai_reports')}
           </TabsTrigger>
          )}
          {hasFeature('ti_model_routes') && (
           <TabsTrigger value="ti-model" className="gap-2">
             <Package className="w-4 h-4" />
             {getFeatureLabel('ti_model_routes')}
           </TabsTrigger>
          )}
          {hasFeature('routes') && (
           <TabsTrigger value="routes" className="gap-2">
              <Truck className="w-4 h-4" />
              {getFeatureLabel('routes')}
           </TabsTrigger>
          )}
          {hasFeature('invoices') && (
           <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              {getFeatureLabel('invoices')}
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
          <ProjectExcelImport projectFilter={true} customerId={customerId} />
        </TabsContent>



        {/* Berekeningen Tab */}
        <TabsContent value="calculations">
          <CalculationsTab customerId={customerId} />
        </TabsContent>



        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <DataDashboard imports={imports} />
        </TabsContent>

        {/* AI Reports Tab */}
        <TabsContent value="reports">
          <ReportGenerator imports={imports} articles={formData.articles} />
        </TabsContent>

        {/* Import Rapportage Tab */}
        <TabsContent value="import-reports">
          <PostNLDashboard customerId={customerId} />
        </TabsContent>

        {/* TI Model Ritten Tab */}
        <TabsContent value="ti-model">
          <TIModelRoutesTab customerId={customerId} />
        </TabsContent>

        {/* Routes Tab (Spotta, DPG Media, etc.) */}
        <TabsContent value="routes">
          <RoutesTab customerId={customerId} />
        </TabsContent>

        {/* Facturen Tab */}
        <TabsContent value="invoices">
          <InvoicesTab customerId={customerId} />
        </TabsContent>
      </Tabs>


    </div>
  );
}