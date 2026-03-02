import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserPlus, Clock, CheckCircle2, Users, Plus, Eye, Trash2 } from "lucide-react";
import OnboardingViewDialog from "../components/onboarding/OnboardingViewDialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

import OnboardingStepIndicator from "../components/onboarding/OnboardingStepIndicator";
import Step1EmployeeDetails from "../components/onboarding/Step1EmployeeDetails";
import Step2Stamkaart from "../components/onboarding/Step2Stamkaart";
import StepIdDocument from "../components/onboarding/StepIdDocument";
import Step3Declarations from "../components/onboarding/Step3Declarations";
import Step4Contract from "../components/onboarding/Step4Contract";
import Step5MobileAccess from "../components/onboarding/Step5MobileAccess";
import Step6Invite from "../components/onboarding/Step5Invite";
import Step7Summary from "../components/onboarding/Step5Summary";

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [employeeData, setEmployeeData] = useState({
    first_name: "", last_name: "", prefix: "", initials: "", email: "", phone: "",
    date_of_birth: "", bsn: "", bank_account: "", address: "", postal_code: "", city: "",
    department: "PakketDistributie", function: "", in_service_since: "", employee_number: "",
    mobile_entry_type: "single_day", emergency_contact_name: "", emergency_contact_phone: "",
    photo_url: "", drivers_license_number: "", drivers_license_categories: "",
    drivers_license_expiry: "", code95_expiry: "", contract_type: "Tijdelijk",
    contract_hours: 40, salary_scale: "", hourly_rate: "", status: "Actief",
    is_chauffeur: true, tonen_in_planner: true, opnemen_in_loonrapport: true,
  });
  const [onboardingData, setOnboardingData] = useState({
    pincode_verklaring_signed: false,
    sleutel_verklaring_signed: false, sleutel_nummer: "", sleutel_toegang: "",
    gps_buddy_toestemming: false, dienstbetrekking_signed: false,
    bedrijfsreglement_ontvangen: false, contract_generated: false,
    mobile_invite_sent: false, employee_signature_url: "",
    id_document: { file_uri: null, file_url: null, file_name: null, document_type: "Identiteitsbewijs", contains_bsn: false, encrypted: false },
  });
  const [createdEmployeeId, setCreatedEmployeeId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewProcess, setViewProcess] = useState(null);

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['onboarding_processes'],
    queryFn: () => base44.entities.OnboardingProcess.list('-created_date', 50),
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees_for_number'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingProcess.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding_processes'] }),
  });

  const employeeName = `${employeeData.first_name} ${employeeData.prefix ? employeeData.prefix + ' ' : ''}${employeeData.last_name}`.trim();

  const handleComplete = async () => {
    // Validate ID document is uploaded
    if (!onboardingData?.id_document?.file_uri) {
      alert("Upload eerst een identiteitsdocument (Stap 3) voordat je de onboarding kunt afronden.");
      return;
    }

    setSubmitting(true);

    // 1. Create employee
    const empPayload = { ...employeeData };
    // Clean categories
    if (typeof empPayload.drivers_license_categories === 'string' && empPayload.drivers_license_categories.trim()) {
      empPayload.drivers_license_categories = empPayload.drivers_license_categories.split(',').map(s => s.trim());
    } else {
      empPayload.drivers_license_categories = null;
    }
    // Remove non-entity fields (keep id_document_number — it's a real Employee field)
    delete empPayload.lkv_uitkering;
    delete empPayload.financiele_situatie;
    // Clean nulls — protect required string fields
    const requiredStringFields = ['first_name', 'last_name', 'department'];
    Object.keys(empPayload).forEach(k => {
      if (requiredStringFields.includes(k)) return;
      if (empPayload[k] === '' || empPayload[k] === undefined) empPayload[k] = null;
    });

    // Copy loonheffing data from onboardingData to empPayload
    if (onboardingData.loonheffing_toepassen) empPayload.loonheffing_toepassen = onboardingData.loonheffing_toepassen;
    if (onboardingData.loonheffing_datum) empPayload.loonheffing_datum = onboardingData.loonheffing_datum;
    if (onboardingData.loonheffing_handtekening_url) empPayload.loonheffing_handtekening_url = onboardingData.loonheffing_handtekening_url;

    let employee;

    // If a temp employee was created for preview, update it and set status to Actief
    if (onboardingData._temp_employee_id) {
      empPayload.status = "Actief";
      await base44.entities.Employee.update(onboardingData._temp_employee_id, empPayload);
      employee = { id: onboardingData._temp_employee_id };
    } else {
      empPayload.status = "Actief";
      employee = await base44.entities.Employee.create(empPayload);
    }

    // 2a. Update existing Document entity with final employee_id
    const idDoc = onboardingData?.id_document;
    if (idDoc?.document_id) {
      await base44.entities.Document.update(idDoc.document_id, {
        linked_employee_id: employee.id,
        linked_entity_name: employeeName,
        name: `ID Document - ${employeeName}`,
        notes: `Bron: onboarding${idDoc.contains_bsn ? ' — BSN zichtbaar op document' : ''}`,
      });
    }

    // 2b. Generate contract if settings were saved
    if (onboardingData.contract_generated && onboardingData.contract_settings) {
      const cs = onboardingData.contract_settings;
      await base44.functions.invoke('generateContract', {
        employee_id: employee.id,
        contract_type: cs.contract_type,
        start_date: cs.start_date,
        end_date: cs.end_date || undefined,
        hours_per_week: cs.hours_per_week ?? employeeData.contract_hours ?? 40,
        proeftijd: cs.proeftijd,
        template_id: cs.template_id || undefined,
      });
    }

    // 3. Create onboarding process record (no pincode stored here)
    await base44.entities.OnboardingProcess.create({
      employee_id: employee.id,
      employee_name: employeeName,
      status: "Afgerond",
      current_step: 8,
      stamkaart_completed: true,
      pincode_verklaring_signed: onboardingData.pincode_verklaring_signed,
      sleutel_verklaring_signed: onboardingData.sleutel_verklaring_signed,
      sleutel_nummer: onboardingData.sleutel_nummer,
      sleutel_toegang: onboardingData.sleutel_toegang,
      gps_buddy_toestemming: onboardingData.gps_buddy_toestemming,
      dienstbetrekking_signed: onboardingData.dienstbetrekking_signed,
      bedrijfsreglement_ontvangen: onboardingData.bedrijfsreglement_ontvangen,
      contract_generated: onboardingData.contract_generated,
      mobile_invite_sent: onboardingData.mobile_invite_sent,
      employee_signature_url: onboardingData.employee_signature_url,
      completed_date: new Date().toISOString(),
    });

    // 4. Auto-create KeylockerPincode if none exists
    const existingPins = await base44.entities.KeylockerPincode.filter({ employee_id: employee.id, active: true });
    if (existingPins.length === 0) {
      const FORBIDDEN = ["0000","1234","4321","1111","2222","3333","4444","5555","6666","7777","8888","9999"];
      let pin;
      do { pin = String(Math.floor(1000 + Math.random() * 9000)); } while (FORBIDDEN.includes(pin));
      const currentUser = await base44.auth.me();
      await base44.entities.KeylockerPincode.create({
        employee_id: employee.id,
        employee_name: employeeName,
        pincode: pin,
        active: true,
        change_reason: "Automatisch aangemaakt bij afronden onboarding",
        changed_by: currentUser.email,
        changed_by_name: currentUser.full_name,
        source: "onboarding",
      });
      try {
        await base44.functions.invoke('auditService', {
          entity_type: 'KeylockerPincode', entity_id: employee.id,
          action_type: 'create', category: 'Security',
          description: `Pincode automatisch aangemaakt voor ${employeeName} via onboarding`,
          metadata: { type: 'keylocker_pincode_auto_created', employee_id: employee.id },
        });
      } catch (_) {}
    }

    queryClient.invalidateQueries({ queryKey: ['onboarding_processes'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });

    setSubmitting(false);
    setWizardOpen(false);
    setCurrentStep(1);
    toast.success(`Onboarding voor ${employeeName} is afgerond!`);

    // Reset form
    setEmployeeData({
      first_name: "", last_name: "", prefix: "", initials: "", email: "", phone: "",
      date_of_birth: "", bsn: "", bank_account: "", address: "", postal_code: "", city: "",
      department: "PakketDistributie", function: "", in_service_since: "", employee_number: "",
      mobile_entry_type: "single_day", emergency_contact_name: "", emergency_contact_phone: "",
      photo_url: "", drivers_license_number: "", drivers_license_categories: "",
      drivers_license_expiry: "", code95_expiry: "", contract_type: "Tijdelijk",
      contract_hours: 40, salary_scale: "", hourly_rate: "", status: "Actief",
      is_chauffeur: true, tonen_in_planner: true, opnemen_in_loonrapport: true,
    });
    setOnboardingData({
      pincode_verklaring_signed: false,
      sleutel_verklaring_signed: false, sleutel_nummer: "", sleutel_toegang: "",
      gps_buddy_toestemming: false, dienstbetrekking_signed: false,
      bedrijfsreglement_ontvangen: false, contract_generated: false,
      mobile_invite_sent: false, employee_signature_url: "",
      id_document: { file_uri: null, file_url: null, file_name: null, document_type: "Identiteitsbewijs", contains_bsn: false, encrypted: false },
      });
      };

  if (wizardOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nieuwe Medewerker Onboarding</h1>
            <p className="text-slate-500 text-sm mt-1">
              {employeeName || "Vul de gegevens in om te starten"}
            </p>
          </div>
          <Button variant="outline" onClick={async () => {
          // Cleanup temp employee if created during preview
          if (onboardingData._temp_employee_id) {
            await base44.entities.Employee.delete(onboardingData._temp_employee_id);
          }
          setWizardOpen(false);
          setCurrentStep(1);
          setCreatedEmployeeId(null);
          setEmployeeData({
            first_name: "", last_name: "", prefix: "", initials: "", email: "", phone: "",
            date_of_birth: "", bsn: "", bank_account: "", address: "", postal_code: "", city: "",
            department: "PakketDistributie", function: "", in_service_since: "", employee_number: "",
            mobile_entry_type: "single_day", emergency_contact_name: "", emergency_contact_phone: "",
            photo_url: "", drivers_license_number: "", drivers_license_categories: "",
            drivers_license_expiry: "", code95_expiry: "", contract_type: "Tijdelijk",
            contract_hours: 40, salary_scale: "", hourly_rate: "", status: "Actief",
            is_chauffeur: true, tonen_in_planner: true, opnemen_in_loonrapport: true,
          });
          setOnboardingData({
            pincode_verklaring_signed: false,
            sleutel_verklaring_signed: false, sleutel_nummer: "", sleutel_toegang: "",
            gps_buddy_toestemming: false, dienstbetrekking_signed: false,
            bedrijfsreglement_ontvangen: false, contract_generated: false,
            mobile_invite_sent: false, employee_signature_url: "",
            id_document: { file_uri: null, file_url: null, file_name: null, document_type: "Identiteitsbewijs", contains_bsn: false, encrypted: false },
          });
        }}>Annuleren</Button>
        </div>

        <OnboardingStepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

        {currentStep === 1 && (
          <Step1EmployeeDetails
            employeeData={employeeData}
            onChange={setEmployeeData}
            onNext={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Stamkaart
            employeeData={employeeData}
            onChange={setEmployeeData}
            onboardingData={onboardingData}
            onOnboardingChange={setOnboardingData}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <StepIdDocument
            employeeData={employeeData}
            onboardingData={onboardingData}
            onChange={setOnboardingData}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step3Declarations
            onboardingData={onboardingData}
            onChange={setOnboardingData}
            employeeName={employeeName}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}
        {currentStep === 5 && (
          <Step4Contract
            employeeData={employeeData}
            onboardingData={onboardingData}
            onChange={setOnboardingData}
            employeeId={createdEmployeeId}
            onNext={() => setCurrentStep(6)}
            onBack={() => setCurrentStep(4)}
          />
        )}
        {currentStep === 6 && (
          <Step5MobileAccess
            employeeData={employeeData}
            onEmployeeChange={setEmployeeData}
            onboardingData={onboardingData}
            onChange={setOnboardingData}
            onNext={() => setCurrentStep(7)}
            onBack={() => setCurrentStep(5)}
          />
        )}
        {currentStep === 7 && (
          <Step6Invite
            employeeData={employeeData}
            onboardingData={onboardingData}
            onChange={setOnboardingData}
            onNext={() => setCurrentStep(8)}
            onBack={() => setCurrentStep(6)}
          />
        )}
        {currentStep === 8 && (
          <Step7Summary
            employeeData={employeeData}
            onboardingData={onboardingData}
            onBack={() => setCurrentStep(7)}
            onComplete={handleComplete}
            isSubmitting={submitting}
          />
        )}
      </div>
    );
  }

  // Overview page
  const stats = {
    total: processes.length,
    completed: processes.filter(p => p.status === "Afgerond").length,
    inProgress: processes.filter(p => p.status === "Gestart" || p.status === "In behandeling").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Onboarding</h1>
          <p className="text-slate-500 mt-1">Onboarding wizard voor nieuwe medewerkers</p>
        </div>
        <Button onClick={() => {
          // Auto-generate next employee number
          const numbers = allEmployees
            .map(e => parseInt(e.employee_number, 10))
            .filter(n => !isNaN(n));
          const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
          setEmployeeData(prev => ({ ...prev, employee_number: String(nextNumber) }));
          setWizardOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nieuwe Onboarding Starten
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-slate-500">Totaal</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-slate-500">Afgerond</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-slate-500">In behandeling</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : processes.length === 0 ? (
        <Card className="text-center py-16">
          <UserPlus className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 text-lg">Nog geen onboardings uitgevoerd</p>
          <p className="text-sm text-slate-400 mt-1">Start een nieuwe onboarding om te beginnen</p>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Medewerker</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Datum</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Acties</th>
              </tr>
            </thead>
            <tbody>
              {processes.map(proc => (
                <tr key={proc.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{proc.employee_name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {proc.completed_date ? format(new Date(proc.completed_date), "d MMM yyyy", { locale: nl }) : format(new Date(proc.created_date), "d MMM yyyy", { locale: nl })}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={
                      proc.status === "Afgerond" ? "bg-green-100 text-green-700" :
                      proc.status === "In behandeling" ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    }>{proc.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600" onClick={() => setViewProcess(proc)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(proc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OnboardingViewDialog
        process={viewProcess}
        open={!!viewProcess}
        onClose={() => setViewProcess(null)}
      />
    </div>
  );
}