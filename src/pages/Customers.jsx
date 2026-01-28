import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Package,
  ChevronRight,
  Trash2,
  Upload,
  X
} from "lucide-react";

export default function Customers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
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

  const resetForm = () => {
    setFormData({
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
  };

  const openEditDialog = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...customer,
      articles: customer.articles || [],
      payment_terms: customer.payment_terms || 30
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedCustomer(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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

  const filteredCustomers = customers.filter(c =>
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Klanten</h1>
          <p className="text-slate-500 mt-1">{customers.length} klanten geregistreerd</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Klant
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Zoek op bedrijfsnaam of contactpersoon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen klanten gevonden</h3>
          <p className="text-slate-500 mt-1">Voeg een nieuwe klant toe.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredCustomers.map(customer => (
             <Card 
             key={customer.id} 
             className="hover:shadow-md transition-shadow group cursor-pointer"
             onClick={() => navigate(`${createPageUrl('CustomerDetail')}?id=${customer.id}`)}
             >
             <CardContent className="p-5">
               <div className="flex items-start justify-between">
                 <div className="flex items-start gap-3 flex-1">
                   {customer.logo_url ? (
                     <img src={customer.logo_url} alt={customer.company_name} className="w-12 h-12 rounded-xl object-contain bg-slate-100 flex-shrink-0" />
                   ) : (
                     <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                       <Building2 className="w-6 h-6 text-slate-600" />
                     </div>
                   )}
                     <div className="flex-1">
                       <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                         {customer.company_name}
                       </h3>
                       {customer.contact_person && (
                         <p className="text-sm text-slate-500">{customer.contact_person}</p>
                       )}
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <Badge variant={customer.status === 'Actief' ? 'success' : 'secondary'}>
                       {customer.status}
                     </Badge>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                   </div>
                 </div>

                 <div className="mt-4 space-y-1.5">
                   {customer.phone && (
                     <p className="text-sm text-slate-600 flex items-center gap-2">
                       <Phone className="w-4 h-4 text-slate-400" />
                       {customer.phone}
                     </p>
                   )}
                   {customer.email && (
                     <p className="text-sm text-slate-600 flex items-center gap-2">
                       <Mail className="w-4 h-4 text-slate-400" />
                       {customer.email}
                     </p>
                   )}
                   {customer.city && (
                     <p className="text-sm text-slate-600 flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-slate-400" />
                       {customer.city}
                     </p>
                   )}
                 </div>

                 {customer.articles?.length > 0 && (
                   <div className="mt-3 pt-3 border-t">
                     <p className="text-xs text-slate-500 flex items-center gap-1">
                       <Package className="w-3.5 h-3.5" />
                       {customer.articles.length} artikel(en)
                     </p>
                   </div>
                 )}
               </CardContent>
             </Card>
           ))}
         </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              {selectedCustomer ? 'Klant Bewerken' : 'Nieuwe Klant'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] px-6 py-4">
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
               <Label>Logo</Label>
               <div className="flex items-center gap-3">
                 {formData.logo_url && (
                   <div className="relative w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                     <img src={formData.logo_url} alt="Logo" className="w-14 h-14 object-contain" />
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

              {/* Articles Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Artikelen</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addArticle}>
                    <Plus className="w-4 h-4 mr-1" />
                    Artikel toevoegen
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.articles.map((article, index) => (
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
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opmerkingen</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </form>
          </ScrollArea>

          <div className="flex justify-end gap-3 p-6 border-t bg-slate-50">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}