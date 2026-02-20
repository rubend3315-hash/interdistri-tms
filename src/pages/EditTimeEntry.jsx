import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Save, ArrowLeft } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function EditTimeEntry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });
  const isAdmin = currentUser?.role === 'admin';

  // Fetch current employee for ownership check
  const { data: currentEmployee } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: currentUser.email });
      return emps[0] ?? null;
    },
    enabled: !!currentUser?.email && !isAdmin
  });

  // Get TimeEntry ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const timeEntryId = urlParams.get('id');

  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    notes: ""
  });

  // Fetch TimeEntry details
  const { data: timeEntry, isLoading, error: timeEntryError } = useQuery({
    queryKey: ['timeEntry', timeEntryId],
    queryFn: () => base44.entities.TimeEntry.get(timeEntryId),
    enabled: !!timeEntryId,
    retry: 1
  });

  // Ownership check: non-admin users can only edit their own entries
  if (!isAdmin && timeEntry && currentEmployee && timeEntry.employee_id !== currentEmployee.id) {
    console.warn("Blocked unauthorized time entry access");
    return <Navigate to={createPageUrl("MobileEntry")} replace />;
  }

  // Fetch Employee details
  const { data: employee } = useQuery({
    queryKey: ['employee', timeEntry?.employee_id],
    queryFn: () => base44.entities.Employee.get(timeEntry.employee_id),
    enabled: !!timeEntry?.employee_id
  });

  // Initialize form data when timeEntry is loaded
  useEffect(() => {
    if (timeEntry) {
      setFormData({
        start_time: timeEntry.start_time || "",
        end_time: timeEntry.end_time || "",
        notes: timeEntry.notes || ""
      });
    }
  }, [timeEntry]);

  // Update TimeEntry mutation — uses server-side status transition
  const updateTimeEntryMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('resubmitTimeEntry', {
        time_entry_id: timeEntryId,
        updated_data: data
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Herindiening mislukt');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntry', timeEntryId] });
      alert('✓ Dienst succesvol aangepast en opnieuw ingediend!');
      navigate(createPageUrl("MobileEntry"));
    }
  });

  // Calculate total hours
  const calculateHours = (start, end, breakMinutes) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes -= breakMinutes || 0;
    return Math.round(totalMinutes / 60 * 100) / 100;
  };

  const totalHours = calculateHours(
    formData.start_time, 
    formData.end_time, 
    timeEntry?.break_minutes || 0
  );

  // Canvas drawing functions
  useEffect(() => {
    if (showSignatureDialog && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [showSignatureDialog]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setSignature(dataUrl);
    setShowSignatureDialog(false);
  };

  const handleSubmit = () => {
    if (!signature) {
      setShowSignatureDialog(true);
      return;
    }

    // Validation
    if (!formData.start_time || !formData.end_time) {
      alert('Vul alstublieft de start- en eindtijd in.');
      return;
    }

    // Update TimeEntry with new data and signature (status transition handled by backend)
    const updateData = {
      start_time: formData.start_time,
      end_time: formData.end_time,
      notes: formData.notes,
      total_hours: totalHours,
      signature_url: signature,
    };

    // Add edit history
    const editHistory = timeEntry.edit_history || [];
    editHistory.push({
      edited_at: new Date().toISOString(),
      edited_by: employee?.email || 'unknown',
      reason: 'Correctie na afkeuring',
      original_data: {
        start_time: timeEntry.start_time,
        end_time: timeEntry.end_time,
        notes: timeEntry.notes,
        total_hours: timeEntry.total_hours
      },
      new_data: {
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        total_hours: totalHours
      }
    });

    updateData.edit_history = editHistory;

    updateTimeEntryMutation.mutate(updateData);
  };

  if (!timeEntryId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Geen TimeEntry ID</h2>
            <p className="text-slate-600 mb-4">Er is geen geldige TimeEntry ID opgegeven in de URL.</p>
            <Button onClick={() => navigate(createPageUrl("MobileEntry"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar Mobile Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Skeleton className="w-32 h-32 rounded-full" />
      </div>
    );
  }

  if (!timeEntry) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Dienst niet gevonden</h2>
            <p className="text-slate-600 mb-2">De gevraagde dienst kon niet worden gevonden.</p>
            {timeEntryError && (
              <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                {timeEntryError?.message || 'Mogelijk geen toestemming of ongeldig ID'}
              </p>
            )}
            <p className="text-sm text-slate-600 mb-4">
              Dit kan gebeuren als je al ingelogd bent met een ander account. Log uit en in met het juiste account.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate(createPageUrl("MobileEntry"))} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Mobile Entry
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  base44.auth.logout();
                }}
              >
                Afmelden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("MobileEntry"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Dienst Aanpassen</h1>
            <p className="text-sm text-amber-100">Afgekeurde tijdregistratie</p>
          </div>
        </div>

        {/* Alert Banner */}
        <div className="bg-white/20 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Je dienst is afgekeurd</p>
            <p className="text-xs text-amber-100 mt-1">
              Pas de onderstaande gegevens aan en onderteken opnieuw om de dienst opnieuw in te dienen.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Rejection Reason */}
        {timeEntry.rejection_reason && (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Reden van afkeuring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-800 whitespace-pre-wrap">
                {timeEntry.rejection_reason}
              </p>
            </CardContent>
          </Card>
        )}

        {/* TimeEntry Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Dienstgegevens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Read-only fields */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-xs text-slate-500">Naam Medewerker</Label>
                <p className="text-sm font-medium text-slate-900">
                  {employee ? `${employee.first_name} ${employee.last_name}` : 'Laden...'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Datum</Label>
                <p className="text-sm font-medium text-slate-900">
                  {timeEntry.date && format(new Date(timeEntry.date), "EEEE d MMMM yyyy", { locale: nl })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Pauze</Label>
                <p className="text-sm font-medium text-slate-900">
                  {timeEntry.break_minutes || 0} minuten
                </p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Starttijd *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength="5"
                  value={formData.start_time}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length >= 3) {
                      value = value.slice(0, 2) + ':' + value.slice(2, 4);
                    }
                    setFormData({ ...formData, start_time: value });
                  }}
                  placeholder="08:30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Eindtijd *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength="5"
                  value={formData.end_time}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length >= 3) {
                      value = value.slice(0, 2) + ':' + value.slice(2, 4);
                    }
                    setFormData({ ...formData, end_time: value });
                  }}
                  placeholder="16:30"
                />
              </div>

              {/* Calculated Total Hours */}
              {formData.start_time && formData.end_time && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Label className="text-xs text-blue-700">Totaal uren (berekend)</Label>
                  <p className="text-lg font-bold text-blue-900">{totalHours} uur</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Opmerkingen</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Extra informatie..."
                />
              </div>
            </div>

            {/* Signature */}
            {signature && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Label className="text-xs text-emerald-700 mb-2 block">Handtekening ✓</Label>
                <img src={signature} alt="Handtekening" className="h-16 border rounded" />
              </div>
            )}

            {/* Submit Button */}
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base"
              onClick={handleSubmit}
              disabled={updateTimeEntryMutation.isPending}
            >
              <Save className="w-5 h-5 mr-2" />
              {updateTimeEntryMutation.isPending ? 'Bezig...' : 'Onderteken en Opnieuw Indienen'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Handtekening</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg">
              <canvas
                ref={canvasRef}
                width={280}
                height={150}
                className="touch-none w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Teken je handtekening hierboven
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearSignature}>
                Wissen
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={saveSignature}>
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}