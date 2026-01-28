import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function TIModelRouteForm({ route, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    route_code: "",
    route_name: "",
    total_time_hours: 0,
    total_time_hhmm: "",
    number_of_stops: 0,
    number_of_parcels: 0,
    calculated_norm_per_hour: 0,
    manual_norm_per_hour: 0,
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
    const newData = { ...formData, [name]: value };

    // Auto-calculate total_time_hhmm from total_time_hours
    if (name === "total_time_hours") {
      const hours = parseFloat(value) || 0;
      const hrs = Math.floor(hours);
      const mins = Math.round((hours - hrs) * 60);
      newData.total_time_hhmm = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

      // Auto-calculate norm per hour (stops / rittijd)
      const stops = parseFloat(newData.number_of_stops) || 0;
      newData.calculated_norm_per_hour = hours > 0 ? (stops / hours).toFixed(2) : 0;
    }

    // Auto-calculate norm when stops change
    if (name === "number_of_stops") {
      const stops = parseFloat(value) || 0;
      const hours = parseFloat(newData.total_time_hours) || 0;
      newData.calculated_norm_per_hour = hours > 0 ? (stops / hours).toFixed(2) : 0;
    }

    setFormData(newData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto pr-2">
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

        {/* Totale rittijd (uren) */}
        <div>
          <Label htmlFor="total_time_hours" className="font-semibold text-slate-900">
            Totale rittijd (uren) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="total_time_hours"
            name="total_time_hours"
            type="number"
            step="0.1"
            placeholder="Bijv. 8.5"
            value={formData.total_time_hours}
            onChange={handleChange}
            className="mt-1"
            required
          />
        </div>

        {/* Rittijd (HH:MM) */}
        <div>
          <Label htmlFor="total_time_hhmm" className="font-semibold text-slate-900">
            Rittijd (HH:MM)
          </Label>
          <Input
            id="total_time_hhmm"
            name="total_time_hhmm"
            placeholder="Automatisch berekend"
            value={formData.total_time_hhmm}
            className="mt-1 bg-slate-50"
            readOnly
            disabled
          />
          <p className="text-xs text-slate-500 mt-1">Automatisch berekend</p>
        </div>

        {/* Aantal stops */}
        <div>
          <Label htmlFor="number_of_stops" className="font-semibold text-slate-900">
            Aantal stops <span className="text-red-500">*</span>
          </Label>
          <Input
            id="number_of_stops"
            name="number_of_stops"
            type="number"
            placeholder="Bijv. 45"
            value={formData.number_of_stops}
            onChange={handleChange}
            className="mt-1"
            required
          />
        </div>

        {/* Aantal stuks */}
        <div>
          <Label htmlFor="number_of_parcels" className="font-semibold text-slate-900">
            Aantal stuks <span className="text-red-500">*</span>
          </Label>
          <Input
            id="number_of_parcels"
            name="number_of_parcels"
            type="number"
            placeholder="Bijv. 120"
            value={formData.number_of_parcels}
            onChange={handleChange}
            className="mt-1"
            required
          />
        </div>

        {/* Berekende norm/uur */}
        <div>
          <Label htmlFor="calculated_norm_per_hour" className="font-semibold text-slate-900">
            Berekende norm/uur
          </Label>
          <Input
            id="calculated_norm_per_hour"
            name="calculated_norm_per_hour"
            placeholder="0.00"
            value={formData.calculated_norm_per_hour}
            className="mt-1 bg-slate-50"
            readOnly
            disabled
          />
          <p className="text-xs text-slate-500 mt-1">Automatisch: stops ÷ rittijd</p>
        </div>

        {/* Norm per besteluur */}
        <div>
          <Label htmlFor="manual_norm_per_hour" className="font-semibold text-slate-900">
            Norm per besteluur (handmatig)
          </Label>
          <Input
            id="manual_norm_per_hour"
            name="manual_norm_per_hour"
            type="number"
            step="0.01"
            placeholder="Bijv. 14.12"
            value={formData.manual_norm_per_hour}
            onChange={handleChange}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">Handmatig in te voeren norm</p>
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