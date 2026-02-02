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
import Approvals from './pages/Approvals';
import Backups from './pages/Backups';
import CaoRules from './pages/CaoRules';
import Contracts from './pages/Contracts';
import CustomerDetail from './pages/CustomerDetail';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import DataMigration from './pages/DataMigration';
import Employees from './pages/Employees';
import HRMSettings from './pages/HRMSettings';
import HelpPage from './pages/HelpPage';
import Holidays from './pages/Holidays';
import Messages from './pages/Messages';
import MobileEntry from './pages/MobileEntry';
import NiwoPermits from './pages/NiwoPermits';
import PerformanceReviews from './pages/PerformanceReviews';
import Planning from './pages/Planning';
import Projects from './pages/Projects';
import SalaryReports from './pages/SalaryReports';
import SalaryTables from './pages/SalaryTables';
import ShiftTime from './pages/ShiftTime';
import TimeTracking from './pages/TimeTracking';
import Trips from './pages/Trips';
import Users from './pages/Users';
import Vehicles from './pages/Vehicles';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Approvals": Approvals,
    "Backups": Backups,
    "CaoRules": CaoRules,
    "Contracts": Contracts,
    "CustomerDetail": CustomerDetail,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "DataMigration": DataMigration,
    "Employees": Employees,
    "HRMSettings": HRMSettings,
    "HelpPage": HelpPage,
    "Holidays": Holidays,
    "Messages": Messages,
    "MobileEntry": MobileEntry,
    "NiwoPermits": NiwoPermits,
    "PerformanceReviews": PerformanceReviews,
    "Planning": Planning,
    "Projects": Projects,
    "SalaryReports": SalaryReports,
    "SalaryTables": SalaryTables,
    "ShiftTime": ShiftTime,
    "TimeTracking": TimeTracking,
    "Trips": Trips,
    "Users": Users,
    "Vehicles": Vehicles,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};