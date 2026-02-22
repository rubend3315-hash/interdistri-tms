/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Activiteiten from './pages/Activiteiten';
import Approvals from './pages/Approvals';
import AuditLog from './pages/AuditLog';
import Backups from './pages/Backups';
import Bedrijfsreglement from './pages/Bedrijfsreglement';
import CaoRules from './pages/CaoRules';
import Charters from './pages/Charters';
import CompletedContracts from './pages/CompletedContracts';
import ContractAnalytics from './pages/ContractAnalytics';
import ContractTemplates from './pages/ContractTemplates';
import ContractWijzigingen from './pages/ContractWijzigingen';
import Contracts from './pages/Contracts';
import CustomerDetail from './pages/CustomerDetail';
import Customers from './pages/Customers';
import Dagstaat from './pages/Dagstaat';
import Dashboard from './pages/Dashboard';
import DataMigration from './pages/DataMigration';
import Documents from './pages/Documents';
import EditTimeEntry from './pages/EditTimeEntry';
import EmployeeReport from './pages/EmployeeReport';
import Employees from './pages/Employees';
import HRImport from './pages/HRImport';
import HRMSettings from './pages/HRMSettings';
import HelpPage from './pages/HelpPage';
import Holidays from './pages/Holidays';
import Integrations from './pages/Integrations';
import Messages from './pages/Messages';
import MobileBedrijfsreglement from './pages/MobileBedrijfsreglement';
import MobileEntry from './pages/MobileEntry';
import MobileEntryMultiDay from './pages/MobileEntryMultiDay';
import MobileHandleiding from './pages/MobileHandleiding';
import NiwoPermits from './pages/NiwoPermits';
import Onboarding from './pages/Onboarding';
import PayCheckedAudit from './pages/PayCheckedAudit';
import PerformanceReviews from './pages/PerformanceReviews';
import Planning from './pages/Planning';
import Projects from './pages/Projects';
import Recalculations from './pages/Recalculations';
import SalaryReports from './pages/SalaryReports';
import SalaryTables from './pages/SalaryTables';
import SecurityArchitecture from './pages/SecurityArchitecture';
import SecurityRoadmap from './pages/SecurityRoadmap';
import SecuritySummary from './pages/SecuritySummary';
import ShiftTime from './pages/ShiftTime';
import Stamkaart from './pages/Stamkaart';
import StandplaatsWerk from './pages/StandplaatsWerk';
import SystemArchitectureDiagram from './pages/SystemArchitectureDiagram';
import TIRekenmodule from './pages/TIRekenmodule';
import TenantArchitecture from './pages/TenantArchitecture';
import TimeTracking from './pages/TimeTracking';
import Trips from './pages/Trips';
import Users from './pages/Users';
import Vehicles from './pages/Vehicles';
import SecureDownload from './pages/SecureDownload';
import EncryptionMigration from './pages/EncryptionMigration';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Activiteiten": Activiteiten,
    "Approvals": Approvals,
    "AuditLog": AuditLog,
    "Backups": Backups,
    "Bedrijfsreglement": Bedrijfsreglement,
    "CaoRules": CaoRules,
    "Charters": Charters,
    "CompletedContracts": CompletedContracts,
    "ContractAnalytics": ContractAnalytics,
    "ContractTemplates": ContractTemplates,
    "ContractWijzigingen": ContractWijzigingen,
    "Contracts": Contracts,
    "CustomerDetail": CustomerDetail,
    "Customers": Customers,
    "Dagstaat": Dagstaat,
    "Dashboard": Dashboard,
    "DataMigration": DataMigration,
    "Documents": Documents,
    "EditTimeEntry": EditTimeEntry,
    "EmployeeReport": EmployeeReport,
    "Employees": Employees,
    "HRImport": HRImport,
    "HRMSettings": HRMSettings,
    "HelpPage": HelpPage,
    "Holidays": Holidays,
    "Integrations": Integrations,
    "Messages": Messages,
    "MobileBedrijfsreglement": MobileBedrijfsreglement,
    "MobileEntry": MobileEntry,
    "MobileEntryMultiDay": MobileEntryMultiDay,
    "MobileHandleiding": MobileHandleiding,
    "NiwoPermits": NiwoPermits,
    "Onboarding": Onboarding,
    "PayCheckedAudit": PayCheckedAudit,
    "PerformanceReviews": PerformanceReviews,
    "Planning": Planning,
    "Projects": Projects,
    "Recalculations": Recalculations,
    "SalaryReports": SalaryReports,
    "SalaryTables": SalaryTables,
    "SecurityArchitecture": SecurityArchitecture,
    "SecurityRoadmap": SecurityRoadmap,
    "SecuritySummary": SecuritySummary,
    "ShiftTime": ShiftTime,
    "Stamkaart": Stamkaart,
    "StandplaatsWerk": StandplaatsWerk,
    "SystemArchitectureDiagram": SystemArchitectureDiagram,
    "TIRekenmodule": TIRekenmodule,
    "TenantArchitecture": TenantArchitecture,
    "TimeTracking": TimeTracking,
    "Trips": Trips,
    "Users": Users,
    "Vehicles": Vehicles,
    "SecureDownload": SecureDownload,
    "EncryptionMigration": EncryptionMigration,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};