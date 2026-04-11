import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function LeaveRejectDialog({ open, onOpenChange, onConfirm, isPending }) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(""); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verlofaanvraag Afkeuren</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reden van afkeuring</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Geef een reden op voor de afkeuring..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleConfirm} disabled={isPending}>
              Afkeuren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}