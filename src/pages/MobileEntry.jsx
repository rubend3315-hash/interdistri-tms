import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import DienstRegelsTab from "@/components/mobile/tabs/DienstRegelsTab";
import MobileInspectionTab from "@/components/mobile/tabs/MobileInspectionTab";
import MobileExpenseTab from "@/components/mobile/tabs/MobileExpenseTab";
import MobileOverviewTab from "@/components/mobile/tabs/MobileOverviewTab";
import MobileMessagesTab from "@/components/mobile/tabs/MobileMessagesTab";
import MobilePlanningTab from "@/components/mobile/MobilePlanningTab";
import MobileLinksTab from "@/components/mobile/tabs/MobileLinksTab";
import { Toaster } from "@/components/ui/sonner";
import { useMobileEntryMode } from "@/components/hooks/useMobileEntryMode";
import { useBusinessMode } from "@/components/utils/mobile/useBusinessMode";
import WeekHeader from "@/components/mobile/WeekHeader";

const MOBILE_ENTRY_V2 = true;

const MENU_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "dienst", label: "Diensttijd", icon: Clock },
  { id: "ritten", label: "Dienstregels", icon: Truck },
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
  const [geenRit, setGeenRit] = useState(false);
  const [geenRitReden, setGeenRitReden] = useState("");
  const [postNLAuto, setPostNLAuto] = useState(false);
  const [postNLOpenDrawer, setPostNLOpenDrawer] = useState(false);
  const { isOnline, syncStatus, pendingCount } = useOfflineSync();

  const data = useMobileData(currentUser);
  const { isMultiDay } = useMobileEntryMode(data.currentEmployee);
  const rawBusinessMode = useBusinessMode(data.currentEmployee);
  const businessMode = MOBILE_ENTRY_V2 ? rawBusinessMode : "HANDMATIG";

  const form = useMobileForm({ isMultiDay, currentEmployee: data.currentEmployee, businessMode: MOBILE_ENTRY_V2 ? businessMode : "HANDMATIG" });

  // Mutual exclusion: PostNL off when geenRit on
  const handleSetGeenRit = useCallback((val) => {
    setGeenRit(val);
    if (val) setPostNLAuto(false);
  }, []);

  // Direct toggle handler — no useEffect, deterministic
  const handleSetPostNLAuto = useCallback((val) => {
    setPostNLAuto(val);
    if (val) {
      setGeenRit(false);
      setGeenRitReden("");
      if (form.formData.start_time && !form.autoRitDismissed) {
        const postNLCustomer = (data.customers || []).find(c => c.company_name?.toLowerCase().includes("postnl"));
        form.generateAutoRit(form.formData.start_time, form.formData.end_time, postNLCustomer?.id || "");
        setActiveTab("ritten");
        setPostNLOpenDrawer(true);
      }
    }
  }, [form.formData.start_time, form.formData.end_time, form.autoRitDismissed, data.customers]);

  const submit = useMobileSubmit({
    formData: form.formData, trips: form.trips, standplaatsWerk: form.standplaatsWerk,
    dienstRegels: form.dienstRegels,
    signature: form.signature, setSignature: form.setSignature,
    currentEmployee: data.currentEmployee, isMultiDay,
    resetForm: form.resetForm, setActiveTab, queryClient: data.queryClient,
    geenRit: MOBILE_ENTRY_V2 ? geenRit : false,
    geenRitReden: MOBILE_ENTRY_V2 ? geenRitReden : "",
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-white">
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} activeTab={activeTab} setActiveTab={setActiveTab} menuItems={menuItems} />
      <MobileHeader todayShift={data.todayShift} todayStr={data.todayStr} isOnline={isOnline} syncStatus={syncStatus} pendingCount={pendingCount} onMenuOpen={() => setMenuOpen(true)} />

      {MOBILE_ENTRY_V2 && (activeTab === "dienst" || activeTab === "ritten") && (
        <WeekHeader
          selectedDate={form.formData.date}
          onSelectDate={(d) => form.setFormData(prev => ({ ...prev, date: d }))}
        />
      )}

      <motion.div
        className="flex-1 overflow-y-auto px-4 pt-3 pb-4"
        drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.x < -80 && info.velocity.x < -300) handleSwipe("left");
          if (info.offset.x > 80 && info.velocity.x > 300) handleSwipe("right");
        }}
      >
        {activeTab === "home" && (
          <div>
            {/* Welcome — flat, no card */}
            <div className="mb-3">
              <h2 className="font-bold text-[15px] text-slate-900">
                {data.welcomeMessage ? '' : `Welkom, ${data.currentEmployee?.first_name || data.user?.full_name || 'Medewerker'}!`}
              </h2>
              {data.welcomeMessage ? (
                <p className="text-[13px] text-slate-600 whitespace-pre-line">{data.welcomeMessage.message}</p>
              ) : (
                <p className="text-[13px] text-slate-500">Werk met plezier en rijd veilig. 🚛</p>
              )}
            </div>
            <MobileFrontpage onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === "dienst" && <MobileDienstTab formData={form.formData} setFormData={form.setFormData} dienstRegels={form.dienstRegels} signature={form.signature} submittedTodayEntries={data.submittedTodayEntries} progressStep={form.progressStep} lastSavedAt={form.lastSavedAt} isSaving={form.isSaving} calculateHours={form.calculateHours} isMultiDay={isMultiDay} isMultiDayAllowed={isMultiDay} isSubmitting={submit.isSubmitting} onSubmit={handleSubmitClick} onSaveDraft={async () => { await submit.handleSaveDraft(); setActiveTab("home"); }} setActiveTab={setActiveTab} geenRit={MOBILE_ENTRY_V2 ? geenRit : false} setGeenRit={handleSetGeenRit} geenRitReden={geenRitReden} setGeenRitReden={setGeenRitReden} v2={MOBILE_ENTRY_V2} postNLAuto={postNLAuto} setPostNLAuto={handleSetPostNLAuto} />}
        {activeTab === "ritten" && <DienstRegelsTab dienstRegels={form.dienstRegels} setDienstRegels={form.setDienstRegels} vehicles={data.vehicles} customers={data.customers} routes={data.routes} tiModelRoutes={data.tiModelRoutes} projects={data.projects} activiteiten={data.activiteiten} progressStep={form.progressStep} lastSavedAt={form.lastSavedAt} isSaving={form.isSaving} isSubmitting={submit.isSubmitting} storageKey={form.storageKey} onSaveDraft={async () => { await submit.handleSaveDraft(); setActiveTab("home"); }} setActiveTab={setActiveTab} formData={form.formData} postNLAuto={postNLAuto} postNLOpenDrawer={postNLOpenDrawer} setPostNLOpenDrawer={setPostNLOpenDrawer} onSaveAndGoHome={async () => { await submit.handleSaveDraft(); setActiveTab("home"); }} onCloseOpenRitToDienst={postNLAuto && !form.formData.end_time ? async () => { await submit.handleSaveDraft(); setActiveTab("dienst"); requestAnimationFrame(() => { document.getElementById("dienst-eindtijd")?.scrollIntoView({ behavior: "smooth" }); }); } : null} />}
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