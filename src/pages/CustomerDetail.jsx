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
  Upload
} from "lucide-react";

export default function CustomerDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl('Customers'))}
          size="icon"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
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
          <TabsTrigger value="imports" className="gap-2">
            <Upload className="w-4 h-4" />
            Imports ({imports.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="w-4 h-4" />
            Opmerkingen
          </TabsTrigger>
        </TabsList>

        {/* Informatie Tab */}
        <TabsContent value="info">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basisgegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Artikelen Tab */}
        <TabsContent value="articles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Artikelen ({formData.articles.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addArticle}>
                <Plus className="w-4 h-4 mr-1" />
                Artikel toevoegen
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.articles.length === 0 ? (
                <p className="text-sm text-slate-500">Geen artikelen toegevoegd</p>
              ) : (
                formData.articles.map((article, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        placeholder="Naam"
                        value={article.name}
                        onChange={(e) => updateArticle(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Omschrijving"
                        value={article.description}
                        onChange={(e) => updateArticle(index, 'description', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Prijs"
                        value={article.price}
                        onChange={(e) => updateArticle(index, 'price', Number(e.target.value))}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Eenheid"
                          value={article.unit}
                          onChange={(e) => updateArticle(index, 'unit', e.target.value)}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeArticle(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-end gap-3 pt-4 border-t">
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

        {/* Imports Tab */}
        <TabsContent value="imports">
          <div className="space-y-4">
            <Button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Excel bestand importeren
            </Button>

            {imports.length === 0 ? (
              <Card className="p-12 text-center">
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Geen imports</h3>
                <p className="text-slate-500 mt-1">Importeer een Excel bestand om data te beheren.</p>
              </Card>
            ) : (
              imports.map(importData => (
                <ImportDataTable 
                  key={importData.id}
                  importData={importData}
                  customerArticles={formData.articles}
                  onDelete={deleteImportMutation.mutate}
                />
              ))
            )}
          </div>
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