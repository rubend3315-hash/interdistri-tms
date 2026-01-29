import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function RouteForm({ route, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    route_code: "",
    route_name: "",
    start_date: "",
    end_date: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (route) {
      setFormData(route);
    }
  }, [route]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Ritcode */}
        <div>
          <Label htmlFor="route_code" className="font-semibold text-slate-900">
            Ritcode <span className="text-red-500">*</span>
          </Label>
          <Input
            id="route_code"
            name="route_code"
            placeholder="Bijv. R001"
            value={formData.route_code}
            onChange={handleChange}
            className="mt-1"
            required
          />
        </div>

        {/* Ritnaam */}
        <div>
          <Label htmlFor="route_name" className="font-semibold text-slate-900">
            Ritnaam <span className="text-red-500">*</span>
          </Label>
          <Input
            id="route_name"
            name="route_name"
            placeholder="Bijv. Route Noord"
            value={formData.route_name}
            onChange={handleChange}
            className="mt-1"
            required
          />
        </div>

        {/* Begindatum */}
        <div>
          <Label htmlFor="start_date" className="font-semibold text-slate-900">
            Begindatum
          </Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            className="mt-1"
          />
        </div>

        {/* Einddatum */}
        <div>
          <Label htmlFor="end_date" className="font-semibold text-slate-900">
            Einddatum
          </Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            className="mt-1"
          />
        </div>
      </div>

      {/* Opmerkingen */}
      <div>
        <Label htmlFor="notes" className="font-semibold text-slate-900">
          Opmerkingen
        </Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Eventuele opmerkingen over deze rit"
          value={formData.notes}
          onChange={handleChange}
          className="mt-1 resize-none"
          rows={3}
        />
      </div>

      {/* Rit actief */}
      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active" className="font-semibold text-slate-900 cursor-pointer">
          Rit actief
        </Label>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuleren
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? "Laden..." : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}