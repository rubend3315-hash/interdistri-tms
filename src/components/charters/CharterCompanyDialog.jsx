import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const emptyForm = {
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  postal_code: "",
  city: "",
  kvk_number: "",
  notes: "",
  status: "Actief"
};

export default function CharterCompanyDialog({ open, onOpenChange, company, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (company) {
      setForm({ ...emptyForm, ...company });
    } else {
      setForm(emptyForm);
    }
  }, [company, open]);

  const handleSave = () => {
    if (!form.company_name.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? "Charterbedrijf bewerken" : "Nieuw charterbedrijf"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Bedrijfsnaam *</Label>
              <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <Label>Contactpersoon</Label>
              <Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>KvK nummer</Label>
              <Input value={form.kvk_number} onChange={e => setForm({ ...form, kvk_number: e.target.value })} />
            </div>
            <div>
              <Label>Adres</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Postcode</Label>
                <Input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} />
              </div>
              <div>
                <Label>Plaats</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actief">Actief</SelectItem>
                  <SelectItem value="Inactief">Inactief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Opmerkingen</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleSave} disabled={!form.company_name.trim()}>Opslaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}