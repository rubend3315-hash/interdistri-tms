/**
 * Centralized changelog data for all app releases.
 * Add new entries at the TOP of the array (newest first).
 * 
 * Format:
 * {
 *   version: "x.y.z",
 *   date: "YYYY-MM-DD",
 *   title: "Release naam",
 *   type: "major" | "minor" | "patch" | "hotfix" | "security",
 *   changes: [
 *     { category: "...", description: "...", files: ["..."] }
 *   ]
 * }
 * 
 * Categories: "Feature", "Bugfix", "Security", "Performance", "Refactor", "Backend", "UI", "Deployment"
 */

export const CHANGELOG = [
  {
    version: "2.1.1",
    date: "2026-03-18",
    title: "Versiehistorie & Changelog Pagina",
    type: "minor",
    changes: [
      { category: "Feature", description: "RecentChanges pagina omgebouwd naar echte code changelog met timeline, zoekfunctie en bestandsverwijzingen", files: ["pages/RecentChanges", "components/changelog/changelogData"] },
      { category: "UI", description: "Versiehistorie toont nu alle releases met categorieën, type-badges en gewijzigde bestanden per release", files: ["pages/RecentChanges"] },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-02-23",
    title: "ID Document Private Storage Hardening",
    type: "security",
    changes: [
      { category: "Security", description: "ID-documenten worden nu opgeslagen in private storage met tijdelijke signed URLs", files: ["functions/shareIdDocument", "functions/secureDownload"] },
      { category: "Security", description: "RBAC Enterprise security model geïmplementeerd met permissie-registry", files: ["components/core/rbac/permissionRegistry", "components/core/rbac/requirePermission", "components/core/rbac/roleDefinitions"] },
      { category: "Deployment", description: "Volledige function redeploy protocol (31 functies geverifieerd)", files: ["components/utils/CHANGELOG_DEPLOY_20260223"] },
      { category: "Backend", description: "Encryption service voor gevoelige data (BSN, IBAN)", files: ["functions/encryptionService"] },
      { category: "UI", description: "Security & Privacy pagina toegevoegd", files: ["pages/SecurityPrivacy"] },
      { category: "Backend", description: "Tenant service basis geïmplementeerd", files: ["functions/tenantService"] },
    ],
  },
  {
    version: "2.0.9",
    date: "2026-02-20",
    title: "MobileEntry Stabilisatie & Autosave Fix",
    type: "hotfix",
    changes: [
      { category: "Bugfix", description: "Infinite reload loop opgelost — UPDATE_REQUIRED versiecheck veroorzaakte window.location.reload(true) loop", files: ["components/utils/mobile/useMobileForm"] },
      { category: "Bugfix", description: "Race condition autosave na submit opgelost — markSubmitted() annuleert nu actieve debounce timers", files: ["components/utils/mobile/useMobileForm"] },
      { category: "Performance", description: "CPU-overbelasting backend opgelost door concurrerende upsertDraftTimeEntry calls te elimineren", files: ["functions/upsertDraftTimeEntry"] },
    ],
  },
  {
    version: "2.0.8",
    date: "2026-02-18",
    title: "Submit Reliability & Safari Hardening",
    type: "minor",
    changes: [
      { category: "Performance", description: "Safari-specifieke timeout tuning (12s vs 15s) en retry-delay (5s vs 1.5s)", files: ["components/utils/mobile/safariHardenedFetch"] },
      { category: "Feature", description: "25s hard safety timeout in useEntrySubmit — UI kan nooit meer vastlopen", files: ["components/utils/mobile/useEntrySubmit"] },
      { category: "Backend", description: "submitTimeEntry v7 — Draft-upsert strategie voorkomt orphaned Concept entries", files: ["functions/submitTimeEntry"] },
      { category: "Feature", description: "Client-side submit logging voor debugging", files: ["components/utils/mobile/clientSubmitLogger"] },
      { category: "Bugfix", description: "Payload size guard voorkomt te grote requests door handtekening-data", files: ["components/utils/mobile/safariHardenedFetch"] },
    ],
  },
  {
    version: "2.0.7",
    date: "2026-02-15",
    title: "Overlap Engine & Admin Update",
    type: "minor",
    changes: [
      { category: "Backend", description: "Unified overlap engine — dezelfde logica in submitTimeEntry en adminUpdateTimeEntry", files: ["functions/submitTimeEntry", "functions/adminUpdateTimeEntry"] },
      { category: "Feature", description: "Admin kan TimeEntries bewerken met overlap-validatie (excl. zichzelf)", files: ["functions/adminUpdateTimeEntry"] },
      { category: "Backend", description: "Break schedule in-memory cache (5 min TTL) voor snellere submits", files: ["functions/submitTimeEntry"] },
      { category: "Feature", description: "Idempotency via submission_id met UNIQUE constraint", files: ["functions/submitTimeEntry"] },
    ],
  },
  {
    version: "2.0.6",
    date: "2026-02-12",
    title: "DienstRegels & Unified Timeline",
    type: "minor",
    changes: [
      { category: "Feature", description: "Unified dienstRegels model — ritten en standplaatswerk in één timeline", files: ["components/mobile/tabs/DienstRegelsTab"] },
      { category: "Feature", description: "saveDraftServiceRules backend functie voor autosave van ritten/SPW", files: ["functions/saveDraftServiceRules"] },
      { category: "UI", description: "DienstRegelDrawer en DienstRegelRow componenten voor mobiele invoer", files: ["components/mobile/dienstregels/DienstRegelDrawer", "components/mobile/dienstregels/DienstRegelRow"] },
      { category: "Bugfix", description: "Date change detection reset in useMobileForm — voorkomt stale data", files: ["components/utils/mobile/useMobileForm"] },
    ],
  },
  {
    version: "2.0.5",
    date: "2026-02-08",
    title: "Approvals Workflow & Recalculation",
    type: "minor",
    changes: [
      { category: "Feature", description: "Goedkeurings-workflow met status-transitie validatie", files: ["functions/approveTimeEntry", "functions/rejectTimeEntry"] },
      { category: "Backend", description: "Async recalculatie na submit (fire-and-forget)", files: ["functions/recalculateAfterTimeEntrySubmit"] },
      { category: "Feature", description: "Weekly summary herberekening na goedkeuring", files: ["functions/recalculateWeeklySummaries"] },
      { category: "UI", description: "Approvals pagina met filters, tabs en correctie-dialogen", files: ["pages/Approvals"] },
    ],
  },
  {
    version: "2.0.4",
    date: "2026-02-05",
    title: "Planning & Scheduling",
    type: "minor",
    changes: [
      { category: "Feature", description: "Drag-and-drop planning met resource badges", files: ["pages/Planning", "components/planning/PlanningTable"] },
      { category: "Feature", description: "ShiftTime beheer voor afdeling-specifieke dienstroosters", files: ["pages/ShiftTime"] },
      { category: "Feature", description: "Week kopiëren en dag kopiëren functionaliteit", files: ["components/planning/CopyWeekDialog", "components/planning/CopyDayDialog"] },
    ],
  },
  {
    version: "2.0.3",
    date: "2026-02-01",
    title: "Contract Management",
    type: "minor",
    changes: [
      { category: "Feature", description: "Contract generatie met templates en PDF download", files: ["functions/generateContract", "functions/downloadContractPdf"] },
      { category: "Feature", description: "Digitale ondertekening flow voor contracten", files: ["functions/sendContractForSigning", "pages/StamkaartSignature"] },
      { category: "Feature", description: "Contract wijzigingen tracking", files: ["pages/ContractWijzigingen", "functions/processContractWijziging"] },
      { category: "Feature", description: "Contract analytics dashboard", files: ["pages/ContractAnalytics"] },
    ],
  },
  {
    version: "2.0.2",
    date: "2026-01-28",
    title: "HR & Onboarding",
    type: "minor",
    changes: [
      { category: "Feature", description: "Onboarding wizard met 5-stappen proces", files: ["pages/Onboarding"] },
      { category: "Feature", description: "Stamkaart met digitale handtekening", files: ["pages/Stamkaart", "functions/sendStamkaartEmail"] },
      { category: "Feature", description: "Documentenbeheer met compliance dashboard", files: ["pages/Documents"] },
      { category: "Feature", description: "Performance reviews en notities", files: ["pages/PerformanceReviews"] },
    ],
  },
  {
    version: "2.0.1",
    date: "2026-01-24",
    title: "Business Intelligence",
    type: "minor",
    changes: [
      { category: "Feature", description: "Business Dashboard met omzet per klant", files: ["pages/BusinessDashboard"] },
      { category: "Feature", description: "KPI rapportage PostNL met import/export", files: ["pages/EmployeeReport"] },
      { category: "Feature", description: "Maandcontrole overzicht", files: ["pages/Maandcontrole"] },
      { category: "Feature", description: "KM Dashboard voor voertuig-analyse", files: ["pages/KmDashboard"] },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-01-20",
    title: "Interdistri TMS v2 — Platform Migratie",
    type: "major",
    changes: [
      { category: "Feature", description: "Volledige migratie naar Base44 platform", files: [] },
      { category: "Feature", description: "MobileEntry voor chauffeurs — mobiele tijdregistratie app", files: ["pages/MobileEntry"] },
      { category: "Feature", description: "Enterprise sidebar navigatie met RBAC", files: ["layout"] },
      { category: "Backend", description: "Alle backend functions opgezet (submit, approve, reject, recalc)", files: [] },
      { category: "Feature", description: "Offline support met IndexedDB sync queue", files: ["components/utils/offlineStorage"] },
    ],
  },
];