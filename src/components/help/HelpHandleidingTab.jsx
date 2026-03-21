import React from 'react';
import { Accordion } from '@/components/ui/accordion';
import HelpMobileEntryGuide from './HelpMobileEntryGuide';
import { EmailGuide, SystemEmailTemplatesGuide, BackupsGuide, EmailChangeGuide, SecurityArchitectureGuide, MultidayGuide, ShiftTypeGuide, HRImportGuide, ReglementGuide, EmployeeTogglesGuide, TipsGuide } from './HelpGuideExtras';
import { GpsBuddyGuide, FuelSurchargeGuide, KmDashboardGuide, DocumentenGuide, GovernanceGuide } from './HelpMissingModules';
import HelpHandleidingGuides from './HelpHandleidingGuides';

export default function HelpHandleidingTab() {
  return (
    <Accordion type="single" collapsible>
      <HelpHandleidingGuides />
      <HelpMobileEntryGuide />
      <GpsBuddyGuide />
      <FuelSurchargeGuide />
      <KmDashboardGuide />
      <DocumentenGuide />
      <GovernanceGuide />
      <ReglementGuide />
      <EmployeeTogglesGuide />
      <EmailGuide />
      <SystemEmailTemplatesGuide />
      <BackupsGuide />
      <HRImportGuide />
      <MultidayGuide />
      <ShiftTypeGuide />
      <EmailChangeGuide />
      <SecurityArchitectureGuide />
      <TipsGuide />
    </Accordion>
  );
}