import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function IntegrationEditDialog({ open, onClose, integration, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    api_url: "",
    api_key: "",
    sync_interval_minutes: 60,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name || "",
        api_url: integration.api_url || "",
        api_key: integration.api_key || "",
        sync_interval_minutes: integration.sync_interval_minutes || 60,
      });
    }
  }, [integration]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(integration.id, formData);
    setSaving(false);
    onClose();
  };

  const urlPlaceholders = {
    loket_nl: "https://api.loket.nl/v2",
    planning_sync: "https://jouw-planning-api.nl/api",
    custom: "https://api.voorbeeld.nl",
  };

  if (!integration) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Instellingen — {integration.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Naam</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>API URL</Label>
            <Input
              value={formData.api_url}
              onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              placeholder={urlPlaceholders[integration.type] || "https://..."}
            />
          </div>
          <div>
            <Label>API Sleutel</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Voer je API sleutel in"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Je API sleutel wordt veilig opgeslagen.
            </p>
          </div>
          <div>
            <Label>Sync-interval (minuten)</Label>
            <Input
              type="number"
              min={5}
              value={formData.sync_interval_minutes}
              onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) || 60 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}