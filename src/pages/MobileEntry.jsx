import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Home, Clock, Truck, ClipboardCheck, FileText,
  CheckCircle, CalendarDays, Mail, ExternalLink
} from "lucide-react";
import { useOfflineSync } from "@/components/utils/useOfflineSync";
import { useMobileData } from "@/components/utils/mobile/useMobileData";
import { useMobileForm } from "@/components/utils/mobile/useMobileForm";
import { useMobileSubmit } from "@/components/utils/mobile/useMobileSubmit";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileMenu from "@/components/mobile/MobileMenu";
import MobileFrontpage from "@/components/mobile/MobileFrontpage";
import MobileSignatureDialog from "@/components/mobile/MobileSignatureDialog";
import MobileReglementTab from "@/components/mobile/MobileReglementTab";
import MobileHandleidingTab from "@/components/mobile/MobileHandleidingTab";
import MobileDienstTab from "@/components/mobile/tabs/MobileDienstTab";
import MobileRittenTab from "@/components/mobile/tabs/MobileRittenTab";
import MobileInspectionTab from "@/components/mobile/tabs/MobileInspectionTab";
import MobileExpenseTab from "@/components/mobile/tabs/MobileExpenseTab";
import MobileOverviewTab from "@/components/mobile/tabs/MobileOverviewTab";
import MobileMessagesTab from "@/components/mobile/tabs/MobileMessagesTab";
import MobilePlanningTab from "@/components/mobile/MobilePlanningTab";
import MobileLinksTab from "@/components/mobile/tabs/MobileLinksTab";
import { Toaster } from "@/components/ui/sonner";
import { useMobileEntryMode } from "@/components/hooks/useMobileEntryMode";

const MENU_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "dienst", label: "Diensttijd", icon: Clock },
  { id: "ritten", label: "Ritten", icon: Truck },
  { id: "inspectie", label: "Voertuiginspectie", icon: ClipboardCheck },
  { id: "declaratie", label: "Declaratie", icon: FileText },
  { id: "overzicht", label: "Overzicht", icon: CheckCircle },
  { id: "planning", label: "Planning", icon: CalendarDays },
  { id: "berichten", label: "Berichten", icon: Mail },
  { id: "reglement", label: "Bedrijfsreglement", icon: FileText },
  { id: "contracten", label: "Mijn Contracten", icon: FileText, isLink: true },
  { id: "links", label: "Links", icon: ExternalLink },
  { id: "handleiding", label: "Handleiding", icon: FileText }
];

const TAB_ORDER = ["home", "dienst", "ritten", "inspectie", "declaratie", "overzicht", "planning", "berichten", "reglement", "links"];

export default function MobileEntry({ currentUser }) {
  const [activeTab, setActiveTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const { isOnline, syncStatus, pendingCount } = useOfflineSync();

  const data = useMobileData(currentUser);
  const { isMultiDay } = useMobileEntryMode(data.currentEmployee);

  const form = useMobileForm({ isMultiDay, currentEmployee: data.currentEmployee });
  const submit = useMobileSubmit({
    formData: form.formData, trips: form.trips, standplaatsWerk: form.standplaatsWerk,
    signature: form.signature, setSignature: form.setSignature,
    currentEmployee: data.currentEmployee, isMultiDay,
    resetForm: form.resetForm, setActiveTab, queryClient: data.queryClient,
  });

  const menuItems = useMemo(() =>
    MENU_ITEMS.map(i => i.id === 'berichten' ? { ...i, badge: data.unreadCount } : i),
  [data.unreadCount]);

  useEffect(() => {
    if (data.currentEmployee?.id) {
      base44.analytics.track({ eventName: "mobile_entry_page_loaded", properties: { employeeId: data.currentEmployee.id, entryType: isMultiDay ? "multi_day" : "single_day" } });
    }
  }, [data.currentEmployee?.id]);

  const handleSwipe = (dir) => {
    const idx = TAB_ORDER.indexOf(activeTab);
    if (dir === "left" && idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1]);
    if (dir === "right" && idx > 0) setActiveTab(TAB_ORDER[idx - 1]);
  };

  const handleSubmitClick = async () => {
    const result = await submit.startSubmitFlow();
    if (result && result.needsSignature) setShowSignatureDialog(true);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} activeTab={activeTab} setActiveTab={setActiveTab} menuItems={menuItems} />
      <MobileHeader todayShift={data.todayShift} todayStr={data.todayStr} isOnline={isOnline} syncStatus={syncStatus} pendingCount={pendingCount} onMenuOpen={() => setMenuOpen(true)} />

      <motion.div className="p-3 pb-32" style={{ minHeight: 'calc(100vh - 140px)' }}
        drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.x < -80 && info.velocity.x < -300) handleSwipe("left");
          if (info.offset.x > 80 && info.velocity.x > 300) handleSwipe("right");
        }}
      >
        {activeTab === "home" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-2.5 text-slate-900 mb-2 border-2 border-blue-200">
              <h2 className="font-bold text-base mb-1">Welkom in de Interdistri TMS app</h2>
              {data.welcomeMessage ? (
                <p className="text-sm text-slate-600 whitespace-pre-line">{data.welcomeMessage.message}</p>
              ) : (
                <p className="text-sm text-slate-600">Welkom op je werkdag, {data.currentEmployee ? `${data.currentEmployee.first_name} ${data.currentEmployee.last_name}` : data.user?.full_name}! Werk met plezier en rijd veilig. 🚛</p>
              )}
            </div>
            <MobileFrontpage onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === "dienst" && <MobileDienstTab formData={form.formData} setFormData={form.setFormData} trips={form.trips} signature={form.signature} submittedTodayEntries={data.submittedTodayEntries} progressStep={form.progressStep} lastSavedAt={form.lastSavedAt} isSaving={form.isSaving} calculateHours={form.calculateHours} isMultiDay={isMultiDay} isSubmitting={submit.isSubmitting} onSubmit={handleSubmitClick} onSaveDraft={async () => { await submit.handleSaveDraft(); setActiveTab("home"); }} setActiveTab={setActiveTab} />}
        {activeTab === "ritten" && <MobileRittenTab trips={form.trips} setTrips={form.setTrips} standplaatsWerk={form.standplaatsWerk} setStandplaatsWerk={form.setStandplaatsWerk} vehicles={data.vehicles} customers={data.customers} routes={data.routes} tiModelRoutes={data.tiModelRoutes} projects={data.projects} activiteiten={data.activiteiten} progressStep={form.progressStep} lastSavedAt={form.lastSavedAt} isSaving={form.isSaving} isSubmitting={submit.isSubmitting} storageKey={form.storageKey} onSaveDraft={async () => { await submit.handleSaveDraft(); setActiveTab("home"); }} setActiveTab={setActiveTab} />}
        {activeTab === "inspectie" && <MobileInspectionTab inspectionData={form.inspectionData} setInspectionData={form.setInspectionData} vehicles={data.vehicles} currentEmployee={data.currentEmployee} />}
        {activeTab === "declaratie" && <MobileExpenseTab expenseData={form.expenseData} setExpenseData={form.setExpenseData} currentEmployee={data.currentEmployee} />}
        {activeTab === "overzicht" && <MobileOverviewTab approvedEntries={data.approvedEntries} loadingEntries={data.loadingEntries} />}
        {activeTab === "berichten" && <MobileMessagesTab myMessages={data.myMessages} markMessageRead={data.markMessageRead} />}
        {activeTab === "planning" && <MobilePlanningTab schedules={data.schedules} currentEmployee={data.currentEmployee} routes={data.routes} tiModelRoutes={data.tiModelRoutes} vehicles={data.vehicles} />}
        {activeTab === "reglement" && <MobileReglementTab />}
        {activeTab === "handleiding" && <MobileHandleidingTab />}
        {activeTab === "links" && <MobileLinksTab />}
      </motion.div>

      <MobileSignatureDialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog} onSave={submit.handleSignatureAndSubmit} />
      <Toaster position="top-center" richColors />
    </div>
  );
}